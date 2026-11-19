"""Conditional telemetry decimation diagnostics; no calibrated AO inference.

Two checks: (1) exact folded alias frequencies for a regular point sampler;
(2) finite-window block-bootstrap uncertainty for a retained scalar telemetry
series. Both are standalone and do not modify the published CIAO audit.
"""
from __future__ import annotations
import math
import random
import statistics
from numbers import Integral


def alias_frequency(frequency_hz: float, sample_rate_hz: float) -> float:
    """Fold a nonnegative sinusoid frequency into [0, fs/2], in Hz."""
    if not (math.isfinite(frequency_hz) and frequency_hz >= 0
            and math.isfinite(sample_rate_hz) and sample_rate_hz > 0):
        raise ValueError("finite nonnegative frequency and positive rate required")
    folded = frequency_hz % sample_rate_hz
    return min(folded, sample_rate_hz - folded)


def block_mean_interval(values, block_length: int, *, draws=2000, seed=0):
    """Circular moving-block bootstrap percentile interval for the sample mean.

    Assumes weak stationarity and a block length long enough to preserve
    relevant serial dependence; this is not a measurement-error model.
    """
    x = [float(v) for v in values]
    n = len(x)
    if (n < 3 or any(not math.isfinite(v) for v in x)
            or isinstance(block_length, bool) or not isinstance(block_length, Integral)
            or not 1 <= block_length <= n or isinstance(draws, bool)
            or not isinstance(draws, Integral) or draws < 20):
        raise ValueError("invalid series, block length, or draw count")
    rng = random.Random(seed)
    means = []
    for _ in range(draws):
        resample = []
        while len(resample) < n:
            start = rng.randrange(n)
            resample.extend(x[(start + j) % n] for j in range(block_length))
        means.append(statistics.fmean(resample[:n]))
    means.sort()
    return {
        "mean": statistics.fmean(x),
        "lower_95": means[int(0.025 * (draws - 1))],
        "upper_95": means[int(0.975 * (draws - 1))],
        "block_length": block_length,
        "draws": draws,
        "seed": seed,
    }


if __name__ == "__main__":
    import unittest

    class AuditTests(unittest.TestCase):
        def test_alias(self):
            self.assertAlmostEqual(alias_frequency(490, 10), 0)
            self.assertAlmostEqual(alias_frequency(7, 10), 3)
            self.assertAlmostEqual(alias_frequency(2, 10), 2)

        def test_invalid(self):
            with self.assertRaises(ValueError):
                alias_frequency(1, 0)
            with self.assertRaises(ValueError):
                block_mean_interval([1, 2], 1)
            for draws in (19, 100.5, float("nan"), True):
                with self.subTest(draws=draws), self.assertRaises(ValueError):
                    block_mean_interval([1, 2, 3], 1, draws=draws)

        def test_bootstrap(self):
            a = block_mean_interval([2.0] * 12, 3, draws=100)
            self.assertEqual(a["lower_95"], 2)
            self.assertEqual(a["upper_95"], 2)
            self.assertEqual(a, block_mean_interval([2.0] * 12, 3, draws=100))

    unittest.main()
