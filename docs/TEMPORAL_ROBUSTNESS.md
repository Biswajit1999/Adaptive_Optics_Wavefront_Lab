# Full-rate temporal sensitivity (27 October 2026)

This independent Python diagnostic uses the **MD5-verified 15,000-frame CIAO1 AOT FITS** already retained in the repository. It never treats the 300-frame browser product as a valid temporal spectrum.

1. **Anti-alias sensitivity:** a reflect-padded, Hamming-windowed sinc FIR (501 taps, cutoff 80% of the stride-50 Nyquist) precedes stride-50 decimation. Compare raw and filtered standard deviations. The filter is a numerical sensitivity example, not a reconstructed CIAO transfer function; its finite stop-band and edge assumptions must be considered.
2. **Time-dependence of mean uncertainty:** circular moving-block bootstrap with 25- and 250-frame blocks versus an iid standard error. Bootstrap intervals are conditional on block length and local stationarity, not calibrated instrumental errors.
3. **Gradient-command association:** full-rate lagged RMS correlation versus 49 seeded circular-shift surrogate maxima. The p-value is a descriptive within-record null check with minimum resolution 1/50; it cannot identify controller causality, true loop latency, or on-sky performance.

Reproduce with `python -m unittest discover -s tests -p 'test_*_research.py' -v` and `python -m research.temporal_robustness --output /tmp/ao-temporal.json`. Requires the retained FITS and locked requirements. See `METHODS.md` and `CLAIMS.md` for observational limitations. This analysis makes **no** wavefront or PSF reconstruction claim.
