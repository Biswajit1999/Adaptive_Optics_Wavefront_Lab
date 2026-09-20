# Contributing to Adaptive Optics Wavefront Lab

Contributions are welcome across the optical model, browser implementation, validation tools, documentation, accessibility, and scientific visualisation.

## Project boundary

This repository is an observation-first telemetry viewer with an optional educational Fourier-optics model. It is not a calibrated observatory model. Contributions must preserve the distinction between:

- released WFS gradients, intensities, and HODM commands;
- the stride-50 browser sample and the full-rate retained FITS;
- generated pupil phase, PSF, and Maréchal diagnostics in simulation mode;
- real wavefront reconstruction and controller identification, which are not implemented.

Do not introduce labels, animations, or numerical claims that imply measured telescope performance or hardware that the model does not contain.

## Local validation

Serve `index.html` over HTTP in a modern browser, then run the complete checks:

```bash
python -m pip install -r requirements.txt
python research/audit_telemetry.py
python tools/validate_observations.py
python tools/validate_model.py
npm run check
git diff --exit-code -- research/generated data/validation_summary.csv
```

All commands should pass before a pull request is opened.

## Scientific changes

When changing equations, sampling, pupil geometry, or diagnostics:

- state the physical assumption being modified;
- document units, normalisation, and parameter bounds;
- update `METHODS.md` and `CLAIMS.md` when an inference boundary changes;
- keep the compact Marechal diagnostic separate from the computed PSF peak;
- add or update an independent validation check;
- describe the regime where any approximation is valid.

## Interface changes

- Keep observed telemetry and generated model products visibly distinct.
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
- observation or simulation mode and selected model settings;
- steps to reproduce;
- expected and observed behaviour;
- console output or screenshots when relevant;
- whether the problem affects the scientific calculation, visualisation, or both.

Keep discussions respectful, evidence-based, and focused on improving the scientific clarity of the project.
