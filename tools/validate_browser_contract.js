#!/usr/bin/env node
/* Validate the browser-side adaptive-optics equations without requiring a DOM. */

const MODES = ["defocus", "astig", "coma", "trefoil"];
const TOLERANCE = 2.5e-2;

function zernike(x, y, mode) {
  const r2 = x * x + y * y;
  if (r2 > 1) return null;
  const rho = Math.sqrt(r2);
  const theta = Math.atan2(y, x);
  if (mode === "defocus") return Math.sqrt(3) * (2 * rho ** 2 - 1);
  if (mode === "astig") return Math.sqrt(6) * rho ** 2 * Math.cos(2 * theta);
  if (mode === "coma") return Math.sqrt(8) * (3 * rho ** 3 - 2 * rho) * Math.cos(theta);
  if (mode === "trefoil") return Math.sqrt(8) * rho ** 3 * Math.cos(3 * theta);
  throw new Error(`Unknown mode: ${mode}`);
}

function diskRms(mode, samples = 401) {
  let total = 0;
  let count = 0;
  for (let ix = 0; ix < samples; ix += 1) {
    const x = (2 * ix) / (samples - 1) - 1;
    for (let iy = 0; iy < samples; iy += 1) {
      const y = (2 * iy) / (samples - 1) - 1;
      const value = zernike(x, y, mode);
      if (value !== null) {
        total += value * value;
        count += 1;
      }
    }
  }
  return Math.sqrt(total / count);
}

function strehl(rmsWaves) {
  return Math.exp(-((2 * Math.PI * rmsWaves) ** 2));
}

function fittingErrorWaves(pitch, r0) {
  if (pitch <= 0 || r0 <= 0) throw new Error("pitch and r0 must be positive");
  return 0.28 * (pitch / r0) ** (5 / 6) / (2 * Math.PI);
}

function servoLagWaves(delayMs, tau0Ms) {
  if (delayMs < 0 || tau0Ms <= 0) throw new Error("delay must be non-negative and tau0 positive");
  return 0.30 * (delayMs / tau0Ms) ** (5 / 6) / (2 * Math.PI);
}

function assertNear(name, value, expected, tolerance) {
  const passed = Math.abs(value - expected) <= tolerance;
  console.log(`${passed ? "PASS" : "FAIL"} ${name}: value=${value.toFixed(6)} expected=${expected}`);
  if (!passed) process.exitCode = 1;
}

function assertTrue(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  if (!condition) process.exitCode = 1;
}

for (const mode of MODES) assertNear(`${mode} RMS normalisation over unit pupil`, diskRms(mode), 1.0, TOLERANCE);
assertNear("Marechal Strehl at zero residual", strehl(0), 1.0, 1e-12);
assertTrue("Marechal Strehl decreases with RMS", strehl(0.15) < strehl(0.05));
assertTrue("Fitting error increases with actuator pitch/r0", fittingErrorWaves(0.32, 0.16) > fittingErrorWaves(0.16, 0.16));
assertTrue("Servo-lag term increases with delay/tau0", servoLagWaves(4.0, 4.0) > servoLagWaves(2.0, 4.0));
