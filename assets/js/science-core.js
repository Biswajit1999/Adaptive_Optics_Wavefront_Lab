(function exposeScienceCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AOScienceCore = api;
})(typeof self !== "undefined" ? self : globalThis, () => {
  "use strict";

  const MODES = Object.freeze([4, 5, 6, 7, 8, 11]);
  const NOLL = Object.freeze({
    1: Object.freeze({ n: 0, m: 0, name: "Piston" }),
    2: Object.freeze({ n: 1, m: 1, name: "Tilt X" }),
    3: Object.freeze({ n: 1, m: -1, name: "Tilt Y" }),
    4: Object.freeze({ n: 2, m: 0, name: "Defocus" }),
    5: Object.freeze({ n: 2, m: -2, name: "Astigmatism -2" }),
    6: Object.freeze({ n: 2, m: 2, name: "Astigmatism +2" }),
    7: Object.freeze({ n: 3, m: -1, name: "Coma -1" }),
    8: Object.freeze({ n: 3, m: 1, name: "Coma +1" }),
    9: Object.freeze({ n: 3, m: -3, name: "Trefoil -3" }),
    10: Object.freeze({ n: 3, m: 3, name: "Trefoil +3" }),
    11: Object.freeze({ n: 4, m: 0, name: "Primary spherical" }),
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function finiteNumber(value, fallback) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
  }

  function factorial(value) {
    let result = 1;
    for (let index = 2; index <= value; index += 1) result *= index;
    return result;
  }

  function zernikeNoll(index, rho, theta) {
    const mode = NOLL[index];
    if (!mode) throw new RangeError(`unsupported Noll index J${index}`);
    if (!Number.isFinite(rho) || !Number.isFinite(theta) || rho < 0 || rho > 1) {
      throw new RangeError("rho must be in [0, 1] and theta must be finite");
    }
    const absoluteM = Math.abs(mode.m);
    let radial = 0;
    for (let s = 0; s <= (mode.n - absoluteM) / 2; s += 1) {
      const sign = s % 2 === 0 ? 1 : -1;
      radial += sign * factorial(mode.n - s) /
        (factorial(s) * factorial((mode.n + absoluteM) / 2 - s) *
          factorial((mode.n - absoluteM) / 2 - s)) * rho ** (mode.n - 2 * s);
    }
    const normalisation = mode.m === 0 ? Math.sqrt(mode.n + 1) : Math.sqrt(2 * (mode.n + 1));
    const angular = mode.m === 0
      ? 1
      : mode.m > 0
        ? Math.cos(absoluteM * theta)
        : Math.sin(absoluteM * theta);
    return normalisation * radial * angular;
  }

  function coefficientRms(coefficients) {
    return Math.sqrt(Array.from(coefficients).reduce((total, value) => total + value * value, 0));
  }

  function pairedRms(first, second) {
    if (first.length !== second.length || first.length === 0) {
      throw new RangeError("paired RMS requires equally sized non-empty arrays");
    }
    let total = 0;
    for (let index = 0; index < first.length; index += 1) {
      total += first[index] * first[index] + second[index] * second[index];
    }
    return Math.sqrt(total / (first.length * 2));
  }

  function rms(values) {
    if (!values.length) throw new RangeError("RMS requires at least one value");
    let total = 0;
    for (const value of values) total += value * value;
    return Math.sqrt(total / values.length);
  }

  function mean(values) {
    if (!values.length) throw new RangeError("mean requires at least one value");
    let total = 0;
    for (const value of values) total += value;
    return total / values.length;
  }

  function quantile(sortedValues, fraction) {
    if (!sortedValues.length) throw new RangeError("quantile requires at least one value");
    const index = Math.floor(clamp(fraction, 0, 1) * (sortedValues.length - 1));
    return sortedValues[index];
  }

  function marechalStrehl(rmsWaves) {
    if (!Number.isFinite(rmsWaves) || rmsWaves < 0) {
      throw new RangeError("RMS wavefront error must be finite and non-negative");
    }
    return Math.exp(-Math.pow(2 * Math.PI * rmsWaves, 2));
  }

  function pidIncrement({ measurement, previousError, integral, dt, kp, ki, kd }) {
    for (const [name, value] of Object.entries({ measurement, previousError, integral, dt, kp, ki, kd })) {
      if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
    }
    if (dt <= 0) throw new RangeError("dt must be positive");
    const nextIntegral = clamp(integral + measurement * dt, -2, 2);
    const derivative = (measurement - previousError) / dt;
    return {
      integral: nextIntegral,
      derivative,
      increment: kp * measurement + ki * nextIntegral + kd * derivative,
    };
  }

  function createRandom(seed) {
    let value = seed >>> 0;
    const random = () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
    random.spare = null;
    return random;
  }

  function gaussian(random) {
    if (random.spare !== null) {
      const spare = random.spare;
      random.spare = null;
      return spare;
    }
    const first = Math.max(Number.EPSILON, random());
    const second = random();
    const magnitude = Math.sqrt(-2 * Math.log(first));
    random.spare = magnitude * Math.sin(2 * Math.PI * second);
    return magnitude * Math.cos(2 * Math.PI * second);
  }

  function validateTelemetryPayload(payload) {
    if (!payload || typeof payload !== "object" || !payload.source || !payload.processing) {
      throw new TypeError("AOT telemetry product is missing provenance metadata");
    }
    const telemetry = payload.telemetry;
    const required = ["seconds", "sourceFrameIndex", "gradientX", "gradientY", "subapertureIntensity", "hodmPosition"];
    if (!telemetry || required.some((name) => !Array.isArray(telemetry[name]))) {
      throw new TypeError("AOT telemetry product is missing a required numeric stream");
    }
    const frames = telemetry.seconds.length;
    if (!frames || required.some((name) => telemetry[name].length !== frames)) {
      throw new RangeError("AOT telemetry streams have inconsistent frame counts");
    }
    const widths = { gradientX: 68, gradientY: 68, subapertureIntensity: 68, hodmPosition: 60 };
    for (const [name, width] of Object.entries(widths)) {
      if (telemetry[name].some((row) => !Array.isArray(row) || row.length !== width || row.some((value) => !Number.isFinite(value)))) {
        throw new RangeError(`${name} must contain finite ${width}-sample rows`);
      }
    }
    if (telemetry.seconds.some((value, index) => !Number.isFinite(value) || (index > 0 && value <= telemetry.seconds[index - 1]))) {
      throw new RangeError("telemetry seconds must be finite and strictly increasing");
    }
    if (telemetry.sourceFrameIndex.some((value, index) => !Number.isInteger(value) || (index > 0 && value <= telemetry.sourceFrameIndex[index - 1]))) {
      throw new RangeError("source-frame indices must be strictly increasing integers");
    }
    return frames;
  }

  return Object.freeze({
    MODES,
    NOLL,
    clamp,
    finiteNumber,
    zernikeNoll,
    coefficientRms,
    pairedRms,
    rms,
    mean,
    quantile,
    marechalStrehl,
    pidIncrement,
    createRandom,
    gaussian,
    validateTelemetryPayload,
  });
});
