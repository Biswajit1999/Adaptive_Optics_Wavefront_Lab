# Adaptive Optics Wavefront Lab

Interactive adaptive optics simulator for visualising low-order wavefront aberrations and simplified closed-loop correction.

**Author:** Biswajit Jana

## Research Motivation

Adaptive optics improves telescope image quality by measuring and correcting atmospheric or instrumental wavefront errors. This project provides a compact visual lab for understanding how low-order aberration modes affect residual wavefront RMS and approximate Strehl ratio before moving to a full Fourier-optics or real-time-control simulation.

## Model

The wavefront is represented as a weighted sum of low-order, RMS-normalised Zernike modes over a circular pupil:

```text
W(x, y) = sum a_i Z_i(x, y)
```

The corrected modal wavefront is approximated by:

```text
W_corrected = (1 - gain) W
```

The residual budget is combined in quadrature:

```text
sigma_total = sqrt(sigma_modal^2 + sigma_fit^2 + sigma_servo^2 + sigma_wfs^2)
```

The Strehl estimate uses the Marechal approximation:

```text
S ~= exp[-(2 pi sigma_total)^2]
```

where `sigma_total` is the residual RMS wavefront error in waves. The implemented browser modes are defocus, cosine astigmatism, cosine coma, and cosine trefoil in a Noll-style normalisation. Coefficients are interpreted as approximate RMS wavefront amplitudes in waves.

Full assumptions are documented in [`docs/science_model.md`](docs/science_model.md).

## Features

- Defocus, astigmatism, coma, and trefoil controls.
- Loop gain control for simplified AO correction.
- AO-style residual error budget with fitting, servo-lag, and wavefront-sensor noise terms.
- Incoming and corrected modal wavefront heatmaps.
- Clearly labelled PSF sketch showing qualitative sharpening only.
- RMS and Marechal Strehl readouts.
- Residual error-budget bar chart.

## Reproducibility and Validation

Run the validation suite locally:

```bash
python tools/strehl_table.py
python tools/validate_model.py
node tools/validate_browser_contract.js
```

The checks verify Zernike RMS normalisation over the unit pupil, Marechal Strehl behaviour, and monotonic fitting/servo-lag scaling. GitHub Actions runs the same validation commands for pull requests.

## Running Locally

Open `index.html` in a browser.

No build step is required for the static interface.

## README Image Prompt

A README hero image prompt is provided in [`docs/image_prompt.md`](docs/image_prompt.md). It focuses on telescope instrumentation, wavefront sensing, deformable mirrors, and PSF sharpening.

## Limitations

This is a pedagogical model. It does not include a Shack-Hartmann wavefront sensor, deformable mirror influence functions, anisoplanatism, chromatic propagation, telescope central obstruction, spiders, pupil segmentation, amplitude errors, or a physical Fourier-optics PSF. The fitting and servo-lag terms are scaling-law diagnostics, not a calibrated AO performance model.

The PSF panel must not be treated as data. It is a labelled sketch, not `|FFT{P exp(i phase)}|^2`.

## Research References

- Noll, 1976, *Zernike polynomials and atmospheric turbulence*.
- Roddier, 1999, *Adaptive Optics in Astronomy*.
- Hardy, 1998, *Adaptive Optics for Astronomical Telescopes*.
- Ellerbroek, 2005, adaptive optics performance and error-budget literature.

## Future Upgrades

- Add full Zernike mode library with Noll indices.
- Add Fourier-transform PSF calculation with explicit pupil sampling.
- Add closed-loop time evolution and sensor noise.
- Add Python validation plots for RMS and Strehl scaling.
- Add Shack-Hartmann spot displacement simulation.

## Topics

`adaptive-optics`, `instrumentation`, `astronomy`, `wavefront`, `zernike`, `control-systems`, `scientific-visualisation`, `javascript`
