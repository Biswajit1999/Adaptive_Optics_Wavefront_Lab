(() => {
  "use strict";

  const defaults = {
    dataset: "CIAO1", playbackRate: 1, modelOverlay: false,
    z4: 0.22, z5: 0.12, z6: -0.18, z7: 0.16, z8: 0.06, z11: 0.08,
    turbulence: 0.08, sensorNoise: 0.002, wavelength: 1650,
    kp: 0.32, ki: 0.06, kd: 0.002, loopRate: 200, latency: 2,
  };
  const controls = Object.fromEntries(
    Object.keys(defaults).map((id) => [id, document.getElementById(id)])
  );
  const output = {
    engineLight: document.getElementById("engine-light"),
    engine: document.getElementById("engine"),
    utc: document.getElementById("utc"),
    fps: document.getElementById("fps"),
    loopTime: document.getElementById("loop-time"),
    inputRms: document.getElementById("input-rms"),
    residualRms: document.getElementById("residual-rms"),
    strehl: document.getElementById("strehl"),
    psfPeak: document.getElementById("psf-peak"),
    servoError: document.getElementById("servo-error"),
    modeTable: document.getElementById("mode-table"),
    log: document.getElementById("log"),
    status: document.getElementById("status"),
  };
  const buttons = {
    run: document.getElementById("run"),
    reset: document.getElementById("reset"),
    defaults: document.getElementById("defaults"),
  };
  const modelControls = document.getElementById("model-controls");

  class ShaderMap {
    constructor(id) {
      this.canvas = document.getElementById(id);
      this.gl = this.canvas.getContext("webgl", {
        antialias: false, alpha: false, preserveDrawingBuffer: false,
      });
      if (!this.gl) {
        throw new Error("WebGL is unavailable");
      }
      this.program = this.createProgram();
      this.texture = this.gl.createTexture();
      this.positiveLocation = this.gl.getUniformLocation(this.program, "u_positive");
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      const vertices = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertices);
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]),
        this.gl.STATIC_DRAW
      );
      this.gl.useProgram(this.program);
      const location = this.gl.getAttribLocation(this.program, "a_vertex");
      this.gl.enableVertexAttribArray(location);
      this.gl.vertexAttribPointer(location, 4, this.gl.FLOAT, false, 0, 0);
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_texture"), 0);
    }

    shader(type, source) {
      const shader = this.gl.createShader(type);
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        throw new Error(this.gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    createProgram() {
      const vertex = this.shader(this.gl.VERTEX_SHADER, `
        attribute vec4 a_vertex;
        varying vec2 v_uv;
        void main() {
          gl_Position = vec4(a_vertex.xy, 0.0, 1.0);
          v_uv = vec2(a_vertex.z, 1.0 - a_vertex.w);
        }
      `);
      const fragment = this.shader(this.gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform float u_positive;
        varying vec2 v_uv;
        vec3 divergent(float value) {
          float signedValue = value * 2.0 - 1.0;
          if (signedValue < 0.0) {
            return mix(vec3(0.055, 0.10, 0.19), vec3(0.10, 0.72, 0.95), -signedValue);
          }
          return mix(vec3(0.055, 0.10, 0.19), vec3(1.0, 0.46, 0.28), signedValue);
        }
        vec3 intensity(float value) {
          vec3 low = vec3(0.03, 0.05, 0.09);
          vec3 mid = vec3(0.12, 0.62, 0.82);
          vec3 high = vec3(1.0, 0.86, 0.44);
          return value < 0.55 ? mix(low, mid, value / 0.55) : mix(mid, high, (value - 0.55) / 0.45);
        }
        void main() {
          vec4 datum = texture2D(u_texture, v_uv);
          if (datum.a < 0.1) {
            gl_FragColor = vec4(0.02, 0.03, 0.055, 1.0);
          } else {
            vec3 colour = u_positive > 0.5 ? intensity(datum.r) : divergent(datum.r);
            gl_FragColor = vec4(colour, 1.0);
          }
        }
      `);
      const program = this.gl.createProgram();
      this.gl.attachShader(program, vertex);
      this.gl.attachShader(program, fragment);
      this.gl.linkProgram(program);
      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        throw new Error(this.gl.getProgramInfoLog(program));
      }
      return program;
    }

    render(bytes, textureWidth, textureHeight, positive = false, square = false) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(10, Math.round(rect.width * ratio));
      const height = Math.max(10, Math.round(rect.height * ratio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.gl.viewport(0, 0, width, height);
      this.gl.clearColor(0.02, 0.03, 0.055, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      if (square) {
        const side = Math.min(width, height);
        this.gl.viewport(Math.floor((width - side) / 2), Math.floor((height - side) / 2), side, side);
      }
      this.gl.useProgram(this.program);
      this.gl.uniform1f(this.positiveLocation, positive ? 1 : 0);
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE_ALPHA, textureWidth, textureHeight, 0,
        this.gl.LUMINANCE_ALPHA, this.gl.UNSIGNED_BYTE, bytes
      );
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  class HistoryPlot {
    constructor() {
      this.canvas = document.getElementById("history");
      this.ctx = this.canvas.getContext("2d", { alpha: false, desynchronized: true });
    }

    render(history) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(10, Math.round(rect.width));
      const height = Math.max(10, Math.round(rect.height));
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const ctx = this.ctx;
      ctx.fillStyle = "#080d16";
      ctx.fillRect(0, 0, width, height);
      const box = { left: 58, top: 12, w: width - 74, h: height - 37 };
      let maximum = 0.001;
      for (const value of history.rms) {
        maximum = Math.max(maximum, value);
      }
      ctx.strokeStyle = "rgba(81,109,143,.25)";
      ctx.font = '10px "Roboto Mono", Consolas, monospace';
      ctx.fillStyle = "#8196ad";
      for (let index = 0; index <= 4; index += 1) {
        const y = box.top + box.h * index / 4;
        ctx.beginPath();
        ctx.moveTo(box.left, y);
        ctx.lineTo(box.left + box.w, y);
        ctx.stroke();
        ctx.fillText((maximum * (1 - index / 4)).toFixed(4), 7, y + 3);
      }
      if (history.time.length > 1) {
        const first = history.time[0];
        const last = history.time[history.time.length - 1];
        ctx.strokeStyle = "#35d7e5";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let index = 0; index < history.time.length; index += 1) {
          const x = box.left + (history.time[index] - first) / (last - first || 1) * box.w;
          const y = box.top + (1 - history.rms[index] / maximum) * box.h;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(`${last.toFixed(2)} s`, box.left + box.w, height - 8);
        ctx.textAlign = "left";
      }
    }
  }

  const state = {
    worker: null,
    requestId: 0,
    requestTimer: 0,
    running: true,
    logs: [],
    frameCounter: 0,
    frameStart: performance.now(),
    maps: null,
    history: new HistoryPlot(),
  };

  function readParameters() {
    return {
      modelOverlay: controls.modelOverlay.checked,
      playbackRate: Number(controls.playbackRate.value),
      z4: Number(controls.z4.value),
      z5: Number(controls.z5.value),
      z6: Number(controls.z6.value),
      z7: Number(controls.z7.value),
      z8: Number(controls.z8.value),
      z11: Number(controls.z11.value),
      turbulence: Number(controls.turbulence.value),
      sensorNoise: Number(controls.sensorNoise.value),
      wavelength: Number(controls.wavelength.value),
      kp: Number(controls.kp.value),
      ki: Number(controls.ki.value),
      kd: Number(controls.kd.value),
      loopRate: Number(controls.loopRate.value),
      latency: Number(controls.latency.value),
    };
  }

  function labels() {
    ["z4", "z5", "z6", "z7", "z8", "z11", "kp", "ki", "kd"].forEach((id) => {
      document.getElementById(`${id}-value`).textContent = Number(controls[id].value).toFixed(3);
    });
    document.getElementById("playbackRate-value").textContent =
      `${Number(controls.playbackRate.value).toFixed(2)} x`;
    document.getElementById("modelOverlay-value").textContent =
      controls.modelOverlay.checked ? "ON" : "OFF";
    document.getElementById("turbulence-value").textContent =
      `${Number(controls.turbulence.value).toFixed(3)} waves`;
    document.getElementById("sensorNoise-value").textContent =
      `${Number(controls.sensorNoise.value).toFixed(3)} waves`;
    document.getElementById("wavelength-value").textContent =
      `${Number(controls.wavelength.value).toFixed(0)} nm`;
    document.getElementById("loopRate-value").textContent =
      `${Number(controls.loopRate.value).toFixed(0)} Hz`;
    document.getElementById("latency-value").textContent =
      `${Number(controls.latency.value).toFixed(0)} frames`;
    modelControls.classList.toggle("inactive", !controls.modelOverlay.checked);
  }

  function status(name, light, text) {
    output.engine.textContent = name;
    output.engineLight.className = light;
    output.status.textContent = text;
  }

  function log(text) {
    state.logs.unshift(`${new Date().toISOString().slice(11, 19)}  ${text}`);
    state.logs.length = Math.min(state.logs.length, 8);
    output.log.replaceChildren(...state.logs.map((entry) => {
      const element = document.createElement("li");
      element.textContent = entry;
      return element;
    }));
  }

  function updateViewLabels(modelMode) {
    const fields = modelMode ? {
      "incoming-title": "SIMULATED INCOMING WAVEFRONT",
      "incoming-note": "NOLL BASIS / WAVES",
      "mirror-title": "SIMULATED DEFORMABLE MIRROR",
      "mirror-note": "PID COMMAND SURFACE",
      "residual-title": "SIMULATED RESIDUAL ERROR",
      "residual-note": "W - DM / WAVES",
      "psf-title": "SIMULATED PSF",
      "psf-note": "FFT INTENSITY",
      "history-title": "MODEL CLOSED-LOOP TELEMETRY",
      "history-note": "RESIDUAL RMS VS VIRTUAL TIME / ALTER Ki TO REVEAL OFFSET",
      "table-title": "MODEL ACTIVE MODES",
      "table-note": "NOLL INDEX TABLE",
      "col-a": "J", "col-b": "(n,m)", "col-c": "NAME", "col-d": "RESIDUAL",
      "metric-a-title": "INPUT RMS", "metric-a-unit": "WAVES",
      "metric-b-title": "RESIDUAL RMS", "metric-b-unit": "WAVES",
      "metric-c-title": "STREHL", "metric-c-unit": "MARECHAL MODEL",
      "metric-d-title": "PSF PEAK", "metric-d-unit": "FFT / IDEAL",
      "metric-e-title": "SERVO ERROR", "metric-e-unit": "MODAL RMS",
    } : {
      "incoming-title": "WFS GRADIENT X",
      "incoming-note": "68 SUBAPERTURES x RELEASED TIME",
      "mirror-title": "WFS GRADIENT Y",
      "mirror-note": "68 SUBAPERTURES x RELEASED TIME",
      "residual-title": "SUBAPERTURE INTENSITY",
      "residual-note": "RECORDED WFS FLUX STREAM",
      "psf-title": "HODM POSITIONS",
      "psf-note": "60 RECORDED ACTUATOR COMMANDS",
      "history-title": "RELEASED TELEMETRY TREND",
      "history-note": "WFS GRADIENT RMS VS SAMPLED AOT TIME",
      "table-title": "OBSERVATION CHANNELS",
      "table-note": "AOT FITS EXTENSIONS",
      "col-a": "STREAM", "col-b": "N", "col-c": "TYPE", "col-d": "CURRENT",
      "metric-a-title": "RELEASED STREHL-R", "metric-a-unit": "FITS HEADER",
      "metric-b-title": "WFS GRADIENT RMS", "metric-b-unit": "NATIVE AOT VALUE",
      "metric-c-title": "HODM RMS", "metric-c-unit": "RECORDED COMMAND",
      "metric-d-title": "LOOP RATE", "metric-d-unit": "RELEASED METADATA",
      "metric-e-title": "MEAN FLUX", "metric-e-unit": "SUBAPERTURE INTENSITY",
    };
    for (const [id, text] of Object.entries(fields)) {
      document.getElementById(id).textContent = text;
    }
  }

  function configure(immediate = false) {
    labels();
    updateViewLabels(controls.modelOverlay.checked);
    if (!state.worker) {
      return;
    }
    clearTimeout(state.requestTimer);
    const send = () => {
      state.requestId += 1;
      status("LOADING", "busy", controls.modelOverlay.checked
        ? "LOADING AOT PRODUCT / INITIALISING OPTIONAL MODEL"
        : "LOADING RELEASED CIAO AOT TELEMETRY");
      state.worker.postMessage({
        type: "configure",
        requestId: state.requestId,
        parameters: readParameters(),
      });
    };
    if (immediate) {
      send();
    } else {
      state.requestTimer = setTimeout(send, 40);
    }
  }

  function handleObservation(message) {
    if (message.requestId !== state.requestId || controls.modelOverlay.checked) {
      return;
    }
    state.maps.incoming.render(
      message.textures.gradientX.bytes, message.textures.gradientX.width,
      message.textures.gradientX.height, false, false
    );
    state.maps.mirror.render(
      message.textures.gradientY.bytes, message.textures.gradientY.width,
      message.textures.gradientY.height, false, false
    );
    state.maps.residual.render(
      message.textures.intensity.bytes, message.textures.intensity.width,
      message.textures.intensity.height, true, false
    );
    state.maps.psf.render(
      message.textures.command.bytes, message.textures.command.width,
      message.textures.command.height, false, false
    );
    state.history.render(message.history);
    log(`CIAO1 AOT loaded / ${message.source.originalFrameCount} released frames / ${message.processing.selectedFrameCount} displayed`);
    status("ONLINE", "online", "RELEASED AOT TELEMETRY ACTIVE / SIMULATION OFF");
  }

  function handleObservationCursor(message) {
    if (controls.modelOverlay.checked) {
      return;
    }
    const telemetry = message.telemetry;
    output.loopTime.textContent = `${telemetry.timeSeconds.toFixed(3)} s`;
    output.inputRms.textContent = telemetry.strehlRatio.toFixed(3);
    output.residualRms.textContent = telemetry.gradientRms.toFixed(5);
    output.strehl.textContent = telemetry.commandRms.toFixed(5);
    output.psfPeak.textContent = `${telemetry.loopRateHz.toFixed(3)} Hz`;
    output.servoError.textContent = telemetry.meanFlux.toFixed(1);
    output.modeTable.replaceChildren(...message.rows.map((item) => tableRow([
      item.name, String(item.n), item.kind, item.current.toFixed(item.kind === "WFS FLUX" ? 1 : 5),
    ])));
  }

  function handleModelFrame(message) {
    if (!controls.modelOverlay.checked) {
      return;
    }
    const telemetry = message.telemetry;
    output.loopTime.textContent = `${telemetry.timeSeconds.toFixed(3)} s`;
    output.inputRms.textContent = telemetry.inputRms.toFixed(4);
    output.residualRms.textContent = telemetry.residualRms.toFixed(5);
    output.strehl.textContent = telemetry.strehl.toFixed(5);
    output.psfPeak.textContent = telemetry.psfPeak.toFixed(5);
    output.servoError.textContent = telemetry.servoError.toFixed(5);
    output.modeTable.replaceChildren(...message.modes.map((mode) => tableRow([
      `J${mode.j}`, `(${mode.n},${mode.m})`, mode.name, mode.residual.toFixed(4),
    ])));
    state.maps.incoming.render(message.incoming, message.gridSize, message.gridSize, false, true);
    state.maps.mirror.render(message.mirror, message.gridSize, message.gridSize, false, true);
    state.maps.residual.render(message.residual, message.gridSize, message.gridSize, false, true);
    state.maps.psf.render(message.psf, message.gridSize, message.gridSize, true, true);
    state.history.render(message.history);
    status("MODEL", "online", `OPTIONAL PID MODEL ACTIVE / WORKER ${telemetry.computeMilliseconds.toFixed(2)} MS`);
  }

  function tableRow(values) {
    const row = document.createElement("tr");
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
    return row;
  }

  function start() {
    labels();
    updateViewLabels(false);
    output.utc.textContent = new Date().toISOString().slice(11, 19);
    setInterval(() => {
      output.utc.textContent = new Date().toISOString().slice(11, 19);
    }, 1000);
    try {
      state.maps = {
        incoming: new ShaderMap("incoming"),
        mirror: new ShaderMap("mirror"),
        residual: new ShaderMap("residual"),
        psf: new ShaderMap("psf"),
      };
      state.worker = new Worker("assets/js/physicsWorker.js");
      state.worker.addEventListener("message", (event) => {
        const message = event.data;
        if (message.type === "observation") {
          handleObservation(message);
        } else if (message.type === "observationCursor") {
          handleObservationCursor(message);
        } else if (message.type === "modelFrame") {
          handleModelFrame(message);
        } else if (message.type === "dataError" && message.requestId === state.requestId) {
          status("FAILED", "failed", "AOT OBSERVATION ASSET UNAVAILABLE");
          log(message.message);
        }
      });
      state.worker.addEventListener("error", (event) => {
        status("FAILED", "failed", "WORKER FAILURE");
        log(event.message);
      });
      configure(true);
      log("Initialising released AOT telemetry view");
    } catch (error) {
      status("FAILED", "failed", "WEBGL OR WORKER UNAVAILABLE");
      log(error.message);
    }
    const fpsFrame = (timestamp) => {
      state.frameCounter += 1;
      if (timestamp - state.frameStart > 1000) {
        output.fps.textContent =
          `${(state.frameCounter * 1000 / (timestamp - state.frameStart)).toFixed(0)} FPS`;
        state.frameCounter = 0;
        state.frameStart = timestamp;
      }
      requestAnimationFrame(fpsFrame);
    };
    requestAnimationFrame(fpsFrame);
  }

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", () => configure(false));
    control.addEventListener("change", () => {
      const modeChanged = control === controls.modelOverlay;
      configure(true);
      if (modeChanged) {
        log(controls.modelOverlay.checked
          ? "Simulation mode enabled / released streams remain available when disabled"
          : "Returned to released CIAO AOT telemetry");
      }
    });
  });
  buttons.run.addEventListener("click", () => {
    state.running = !state.running;
    buttons.run.textContent = state.running ? "PAUSE STREAM" : "RESUME STREAM";
    buttons.run.classList.toggle("on", state.running);
    state.worker?.postMessage({ type: "setRunning", running: state.running });
    log(state.running ? "Stream resumed" : "Stream paused");
  });
  buttons.reset.addEventListener("click", () => {
    state.worker?.postMessage({ type: "resetController" });
    log(controls.modelOverlay.checked ? "Optional PID mirror state reset" : "Released playback returned to first retained frame");
  });
  buttons.defaults.addEventListener("click", () => {
    for (const [key, value] of Object.entries(defaults)) {
      if (controls[key].type === "checkbox") {
        controls[key].checked = value;
      } else {
        controls[key].value = String(value);
      }
    }
    configure(true);
    log("Observation-first defaults restored");
  });
  start();
})();
