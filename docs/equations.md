# Equations and Assumptions

## Zernike Expansion

The pupil wavefront is modelled as a weighted sum of low-order Zernike modes:

```text
W(rho, theta) = sum a_j Z_j(rho, theta)
```

The implemented modes are RMS-normalised over a circular pupil in a Noll-style convention:

```text
Defocus:      sqrt(3) (2 rho^2 - 1)
Astigmatism:  sqrt(6) rho^2 cos(2 theta)
Coma:         sqrt(8) (3 rho^3 - 2 rho) cos(theta)
Trefoil:      sqrt(8) rho^3 cos(3 theta)
```

The coefficients are therefore interpreted as approximate wavefront RMS amplitudes in waves when modes are orthogonal.

## Correction Model

The adaptive optics correction is represented as a single scalar loop gain:

```text
W_residual = (1 - gain) W_input
```

This is intentionally simple. It represents ideal modal correction with no sensor noise, actuator fitting error, temporal delay, or non-common-path aberration.

## Strehl Ratio

The project uses the extended Marechal approximation:

```text
S ~= exp[-sigma_phi^2]
```

where phase RMS is:

```text
sigma_phi = 2 pi sigma_waves
```

so:

```text
S ~= exp[-(2 pi sigma_waves)^2]
```

## Simplified AO Error Budget

The browser combines residual terms in quadrature:

```text
sigma_total = sqrt(sigma_modal^2 + sigma_fit^2 + sigma_servo^2 + sigma_wfs^2)
```

The fitting and servo-lag terms use Kolmogorov-style scaling intuition:

```text
sigma_fit proportional to (d / r0)^(5/6)
sigma_servo proportional to (tau_delay / tau0)^(5/6)
```

where `d` is actuator pitch, `r0` is the Fried parameter, `tau_delay` is loop delay, and `tau0` is atmospheric coherence time. Coefficients are illustrative and chosen for interactive scaling, not calibrated instrument prediction.
