# Project at a glance

## Adaptive Optics Wavefront Lab

**Biswajit Jana · Independent learning and research-software project**

### What is this?

A browser laboratory and reproducible analysis pipeline for exploring public adaptive-optics telemetry. Adaptive optics uses measurements of optical distortion to drive corrective optics. This project follows the recorded sensor and mirror streams, tests the effects of reducing them for display, and provides a separate model for learning optics and feedback.

### Why I built it

I wanted to connect my interest in instrumentation and feedback control with astronomical imaging, and learn wavefront sensing through real data. The practical question is not just “can I display the observation?” but “which conclusions does this representation support?”

### What the pipeline does

**Public CIAO AOT FITS → explicit frame selection → browser JSON → fidelity audit → interactive inspection.**

The source contains 15,000 frames at a released rate of 499.962 Hz. The browser retains every 50th frame: 300 time samples containing 79,200 telemetry values, plus timestamps and source-frame indices. Visitors can pause playback, select a sample, inspect its original frame number and read numeric colour limits.

### What the analysis found

| Question | Finding |
| --- | --- |
| Does the conversion reproduce the selected data? | Yes, within the declared six-decimal rounding tolerance. |
| Do the tested coarse statistical summaries survive? | Yes, for the means and selected percentiles of three aggregate diagnostics under the repository thresholds. |
| Is the reduced series suitable for temporal inference? | No under the chosen gate: above-reduced-Nyquist power is 20.89%, 9.19% and 64.46%, each exceeding 5%. |

The main lesson is that **correctly copied samples do not guarantee a scientifically adequate time series**. This reduction supports a sparse overview, not loop-bandwidth or temporal-spectrum claims. The failed gate concerns the data reduction, not a failure of the telescope.

### What the model adds

An independent six-mode Zernike model connects input aberrations, a delayed custom accumulating correction, residual phase and an FFT intensity diagnostic. It is an educational experiment, not a reconstruction of CIAO. The wavelength control converts residual waves to nanometres; it does not simulate chromatic propagation.

### Contribution and learning

This repository contributes the inspection interface, data-processing workflow, reproducible audit and documented interpretation boundaries around an existing public release. The source teams acquired the telescope data.

The work provides concrete practice in FITS data handling, provenance checks, sampling theory, Zernike/FFT calculations, feedback modelling and research-software testing. It does not demonstrate improved on-sky performance or a calibrated AO reconstruction.

### What comes next

A proposed next experiment compares point sampling with anti-aliased reduction against the full-rate reference. The preserved quantity, bandwidth, filter response, edge handling and acceptance criteria need to be specified first. Calibration products would be required before attempting a physically justified wavefront reconstruction.

### Explore the work

[Overview](index.html) · [Full report](report.html) · [Interactive lab](lab.html) · [Numerical evidence](research/generated/telemetry-decimation-audit.json) · [Source code](https://github.com/Biswajit1999/Adaptive_Optics_Wavefront_Lab)

Data: Gomes et al., [AOT proof-of-concept release](https://doi.org/10.5281/zenodo.8192742), CC BY 4.0. Software: MIT. AI-assisted tools were used for development and review; reported scientific claims are bounded by the committed tests and evidence.
