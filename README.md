# Adaptive Optics Wavefront Lab

**An observation-first WebGL console for released adaptive-optics telemetry and optional
Noll-index closed-loop experiments.**

Adaptive Optics Wavefront Lab boots into recorded adaptive-optics telemetry from ESO CIAO,
distributed through the Adaptive Optics Telemetry (AOT) proof-of-concept data release. It
shows actual Shack-Hartmann wavefront-sensor streams and high-order deformable-mirror commands.
Only after the user enables `SIMULATION MODE` does the console present generated pupil phase,
PID control and point-spread-function products.

## Released Telemetry Product

The retained FITS source is:

```text
CIAO1_2019-12-06_DATA_EXPO-015808.fits
https://zenodo.org/records/8192742
doi:10.5281/zenodo.8192742
```

Zenodo records the file as part of the AOT standard demonstration data, derived from ESO
programme `60.A-9278(B)` and licensed under Creative Commons Attribution 4.0 International.
The local retained source matches the published MD5:

```text
069b37b24997bf55c5312a7bad469502
```

Its AOT/FITS metadata identifies:

| Item | Released value |
| --- | --- |
| Instrument | CIAO |
| AO mode | SCAO |
| Observation start | `2019-12-07T01:58:09.100420` UTC |
| Guide source | Natural Guide Star |
| Sensor | Shack-Hartmann |
| Corrector | High Order Deformable Mirror |
| Loop state and rate | Closed, `499.962 Hz` |
| Released loop frames | `15,000` |
| Header `STREHL-R` | `0.71` |

The browser asset retains every fiftieth released frame, yielding 300 display samples while
keeping the original FITS file locally for provenance and reproducible regeneration. It
contains the released AOT extensions:

| Extension | Display role | Dimensions in source |
| --- | --- | ---: |
| `GRADIENTS` | WFS slope X and Y telemetry maps | `15000 x 2 x 68` |
| `INTENSITIES` | WFS subaperture-flux telemetry map | `15000 x 68` |
| `HODM POSITIONS` | Recorded high-order mirror commands | `15000 x 60` |

These streams are measured telemetry, not reconstructed pupil optical path error. The
observation view therefore does not infer an incoming wavefront phase map or a PSF from them.

## Instrument Capabilities

- Observation-first WebGL heatmaps for recorded WFS gradient X/Y, WFS subaperture intensity
  and HODM command streams.
- Recorded telemetry playback with released header Strehl, per-frame slope RMS, command RMS,
  mean flux and loop-rate readouts.
- Worker-side loading and texture preparation so the UI thread uploads compact display maps.
- Optional simulation mode, disabled by default, for physically declared Noll-index/PID
  experiments.
- GLSL pupil rendering and worker-side FFT PSF generation in model mode.
- Adjustable proportional and integral gains for servo-lag and baseline-offset experiments.
- Zero-build HTML/CSS/JavaScript deployment.

## Architecture

```text
Adaptive Optics Wavefront Lab/
  index.html
  assets/
    css/style.css
    js/app.js                       WebGL presentation and controls
    js/physicsWorker.js             AOT telemetry loading and optional model
  data/observations/
    CIAO1_2019-12-06_DATA_EXPO-015808.fits
    ciao1_aot_telemetry.json        Browser-reduced released streams
    ciao1_aot_metadata.json
  docs/
    equations.md
    validation.md
  tools/
    fetch_aot_observations.py
    validate_observations.py
    validate_model.py
    strehl_table.py
```

The worker has two explicit paths. In observation mode, it loads and scales only released AOT
streams for rendering. In simulation mode, it uses the Noll/PID/FFT model described below.
There is no synthetic fallback if the observation asset cannot be loaded.

## Optional Noll/PID Model

The generated optical path error uses unit-RMS Zernike polynomials over the circular pupil:

```text
W(rho, theta) = sum_j a_j Z_j(rho, theta)
```

The controlled Noll modes are:

| Noll index | `(n, m)` | Aberration |
| --- | --- | --- |
| `J4` | `(2, 0)` | Defocus |
| `J5` | `(2, -2)` | Astigmatism -2 |
| `J6` | `(2, 2)` | Astigmatism +2 |
| `J7` | `(3, -1)` | Coma -1 |
| `J8` | `(3, 1)` | Coma +1 |
| `J11` | `(4, 0)` | Primary spherical |

For residual modal error `e_j`, the optional discrete mirror controller is:

```text
I_j[k] = I_j[k-1] + e_j[k] dt
u_j[k+1] = u_j[k] + Kp e_j[k] + Ki I_j[k] + Kd (e_j[k] - e_j[k-1]) / dt
```

Lower integral gain allows slowly varying residual baseline error to persist; additional
latency exposes servo lag. These quantities are model experiments and are not claimed to be
the CIAO system controller reconstruction.

The model-mode Strehl estimate is the Marechal approximation for residual RMS in waves:

```text
S approximately exp[-(2 pi sigma_res)^2]
```

The model PSF panel separately evaluates:

```text
PSF = | FFT2 { P(rho,theta) exp[i 2 pi W_res(rho,theta)] } |^2
```

## Running

Serve this directory over HTTP:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`. WebGL is required; no build step or JavaScript dependency
installation is required.

To recreate the browser data asset from the official FITS release:

```bash
python tools/fetch_aot_observations.py
```

The converter requires Python, `numpy` and `astropy`; a download is required only when the
retained source FITS file is absent.

## Verification

```bash
python tools/validate_observations.py
python tools/strehl_table.py
python tools/validate_model.py
```

`validate_observations.py` checks the FITS MD5, release DOI, dimensions and finite telemetry
content. The model validators test Zernike normalisation, modal orthogonality and the declared
Marechal relationship. These are integrity and numerical checks, not a CIAO PSF
reconstruction.

## References

Gomes, T., Garcia, P., Correia, C. and Morujao, N. (2023) *Proof-of-concept AO telemetry
data using the AOT standard format*. Zenodo. doi:
[10.5281/zenodo.8192742](https://doi.org/10.5281/zenodo.8192742).

Gomes, T. et al. (2024) 'Adaptive optics telemetry standard: Design and specification of a
novel data exchange format', *Astronomy & Astrophysics*, 686, A7. doi:
[10.1051/0004-6361/202348486](https://doi.org/10.1051/0004-6361/202348486).

Noll, R.J. (1976) 'Zernike polynomials and atmospheric turbulence', *Journal of the Optical
Society of America*, 66(3), pp. 207-211.

Roddier, F. (ed.) (1999) *Adaptive Optics in Astronomy*. Cambridge: Cambridge University
Press.

## Licence

Application source is released under the MIT Licence; see `LICENSE`. The bundled AOT
observational product is attributed to its authors and distributed under CC BY 4.0.
