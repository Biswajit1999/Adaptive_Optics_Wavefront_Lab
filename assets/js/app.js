const controlIds = ["defocus", "astig", "coma", "trefoil", "gain"];
const controls = Object.fromEntries(controlIds.map((id) => [id, document.getElementById(id)]));
const out = {
  defocus: document.getElementById("defocusOut"),
  astig: document.getElementById("astigOut"),
  coma: document.getElementById("comaOut"),
  trefoil: document.getElementById("trefoilOut"),
  gain: document.getElementById("gainOut"),
  inputRms: document.getElementById("inputRms"),
  outputRms: document.getElementById("outputRms"),
  strehl: document.getElementById("strehl"),
  gainReadout: document.getElementById("gainReadout"),
};

function zernike(x, y, mode) {
  const r2 = x * x + y * y;
  if (r2 > 1) return null;
  const rho = Math.sqrt(r2);
  const theta = Math.atan2(y, x);
  if (mode === "defocus") return Math.sqrt(3) * (2 * rho ** 2 - 1);
  if (mode === "astig") return Math.sqrt(6) * rho ** 2 * Math.cos(2 * theta);
  if (mode === "coma") return Math.sqrt(8) * (3 * rho ** 3 - 2 * rho) * Math.cos(theta);
  if (mode === "trefoil") return Math.sqrt(8) * rho ** 3 * Math.cos(3 * theta);
  return 0;
}

function modelAt(x, y) {
  const coeff = Object.fromEntries(controlIds.map((id) => [id, Number(controls[id].value)]));
  const modes = ["defocus", "astig", "coma", "trefoil"];
  let wave = 0;
  for (const mode of modes) wave += coeff[mode] * zernike(x, y, mode);
  return { input: wave, corrected: wave * (1 - coeff.gain), gain: coeff.gain };
}

function setup(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  canvas.width = size * ratio;
  canvas.height = size * ratio * Number(canvas.height) / Number(canvas.width);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: canvas.clientWidth, height: canvas.clientHeight || canvas.clientWidth };
}

function color(value) {
  const t = Math.max(-1, Math.min(1, value));
  if (t >= 0) return `rgb(${Math.round(30 + 225 * t)}, ${Math.round(70 + 70 * t)}, ${Math.round(120 + 50 * (1 - t))})`;
  return `rgb(${Math.round(45 + 60 * (1 + t))}, ${Math.round(150 + 60 * (1 + t))}, ${Math.round(220 + 25 * -t)})`;
}

function drawWavefront(canvas, which) {
  const { ctx, width, height } = setup(canvas);
  const n = 130;
  const cell = width / n;
  let sum = 0;
  let count = 0;
  for (let iy = 0; iy < n; iy += 1) {
    for (let ix = 0; ix < n; ix += 1) {
      const x = (ix / (n - 1)) * 2 - 1;
      const y = (iy / (n - 1)) * 2 - 1;
      const sample = modelAt(x, y);
      if (sample.input === null) continue;
      if (x * x + y * y > 1) {
        ctx.fillStyle = "#0d1114";
      } else {
        const value = sample[which];
        sum += value * value;
        count += 1;
        ctx.fillStyle = color(value);
      }
      ctx.fillRect(ix * cell, iy * cell, cell + 1, cell + 1);
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, width * 0.49, 0, Math.PI * 2);
  ctx.stroke();
  return Math.sqrt(sum / Math.max(1, count));
}

function drawPsf(inputRms, correctedRms) {
  const canvas = document.getElementById("psfCanvas");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = width * Number(canvas.height) / Number(canvas.width);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = "#0d1114";
  ctx.fillRect(0, 0, width, height);
  drawSpot(ctx, width * 0.32, height / 2, inputRms, "#e77cff", "uncorrected");
  drawSpot(ctx, width * 0.68, height / 2, correctedRms, "#82e6a6", "corrected");
}

function drawSpot(ctx, cx, cy, rms, hue, label) {
  const radius = 18 + rms * 75;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, hue);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a6b3bc";
  ctx.font = "13px system-ui";
  ctx.fillText(label, cx - 36, cy + radius + 22);
}

function render() {
  const inputRms = drawWavefront(document.getElementById("inputCanvas"), "input");
  const outputRms = drawWavefront(document.getElementById("correctedCanvas"), "corrected");
  const strehl = Math.exp(-((2 * Math.PI * outputRms) ** 2));
  drawPsf(inputRms, outputRms);
  out.defocus.textContent = `${Number(controls.defocus.value).toFixed(2)} waves`;
  out.astig.textContent = `${Number(controls.astig.value).toFixed(2)} waves`;
  out.coma.textContent = `${Number(controls.coma.value).toFixed(2)} waves`;
  out.trefoil.textContent = `${Number(controls.trefoil.value).toFixed(2)} waves`;
  out.gain.textContent = Number(controls.gain.value).toFixed(2);
  out.gainReadout.textContent = Number(controls.gain.value).toFixed(2);
  out.inputRms.textContent = `${inputRms.toFixed(3)} waves`;
  out.outputRms.textContent = `${outputRms.toFixed(3)} waves`;
  out.strehl.textContent = strehl.toFixed(3);
}

controlIds.forEach((id) => controls[id].addEventListener("input", render));
window.addEventListener("resize", render);
render();
