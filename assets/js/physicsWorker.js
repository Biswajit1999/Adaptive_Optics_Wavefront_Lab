"use strict";

const OBSERVATION_URL = "../../data/observations/ciao1_aot_telemetry.json";
const GRID_SIZE = 128;
const DISPLAY_RANGE_WAVES = 0.75;
const FRAME_INTERVAL_MS = 50;
const MODES = [4, 5, 6, 7, 8, 11];
const NOLL = Object.freeze({
  1: { n: 0, m: 0, name: "Piston" },
  2: { n: 1, m: 1, name: "Tilt X" },
  3: { n: 1, m: -1, name: "Tilt Y" },
  4: { n: 2, m: 0, name: "Defocus" },
  5: { n: 2, m: -2, name: "Astigmatism -2" },
  6: { n: 2, m: 2, name: "Astigmatism +2" },
  7: { n: 3, m: -1, name: "Coma -1" },
  8: { n: 3, m: 1, name: "Coma +1" },
  9: { n: 3, m: -3, name: "Trefoil -3" },
  10: { n: 3, m: 3, name: "Trefoil +3" },
  11: { n: 4, m: 0, name: "Primary spherical" },
});

const basis = buildBasis();
const runtime = {
  observationPromise: null,
  observation: null,
  observationPosition: 0,
  requestId: 0,
  parameters: null,
  mode: "observation",
  timeSeconds: 0,
  correction: new Float64Array(MODES.length),
  integral: new Float64Array(MODES.length),
  previousError: new Float64Array(MODES.length),
  delayQueues: MODES.map(() => []),
  history: [],
  running: true,
  random: createRandom(92017),
  timer: null,
  lastTick: performance.now(),
};

self.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "configure") {
    runtime.requestId = message.requestId;
    configure(message);
  } else if (message.type === "setRunning") {
    runtime.running = Boolean(message.running);
    runtime.lastTick = performance.now();
    if (runtime.mode === "model") {
      emitModelFrame();
    } else {
      emitObservationCursor();
    }
    ensureTimer();
  } else if (message.type === "resetController") {
    if (runtime.mode === "model") {
      resetController();
      emitModelFrame();
    } else {
      runtime.observationPosition = 0;
      emitObservationCursor();
    }
  }
});

