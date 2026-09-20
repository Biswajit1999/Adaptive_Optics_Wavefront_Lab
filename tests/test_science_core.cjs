"use strict";

const assert = require("node:assert/strict");
const core = require("../assets/js/science-core.js");

function sampledMoments(j, size = 251) {
  const values = [];
  for (let y = 0; y < size; y += 1) {
    const cy = 2 * (y + 0.5) / size - 1;
    for (let x = 0; x < size; x += 1) {
      const cx = 2 * (x + 0.5) / size - 1;
      const rho = Math.hypot(cx, cy);
      if (rho <= 1) values.push(core.zernikeNoll(j, rho, Math.atan2(cy, cx)));
    }
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
  return { values, mean, rms };
}

const sampled = new Map(core.MODES.map((j) => [j, sampledMoments(j)]));
for (const j of core.MODES) {
  assert.ok(Math.abs(sampled.get(j).mean) < 0.003, `J${j} piston`);
  assert.ok(Math.abs(sampled.get(j).rms - 1) < 0.015, `J${j} unit RMS`);
}
for (let left = 0; left < core.MODES.length; left += 1) {
  for (let right = left + 1; right < core.MODES.length; right += 1) {
    const a = sampled.get(core.MODES[left]).values;
    const b = sampled.get(core.MODES[right]).values;
    const dot = a.reduce((sum, value, index) => sum + value * b[index], 0) / a.length;
    assert.ok(Math.abs(dot) < 0.004, `J${core.MODES[left]} ⟂ J${core.MODES[right]}`);
  }
}

assert.equal(core.marechalStrehl(0), 1);
assert.ok(core.marechalStrehl(0.05) > core.marechalStrehl(0.15));
assert.throws(() => core.marechalStrehl(-0.01), RangeError);

const pid = core.pidIncrement({ measurement: 0.2, previousError: 0.1, integral: 0, dt: 0.005, kp: 0.32, ki: 0.06, kd: 0.002 });
assert.ok(Math.abs(pid.integral - 0.001) < 1e-15);
assert.ok(Math.abs(pid.derivative - 20) < 1e-12);
assert.ok(Math.abs(pid.increment - 0.10406) < 1e-12);

function syntheticPayload() {
  const frames = 3;
  const rows = (width) => Array.from({ length: frames }, (_, frame) => Array.from({ length: width }, (_, channel) => frame + channel / 100));
  return {
    source: { doi: "test" },
    processing: { frameStride: 50 },
    telemetry: {
      seconds: [0, 0.1, 0.2],
      sourceFrameIndex: [0, 50, 100],
      gradientX: rows(68), gradientY: rows(68), subapertureIntensity: rows(68), hodmPosition: rows(60),
    },
  };
}
assert.equal(core.validateTelemetryPayload(syntheticPayload()), 3);
const malformed = syntheticPayload();
malformed.telemetry.gradientX[1].pop();
assert.throws(() => core.validateTelemetryPayload(malformed), RangeError);

const first = core.createRandom(92017);
const second = core.createRandom(92017);
for (let index = 0; index < 20; index += 1) assert.equal(first(), second());

console.log("PASS 6-mode science core, PID equation, telemetry schema, and deterministic RNG");
