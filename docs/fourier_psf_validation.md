# Fourier PSF validation protocol

The browser PSF panel computes the squared modulus of the two-dimensional discrete Fourier transform of a phase-only circular pupil:

```text
E = P exp(i 2 pi W)
PSF = |FFT(E)|^2
```

The project contains a minimal deterministic validation command:

```bash
node tools/validate_fourier_psf.js
```

It checks the zero-aberration limit. For a unit circular pupil, the on-axis Fourier intensity must equal the square of the number of sampled pupil cells, so the normalised central-peak ratio is exactly one up to floating-point precision.

The browser panel reports this same normalised central-peak quantity for the input and modal-corrected pupils. It is not the same quantity as the Maréchal estimate shown in the main summary. The latter is calculated from the illustrative root-sum-square residual budget and is only reliable in the low-aberration regime.

## Boundaries

- The FFT grid is a numerical display model, not a calibrated telescope pupil.
- The browser currently has no central obstruction, spiders, amplitude apodisation, turbulence time series, DM influence functions, or detector model.
- Fitting, servo-lag, and WFS terms remain in the scalar residual budget. They are deliberately not inserted as synthetic phase screens into the displayed PSF.
