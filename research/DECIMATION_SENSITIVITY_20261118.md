# Conditional decimation sensitivity — 18 November 2026

Author: Biswajit Jana. AI-assisted code preparation disclosed.

Two independent numerical checks are added in `conditional_decimation_20261118.py`:
(1) alias folding for regular point sampling (Hz), and
(2) circular moving-block bootstrap percentile uncertainty for the mean of a single scalar telemetry channel.

The released 499.962 Hz stream and stride-50 sample (~9.99924 Hz) are distinct. Aliasing is a mathematical property of point sampling; the folding formula is not a measurement of spectral power or a reconstruction of the instrument controller. A 7 Hz sinusoid sampled at 10 Hz appears at 3 Hz. The bootstrap is conditional on approximate stationarity, representative sample coverage, and a selected block length; repeat the analysis across several block lengths. It does not undo aliasing or recover lost full-rate content.

Reproduce: `python research/conditional_decimation_20261118.py`.
This isolated code has not been integrated with FITS data or the existing validation pipeline. Do not replace the published negative temporal-fidelity result with these synthetic checks.
