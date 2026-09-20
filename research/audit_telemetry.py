#!/usr/bin/env python3
"""Audit the browser telemetry product against the retained AOT FITS source.

The study has three predeclared gates:

1. provenance: every browser value must equal the selected FITS value rounded to
   six decimal places;
2. distribution: stride-50 samples must reproduce the full-rate mean within
   0.10 full-rate standard deviations and the 5/50/95 percentiles within 0.20
   interquartile ranges for each scalar diagnostic;
3. temporal fidelity: no more than 5% of windowed full-rate power may lie above
   the browser product's Nyquist frequency.

The third gate is intentionally strict. A failure means the browser series is a
sparse overview and must not be used for temporal-spectrum or controller claims.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from astropy.io import fits


ROOT = Path(__file__).resolve().parents[1]
OBSERVATIONS = ROOT / "data" / "observations"
SOURCE = OBSERVATIONS / "CIAO1_2019-12-06_DATA_EXPO-015808.fits"
PRODUCT = OBSERVATIONS / "ciao1_aot_telemetry.json"
OUTPUT = ROOT / "research" / "generated"
STRIDE = 50
EXPECTED_MD5 = "069b37b24997bf55c5312a7bad469502"
ROUNDING_ATOL = 5.01e-7


def digest(path: Path, algorithm: str) -> str:
    value = hashlib.new(algorithm)
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def canonical_numbers(value: object) -> object:
    """Round published floats to a platform-stable 12 significant digits."""
    if isinstance(value, float):
        return float(f"{value:.12g}")
    if isinstance(value, list):
        return [canonical_numbers(item) for item in value]
    if isinstance(value, dict):
        return {key: canonical_numbers(item) for key, item in value.items()}
    return value


def scalar_series(
    gradients: np.ndarray, intensities: np.ndarray, commands: np.ndarray
) -> dict[str, np.ndarray]:
    return {
        "gradient_rms": np.sqrt(np.mean(np.square(gradients), axis=(1, 2))),
        "command_rms": np.sqrt(np.mean(np.square(commands), axis=1)),
        "mean_flux": np.mean(intensities, axis=1),
    }


def percentile(values: np.ndarray, quantile: float) -> float:
    return float(np.quantile(values, quantile, method="linear"))


def power_above_reduced_nyquist(values: np.ndarray, sample_rate_hz: float) -> float:
    centred = values - np.mean(values)
    windowed = centred * np.hanning(values.size)
    power = np.square(np.abs(np.fft.rfft(windowed)))
    frequencies = np.fft.rfftfreq(values.size, d=1.0 / sample_rate_hz)
    non_dc_power = float(np.sum(power[1:]))
    if non_dc_power == 0.0:
        return 0.0
    reduced_nyquist = sample_rate_hz / (2.0 * STRIDE)
    return float(np.sum(power[frequencies > reduced_nyquist]) / non_dc_power)


def metric_audit(name: str, full: np.ndarray, retained: np.ndarray, rate: float) -> dict[str, object]:
    full_mean = float(np.mean(full))
    retained_mean = float(np.mean(retained))
    full_std = float(np.std(full, ddof=1))
    retained_std = float(np.std(retained, ddof=1))
    full_q25 = percentile(full, 0.25)
    full_q75 = percentile(full, 0.75)
    iqr = max(full_q75 - full_q25, np.finfo(float).eps)
    quantiles = {}
    largest_quantile_error_iqr = 0.0
    for label, q in (("q05", 0.05), ("q50", 0.50), ("q95", 0.95)):
        full_value = percentile(full, q)
        retained_value = percentile(retained, q)
        error_iqr = abs(retained_value - full_value) / iqr
        largest_quantile_error_iqr = max(largest_quantile_error_iqr, error_iqr)
        quantiles[label] = {
            "full": full_value,
            "retained": retained_value,
            "absolute_error": abs(retained_value - full_value),
            "error_in_full_iqr": error_iqr,
        }
    mean_error_sd = abs(retained_mean - full_mean) / max(full_std, np.finfo(float).eps)
    distribution_pass = mean_error_sd <= 0.10 and largest_quantile_error_iqr <= 0.20
    aliased_power_fraction = power_above_reduced_nyquist(full, rate)
    return {
        "metric": name,
        "full": {"n": int(full.size), "mean": full_mean, "std": full_std},
        "retained": {
            "n": int(retained.size),
            "mean": retained_mean,
            "std": retained_std,
        },
        "mean_error_in_full_sd": mean_error_sd,
        "largest_quantile_error_in_full_iqr": largest_quantile_error_iqr,
        "quantiles": quantiles,
        "power_above_reduced_nyquist_fraction": aliased_power_fraction,
        "distribution_gate_passed": distribution_pass,
        "temporal_gate_passed": aliased_power_fraction <= 0.05,
    }


def exact_browser_parity(payload: dict[str, object], selected: np.ndarray, arrays: dict[str, np.ndarray]) -> dict[str, float]:
    telemetry = payload["telemetry"]
    assert isinstance(telemetry, dict)
    comparisons = {
        "seconds": np.asarray(telemetry["seconds"], dtype=float),
        "sourceFrameIndex": np.asarray(telemetry["sourceFrameIndex"], dtype=int),
        "gradientX": np.asarray(telemetry["gradientX"], dtype=float),
        "gradientY": np.asarray(telemetry["gradientY"], dtype=float),
        "subapertureIntensity": np.asarray(telemetry["subapertureIntensity"], dtype=float),
        "hodmPosition": np.asarray(telemetry["hodmPosition"], dtype=float),
    }
    expected = {
        "seconds": arrays["seconds"][selected],
        "sourceFrameIndex": selected,
        "gradientX": arrays["gradients"][selected, 0, :],
        "gradientY": arrays["gradients"][selected, 1, :],
        "subapertureIntensity": arrays["intensities"][selected],
        "hodmPosition": arrays["commands"][selected],
    }
    maxima: dict[str, float] = {}
    for name, actual in comparisons.items():
        if actual.shape != expected[name].shape:
            raise AssertionError(f"{name}: shape {actual.shape} != {expected[name].shape}")
        delta = np.abs(actual.astype(float) - expected[name].astype(float))
        maxima[name] = float(np.max(delta)) if delta.size else 0.0
        tolerance = 0.0 if name == "sourceFrameIndex" else ROUNDING_ATOL
        if maxima[name] > tolerance:
            raise AssertionError(f"{name}: maximum FITS/browser difference {maxima[name]:.9g}")
    return maxima


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
    fields = [
        "metric",
        "full_n",
        "retained_n",
        "full_mean",
        "retained_mean",
        "mean_error_in_full_sd",
        "largest_quantile_error_in_full_iqr",
        "power_above_reduced_nyquist_fraction",
        "distribution_gate_passed",
        "temporal_gate_passed",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "metric": row["metric"],
                    "full_n": row["full"]["n"],
                    "retained_n": row["retained"]["n"],
                    "full_mean": f"{row['full']['mean']:.12g}",
                    "retained_mean": f"{row['retained']['mean']:.12g}",
                    "mean_error_in_full_sd": f"{row['mean_error_in_full_sd']:.12g}",
                    "largest_quantile_error_in_full_iqr": f"{row['largest_quantile_error_in_full_iqr']:.12g}",
                    "power_above_reduced_nyquist_fraction": f"{row['power_above_reduced_nyquist_fraction']:.12g}",
                    "distribution_gate_passed": str(row["distribution_gate_passed"]).lower(),
                    "temporal_gate_passed": str(row["temporal_gate_passed"]).lower(),
                }
            )


def main() -> None:
    if digest(SOURCE, "md5") != EXPECTED_MD5:
        raise AssertionError("retained FITS does not match the Zenodo MD5")
    payload = json.loads(PRODUCT.read_text(encoding="utf-8"))
    with fits.open(SOURCE, memmap=False) as hdul:
        timestamps = np.asarray(hdul["AOT_TIME"].data[0]["TIMESTAMPS"], dtype=float)
        arrays = {
            "seconds": timestamps - timestamps[0],
            "gradients": np.asarray(hdul["GRADIENTS"].data, dtype=float),
            "intensities": np.asarray(hdul["INTENSITIES"].data, dtype=float),
            "commands": np.asarray(hdul["HODM POSITIONS"].data, dtype=float),
        }
        rate = float(hdul["AOT_LOOPS"].data[0]["FRAMERATE"])

    selected = np.arange(0, timestamps.size, STRIDE)
    parity = exact_browser_parity(payload, selected, arrays)
    series = scalar_series(arrays["gradients"], arrays["intensities"], arrays["commands"])
    rows = [metric_audit(name, values, values[selected], rate) for name, values in series.items()]
    result = {
        "schema_version": "1.0.0",
        "study": "CIAO1 stride-50 telemetry fidelity audit",
        "source": {
            "doi": "10.5281/zenodo.8192742",
            "file": SOURCE.name,
            "md5": digest(SOURCE, "md5"),
            "sha256": digest(SOURCE, "sha256"),
            "frames": int(timestamps.size),
            "loop_rate_hz": rate,
        },
        "browser_product": {
            "file": PRODUCT.name,
            "sha256": digest(PRODUCT, "sha256"),
            "stride": STRIDE,
            "frames": int(selected.size),
            "effective_sample_rate_hz": rate / STRIDE,
            "nyquist_hz": rate / (2.0 * STRIDE),
            "maximum_fits_parity_error": parity,
        },
        "predeclared_gates": {
            "provenance_max_absolute_error": ROUNDING_ATOL,
            "distribution_mean_error_full_sd_max": 0.10,
            "distribution_quantile_error_full_iqr_max": 0.20,
            "temporal_power_above_reduced_nyquist_max": 0.05,
        },
        "metrics": rows,
        "conclusions": {
            "provenance_gate_passed": True,
            "distribution_gate_passed": all(bool(row["distribution_gate_passed"]) for row in rows),
            "temporal_gate_passed": all(bool(row["temporal_gate_passed"]) for row in rows),
            "interpretation": (
                "The browser product is an exact rounded stride sample. Distributional and temporal "
                "fitness are separate gates; a failed temporal gate forbids spectral, bandwidth, or "
                "closed-loop dynamics inference from the 300-frame browser product."
            ),
        },
    }
    if not all(math.isfinite(float(row["power_above_reduced_nyquist_fraction"])) for row in rows):
        raise AssertionError("non-finite spectral result")
    result = canonical_numbers(result)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    json_path = OUTPUT / "telemetry-decimation-audit.json"
    csv_path = OUTPUT / "telemetry-decimation-audit.csv"
    json_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_csv(rows, csv_path)
    print(json.dumps(result["conclusions"], sort_keys=True))
    for row in rows:
        print(
            f"{row['metric']}: mean_error={row['mean_error_in_full_sd']:.4f} SD, "
            f"max_quantile_error={row['largest_quantile_error_in_full_iqr']:.4f} IQR, "
            f"power_above_5Hz={100 * row['power_above_reduced_nyquist_fraction']:.2f}%"
        )


if __name__ == "__main__":
    main()
