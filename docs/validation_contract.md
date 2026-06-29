# Validation contract

This branch keeps the AO model deliberately narrow and testable.

## Browser model

- The pupil phase is a weighted sum of low-order Zernike modes over a circular pupil.
- The correction model is a scalar modal gain: `W_residual = (1 - gain) W`.
- The PSF panel is generated from the displayed phase-only pupil using a browser-native 2D FFT.
- The compact residual budget is reported separately as an RSS diagnostic.

## Checks

Run:

```bash
python tools/validate_model.py
node tools/validate_fourier_psf.js
```

The Python script checks Zernike RMS normalisation, modal gain limits, quadrature RSS, monotonic Strehl scaling, fitting-error monotonicity, and servo-error monotonicity.

The Node script checks the FFT convention with a flat circular pupil. The direct central-peak ratio must be one.

## Boundary

The model does not include a wavefront sensor, deformable-mirror influence functions, real control dynamics, turbulence phase screens, scintillation, telescope obscurations, detector noise, or calibrated observatory parameters.
