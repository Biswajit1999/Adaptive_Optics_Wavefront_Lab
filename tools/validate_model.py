"""Validate Noll-index Zernike and Marechal relationships used by the AO worker."""

from __future__ import annotations

import csv
import math
from pathlib import Path

NOLL = {
    4: (2, 0, "Defocus"),
    5: (2, -2, "Astigmatism -2"),
    6: (2, 2, "Astigmatism +2"),
    7: (3, -1, "Coma -1"),
    8: (3, 1, "Coma +1"),
    11: (4, 0, "Primary spherical"),
}


def radial(n: int, absolute_m: int, rho: float) -> float:
    value = 0.0
    for s in range((n - absolute_m) // 2 + 1):
        value += (
            (-1) ** s
            * math.factorial(n - s)
            / (
                math.factorial(s)
                * math.factorial((n + absolute_m) // 2 - s)
                * math.factorial((n - absolute_m) // 2 - s)
            )
            * rho ** (n - 2 * s)
        )
    return value


def zernike(j: int, x: float, y: float) -> float | None:
    rho = math.hypot(x, y)
    if rho > 1.0:
        return None
    n, m, _ = NOLL[j]
    normalisation = math.sqrt(n + 1) if m == 0 else math.sqrt(2 * (n + 1))
    theta = math.atan2(y, x)
    angular = 1.0 if m == 0 else math.cos(m * theta) if m > 0 else math.sin(abs(m) * theta)
    return normalisation * radial(n, abs(m), rho) * angular


def inner_product(first: int, second: int, samples: int = 401) -> float:
    total = 0.0
    count = 0
    for iy in range(samples):
        y = 2.0 * (iy + 0.5) / samples - 1.0
        for ix in range(samples):
            x = 2.0 * (ix + 0.5) / samples - 1.0
            first_value = zernike(first, x, y)
            if first_value is not None:
                total += first_value * zernike(second, x, y)  # type: ignore[operator]
                count += 1
    return total / count


def strehl(rms_waves: float) -> float:
    return math.exp(-((2.0 * math.pi * rms_waves) ** 2))


def main() -> None:
    rows: list[dict[str, object]] = []
    for j in NOLL:
        rms_squared = inner_product(j, j)
        rows.append(
            {
                "check": f"J{j}_unit_rms",
                "value": math.sqrt(rms_squared),
                "expected": 1.0,
                "passed": abs(math.sqrt(rms_squared) - 1.0) < 0.01,
            }
        )
    maximum_cross_term = max(abs(inner_product(4, j)) for j in (5, 6, 7, 8, 11))
    rows.extend(
        [
            {
                "check": "Noll_J4_is_defocus",
                "value": NOLL[4][2],
                "expected": "Defocus",
                "passed": NOLL[4] == (2, 0, "Defocus"),
            },
            {
                "check": "modal_orthogonality",
                "value": maximum_cross_term,
                "expected": 0.0,
                "passed": maximum_cross_term < 0.01,
            },
            {
                "check": "strehl_zero_rms",
                "value": strehl(0.0),
                "expected": 1.0,
                "passed": strehl(0.0) == 1.0,
            },
            {
                "check": "strehl_monotonic",
                "value": strehl(0.15),
                "expected": f"< {strehl(0.05)}",
                "passed": strehl(0.15) < strehl(0.05),
            },
        ]
    )
    output = Path(__file__).resolve().parents[1] / "data" / "validation_summary.csv"
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["check", "value", "expected", "passed"])
        writer.writeheader()
        writer.writerows(rows)
    failures = [row["check"] for row in rows if not row["passed"]]
    if failures:
        raise SystemExit(f"Validation failed: {', '.join(str(item) for item in failures)}")
    print(f"Validated {len(rows)} adaptive-optics invariants; wrote {output}")


if __name__ == "__main__":
    main()
