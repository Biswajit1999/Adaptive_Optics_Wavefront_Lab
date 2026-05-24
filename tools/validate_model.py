"""Validate Zernike normalisation and Strehl scaling."""

from __future__ import annotations

import csv
import math
from pathlib import Path


def zernike(x: float, y: float, mode: str) -> float | None:
    rho2 = x * x + y * y
    if rho2 > 1:
        return None
    rho = math.sqrt(rho2)
    theta = math.atan2(y, x)
    if mode == "defocus":
        return math.sqrt(3) * (2 * rho**2 - 1)
    if mode == "astig":
        return math.sqrt(6) * rho**2 * math.cos(2 * theta)
    if mode == "coma":
        return math.sqrt(8) * (3 * rho**3 - 2 * rho) * math.cos(theta)
    if mode == "trefoil":
        return math.sqrt(8) * rho**3 * math.cos(3 * theta)
    raise ValueError(mode)


def rms_mode(mode: str, samples: int = 301) -> float:
    total = 0.0
    count = 0
    for ix in range(samples):
        x = 2 * ix / (samples - 1) - 1
        for iy in range(samples):
            y = 2 * iy / (samples - 1) - 1
            value = zernike(x, y, mode)
            if value is not None:
                total += value * value
                count += 1
    return math.sqrt(total / count)


def strehl(rms_waves: float) -> float:
    return math.exp(-((2 * math.pi * rms_waves) ** 2))


def fitting_error(pitch: float, r0: float) -> float:
    return 0.28 * (pitch / r0) ** (5 / 6) / (2 * math.pi)


def servo_error(delay: float, tau0: float) -> float:
    return 0.30 * (delay / tau0) ** (5 / 6) / (2 * math.pi)


def main() -> None:
    modes = ["defocus", "astig", "coma", "trefoil"]
    output = Path(__file__).resolve().parents[1] / "data" / "validation_summary.csv"
    rows = []
    for mode in modes:
        rms = rms_mode(mode)
        rows.append({"check": f"{mode}_rms_normalisation", "value": rms, "expected": 1.0, "passed": abs(rms - 1.0) < 0.02})
    rows.append({"check": "strehl_at_zero_rms", "value": strehl(0.0), "expected": 1.0, "passed": math.isclose(strehl(0.0), 1.0)})
    rows.append({"check": "strehl_monotonic", "value": strehl(0.15) < strehl(0.05), "expected": True, "passed": strehl(0.15) < strehl(0.05)})
    rows.append({"check": "fitting_error_pitch_monotonic", "value": fitting_error(0.32, 0.16) > fitting_error(0.16, 0.16), "expected": True, "passed": fitting_error(0.32, 0.16) > fitting_error(0.16, 0.16)})
    rows.append({"check": "servo_error_delay_monotonic", "value": servo_error(4.0, 4.0) > servo_error(2.0, 4.0), "expected": True, "passed": servo_error(4.0, 4.0) > servo_error(2.0, 4.0)})
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["check", "value", "expected", "passed"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
