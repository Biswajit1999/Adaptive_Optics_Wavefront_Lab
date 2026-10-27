"""Independent full-rate AO telemetry sensitivity diagnostics, not controller inference."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import numpy as np


def lowpass_decimate(values: np.ndarray, stride: int, taps: int = 201) -> np.ndarray:
    """Reflect-padded windowed-sinc FIR followed by decimation (relative Nyquist 0.8)."""
    x = np.asarray(values, float)
    if x.ndim != 1 or not np.all(np.isfinite(x)) or stride < 2 or taps < 3 or taps % 2 != 1 or x.size < taps:
        raise ValueError("Require finite 1D series, stride>=2, odd taps and sufficient samples")
    half = taps // 2
    cutoff = 0.4 / stride  # cycles per original sample, 80% of reduced Nyquist
    k = np.arange(-half, half + 1)
    h = 2 * cutoff * np.sinc(2 * cutoff * k) * np.hamming(taps)
    h /= h.sum()
    filtered = np.convolve(np.pad(x, half, mode="reflect"), h, mode="valid")
    return filtered[::stride]


def block_mean_uncertainty(values: np.ndarray, block: int, draws: int = 300, seed: int = 27) -> dict:
    """Circular moving-block bootstrap of a mean; no iid assumption for bootstrap."""
    x = np.asarray(values, float)
    n = x.size
    if x.ndim != 1 or not np.all(np.isfinite(x)) or n < 4 or not 1 <= block <= n//2 or draws < 20:
        raise ValueError("Invalid series, block length or draw count")
    rng = np.random.default_rng(seed)
    blocks = (n + block - 1)//block
    offsets = np.arange(block)
    means = np.empty(draws)
    for j in range(draws):
        starts = rng.integers(0, n, size=blocks)
        indices = ((starts[:, None] + offsets) % n).ravel()[:n]
        means[j] = np.mean(x[indices])
    return {"mean": float(x.mean()), "iid_se": float(x.std(ddof=1)/np.sqrt(n)),
            "block_se": float(means.std(ddof=1)),
            "ci_95": [float(v) for v in np.quantile(means, [.025, .975])]}


def lag_surrogate_test(first: np.ndarray, second: np.ndarray, max_lag: int = 20,
                       surrogates: int = 99, seed: int = 27) -> dict:
    """Peak signed cross-correlation vs circular-shift null; no causal direction claim."""
    x, y = np.asarray(first, float), np.asarray(second, float)
    if x.ndim != 1 or y.shape != x.shape or x.size < 8*max_lag+8 or max_lag < 1 or surrogates < 9 or not np.all(np.isfinite(x)) or not np.all(np.isfinite(y)):
        raise ValueError("Invalid aligned series, lag or surrogate count")
    x, y = x-x.mean(), y-y.mean()
    if np.std(x) == 0 or np.std(y) == 0:
        raise ValueError("Cannot correlate constant series")
    def correlations(a, b):
        values = []
        for lag in range(-max_lag, max_lag+1):
            aa, bb = (a[:lag], b[-lag:]) if lag < 0 else ((a[lag:], b[:-lag]) if lag > 0 else (a, b))
            values.append(float(np.dot(aa, bb)/np.sqrt(np.dot(aa, aa)*np.dot(bb, bb))))
        return np.asarray(values)
    observed = correlations(x, y)
    peak = int(np.argmax(np.abs(observed)))
    rng = np.random.default_rng(seed)
    shifts = rng.integers(2*max_lag+1, x.size-2*max_lag, size=surrogates)
    null = np.asarray([np.max(np.abs(correlations(x, np.roll(y, int(shift))))) for shift in shifts])
    return {"lag_samples": peak-max_lag, "correlation": float(observed[peak]),
            "max_abs_null_q95": float(np.quantile(null, .95)),
            "surrogate_p": float((1+np.count_nonzero(null >= abs(observed[peak])))/(surrogates+1))}


def run_observations() -> dict:
    """Use repository-retained, MD5-checked full-rate FITS, never browser stride series."""
    from astropy.io import fits
    from research.audit_telemetry import SOURCE, EXPECTED_MD5, digest, scalar_series, STRIDE
    if digest(SOURCE, 'md5') != EXPECTED_MD5:
        raise AssertionError('Official FITS MD5 mismatch')
    with fits.open(SOURCE, memmap=False) as hdul:
        values = scalar_series(np.asarray(hdul['GRADIENTS'].data, float),
                               np.asarray(hdul['INTENSITIES'].data, float),
                               np.asarray(hdul['HODM POSITIONS'].data, float))
        rate = float(hdul['AOT_LOOPS'].data[0]['FRAMERATE'])
    output = {"source": SOURCE.name, "verified_md5": EXPECTED_MD5, "full_rate_hz": rate,
              "frame_count": len(values['gradient_rms']), "stride": STRIDE, "metrics": {}}
    for name, series in values.items():
        raw = series[::STRIDE]
        filtered = lowpass_decimate(series, STRIDE, taps=501)
        output['metrics'][name] = {
            "raw_stride_std": float(np.std(raw, ddof=1)),
            "anti_alias_std": float(np.std(filtered, ddof=1)),
            "mean_bootstrap_block_25": block_mean_uncertainty(series, 25),
            "mean_bootstrap_block_250": block_mean_uncertainty(series, 250)}
    output['gradient_command_lag'] = lag_surrogate_test(
        values['gradient_rms'], values['command_rms'], max_lag=25, surrogates=49)
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = run_observations()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(f"Full-rate telemetry diagnostics: {result['frame_count']} frames; {args.output}")


if __name__ == '__main__':
    main()
