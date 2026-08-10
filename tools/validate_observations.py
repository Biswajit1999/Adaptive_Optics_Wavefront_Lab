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
EXPECTED_MD5 = "069b37b24997bf55c5312a7bad469502"


def assert_matrix(matrix: list[list[float]], rows: int, columns: int, name: str) -> None:
    if len(matrix) != rows or any(len(row) != columns for row in matrix):
        raise ValueError(f"{name}: unexpected matrix dimensions")
    if not all(math.isfinite(float(value)) for row in matrix for value in row):
        raise ValueError(f"{name}: non-finite telemetry value")


def main() -> None:
    if hashlib.md5(SOURCE.read_bytes()).hexdigest() != EXPECTED_MD5:
        raise ValueError("The retained AOT FITS source does not match the published Zenodo MD5")
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
    print(
        "Validated CIAO AOT observation asset: 15000 source frames, "
        "300 retained browser frames, 68 WFS samples, 60 HODM actuators"
    )


if __name__ == "__main__":
    main()
