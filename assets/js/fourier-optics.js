const aoControlIds = ["defocus", "astig", "coma", "trefoil", "gain", "actuatorPitch", "friedR0", "loopDelay", "coherenceTime", "wfsNoise"];
const aoControls = Object.fromEntries(aoControlIds.map((id) => [id, document.getElementById(id)]));
const aoOut = {
  defocus: document.getElementById("defocusOut"), astig: document.getElementById("astigOut"), coma: document.getElementById("comaOut"), trefoil: document.getElementById("trefoilOut"), gain: document.getElementById("gainOut"), actuatorPitch: document.getElementById("pitchOut"), friedR0: document.getElementById("r0Out"), loopDelay: document.getElementById("delayOut"), coherenceTime: document.getElementById("tau0Out"), wfsNoise: document.getElementById("wfsOut"), inputRms: document.getElementById("inputRms"), outputRms: document.getElementById("outputRms"), strehl: document.getElementById("strehl"), gainReadout: document.getElementById("gainReadout"), modalResidual: document.getElementById("modalResidual"), fittingError: document.getElementById("fittingError"), servoLag: document.getElementById("servoLag"), totalResidual: document.getElementById("totalResidual"),
};
const aoModes = ["defocus", "astig", "coma", "trefoil"];
const PSF_GRID = 128;

function aoZernike(x, y, mode) {
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

function aoCoefficients() { return Object.fromEntries(aoControlIds.map((id) => [id, Number(aoControls[id].value)])); }
function aoWavefront(x, y, coeff) {
  let wave = 0;
  for (const mode of aoModes) wave += coeff[mode] * aoZernike(x, y, mode);
  return wave;
}

function aoErrorBudget(modalResidual, coeff) {
  const fitting = 0.28 * (coeff.actuatorPitch / coeff.friedR0) ** (5 / 6) / (2 * Math.PI);
  const servo = 0.30 * (Math.max(coeff.loopDelay, 0) / coeff.coherenceTime) ** (5 / 6) / (2 * Math.PI);
  const total = Math.sqrt(modalResidual ** 2 + fitting ** 2 + servo ** 2 + coeff.wfsNoise ** 2);
  return { modal: modalResidual, fitting, servo, wfsNoise: coeff.wfsNoise, total };
}

function aoSetup(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, canvas.clientWidth);
  const aspect = Number(canvas.getAttribute("height")) / Number(canvas.getAttribute("width"));
  const height = Math.max(1, width * aspect);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

function aoPhaseColor(value) {
  const t = Math.max(-1, Math.min(1, value));
  if (t >= 0) return `rgb(${Math.round(30 + 225 * t)}, ${Math.round(70 + 70 * t)}, ${Math.round(120 + 50 * (1 - t))})`;
  return `rgb(${Math.round(45 + 60 * (1 + t))}, ${Math.round(150 + 60 * (1 + t))}, ${Math.round(220 + 25 * -t)})`;
}

function aoDrawWavefront(canvas, scale, coeff) {
  const { ctx, width, height } = aoSetup(canvas);
  const n = 130;
  const cell = width / n;
  let sum = 0;
  let count = 0;
  for (let iy = 0; iy < n; iy += 1) {
    for (let ix = 0; ix < n; ix += 1) {
      const x = (ix / (n - 1)) * 2 - 1;
      const y = (iy / (n - 1)) * 2 - 1;
      if (x * x + y * y > 1) {
        ctx.fillStyle = "#0d1114";
      } else {
        const value = aoWavefront(x, y, coeff) * scale;
        sum += value * value;
        count += 1;
        ctx.fillStyle = aoPhaseColor(value);
      }
      ctx.fillRect(ix * cell, iy * cell, cell + 1, cell + 1);
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(width / 2, height / 2, width * 0.49, 0, Math.PI * 2); ctx.stroke();
  return Math.sqrt(sum / Math.max(1, count));
}

function aoFft1d(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = -2 * Math.PI / length;
    const wLenR = Math.cos(angle);
    const wLenI = Math.sin(angle);
    for (let start = 0; start < n; start += length) {
      let wr = 1;
      let wi = 0;
      const half = length >> 1;
      for (let k = 0; k < half; k += 1) {
        const even = start + k;
        const odd = even + half;
        const vr = real[odd] * wr - imag[odd] * wi;
        const vi = real[odd] * wi + imag[odd] * wr;
        const er = real[even];
        const ei = imag[even];
        real[even] = er + vr; imag[even] = ei + vi;
        real[odd] = er - vr; imag[odd] = ei - vi;
        const nextWr = wr * wLenR - wi * wLenI;
        wi = wr * wLenI + wi * wLenR;
        wr = nextWr;
      }
    }
  }
}

function aoFft2d(real, imag, n) {
  const rowR = new Float64Array(n);
  const rowI = new Float64Array(n);
  for (let y = 0; y < n; y += 1) {
    const offset = y * n;
    for (let x = 0; x < n; x += 1) { rowR[x] = real[offset + x]; rowI[x] = imag[offset + x]; }
    aoFft1d(rowR, rowI);
    for (let x = 0; x < n; x += 1) { real[offset + x] = rowR[x]; imag[offset + x] = rowI[x]; }
  }
  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) { rowR[y] = real[y * n + x]; rowI[y] = imag[y * n + x]; }
    aoFft1d(rowR, rowI);
    for (let y = 0; y < n; y += 1) { real[y * n + x] = rowR[y]; imag[y * n + x] = rowI[y]; }
  }
}

