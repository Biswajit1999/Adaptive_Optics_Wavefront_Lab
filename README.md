# Adaptive Optics Wavefront Lab

Interactive adaptive optics laboratory for low-order Zernike aberrations, modal correction, selected pupil geometry, Fourier point-spread functions, modulation transfer diagnostics, and a deliberately limited error budget.

**Author:** Biswajit Jana

## Purpose

This browser laboratory connects a pupil-plane wavefront error to a focal-plane diffraction pattern. It is designed for scientific intuition and transparent model boundaries, not for calibrated observatory performance prediction.

## Optical model

The input wavefront is a weighted sum of low-order RMS-normalised Zernike modes:

```text
W(x, y) = sum a_i Z_i(x, y)
```

The modal controller is an ideal scalar response:

```text
W_residual = (1 - gain) W
```

The complex pupil and monochromatic PSF are

```text
E(x, y) = P(x, y) exp(i 2 pi W(x, y))
PSF = |FFT(E)|^2
```

`P` is a binary selected pupil. It can include a central obstruction and four orthogonal support vanes. The direct central peak is normalized against an unaberrated pupil with the same geometry, so changing the obstruction or vanes does not get misreported as a phase-correction loss.

The MTF panel is an azimuthal average of the normalized sampled optical transfer function derived from the computed PSF.

The separate compact residual budget uses the low-aberration Marechal relation:

```text
S ~= exp[-(2 pi sigma)^2]
```

It should not be treated as a calibrated Strehl prediction at large aberration.

## Features

- Defocus, astigmatism, coma, and trefoil controls.
- Idealised modal loop-gain control.
- Central obstruction and four-vane pupil geometry.
- Input and modal-corrected pupil-phase maps.
- Browser-native 2D FFT PSFs from the displayed complex pupil.
- Direct PSF peak ratios against matching ideal pupils.
- Input versus corrected sampled MTF profiles.
- Explicit fitting, servo-lag, and wavefront-sensor RSS budget.
- Node and Python validation checks.

## Run and validate

Open `index.html` in a modern browser.

```bash
python tools/validate_model.py
node tools/validate_fourier_psf.js
```

The Python script checks Zernike RMS normalization, gain limits, RSS behaviour, and compact scaling laws. The Node script checks clear and obstructed flat-pupil peak invariants and verifies that a phase perturbation reduces the direct peak.

## Model boundaries

- Monochromatic, phase-only pupil model.
- Scalar modal gain rather than a WFS and deformable-mirror control loop.
- No measured telescope pupil, real DM influence functions, phase-screen time series, anisoplanatism, chromatic propagation, scintillation, detector sampling, jitter, amplitude errors, or instrument calibration.
- Fitting, servo-lag, and WFS terms remain a separate RSS diagnostic and are not painted into the PSF as artificial static phase screens.
- The MTF is a sampled visual diagnostic, not a calibrated telescope MTF.

## References

- Add full Zernike mode library with Noll indices.
- Add Fourier-transform PSF calculation with explicit pupil sampling.
- Add closed-loop time evolution and sensor noise.
- Add Python validation plots for RMS and Strehl scaling.
- Add Shack-Hartmann spot displacement simulation.
- Noll, 1976, Zernike polynomials and atmospheric turbulence.
- Roddier, 1999, Adaptive Optics in Astronomy.
- Hardy, 1998, Adaptive Optics for Astronomical Telescopes.

## Topics

`adaptive-optics`, `instrumentation`, `astronomy`, `wavefront`, `zernike`, `fourier-optics`, `scientific-visualisation`, `javascript`
