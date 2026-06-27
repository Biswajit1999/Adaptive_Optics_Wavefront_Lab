# Adaptive Optics Wavefront Lab

Interactive adaptive optics simulator for low-order Zernike aberrations, modal correction, a Fourier-optics point-spread function, residual RMS, and a deliberately limited AO error budget.

**Author:** Biswajit Jana

## Research Motivation

Adaptive optics improves telescope image quality by measuring and correcting atmospheric or instrumental wavefront errors. This project is a compact visual laboratory for connecting a pupil-plane phase error to its focal-plane point-spread function (PSF), while keeping model boundaries visible.

## Model

The input wavefront is a weighted sum of low-order, RMS-normalised Zernike modes over a circular pupil:

```text
W(x, y) = sum a_i Z_i(x, y)
```

The modal correction is an idealised scalar loop response:

```text
W_modal_residual = (1 - gain) W
```

For the phase-only pupil used in the PSF panel,

```text
E_pupil(x, y) = P(x, y) exp[i 2 pi W(x, y)]
PSF = |FFT{E_pupil}|^2
```

where `P` is a unit circular pupil and `W` is in waves. The panel uses a two-dimensional radix-2 FFT and displays the logarithm of the resulting intensity. The reported central-peak ratio is measured directly against the perfect discrete circular pupil; it is distinct from the separate Maréchal estimate.

The Maréchal approximation is displayed for the compact system-RMS budget:

```text
S ~= exp[-(2 pi sigma)^2]
```

where `sigma` is residual RMS wavefront error in waves. It is most reliable near the diffraction-limited regime and should not be used as a calibrated prediction at large aberration.

The browser modes are defocus, oblique astigmatism, horizontal coma, and horizontal trefoil in a Noll-style normalisation. Coefficients are interpreted as approximate RMS wavefront amplitudes in waves.

## Features

- Defocus, astigmatism, coma, and trefoil controls.
- Idealised modal loop-gain control.
- Incoming and modal-corrected pupil-phase heatmaps.
- Fourier-optics PSFs calculated from the displayed circular pupil.
- Direct central-peak ratios for uncorrected and corrected modal pupils.
- Separate Maréchal estimate from the illustrative total residual budget.
- AO-style residual error budget with fitting, servo-lag, and wavefront-sensor noise terms.
- Residual RMS and error-budget bar chart.

## Research Use Cases

- Demonstrating Zernike modal decomposition, pupil phase, and focal-plane diffraction.
- Showing why a pupil-phase correction must be evaluated through a PSF rather than a decorative blur.
- Comparing direct Fourier peak ratios with a low-aberration Maréchal estimate.
- Building intuition for why fitting, temporal, and sensor terms can limit AO performance beyond ideal modal removal.
- Creating synthetic, clearly labelled AO diagnostic figures for educational or early-stage instrumentation work.

## Running Locally

Open `index.html` in a modern browser.

The Fourier renderer is browser-native and has no external dependency. It uses a fixed `128 x 128` pupil grid to keep interaction responsive.

## Limitations

This is a pedagogical model, not an end-to-end AO simulator.

- The correction is a scalar modal gain; there is no wavefront-sensor reconstruction, deformable-mirror influence function, actuator geometry, or control-law dynamics.
- The Fourier panel models only the controlled low-order pupil phase. The fitting, servo-lag and WFS noise terms are included in the reported RSS budget but are not injected as temporally correlated pupil realisations.
- It does not include atmospheric phase screens, anisoplanatism, chromatic propagation, scintillation, telescope obscurations, detector noise, or calibrated instrument parameters.
- The fitting and servo-lag terms are compact scaling-law diagnostics, not a telescope-specific performance model.

## Research References

- Noll, 1976, *Zernike polynomials and atmospheric turbulence*.
- Roddier, 1999, *Adaptive Optics in Astronomy*.
- Hardy, 1998, *Adaptive Optics for Astronomical Telescopes*.
- Ferreira et al., 2018, numerical AO wavefront-error breakdown and PSF reconstruction.
- Doelman, 2019, time-delay wavefront error under frozen-flow turbulence.

## Future Upgrades

- Add a selectable pupil mask with central obstruction and spiders.
- Add a phase-screen time series with a frozen-flow control loop.
- Add deformable-mirror influence functions and a Shack-Hartmann spot-displacement mode.
- Add Python reference plots to cross-check RMS, PSF peak ratios, and scaling laws.
- Add browser snapshots with regression fixtures for canonical Zernike cases.

## Topics

`adaptive-optics`, `instrumentation`, `astronomy`, `wavefront`, `zernike`, `control-systems`, `fourier-optics`, `scientific-visualisation`, `javascript`
