# Validation Protocol

## Released Observation Integrity

Run:

```bash
python tools/validate_observations.py
```

The test verifies the retained FITS source against the published Zenodo MD5, checks the
release DOI and measured loop rate, and verifies the selected browser-stream dimensions:
300 display frames, 68 Shack-Hartmann samples and 60 HODM commands.

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
| In model mode set turbulence and WFS noise to zero | Positive PID gains drive residual toward zero and model Strehl toward unity. |
| In model mode reduce `Ki` | Slowly varying simulated residual offsets persist for longer. |
| Disable `SIMULATION MODE` | The view returns to unchanged released AOT telemetry. |

## Interpretation Boundary

The released observation contains sensor slopes, intensities and corrector commands. A pupil
wavefront or PSF reconstruction would require the appropriate calibrated interaction matrices,
optical model and validation workflow. This application deliberately does not display its
simulated phase maps as if they were reconstructed CIAO observations.