function aoPhasePsf(scale, coeff, n = PSF_GRID) {
  const real = new Float64Array(n * n);
  const imag = new Float64Array(n * n);
  let pupilSamples = 0;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const px = (2 * (x + 0.5)) / n - 1;
      const py = (2 * (y + 0.5)) / n - 1;
      if (px * px + py * py > 1) continue;
      const phase = 2 * Math.PI * aoWavefront(px, py, coeff) * scale;
      const index = y * n + x;
      real[index] = Math.cos(phase);
      imag[index] = Math.sin(phase);
      pupilSamples += 1;
    }
  }
  aoFft2d(real, imag, n);
  const intensity = new Float64Array(n * n);
  let displayPeak = 0;
  for (let i = 0; i < intensity.length; i += 1) {
    const value = real[i] * real[i] + imag[i] * imag[i];
    intensity[i] = value;
    if (value > displayPeak) displayPeak = value;
  }
  return { n, intensity, displayPeak, centralPeakRatio: intensity[0] / Math.max(1, pupilSamples * pupilSamples) };
}

function aoPsfColor(value) {
  const t = Math.max(0, Math.min(1, value));
  return [Math.round(5 + 240 * Math.pow(t, 0.66)), Math.round(10 + 212 * Math.pow(t, 1.35)), Math.round(18 + 235 * Math.pow(t, 2.1))];
}

function aoDrawPsfMap(ctx, psf, x, y, size, label, tint) {
  const image = ctx.createImageData(psf.n, psf.n);
  for (let py = 0; py < psf.n; py += 1) {
    for (let px = 0; px < psf.n; px += 1) {
      const sourceX = (px + psf.n / 2) % psf.n;
      const sourceY = (py + psf.n / 2) % psf.n;
      const value = psf.intensity[sourceY * psf.n + sourceX] / Math.max(psf.displayPeak, 1e-18);
      const mapped = Math.log10(1 + 5e4 * value) / Math.log10(5e4);
      const [r, g, b] = aoPsfColor(mapped);
      const index = 4 * (py * psf.n + px);
      image.data[index] = r; image.data[index + 1] = g; image.data[index + 2] = b; image.data[index + 3] = 255;
    }
  }
  const raw = document.createElement("canvas");
  raw.width = psf.n; raw.height = psf.n;
  raw.getContext("2d").putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(raw, x, y, size, size);
  ctx.strokeStyle = tint; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, size, size);
  ctx.fillStyle = "#dce9ef"; ctx.font = "600 13px system-ui"; ctx.fillText(label, x, y - 12);
  ctx.fillStyle = tint; ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`central peak / ideal = ${psf.centralPeakRatio.toFixed(3)}`, x, y + size + 20);
  ctx.restore();
}

