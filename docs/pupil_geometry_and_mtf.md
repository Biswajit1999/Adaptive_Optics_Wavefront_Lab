# Pupil geometry and MTF diagnostic

The browser pupil is a unit circular aperture. Two optional geometry controls are applied before the Fourier transform:

- central obstruction diameter divided by outer pupil diameter;
- four orthogonal support vanes, with the vane width divided by outer pupil diameter.

The complex pupil is

```text
E(x,y) = P(x,y) exp[i 2 pi W(x,y)]
```

where `P` is the selected binary pupil and `W` is the controlled low-order phase in waves. The focal-plane intensity is calculated as

```text
PSF = |FFT(E)|^2
```

The direct peak metric is normalized by the unoberrated pupil with the **same** obstruction and vane geometry. It therefore isolates the effect of the displayed phase error rather than penalising diffraction caused by a changed pupil shape.

The MTF panel uses the magnitude of the Fourier transform of the sampled PSF, normalized by its zero-frequency value, then averages in radial bins. It is a compact monochromatic diagnostic for comparing the input and corrected pupils. It is not a calibrated telescope MTF: no physical pixel scale, wavelength bandpass, detector sampling, jitter, amplitude errors, or field dependence is included.
