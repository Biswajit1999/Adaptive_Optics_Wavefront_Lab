# Sampling-information sensitivity study (13 November 2026)

Independent Python diagnostics: (1) sinusoidal alias folding into the reduced Nyquist band, (2) exact discrete boxcar amplitude response, and (3) Hann-windowed fraction of non-DC spectral power retained below the reduced Nyquist frequency.

Run `python -m unittest discover -s tests -p 'test_sampling_information.py'` from repository root. This is a synthetic numerical check, **not** a reanalysis of the CIAO FITS file. The 50-frame averaging response is a hypothetical anti-aliasing prefilter, **not** the existing stride-50 point sampler. A boxcar does not perfectly suppress aliases. Window leakage and finite-length data affect the power ratio; do not interpret it as telescope control bandwidth or Strehl. This branch does not change the browser product or the predeclared fidelity gate.

AI-assisted code development was used; Biswajit Jana is the requested commit author. Independent review and real-data validation remain necessary.
