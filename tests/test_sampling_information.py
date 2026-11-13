"""Synthetic regression checks for sampling diagnostics."""
import unittest
import numpy as np
from research.sampling_information import alias_frequency,boxcar_response,retained_power_fraction

class SamplingTests(unittest.TestCase):
    def test_alias(self):
        self.assertAlmostEqual(alias_frequency(12,10),2)
        self.assertAlmostEqual(alias_frequency(5,10),5)
    def test_boxcar(self):
        self.assertAlmostEqual(float(boxcar_response(0,100,50)),1)
        self.assertLess(float(boxcar_response(2,100,50)),1e-12)
    def test_power(self):
        t=np.arange(1000)/100
        self.assertGreater(retained_power_fraction(np.sin(2*np.pi*2*t),100,10),.99)
        self.assertLess(retained_power_fraction(np.sin(2*np.pi*20*t),100,10),.01)
    def test_invalid(self):
        with self.assertRaises(ValueError): alias_frequency(-1,10)

if __name__ == "__main__": unittest.main()
