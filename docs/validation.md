# Validation Protocol

## Released Observation Integrity

Run:

```bash
python research/audit_telemetry.py
python tools/validate_observations.py
```

The audit verifies the retained FITS against MD5 and SHA-256 receipts, compares
all browser values with the corresponding FITS samples, evaluates declared
distribution gates, and quantifies full-rate power above the reduced Nyquist
limit. The compact validator then checks the frozen evidence boundary and stream
dimensions.

## Optional Model Invariants

Run:

```bash
python tools/strehl_table.py
python tools/validate_model.py
```

These checks sample the unit pupil, verify the RMS normalisation and approximate orthogonality
of active Noll modes, confirm the Noll mapping for defocus and coma, and validate monotonic
Marechal Strehl degradation.

## Interactive Checks

| Manipulation | Expected result |
| --- | --- |
| Initial application load | Four WebGL maps show released CIAO telemetry; metrics identify released Strehl and loop rate. |
| Play or pause observation stream | Per-frame measured readouts advance or hold without changing the heatmap data product. |
| Enable `SIMULATION MODE` | Panels are relabelled as simulated wavefront, mirror, residual and PSF products. |
| Static controlled test: turbulence/noise=0, Kp=0.1, Ki=Kd=0, delay=0 | The accumulating proportional correction reduces static residual below 1e-10 waves after 1,000 steps. This is one tested configuration, not a general stability guarantee. |
| Double conversion wavelength while paused | Residual OPD in nm doubles; fixed-wave residual and dimensionless FFT peak do not change. |
| Drag retained-sample slider | Playback pauses; readouts and cursor identify the selected source frame. |
| Disable `SIMULATION MODE` | The view returns to unchanged released AOT telemetry. |

## Interpretation Boundary

The released observation contains sensor slopes, intensities and corrector commands. A pupil
wavefront or PSF reconstruction would require the appropriate calibrated interaction matrices,
optical model and validation workflow. This application deliberately does not display its
simulated phase maps as if they were reconstructed CIAO observations.
