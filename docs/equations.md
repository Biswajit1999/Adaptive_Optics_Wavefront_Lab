# AO Data Products And Model Equations

## Observation Layer

The default view is sourced from the released CIAO AOT FITS product. The displayed telemetry
extensions are:

```text
GRADIENTS       Shack-Hartmann measured slopes, dimensions [frame, axis, subaperture]
INTENSITIES     Shack-Hartmann subaperture intensity, dimensions [frame, subaperture]
HODM POSITIONS  Recorded high-order deformable-mirror commands, dimensions [frame, actuator]
```

The browser reduction selects every fiftieth of the 15,000 released loop frames. WebGL colour
normalisation is a display transformation only. The observation mode does not transform slope
measurements into wavefront phase or PSF values.

## Optional Noll-Indexed Wavefront

Simulation mode evaluates unit-RMS Zernike polynomials over a circular pupil:

```text
W(rho, theta, t) = sum_j a_j(t) Z_j(rho, theta)
```

Controlled terms use Noll indices `J4=(2,0)`, `J5=(2,-2)`, `J6=(2,2)`, `J7=(3,-1)`,
`J8=(3,1)` and `J11=(4,0)`. Coefficients are model optical path error in waves RMS.

## Optional Modal PID Deformable Mirror

For each simulated coefficient, a latency-delayed and noise-perturbed residual drives:

```text
e_j[k] = a_j[k] - u_j[k]
I_j[k] = I_j[k-1] + e_j[k] dt
u_j[k+1] = u_j[k] + Kp e_j[k] + Ki I_j[k] + Kd (e_j[k] - e_j[k-1]) / dt
```

The simulated pupil residual is `W_res = W_input - W_DM`.

## Optional Image-Quality Products

For simulated residual RMS in waves, the model reports:

```text
S = exp[-(2 pi sigma_res)^2]
PSF = | FFT2 { P(rho,theta) exp[i 2 pi W_res(rho,theta)] } |^2
```

Neither equation is applied to the released CIAO slope matrices without a calibrated
reconstruction pipeline.
