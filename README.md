# Adaptive Optics Wavefront Lab

Interactive adaptive optics simulator for visualising low-order wavefront aberrations and closed-loop correction.

**Author:** Biswajit Jana

## Research Motivation

Adaptive optics improves telescope image quality by measuring and correcting atmospheric or instrumental wavefront errors. This project provides a compact visual lab for understanding how low-order aberration modes affect wavefront RMS and point-spread concentration.

## Model

The wavefront is represented as a weighted sum of low-order, RMS-normalised Zernike modes over a circular pupil:

```text
W(x, y) = sum a_i Z_i(x, y)
```

The corrected wavefront is approximated by:

```text
W_corrected = (1 - gain) W
```

The Strehl estimate uses the Marechal approximation:

```text
S ~= exp[-(2 pi sigma)^2]
```

where `sigma` is the residual RMS wavefront error in waves.

The implemented browser modes are defocus, oblique astigmatism, horizontal coma, and horizontal trefoil in a Noll-style normalisation. Coefficients are interpreted as approximate RMS wavefront amplitudes in waves.

## Features

- Defocus, astigmatism, coma, and trefoil controls.
- Loop gain control for simplified AO correction.
- Incoming and corrected wavefront heatmaps.
- PSF sketch showing qualitative sharpening.
- RMS and Strehl readouts.

## Research Use Cases

- Demonstrating Zernike modal decomposition and residual RMS concepts for astronomical instrumentation.
- Exploring the relationship between wavefront error and Strehl ratio before moving to full Fourier optics.
- Creating synthetic AO performance tables for dashboards or early-stage control-system explanations.
- Acting as a visual companion to future EXOhSPEC-style stability and optical alignment projects.

## Running Locally

Open `index.html` in a browser.

Optional Python table generation and validation:

```bash
python tools/strehl_table.py
python tools/validate_model.py
```

## README Image Prompt

A README hero image prompt is provided in [`docs/image_prompt.md`](docs/image_prompt.md). It focuses on telescope instrumentation, wavefront sensing, deformable mirrors, and PSF sharpening.

## Limitations

This is a pedagogical model. It does not include a Shack-Hartmann wavefront sensor, deformable mirror influence functions, temporal bandwidth, photon noise, servo lag, anisoplanatism, or a physical Fourier optics PSF.

## Research References

- Noll, 1976, *Zernike polynomials and atmospheric turbulence*.
- Roddier, 1999, *Adaptive Optics in Astronomy*.
- Hardy, 1998, *Adaptive Optics for Astronomical Telescopes*.
- Ellerbroek, 2005, adaptive optics performance and error-budget literature.

## Future Upgrades

- Add Zernike mode library with Noll indices.
- Add Fourier-transform PSF calculation.
- Add closed-loop time evolution and sensor noise.
- Add Python validation plots for RMS and Strehl scaling.
- Add Shack-Hartmann spot displacement simulation.

## Topics

`adaptive-optics`, `instrumentation`, `astronomy`, `wavefront`, `zernike`, `control-systems`, `scientific-visualisation`, `javascript`
