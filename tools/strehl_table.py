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


if __name__ == "__main__":
    main()
