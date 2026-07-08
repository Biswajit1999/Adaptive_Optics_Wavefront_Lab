# Adaptive Optics Wavefront Lab

Interactive adaptive optics laboratory for low-order Zernike aberrations, ideal modal correction, selected pupil geometry, Fourier point-spread functions, modulation transfer diagnostics, and a deliberately limited residual error budget.

**Author:** Biswajit Jana

## Purpose

This browser laboratory connects a pupil-plane wavefront error to a focal-plane diffraction pattern. It is designed for scientific intuition and transparent model boundaries, not for calibrated observatory performance prediction.

## Optical model

The input wavefront is a weighted sum of low-order RMS-normalised Zernike modes over the unobstructed unit disk:

```text
W(x, y) = sum a_i Z_i(x, y)
```

The modal controller is an ideal scalar response:

```text
W_residual = (1 - gain) W
```

The complex pupil and monochromatic Fraunhofer PSF are

```text
E(x, y) = P(x, y) exp(i 2 pi W(x, y))
PSF = |FFT(E)|^2
```

`P` is a binary selected pupil. In the browser implementation, the central-obstruction slider is a radius fraction of the unit pupil radius, and the four-vane slider is a half-width fraction of that same unit radius. The direct central peak is normalized against an unaberrated pupil with the same geometry, so changing the obstruction or vanes does not get misreported as a phase-correction loss.

The MTF panel is an azimuthal average of the normalized sampled optical transfer function derived from the computed PSF.

The separate compact residual budget uses the low-aberration Marechal relation:

```text
S ~= exp[-(2 pi sigma)^2]
```

It should not be treated as a calibrated Strehl prediction at large aberration. The fitting, servo-lag, and WFS-noise terms are scalar diagnostics only; they are not injected into the displayed phase map or PSF.

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
node tools/validate_html_contract.js
```

The Python script checks Zernike RMS normalization, gain limits, RSS behaviour, and compact scaling laws. The Fourier Node script checks clear and obstructed flat-pupil peak invariants and verifies that a phase perturbation reduces the direct peak. The HTML contract script checks that the browser document has a single authoritative lab structure and preserves the science-boundary labels.

## Science and visualisation contract

- A visual layer may animate the current model state, but it must not imply extra data, turbulence, a measured deformable mirror, or observatory performance.
- The phase maps, PSF, MTF, and residual-budget panels are the authoritative outputs.
- The compact Marechal diagnostic and the direct PSF peak are separate metrics and must not be labelled as interchangeable.
- The selected obstruction and vane geometry is part of the displayed pupil mask, not a hidden calibration term.

## Model boundaries

- Monochromatic, phase-only pupil model.
- Scalar modal gain rather than a WFS and deformable-mirror control loop.
- No measured telescope pupil, real DM influence functions, phase-screen time series, anisoplanatism, chromatic propagation, scintillation, detector sampling, jitter, amplitude errors, or instrument calibration.
- Fitting, servo-lag, and WFS terms remain a separate RSS diagnostic and are not painted into the PSF as artificial static phase screens.
- The MTF is a sampled visual diagnostic, not a calibrated telescope MTF.

## References / future work

- Add full Zernike mode library with Noll indices.
- Add parity fixtures between browser and Python for one pupil/phase scene.
- Add closed-loop time evolution and sensor noise only after a documented control model exists.
- Add Python validation plots for RMS and Strehl scaling.
- Add Shack-Hartmann spot displacement simulation.
- Noll, 1976, Zernike polynomials and atmospheric turbulence.
- Roddier, 1999, Adaptive Optics in Astronomy.
- Hardy, 1998, Adaptive Optics for Astronomical Telescopes.

## Topics

`adaptive-optics`, `instrumentation`, `astronomy`, `wavefront`, `zernike`, `fourier-optics`, `scientific-visualisation`, `javascript`
