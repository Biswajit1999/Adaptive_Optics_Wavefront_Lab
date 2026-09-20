# Claim and non-claim ledger

| ID | Status | Claim | Evidence or boundary |
| --- | --- | --- | --- |
| C1 | supported | The retained FITS file is byte-identical to the Zenodo CIAO1 file identified by the published MD5. | MD5 plus local SHA-256 in `research/generated/telemetry-decimation-audit.json`. |
| C2 | supported | The browser product contains every 50th released frame and reproduces the selected numeric FITS values to its declared six-decimal rounding. | Exact source-to-product parity audit over 103,800 telemetry values, 300 timestamps, and 300 indices. |
| C3 | supported within declared diagnostics | The retained sample passes the repository's distributional-fidelity thresholds for gradient RMS, command RMS, and mean flux. | All mean errors ≤0.0411 full SD and quantile errors ≤0.1092 full IQR. |
| C4 | falsified | The 300-frame point sample is temporally faithful at its reduced 5 Hz Nyquist limit. | Above-Nyquist power is 20.89%, 9.19%, and 64.46%; all exceed the predeclared 5% limit. |
| C5 | supported | The optional model evaluates six declared unit-RMS Noll modes and a phase-only FFT on a clear circular pupil. | Direct tests call the deployed `science-core.js`; worker-contract test prevents a divergent implementation. |
| C6 | supported only as approximation | The displayed Maréchal diagnostic decreases with residual modal RMS and agrees with the direct peak in a tested small-phase case. | Numerical invariant and 0.03-wave cross-check. It is not a calibrated on-sky Strehl prediction. |
| N1 | not claimed | The telemetry heatmaps reconstruct incoming CIAO pupil phase or PSF. | A calibrated interaction/reconstructor matrix and optical model are absent. |
| N2 | not claimed | The sparse browser product measures loop bandwidth, temporal PSD, or transfer functions. | Temporal gate fails; only the full-rate FITS is suitable for a future temporal analysis. |
| N3 | not claimed | Simulation-mode gains reproduce the CIAO controller. | The PID experiment is deterministic and pedagogical; it is not inferred from the observation. |
| N4 | not claimed | Header `STREHL-R=0.71` is a per-frame Strehl time series. | It is displayed as one released summary-header value, not recomputed for each retained frame. |
| N5 | not claimed | Repository maturity score measures scientific truth, applicant quality, peer review, or citation impact. | It scores auditable repository practices only. |

