# Contributing to Adaptive Optics Wavefront Lab

Contributions are welcome across the optical model, browser implementation, validation tools, documentation, accessibility, and scientific visualisation.

## Project boundary

This repository is an educational Fourier-optics laboratory. It is not a calibrated observatory model. Contributions must preserve the distinction between:

- the displayed pupil phase, PSF, and MTF;
- the separate compact residual-error diagnostic;
- idealised modal gain;
- real wavefront-sensor and deformable-mirror behaviour, which is not currently implemented.

Do not introduce labels, animations, or numerical claims that imply measured telescope performance or hardware that the model does not contain.

## Local validation

Open `index.html` in a modern browser, then run the existing checks:

```bash
python tools/validate_model.py
node tools/validate_fourier_psf.js
node tools/validate_html_contract.js
```

All three commands should pass before a pull request is opened.

## Scientific changes

When changing equations, sampling, pupil geometry, or diagnostics:

- state the physical assumption being modified;
- document units, normalisation, and parameter bounds;
- preserve the matching ideal-pupil reference used for direct peak ratios;
- keep the compact Marechal diagnostic separate from the computed PSF peak;
- add or update an independent validation check;
- describe the regime where any approximation is valid.

## Interface changes

- Keep the pupil, phase, PSF, MTF, and residual-budget outputs readable.
- Preserve keyboard access and meaningful labels.
- Test the layout at desktop and narrow-screen widths.
- Avoid visual effects that imply unmodelled turbulence, telemetry, or live observatory data.
- Do not duplicate element IDs or create multiple authoritative laboratory panels.

## Pull-request workflow

1. Create a focused branch from `main`.
2. Keep each pull request limited to one coherent scientific or interface change.
3. Run the browser and all validation commands.
4. Explain the model impact and any new limitation.
5. Update the README or science documentation when behaviour changes.

## Pull-request checklist

- [ ] The browser laboratory loads without console errors.
- [ ] `validate_model.py` passes.
- [ ] `validate_fourier_psf.js` passes.
- [ ] `validate_html_contract.js` passes.
- [ ] Optical normalisation and model boundaries remain explicit.
- [ ] New numerical claims have an independent validation check.
- [ ] Desktop and mobile layouts have been checked for interface changes.
- [ ] Documentation has been updated where necessary.

## Reporting issues

Please include:

- browser and operating system;
- the selected aberration and pupil settings;
- steps to reproduce;
- expected and observed behaviour;
- console output or screenshots when relevant;
- whether the problem affects the scientific calculation, visualisation, or both.

Keep discussions respectful, evidence-based, and focused on improving the scientific clarity of the project.