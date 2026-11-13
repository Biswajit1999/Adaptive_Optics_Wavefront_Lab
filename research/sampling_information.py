"""Sampling diagnostics for AO telemetry; not wavefront reconstruction."""
import numpy as np

def alias_frequency(frequency_hz, sample_rate_hz):
    """Fold sinusoidal frequency into [0, fs/2]."""
    if not np.isfinite(frequency_hz) or frequency_hz < 0 or not np.isfinite(sample_rate_hz) or sample_rate_hz <= 0:
        raise ValueError("invalid frequency or rate")
    return abs((frequency_hz + sample_rate_hz/2) % sample_rate_hz - sample_rate_hz/2)

def boxcar_response(frequency_hz, sample_rate_hz, length):
    """Magnitude of length-N mean response at original sample rate."""
    if not isinstance(length, int) or length < 1 or sample_rate_hz <= 0:
        raise ValueError("invalid length or rate")
    f = np.asarray(frequency_hz, dtype=float)
    if not np.all(np.isfinite(f)):
        raise ValueError("nonfinite frequency")
    x = f/sample_rate_hz
    return np.abs(np.sinc(length*x)/np.sinc(x))

def retained_power_fraction(signal, sample_rate_hz, reduced_rate_hz):
    """Hann-windowed non-DC power below the reduced Nyquist frequency."""
    x = np.asarray(signal, dtype=float)
    if x.ndim != 1 or x.size < 8 or not np.all(np.isfinite(x)) or not 0 < reduced_rate_hz <= sample_rate_hz:
        raise ValueError("invalid series or rates")
    p = np.abs(np.fft.rfft((x-x.mean())*np.hanning(x.size)))**2
    f = np.fft.rfftfreq(x.size, 1/sample_rate_hz)
    total = p[1:].sum()
    if total <= 0:
        raise ValueError("zero non-DC power")
    return float(p[(f > 0) & (f <= reduced_rate_hz/2)].sum()/total)
