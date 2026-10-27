"""Synthetic invariants for full-rate temporal sensitivity diagnostics."""
import unittest
import numpy as np
from research.temporal_robustness import lowpass_decimate, block_mean_uncertainty, lag_surrogate_test


class TemporalResearchTests(unittest.TestCase):
    def test_fir_constant_preservation(self):
        x = np.full(2000, 3.2)
        self.assertTrue(np.allclose(lowpass_decimate(x, 20, 401), 3.2, atol=1e-12))

    def test_antialias_rejects_above_reduced_nyquist(self):
        n = 10000
        t = np.arange(n)
        low = np.sin(2*np.pi*.004*t)
        high = 2*np.sin(2*np.pi*.157*t)
        filtered = lowpass_decimate(low+high, 20, 401)
        expected = low[::20]
        self.assertLess(np.std(filtered[20:-20]-expected[20:-20]), .12)
        self.assertGreater(np.std((low+high)[::20][20:-20]-expected[20:-20]), .8)

    def test_invalid_decimation(self):
        with self.assertRaises(ValueError):
            lowpass_decimate(np.ones(20), 50, 201)

    def test_bootstrap_constant(self):
        result = block_mean_uncertainty(np.full(400, 5.), 20, draws=60)
        self.assertAlmostEqual(result['mean'], 5.)
        self.assertAlmostEqual(result['block_se'], 0.)

    def test_bootstrap_correlated_uncertainty(self):
        rng = np.random.default_rng(3)
        innovations = rng.normal(size=3000)
        x = np.empty(3000)
        x[0] = innovations[0]
        for i in range(1, 3000):
            x[i] = .9*x[i-1] + innovations[i]
        result = block_mean_uncertainty(x, 80, draws=350)
        self.assertGreater(result['block_se'], 2*result['iid_se'])

    def test_bootstrap_reproducible(self):
        x = np.arange(100, dtype=float)
        self.assertEqual(block_mean_uncertainty(x, 10, seed=9), block_mean_uncertainty(x, 10, seed=9))

    def test_lag_known_synthetic_shift(self):
        rng = np.random.default_rng(7)
        x = rng.normal(size=1500)
        y = np.roll(x, 4) + .1*rng.normal(size=1500)
        result = lag_surrogate_test(x, y, max_lag=12, surrogates=49)
        self.assertEqual(result['lag_samples'], -4)
        self.assertGreater(abs(result['correlation']), .98)
        self.assertLessEqual(result['surrogate_p'], .05)

    def test_lag_invalid_constant(self):
        with self.assertRaises(ValueError):
            lag_surrogate_test(np.ones(100), np.ones(100), max_lag=5)


if __name__ == '__main__':
    unittest.main()
