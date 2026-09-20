#!/usr/bin/env python3
"""Validate the official CIAO AOT telemetry-derived browser asset."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OBSERVATIONS = ROOT / "data" / "observations"
SOURCE = OBSERVATIONS / "CIAO1_2019-12-06_DATA_EXPO-015808.fits"
PRODUCT = OBSERVATIONS / "ciao1_aot_telemetry.json"
AUDIT = ROOT / "research" / "generated" / "telemetry-decimation-audit.json"
EXPECTED_MD5 = "069b37b24997bf55c5312a7bad469502"
EXPECTED_SOURCE_SHA256 = "cd9e05a65c90e459df28fb8c2d4671381a08060d10b012c472dc41a6bdfd3d0e"
EXPECTED_PRODUCT_SHA256 = "3b178065db3cb38db498ab965beb58b5c93eb6ff960cd7f9670b500787a5f615"


def assert_matrix(matrix: list[list[float]], rows: int, columns: int, name: str) -> None:
    if len(matrix) != rows or any(len(row) != columns for row in matrix):
        raise ValueError(f"{name}: unexpected matrix dimensions")
    if not all(math.isfinite(float(value)) for row in matrix for value in row):
        raise ValueError(f"{name}: non-finite telemetry value")


def main() -> None:
    if hashlib.md5(SOURCE.read_bytes()).hexdigest() != EXPECTED_MD5:
        raise ValueError("The retained AOT FITS source does not match the published Zenodo MD5")
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED_SOURCE_SHA256:
        raise ValueError("The retained AOT FITS source does not match the reviewed SHA-256")
    if hashlib.sha256(PRODUCT.read_bytes()).hexdigest() != EXPECTED_PRODUCT_SHA256:
        raise ValueError("The browser telemetry product does not match the reviewed SHA-256")
    payload = json.loads(PRODUCT.read_text(encoding="utf-8"))
    source = payload["source"]
    telemetry = payload["telemetry"]
    if source["doi"] != "10.5281/zenodo.8192742" or source["loopRateHz"] != 499.962:
        raise ValueError("AOT source provenance or loop rate differs from the selected release")
    if source["originalFrameCount"] != 15000 or len(telemetry["seconds"]) != 300:
        raise ValueError("Unexpected original or sampled frame count")
    assert_matrix(telemetry["gradientX"], 300, 68, "gradientX")
    assert_matrix(telemetry["gradientY"], 300, 68, "gradientY")
    assert_matrix(telemetry["subapertureIntensity"], 300, 68, "subapertureIntensity")
    assert_matrix(telemetry["hodmPosition"], 300, 60, "hodmPosition")
    audit = json.loads(AUDIT.read_text(encoding="utf-8"))
    if audit["source"]["sha256"] != EXPECTED_SOURCE_SHA256:
        raise ValueError("Audit source receipt is stale")
    if audit["browser_product"]["sha256"] != EXPECTED_PRODUCT_SHA256:
        raise ValueError("Audit browser-product receipt is stale")
    conclusions = audit["conclusions"]
    if not conclusions["provenance_gate_passed"] or not conclusions["distribution_gate_passed"]:
        raise ValueError("Reviewed provenance or distribution gate no longer passes")
    if conclusions["temporal_gate_passed"]:
        raise ValueError("Temporal gate changed; review the public inference boundary")
    print(
        "Validated CIAO AOT receipts and evidence boundary: 15000 source frames, "
        "300 retained frames; provenance/distribution PASS, temporal fidelity FAIL"
    )


if __name__ == "__main__":
    main()
