// Run with: node tools/validate_fourier_psf.js
// Independent compact check for the same radix-2 FFT convention used by the browser.

function fft1d(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = -2 * Math.PI / length;
    const c = Math.cos(angle); const s = Math.sin(angle);
    for (let start = 0; start < n; start += length) {
      let wr = 1; let wi = 0; const half = length >> 1;
      for (let k = 0; k < half; k += 1) {
        const even = start + k; const odd = even + half;
        const vr = real[odd] * wr - imag[odd] * wi; const vi = real[odd] * wi + imag[odd] * wr;
        const er = real[even]; const ei = imag[even];
        real[even] = er + vr; imag[even] = ei + vi;
        real[odd] = er - vr; imag[odd] = ei - vi;
        const next = wr * c - wi * s; wi = wr * s + wi * c; wr = next;
      }
    }
  }
}

function fft2d(real, imag, n) {
  const rowR = new Float64Array(n); const rowI = new Float64Array(n);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) { rowR[x] = real[y * n + x]; rowI[x] = imag[y * n + x]; }
    fft1d(rowR, rowI);
    for (let x = 0; x < n; x += 1) { real[y * n + x] = rowR[x]; imag[y * n + x] = rowI[x]; }
  }
  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) { rowR[y] = real[y * n + x]; rowI[y] = imag[y * n + x]; }
    fft1d(rowR, rowI);
    for (let y = 0; y < n; y += 1) { real[y * n + x] = rowR[y]; imag[y * n + x] = rowI[y]; }
  }
}

const n = 128;
const real = new Float64Array(n * n);
const imag = new Float64Array(n * n);
let pupilSamples = 0;
for (let y = 0; y < n; y += 1) {
  for (let x = 0; x < n; x += 1) {
    const px = (2 * (x + 0.5)) / n - 1;
    const py = (2 * (y + 0.5)) / n - 1;
    if (px * px + py * py <= 1) { real[y * n + x] = 1; pupilSamples += 1; }
  }
}
fft2d(real, imag, n);
const centralPeakRatio = (real[0] * real[0] + imag[0] * imag[0]) / (pupilSamples * pupilSamples);
if (Math.abs(centralPeakRatio - 1) > 1e-12) throw new Error(`Flat pupil check failed: ${centralPeakRatio}`);
console.log(`PASS flat circular pupil central-peak ratio = ${centralPeakRatio.toFixed(12)}`);