async function configure(message) {
  try {
    const observation = await loadObservation();
    if (message.requestId !== runtime.requestId) {
      return;
    }
    runtime.parameters = sanitise(message.parameters);
    runtime.observation = observation;
    runtime.mode = runtime.parameters.modelOverlay ? "model" : "observation";
    runtime.lastTick = performance.now();
    if (runtime.mode === "model") {
      resetController();
      emitModelFrame();
    } else {
      runtime.observationPosition = 0;
      emitObservationProduct(message.requestId);
      emitObservationCursor();
    }
    ensureTimer();
  } catch (error) {
    self.postMessage({
      type: "dataError",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function loadObservation() {
  if (!runtime.observationPromise) {
    runtime.observationPromise = fetch(OBSERVATION_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`AOT telemetry request failed with HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(buildObservationProduct);
  }
  return runtime.observationPromise;
}

function buildObservationProduct(payload) {
  const telemetry = payload.telemetry;
  if (!telemetry || !Array.isArray(telemetry.gradientX) || !telemetry.gradientX.length) {
    throw new Error("AOT telemetry browser asset is malformed");
  }
  const frames = telemetry.seconds.length;
  const gradientRms = new Float32Array(frames);
  const commandRms = new Float32Array(frames);
  const meanFlux = new Float32Array(frames);
  const seconds = Float32Array.from(telemetry.seconds);
  for (let frame = 0; frame < frames; frame += 1) {
    gradientRms[frame] = pairedRms(telemetry.gradientX[frame], telemetry.gradientY[frame]);
    commandRms[frame] = rms(telemetry.hodmPosition[frame]);
    meanFlux[frame] = mean(telemetry.subapertureIntensity[frame]);
  }
  return {
    source: payload.source,
    processing: payload.processing,
    raw: telemetry,
    frameCount: frames,
    seconds,
    gradientRms,
    commandRms,
    meanFlux,
    textures: {
      gradientX: matrixTexture(telemetry.gradientX, true),
      gradientY: matrixTexture(telemetry.gradientY, true),
      intensity: matrixTexture(telemetry.subapertureIntensity, false),
      command: matrixTexture(telemetry.hodmPosition, true),
    },
  };
}

function matrixTexture(matrix, divergent) {
  const width = matrix.length;
  const height = matrix[0].length;
  const values = [];
  for (const row of matrix) {
    for (const value of row) {
      values.push(divergent ? Math.abs(value) : value);
    }
  }
  values.sort((a, b) => a - b);
  const lower = divergent ? 0 : quantile(values, 0.01);
  const upper = quantile(values, 0.99);
  const scale = Math.max(Number.EPSILON, upper - lower);
  const texture = new Uint8Array(width * height * 2);
  for (let channel = 0; channel < height; channel += 1) {
    for (let frame = 0; frame < width; frame += 1) {
      const sample = matrix[frame][channel];
      const display = divergent
        ? clamp(0.5 + 0.5 * sample / Math.max(upper, Number.EPSILON), 0, 1)
        : clamp((sample - lower) / scale, 0, 1);
      const offset = (channel * width + frame) * 2;
      texture[offset] = Math.round(display * 255);
      texture[offset + 1] = 255;
    }
  }
  return { texture, width, height, divergent, lower, upper };
}

function emitObservationProduct(requestId) {
  const observation = runtime.observation;
  const message = {
    type: "observation",
    requestId,
    source: observation.source,
    processing: observation.processing,
    textures: {
      gradientX: transferTexture(observation.textures.gradientX),
      gradientY: transferTexture(observation.textures.gradientY),
      intensity: transferTexture(observation.textures.intensity),
      command: transferTexture(observation.textures.command),
    },
    history: {
      time: observation.seconds.slice(),
      rms: observation.gradientRms.slice(),
    },
  };
  self.postMessage(message, [
    message.textures.gradientX.bytes.buffer,
    message.textures.gradientY.bytes.buffer,
    message.textures.intensity.bytes.buffer,
    message.textures.command.bytes.buffer,
    message.history.time.buffer,
    message.history.rms.buffer,
  ]);
}

function transferTexture(product) {
  return {
    bytes: product.texture.slice(),
    width: product.width,
    height: product.height,
    positive: !product.divergent,
    lower: product.lower,
    upper: product.upper,
  };
}

function emitObservationCursor() {
  const observation = runtime.observation;
  if (!observation || runtime.mode !== "observation") {
    return;
  }
  const frame = Math.min(observation.frameCount - 1, Math.floor(runtime.observationPosition));
  const raw = observation.raw;
  self.postMessage({
    type: "observationCursor",
    telemetry: {
      frame,
      sourceFrameIndex: raw.sourceFrameIndex[frame],
      timeSeconds: observation.seconds[frame],
      strehlRatio: observation.source.headerStrehlRatio,
      gradientRms: observation.gradientRms[frame],
      commandRms: observation.commandRms[frame],
      meanFlux: observation.meanFlux[frame],
      loopRateHz: observation.source.loopRateHz,
    },
    rows: [
      { name: "GRADIENTS", n: 68, kind: "WFS X/Y", current: observation.gradientRms[frame] },
      { name: "INTENSITIES", n: 68, kind: "WFS FLUX", current: observation.meanFlux[frame] },
      { name: "HODM POSITIONS", n: 60, kind: "DM CMD", current: observation.commandRms[frame] },
    ],
  });
}

function sanitise(raw) {
  return {
    modelOverlay: Boolean(raw.modelOverlay),
    playbackRate: clamp(number(raw.playbackRate, 1), 0.05, 20),
    coefficients: new Float64Array([
      number(raw.z4, 0.22),
      number(raw.z5, 0.12),
      number(raw.z6, -0.18),
      number(raw.z7, 0.16),
      number(raw.z8, 0.06),
      number(raw.z11, 0.08),
    ]),
    turbulenceWaves: clamp(number(raw.turbulence, 0.08), 0, 2),
    sensorNoiseWaves: clamp(number(raw.sensorNoise, 0.002), 0, 1),
    wavelengthNm: clamp(number(raw.wavelength, 1650), 100, 10000),
    kp: clamp(number(raw.kp, 0.32), 0, 2),
    ki: clamp(number(raw.ki, 0.06), 0, 4),
    kd: clamp(number(raw.kd, 0.002), 0, 0.2),
    loopRateHz: clamp(number(raw.loopRate, 200), 1, 5000),
    latencyFrames: Math.round(clamp(number(raw.latency, 2), 0, 100)),
  };
}

function ensureTimer() {
  if (runtime.timer === null) {
    runtime.timer = self.setInterval(tick, FRAME_INTERVAL_MS);
  }
}

function tick() {
  const now = performance.now();
  const elapsed = Math.max(0, (now - runtime.lastTick) / 1000);
  runtime.lastTick = now;
  if (!runtime.running || !runtime.parameters) {
    return;
  }
  if (runtime.mode === "observation") {
    const frameDuration = runtime.observation.processing.frameStride / runtime.observation.source.loopRateHz;
    runtime.observationPosition =
      (runtime.observationPosition + elapsed * runtime.parameters.playbackRate / frameDuration) %
      runtime.observation.frameCount;
    emitObservationCursor();
  } else {
    emitModelFrame();
  }
}

function resetController() {
  runtime.timeSeconds = 0;
  runtime.correction.fill(0);
  runtime.integral.fill(0);
  runtime.previousError.fill(0);
  runtime.delayQueues = MODES.map(() => []);
  runtime.history = [];
  runtime.random = createRandom(92017);
}

function emitModelFrame() {
  if (!runtime.parameters || runtime.mode !== "model") {
    return;
  }
  const started = performance.now();
  if (runtime.running) {
    const steps = Math.max(1, Math.round(runtime.parameters.loopRateHz * FRAME_INTERVAL_MS / 1000));
    for (let index = 0; index < steps; index += 1) {
      advanceController();
    }
  }
  const coefficients = currentCoefficients();
  const products = assembleMaps(coefficients);
  const psf = computePsf(products.residualValues, products.mask);
  const inputRms = coefficientRms(coefficients.incoming);
  const residualRms = coefficientRms(coefficients.residual);
  const strehl = Math.exp(-Math.pow(2 * Math.PI * residualRms, 2));
  runtime.history.push({ time: runtime.timeSeconds, rms: residualRms });
  if (runtime.history.length > 220) {
    runtime.history.shift();
  }
  const historyTime = new Float32Array(runtime.history.map((point) => point.time));
  const historyRms = new Float32Array(runtime.history.map((point) => point.rms));
  const modes = MODES.map((j, index) => ({
    j,
    n: NOLL[j].n,
    m: NOLL[j].m,
    name: NOLL[j].name,
    residual: coefficients.residual[index],
  }));
  const message = {
    type: "modelFrame",
    telemetry: {
      timeSeconds: runtime.timeSeconds,
      inputRms,
      residualRms,
      strehl,
      psfPeak: psf.normalisedPeak,
      servoError: residualRms,
      computeMilliseconds: performance.now() - started,
      wavelengthNm: runtime.parameters.wavelengthNm,
    },
    modes,
    incoming: products.incomingTexture,
    mirror: products.mirrorTexture,
    residual: products.residualTexture,
    psf: psf.texture,
    history: { time: historyTime, rms: historyRms },
    gridSize: GRID_SIZE,
  };
  self.postMessage(message, [
    message.incoming.buffer,
    message.mirror.buffer,
    message.residual.buffer,
    message.psf.buffer,
    historyTime.buffer,
    historyRms.buffer,
  ]);
}

function advanceController() {
  const parameters = runtime.parameters;
  const dt = 1 / parameters.loopRateHz;
  const incoming = atmosphericCoefficients(runtime.timeSeconds);
  for (let index = 0; index < MODES.length; index += 1) {
    const immediateError = incoming[index] - runtime.correction[index];
    const queue = runtime.delayQueues[index];
    queue.push(immediateError + parameters.sensorNoiseWaves * gaussian(runtime.random));
    const measurement = queue.length > parameters.latencyFrames ? queue.shift() : 0;
    runtime.integral[index] = clamp(runtime.integral[index] + measurement * dt, -2, 2);
    const derivative = (measurement - runtime.previousError[index]) / dt;
    const update =
      parameters.kp * measurement +
      parameters.ki * runtime.integral[index] +
      parameters.kd * derivative;
    runtime.correction[index] += clamp(update, -0.25, 0.25);
    runtime.correction[index] = clamp(runtime.correction[index], -3, 3);
    runtime.previousError[index] = measurement;
  }
  runtime.timeSeconds += dt;
}

function currentCoefficients() {
  const incoming = atmosphericCoefficients(runtime.timeSeconds);
  const residual = new Float64Array(MODES.length);
  for (let index = 0; index < MODES.length; index += 1) {
    residual[index] = incoming[index] - runtime.correction[index];
  }
  return { incoming, residual };
}

function atmosphericCoefficients(timeSeconds) {
  const parameters = runtime.parameters;
  const coefficients = new Float64Array(MODES.length);
  const weights = [0.72, 0.86, 0.84, 1.0, 0.92, 0.55];
  for (let index = 0; index < MODES.length; index += 1) {
    const first = Math.sin(timeSeconds * (1.4 + index * 0.29) + index * 1.73);
    const second = Math.sin(timeSeconds * (0.31 + index * 0.08) + index * 0.44);
    coefficients[index] =
      parameters.coefficients[index] +
      parameters.turbulenceWaves * weights[index] * (0.7 * first + 0.3 * second);
  }
  return coefficients;
}

function assembleMaps(coefficients) {
  const incomingTexture = new Uint8Array(GRID_SIZE * GRID_SIZE * 2);
  const mirrorTexture = new Uint8Array(GRID_SIZE * GRID_SIZE * 2);
  const residualTexture = new Uint8Array(GRID_SIZE * GRID_SIZE * 2);
  const residualValues = new Float64Array(GRID_SIZE * GRID_SIZE);
  const mask = basis.mask;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (!mask[pixel]) {
      continue;
    }
    let incoming = 0;
    let mirror = 0;
    for (let mode = 0; mode < MODES.length; mode += 1) {
      incoming += coefficients.incoming[mode] * basis.values[mode][pixel];
      mirror += runtime.correction[mode] * basis.values[mode][pixel];
    }
    const residual = incoming - mirror;
    residualValues[pixel] = residual;
    writeTexture(incomingTexture, pixel, incoming);
    writeTexture(mirrorTexture, pixel, mirror);
    writeTexture(residualTexture, pixel, residual);
  }
  return { incomingTexture, mirrorTexture, residualTexture, residualValues, mask };
}

function writeTexture(texture, pixel, waves) {
  const offset = pixel * 2;
  texture[offset] = Math.round((clamp(waves / DISPLAY_RANGE_WAVES, -1, 1) * 0.5 + 0.5) * 255);
  texture[offset + 1] = 255;
}

function computePsf(residualValues, mask) {
  const real = new Float64Array(GRID_SIZE * GRID_SIZE);
  const imaginary = new Float64Array(GRID_SIZE * GRID_SIZE);
  let apertureCount = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (mask[pixel]) {
      const phase = 2 * Math.PI * residualValues[pixel];
      real[pixel] = Math.cos(phase);
      imaginary[pixel] = Math.sin(phase);
      apertureCount += 1;
    }
  }
  fft2d(real, imaginary, GRID_SIZE);
  const idealPeak = apertureCount * apertureCount;
  let peak = 0;
  const intensity = new Float64Array(real.length);
  for (let pixel = 0; pixel < intensity.length; pixel += 1) {
    intensity[pixel] = real[pixel] * real[pixel] + imaginary[pixel] * imaginary[pixel];
    peak = Math.max(peak, intensity[pixel]);
  }
  const texture = new Uint8Array(GRID_SIZE * GRID_SIZE * 2);
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const sourceX = (x + GRID_SIZE / 2) % GRID_SIZE;
      const sourceY = (y + GRID_SIZE / 2) % GRID_SIZE;
      const sourcePixel = sourceY * GRID_SIZE + sourceX;
      const outputPixel = y * GRID_SIZE + x;
      const display = clamp(Math.log1p(intensity[sourcePixel]) / Math.log1p(peak || 1), 0, 1);
      texture[outputPixel * 2] = Math.round(display * 255);
      texture[outputPixel * 2 + 1] = 255;
    }
  }
  return { texture, normalisedPeak: peak / idealPeak };
}

function fft2d(real, imaginary, size) {
  const rowReal = new Float64Array(size);
  const rowImaginary = new Float64Array(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = y * size + x;
      rowReal[x] = real[pixel];
      rowImaginary[x] = imaginary[pixel];
    }
    fft(rowReal, rowImaginary);
    for (let x = 0; x < size; x += 1) {
      const pixel = y * size + x;
      real[pixel] = rowReal[x];
      imaginary[pixel] = rowImaginary[x];
    }
  }
  const columnReal = new Float64Array(size);
  const columnImaginary = new Float64Array(size);
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      const pixel = y * size + x;
      columnReal[y] = real[pixel];
      columnImaginary[y] = imaginary[pixel];
    }
    fft(columnReal, columnImaginary);
    for (let y = 0; y < size; y += 1) {
      const pixel = y * size + x;
      real[pixel] = columnReal[y];
      imaginary[pixel] = columnImaginary[y];
    }
  }
}

function fft(real, imaginary) {
  const length = real.length;
  let reversed = 0;
  for (let index = 1; index < length; index += 1) {
    let bit = length >> 1;
    while (reversed & bit) {
      reversed ^= bit;
      bit >>= 1;
    }
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]];
    }
  }
  for (let block = 2; block <= length; block <<= 1) {
    const angle = -2 * Math.PI / block;
    const rotationReal = Math.cos(angle);
    const rotationImaginary = Math.sin(angle);
    for (let start = 0; start < length; start += block) {
      let unitReal = 1;
      let unitImaginary = 0;
      for (let index = 0; index < block / 2; index += 1) {
        const even = start + index;
        const odd = even + block / 2;
        const transformedReal = unitReal * real[odd] - unitImaginary * imaginary[odd];
        const transformedImaginary = unitReal * imaginary[odd] + unitImaginary * real[odd];
        real[odd] = real[even] - transformedReal;
        imaginary[odd] = imaginary[even] - transformedImaginary;
        real[even] += transformedReal;
        imaginary[even] += transformedImaginary;
        const nextReal = unitReal * rotationReal - unitImaginary * rotationImaginary;
        unitImaginary = unitReal * rotationImaginary + unitImaginary * rotationReal;
        unitReal = nextReal;
      }
    }
  }
}

function buildBasis() {
  const mask = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const values = MODES.map(() => new Float64Array(GRID_SIZE * GRID_SIZE));
  for (let y = 0; y < GRID_SIZE; y += 1) {
    const coordinateY = 2 * (y + 0.5) / GRID_SIZE - 1;
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const coordinateX = 2 * (x + 0.5) / GRID_SIZE - 1;
      const rho = Math.hypot(coordinateX, coordinateY);
      const pixel = y * GRID_SIZE + x;
      if (rho <= 1) {
        mask[pixel] = 1;
        const theta = Math.atan2(coordinateY, coordinateX);
        for (let mode = 0; mode < MODES.length; mode += 1) {
          values[mode][pixel] = zernikeNoll(MODES[mode], rho, theta);
        }
      }
    }
  }
  return { mask, values };
}

function zernikeNoll(index, rho, theta) {
  const mode = NOLL[index];
  const absoluteM = Math.abs(mode.m);
  let radial = 0;
  for (let s = 0; s <= (mode.n - absoluteM) / 2; s += 1) {
    const sign = s % 2 === 0 ? 1 : -1;
    radial += sign * factorial(mode.n - s) /
      (factorial(s) * factorial((mode.n + absoluteM) / 2 - s) *
        factorial((mode.n - absoluteM) / 2 - s)) *
      rho ** (mode.n - 2 * s);
  }
  const normalisation = mode.m === 0 ? Math.sqrt(mode.n + 1) : Math.sqrt(2 * (mode.n + 1));
  const angular =
    mode.m === 0 ? 1 : mode.m > 0 ? Math.cos(absoluteM * theta) : Math.sin(absoluteM * theta);
  return normalisation * radial * angular;
}

function coefficientRms(coefficients) {
  let total = 0;
  for (const coefficient of coefficients) {
    total += coefficient * coefficient;
  }
  return Math.sqrt(total);
}

function pairedRms(first, second) {
  let total = 0;
  for (let index = 0; index < first.length; index += 1) {
    total += first[index] * first[index] + second[index] * second[index];
  }
  return Math.sqrt(total / (first.length * 2));
}

function rms(values) {
  let total = 0;
  for (const value of values) {
    total += value * value;
  }
  return Math.sqrt(total / Math.max(1, values.length));
}

function mean(values) {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total / Math.max(1, values.length);
}

function quantile(sortedValues, fraction) {
  const index = Math.floor(clamp(fraction, 0, 1) * (sortedValues.length - 1));
  return sortedValues[index];
}

function factorial(value) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }
  return result;
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

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function number(value, fallback) {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
}
