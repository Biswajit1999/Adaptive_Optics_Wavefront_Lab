// Run with: node tools/validate_fourier_psf.js
// Independent checks for the browser FFT convention and binary pupil geometry.

function fft1d(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = -2 * Math.PI / length;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
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
        real[even] = er + vr;
        imag[even] = ei + vi;
        real[odd] = er - vr;
        imag[odd] = ei - vi;
        const next = wr * c - wi * s;
        wi = wr * s + wi * c;
        wr = next;
      }
    }
  }
}

function fft2d(real, imag, n) {
  const rowR = new Float64Array(n);
  const rowI = new Float64Array(n);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      rowR[x] = real[y * n + x];
      rowI[x] = imag[y * n + x];
    }
    fft1d(rowR, rowI);
    for (let x = 0; x < n; x += 1) {
      real[y * n + x] = rowR[x];
      imag[y * n + x] = rowI[x];
    }
  }
  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) {
      rowR[y] = real[y * n + x];
      rowI[y] = imag[y * n + x];
    }
    fft1d(rowR, rowI);
    for (let y = 0; y < n; y += 1) {
      real[y * n + x] = rowR[y];
      imag[y * n + x] = rowI[y];
    }
  }
}

function pupilOpen(x, y, obscuration, spiderWidth) {
  const radius = Math.hypot(x, y);
  if (radius > 1 || radius < obscuration) return false;
  return spiderWidth <= 0 || (Math.abs(x) >= spiderWidth && Math.abs(y) >= spiderWidth);
}

function directPeakRatio({ obscuration, spiderWidth, phase }) {
  const n = 128;
  const real = new Float64Array(n * n);
  const imag = new Float64Array(n * n);
  let samples = 0;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const px = (2 * (x + 0.5)) / n - 1;
      const py = (2 * (y + 0.5)) / n - 1;
      if (!pupilOpen(px, py, obscuration, spiderWidth)) continue;
      const value = phase(px, py);
      const index = y * n + x;
      real[index] = Math.cos(2 * Math.PI * value);
      imag[index] = Math.sin(2 * Math.PI * value);
      samples += 1;
    }
  }
  fft2d(real, imag, n);
  return { samples, ratio: (real[0] * real[0] + imag[0] * imag[0]) / (samples * samples) };
}

function expectClose(name, actual, expected, tolerance = 1e-12) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${name}: expected ${expected}, received ${actual}`);
}

const clear = directPeakRatio({ obscuration: 0, spiderWidth: 0, phase: () => 0 });
const obstructed = directPeakRatio({ obscuration: 0.28, spiderWidth: 0.015, phase: () => 0 });
const defocused = directPeakRatio({
  obscuration: 0.28,
  spiderWidth: 0.015,
  phase: (x, y) => 0.25 * Math.sqrt(3) * (2 * (x * x + y * y) - 1),
});

expectClose("flat clear pupil", clear.ratio, 1);
expectClose("flat obstructed pupil", obstructed.ratio, 1);
if (!(obstructed.samples < clear.samples && obstructed.samples > 0)) throw new Error("pupil geometry did not reduce transmitted samples");
if (!(defocused.ratio < obstructed.ratio)) throw new Error("defocus did not reduce the direct PSF peak");

console.log(`PASS clear flat-pupil direct peak = ${clear.ratio.toFixed(12)}`);
console.log(`PASS obstructed flat-pupil direct peak = ${obstructed.ratio.toFixed(12)}`);
console.log(`PASS phase perturbation reduces peak: ${defocused.ratio.toFixed(6)} < ${obstructed.ratio.toFixed(6)}`);