function aoDrawPsf(coeff) {
  const { ctx, width, height } = aoSetup(document.getElementById("psfCanvas"));
  ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, width, height);
  const input = aoPhasePsf(1, coeff);
  const corrected = aoPhasePsf(1 - coeff.gain, coeff);
  const size = Math.min(height - 60, width * 0.36);
  aoDrawPsfMap(ctx, input, width * 0.10, 32, size, "uncorrected phase pupil", "#e77cff");
  aoDrawPsfMap(ctx, corrected, width * 0.55, 32, size, "modal-corrected phase pupil", "#82e6a6");
  ctx.fillStyle = "#a6b3bc"; ctx.font = "12px system-ui";
  ctx.fillText("Fraunhofer PSF from a circular phase pupil P exp(i 2 pi W); logarithmic display. The compact system error budget is not injected into this pupil.", 18, height - 16);
  return { input, corrected };
}

function aoDrawBudget(budget) {
  const { ctx, width, height } = aoSetup(document.getElementById("budgetCanvas"));
  ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, width, height);
  const terms = [["modal", budget.modal, "#82e6a6"], ["fitting", budget.fitting, "#5ed7ff"], ["servo", budget.servo, "#e77cff"], ["WFS noise", budget.wfsNoise, "#f4bf75"], ["RSS total", budget.total, "#ffffff"]];
  const max = Math.max(0.05, ...terms.map((term) => term[1]));
  const barW = (width - 90) / terms.length;
  terms.forEach((term, index) => {
    const x = 48 + index * barW;
    const h = (term[1] / max) * (height - 80);
    ctx.fillStyle = term[2]; ctx.fillRect(x, height - 44 - h, barW * 0.62, h);
    ctx.fillStyle = "#a6b3bc"; ctx.font = "12px system-ui";
    ctx.fillText(term[0], x, height - 20); ctx.fillText(term[1].toFixed(3), x, height - 50 - h);
  });
}

function aoRender() {
  const coeff = aoCoefficients();
  const inputRms = aoDrawWavefront(document.getElementById("inputCanvas"), 1, coeff);
  const modalRms = aoDrawWavefront(document.getElementById("correctedCanvas"), 1 - coeff.gain, coeff);
  const budget = aoErrorBudget(modalRms, coeff);
  const marechal = Math.exp(-((2 * Math.PI * budget.total) ** 2));
  const psf = aoDrawPsf(coeff);
  aoDrawBudget(budget);
  aoOut.defocus.textContent = `${coeff.defocus.toFixed(2)} waves`; aoOut.astig.textContent = `${coeff.astig.toFixed(2)} waves`; aoOut.coma.textContent = `${coeff.coma.toFixed(2)} waves`; aoOut.trefoil.textContent = `${coeff.trefoil.toFixed(2)} waves`; aoOut.gain.textContent = coeff.gain.toFixed(2); aoOut.actuatorPitch.textContent = `${coeff.actuatorPitch.toFixed(2)} m`; aoOut.friedR0.textContent = `${coeff.friedR0.toFixed(2)} m`; aoOut.loopDelay.textContent = `${coeff.loopDelay.toFixed(1)} ms`; aoOut.coherenceTime.textContent = `${coeff.coherenceTime.toFixed(1)} ms`; aoOut.wfsNoise.textContent = `${coeff.wfsNoise.toFixed(3)} waves`; aoOut.gainReadout.textContent = coeff.gain.toFixed(2);
  aoOut.inputRms.textContent = `${inputRms.toFixed(3)} waves`; aoOut.outputRms.textContent = `${modalRms.toFixed(3)} waves`; aoOut.strehl.textContent = marechal.toFixed(3); aoOut.modalResidual.textContent = `${budget.modal.toFixed(3)} waves`; aoOut.fittingError.textContent = `${budget.fitting.toFixed(3)} waves`; aoOut.servoLag.textContent = `${budget.servo.toFixed(3)} waves`; aoOut.totalResidual.textContent = `${budget.total.toFixed(3)} waves`;
  document.getElementById("psfCanvas").setAttribute("aria-label", `Fourier point spread function. Input central-peak ratio ${psf.input.centralPeakRatio.toFixed(3)}. Corrected modal central-peak ratio ${psf.corrected.centralPeakRatio.toFixed(3)}.`);
}

aoControlIds.forEach((id) => aoControls[id].addEventListener("input", aoRender));
window.addEventListener("resize", aoRender);
aoRender();
