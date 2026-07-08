# Adaptive Optics Wavefront Lab — science validation audit

Date: 2026-07-08
Author: Biswajit Jana

## Scope of this pass

This pass intentionally addresses scientific correctness, reproducibility, and document structure before any interface animation upgrade. No decorative effect is added.

## Findings

### 1. HTML structure was not trustworthy enough for a scientific browser lab

The previous `index.html` contained duplicated document sections: repeated head/body/main structure and duplicated laboratory panels. That is a reproducibility issue because browser recovery from invalid document structure can vary and can leave duplicate element IDs in the DOM.

Action taken: rebuilt `index.html` as one valid document with one control rack, one metrics strip, one laboratory section, one set of authoritative canvases, and one script-loading sequence.

### 2. Pupil-geometry wording needed tightening

The browser mask applies the central obstruction as a radius threshold in unit-pupil coordinates and the four-vane value as a half-width threshold in those same coordinates. The interface and README now describe the quantities as radius/half-width fractions rather than diameter fractions.

### 3. Direct PSF peak and Marechal diagnostic must remain separate

The direct PSF peak is computed from the sampled complex pupil and normalized against the matching ideal pupil geometry. The compact Marechal value is calculated from the separate residual budget. These are related intuition aids, but they are not interchangeable measurements.

Action taken: added explicit labels in the interface and README stating that the direct PSF peak and Marechal diagnostic are separate.

### 4. Error-budget terms must not be painted into the pupil

Fitting, servo-lag, and WFS-noise terms are scalar diagnostics only in this repository. They are not drawn as static phase screens and are not included in the Fourier PSF.

Action taken: kept that boundary visible beside the residual-budget panel and in the README science contract.

## Validation commands

```bash
python tools/validate_model.py
node tools/validate_fourier_psf.js
```

Expected outcome:

- Python writes `data/validation_summary.csv` and checks Zernike RMS normalization, modal gain limits, RSS behaviour, and compact scaling-law monotonicity.
- Node validates flat-pupil direct peak invariants and confirms a phase perturbation reduces the direct peak.

## Next scientific gap

Add a browser/Python parity fixture for one fixed scene: coefficients, pupil geometry, input RMS, corrected RMS, direct PSF peak ratio, and sampled MTF first-bin values. That fixture should be used before adding any more visual layers.