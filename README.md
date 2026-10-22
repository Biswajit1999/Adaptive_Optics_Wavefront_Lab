# Adaptive Optics Wavefront Lab

**A learning project connecting astronomical instrumentation, feedback control and trustworthy telemetry processing.**
Author: Biswajit Jana · Public CIAO AOT data · Separate optical/control teaching model

[Research overview](https://biswajit1999.github.io/Adaptive_Optics_Wavefront_Lab/) · [Project at a glance](https://biswajit1999.github.io/Adaptive_Optics_Wavefront_Lab/summary.html) · [Project report](https://biswajit1999.github.io/Adaptive_Optics_Wavefront_Lab/report.html) · [Interactive lab](https://biswajit1999.github.io/Adaptive_Optics_Wavefront_Lab/lab.html)

## Why this project

I want to connect instrumentation and feedback control to astronomical imaging, and learn wavefront sensing and adaptive optics through real telemetry. The project asks a concrete question: **what information survives reducing a 15,000-frame observation to a 300-frame browser display?**

It is a reproducible inspection and learning workflow, not a newly built AO instrument or a calibrated reconstruction of CIAO.

## What I built

```text
Public CIAO AOT FITS (15,000 frames, 499.962 Hz)
    → stride-50 selection + explicit frame indices
    → rounded browser JSON (300 frames, 9.99924 Hz)
    → independent provenance / distribution / temporal audit
    → observation-first interactive laboratory

Separate learning branch:
six Noll modes → custom accumulating feedback → residual phase → FFT diagnostic
```

The retained channels contain **79,200 telemetry values**: 300 × (68 X gradients + 68 Y gradients + 68 intensities + 60 commands), plus 300 timestamps and 300 indices.

## What the evidence supports

| Test | Result | Boundary |
| --- | --- | --- |
| Source-to-browser parity | Pass | Every retained value matches within the six-decimal rounding tolerance. |
| Three diagnostic distributions | Pass | Means and 5/50/95 percentiles meet repository-specific thresholds. |
| Temporal fidelity of the reduction | Fail | Above-reduced-Nyquist power is 20.89%, 9.19% and 64.46%, exceeding the 5% gate. |

**A faithful point sample is not necessarily a faithful time series.** This product supports a sparse overview and the tested coarse summaries, not temporal spectra, loop bandwidth or controller identification. The negative result concerns the reduction, not the telescope.

See [methods](METHODS.md), [claim ledger](CLAIMS.md) and [generated evidence](research/generated/telemetry-decimation-audit.json).

## Explore the project

1. Read the [project summary](PROJECT_SUMMARY.md) for motivation, contribution and findings.
2. Read the [full report](PROJECT_REPORT.md) for definitions, results, limits and reproduction.
3. Open the lab with simulation OFF. Inspect source-frame indices and numeric colour scales.
4. Turn simulation ON only after explaining that it is a separate teaching experiment.

The HTML summary and report have print styles; use the browser's Print → Save as PDF if you want an attachment.

## Run and verify

Use Node 24 and Python 3.12:

```bash
python -m pip install -r requirements.txt
npm ci --ignore-scripts
npm run check
python research/audit_telemetry.py
python tools/validate_observations.py
python tools/validate_model.py
python tools/build_reports.py
git diff --exit-code -- research/generated data/validation_summary.csv report.html summary.html
python -m http.server 8000
```

Visit `http://localhost:8000/`. Serve over HTTP rather than opening a file URL. The lab requires WebGL and Web Workers; the overview and report do not.

## Repository map

| Path | Purpose |
| --- | --- |
| `index.html`, `report.html`, `summary.html` | Public-facing overview and generated printable documents |
| `lab.html`, `assets/js/` | Observation console and isolated teaching model |
| `data/observations/` | Retained FITS source, JSON product and provenance |
| `research/audit_telemetry.py` | Full-rate/reduced-product fidelity audit |
| `research/generated/` | Deterministic numerical receipts |
| `tests/`, `tools/` | Deployed-core/worker tests and report generation |
| `METHODS.md`, `CLAIMS.md` | Evaluation protocol and scientific claim boundaries |

## Model boundaries

Six unit-RMS Noll modes on a clear pupil, seeded synthetic disturbances/noise, and custom accumulating modal feedback support exploration. The model is not fitted to the released observation. Its proportional contribution accumulates, so Ki=0 does not necessarily leave a static offset. The wavelength slider converts residual waves to OPD nanometres; it is not a chromatic propagation model.

Header Strehl 0.71 is fixed released metadata. Neither gradient RMS nor command RMS is a calibrated wavefront-error measurement. The FFT image uses per-frame logarithmic display scaling, and Maréchal is a small-phase approximation.

## Learning and next study

The concrete outputs demonstrate practice in FITS provenance, dimensional checks, validation design, Zernike/FFT concepts and reproducible research software. They do not establish expert mastery or improved on-sky performance. AI-assisted development and review were used; understanding and reproducing the work remain my responsibility.

The next **proposed** study is anti-aliased reduction, with bandwidth, filters, edge handling and evaluation criteria specified before comparing results. A calibrated reconstruction requires additional instrument products and justification.

## Data attribution and citation

Gomes et al., [Proof-of-concept AO telemetry data using the AOT standard format](https://doi.org/10.5281/zenodo.8192742), CC BY 4.0. The release description associates CIAO with programme **60.A-9278(C)**. The retained filename contains 2019-12-06; its observation metadata starts on 2019-12-07 UTC.

[AOT specification paper](https://doi.org/10.1051/0004-6361/202348486) · [Noll (1976)](https://doi.org/10.1364/JOSA.66.000207) · [CITATION.cff](CITATION.cff) · [Software licence](LICENSE)

The source teams acquired the observation. This project's contribution is the learning, processing, inspection and validation workflow.
