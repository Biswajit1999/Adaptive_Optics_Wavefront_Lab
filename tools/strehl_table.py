"""Generate a simple Strehl-ratio lookup table for residual wavefront RMS."""

from __future__ import annotations

import csv
import math
from pathlib import Path


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "data" / "strehl_table.csv"
    output.parent.mkdir(exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["rms_waves", "strehl"])
        writer.writeheader()
        for index in range(101):
            rms = index / 500
            writer.writerow({"rms_waves": rms, "strehl": math.exp(-((2 * math.pi * rms) ** 2))})
    print(f"Wrote {output}")

    budget_output = Path(__file__).resolve().parents[1] / "data" / "ao_error_budget.csv"
    with budget_output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["actuator_pitch_m", "fried_r0_m", "fitting_error_waves"])
        writer.writeheader()
        for index in range(1, 41):
            pitch = 0.02 * index
            r0 = 0.16
            fitting = 0.28 * (pitch / r0) ** (5 / 6) / (2 * math.pi)
            writer.writerow({"actuator_pitch_m": pitch, "fried_r0_m": r0, "fitting_error_waves": fitting})
    print(f"Wrote {budget_output}")


if __name__ == "__main__":
    main()
