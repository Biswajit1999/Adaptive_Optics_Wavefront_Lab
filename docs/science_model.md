# Adaptive Optics Science Model

This repository is a pedagogical adaptive-optics visualisation, not an end-to-end AO simulator.

## Wavefront basis

The browser model represents the pupil-plane wavefront as a linear combination of four low-order, RMS-normalised Zernike modes over a unit circular pupil:

```text
W(x, y) = a_defocus Z_4 + a_astig Z_6 + a_coma Z_8 + a_trefoil Z_10
```

The coefficients are interpreted as approximate RMS wavefront amplitudes in waves when the modes are orthonormal over the unobscured unit disk. Tip, tilt, piston, central obscuration, spiders, segmentation, amplitude errors, and chromatic propagation are not included.

Implemented modes:

| Control | Noll-style mode | Polynomial |
| --- | --- | --- |
| Defocus | Z4 | sqrt(3) (2 rho^2 - 1) |
| Astigmatism | Z6 cosine term | sqrt(6) rho^2 cos(2 theta) |
| Coma | Z8 cosine term | sqrt(8) (3 rho^3 - 2 rho) cos(theta) |
| Trefoil | Z10 cosine term | sqrt(8) rho^3 cos(3 theta) |

## Correction model

The closed-loop correction is intentionally simple:

```text
W_corrected = (1 - gain) W
```

This is a scalar residual-gain demonstrator. It does not model a reconstructor matrix, deformable-mirror influence functions, modal cross-coupling, temporal controller poles, saturation, or wavefront-sensor measurement geometry.

## Residual budget

The total residual is a quadrature sum:

```text
sigma_total = sqrt(sigma_modal^2 + sigma_fit^2 + sigma_servo^2 + sigma_wfs^2)
```

The fitting and servo-lag sliders use scaling-law diagnostics:

```text
sigma_fit = 0.28 (d / r0)^(5/6) / (2 pi)
sigma_servo = 0.30 (delay / tau0)^(5/6) / (2 pi)
```

The division by `2 pi` converts phase radians to waves. These coefficients are not calibrated for a specific telescope, wavelength, guide star, seeing profile, or real-time controller.

## Strehl estimate

The Strehl readout uses the Marechal approximation:

```text
S ~= exp[-(2 pi sigma_total)^2]
```

This approximation is useful for small residual phase variance. It should not be interpreted as an exact PSF metric for large aberrations or non-Gaussian residuals.

## PSF panel

The PSF canvas is a labelled sketch showing the expected qualitative trend that larger residual RMS broadens and lowers image concentration. It is not a Fourier transform of the pupil field. A future physically stronger upgrade should compute:

```text
PSF = |FFT{ P(x, y) exp[i 2 pi W(x, y)] }|^2
```

with correct sampling, pupil mask, wavelength units, and normalisation.

## Validation contract

The repository validates:

1. Zernike RMS normalisation over the unit disk.
2. Strehl equals 1 at zero RMS.
3. Strehl decreases monotonically with residual RMS.
4. Fitting error increases with actuator pitch relative to `r0`.
5. Servo-lag error increases with delay relative to `tau0`.

These tests protect physical meaning before visual polish.
