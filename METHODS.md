# Methods and reproducibility protocol

## Research question

Does the committed 300-frame browser product preserve enough information from the
15,000-frame CIAO1 AOT telemetry release to support (a) provenance, (b)
distributional summaries, and (c) temporal-dynamics interpretation?

The three questions are evaluated separately. Passing one does not imply passing
the others.

## Data and provenance

- Source: `CIAO1_2019-12-06_DATA_EXPO-015808.fits` from Zenodo record
  [8192742](https://doi.org/10.5281/zenodo.8192742).
- Published MD5: `069b37b24997bf55c5312a7bad469502`.
- Retained-file SHA-256:
  `cd9e05a65c90e459df28fb8c2d4671381a08060d10b012c472dc41a6bdfd3d0e`.
- Browser-product SHA-256:
  `3b178065db3cb38db498ab965beb58b5c93eb6ff960cd7f9670b500787a5f615`.
- Released loop rate: 499.962 Hz; full frames: 15,000; retained stride: 50;
  browser frames: 300; effective browser rate: 9.99924 Hz.

The audit reads the retained FITS directly with Astropy. It does not download or
silently refresh data during verification or deployment.

## Predeclared gates

### 1. Provenance fidelity

Every retained timestamp, source-frame index, gradient-X value, gradient-Y value,
subaperture intensity, and HODM position must match the corresponding stride-50
FITS value. Floating-point values may differ by at most `5.01e-7`, which covers
the documented six-decimal JSON rounding. Integer frame indices must match
exactly.

### 2. Distributional fidelity

For each of three per-frame diagnostics—paired gradient RMS, HODM command RMS,
and mean subaperture intensity—the retained-sample mean must be within 0.10
full-rate standard deviations of the full mean. Its 5th, 50th, and 95th
percentiles must each be within 0.20 full-rate interquartile ranges of the
corresponding full-rate percentile.

These thresholds are repository acceptance rules, not universal AO standards.
They were fixed in the audit code before interpreting the output.

### 3. Temporal fidelity

For each diagnostic, no more than 5% of non-DC windowed full-rate power may lie
above the reduced product's 4.99962 Hz Nyquist frequency. Power is calculated
from a Hann-windowed, mean-centred real FFT of all 15,000 frames.

This gate is deliberately conservative. Uniform point decimation without an
anti-alias filter cannot preserve above-Nyquist content; the test quantifies the
scale of the resulting interpretation boundary.

## Results

| Diagnostic | Mean error (full SD) | Largest quantile error (full IQR) | Power above 5 Hz | Distribution | Temporal |
| --- | ---: | ---: | ---: | --- | --- |
| Gradient RMS | 0.0054 | 0.1092 | 20.89% | pass | fail |
| Command RMS | 0.0272 | 0.0115 | 9.19% | pass | fail |
| Mean flux | 0.0411 | 0.0998 | 64.46% | pass | fail |

All 103,800 retained telemetry values plus the 300 timestamps and 300 frame
indices pass the provenance gate. All three diagnostics pass the declared
distribution gate. All three fail the temporal gate.

The 300-frame browser product is therefore suitable for a sparse visual overview
and the declared coarse distribution summaries. It is not evidence for temporal
power spectra, loop bandwidth, transfer functions, disturbance rejection, or a
reconstruction of the CIAO controller.

## Optional teaching model

Simulation mode is isolated from the observation view. It uses six unit-RMS
Noll-index Zernike modes (`J4`, `J5`, `J6`, `J7`, `J8`, `J11`), a deterministic
incremental modal PID demonstration, a clear circular pupil, and a monochromatic
FFT intensity diagnostic. The Maréchal value is a small-phase approximation from
modal residual RMS; the FFT peak is computed independently from the pupil field.

The deployed worker imports `assets/js/science-core.js`, and the test suite calls
that same file directly. No separate test-only implementation is accepted.

This model is not fitted to CIAO telemetry. It contains no calibrated interaction
matrix, deformable-mirror influence functions, atmospheric phase-screen spectrum,
aliasing model, photon/read noise model, non-common-path aberrations, telescope
obscuration, chromatic propagation, or measured controller transfer function.

## Reproduction

Use Python 3.12 and Node 24:

```bash
python -m pip install -r requirements.txt
python research/audit_telemetry.py
python tools/validate_observations.py
python tools/validate_model.py
npm run check
git diff --exit-code -- research/generated data/validation_summary.csv
```

The CI workflow runs the same sequence from a clean checkout and fails if
generated evidence changes.

## References

1. Gomes, T. et al. (2023), *Proof-of-concept AO telemetry data using the AOT
   standard format*, Zenodo, <https://doi.org/10.5281/zenodo.8192742>.
2. Gomes, T. et al. (2024), *Adaptive optics telemetry standard: Design and
   specification of a novel data exchange format*, A&A 686, A7,
   <https://doi.org/10.1051/0004-6361/202348486>.
3. Noll, R. J. (1976), *Zernike polynomials and atmospheric turbulence*, JOSA
   66(3), 207–211, <https://doi.org/10.1364/JOSA.66.000207>.

