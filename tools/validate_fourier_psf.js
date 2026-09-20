#!/usr/bin/env node
"use strict";

// Independent zero-aberration and small-phase checks for the worker FFT convention.
const { zernikeNoll, marechalStrehl } = require("../assets/js/science-core.js");

function fft(real, imaginary) {
  const length = real.length;
  let reversed = 0;
  for (let index = 1; index < length; index += 1) {
    let bit = length >> 1;
    while (reversed & bit) { reversed ^= bit; bit >>= 1; }
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

function fft2d(real, imaginary, size) {
  const lineReal = new Float64Array(size);
  const lineImaginary = new Float64Array(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      lineReal[x] = real[y * size + x]; lineImaginary[x] = imaginary[y * size + x];
    }
    fft(lineReal, lineImaginary);
    for (let x = 0; x < size; x += 1) {
      real[y * size + x] = lineReal[x]; imaginary[y * size + x] = lineImaginary[x];
    }
  }
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      lineReal[y] = real[y * size + x]; lineImaginary[y] = imaginary[y * size + x];
    }
    fft(lineReal, lineImaginary);
    for (let y = 0; y < size; y += 1) {
      real[y * size + x] = lineReal[y]; imaginary[y * size + x] = lineImaginary[y];
    }
  }
}

function directPeak(coefficientWaves, size = 128) {
  const real = new Float64Array(size * size);
  const imaginary = new Float64Array(size * size);
  let apertureCount = 0;
  for (let y = 0; y < size; y += 1) {
    const cy = 2 * (y + 0.5) / size - 1;
    for (let x = 0; x < size; x += 1) {
      const cx = 2 * (x + 0.5) / size - 1;
      const rho = Math.hypot(cx, cy);
      if (rho > 1) continue;
      const phase = 2 * Math.PI * coefficientWaves * zernikeNoll(4, rho, Math.atan2(cy, cx));
      const index = y * size + x;
      real[index] = Math.cos(phase); imaginary[index] = Math.sin(phase); apertureCount += 1;
    }
  }
  fft2d(real, imaginary, size);
  return (real[0] * real[0] + imaginary[0] * imaginary[0]) / (apertureCount * apertureCount);
}

const flat = directPeak(0);
const small = directPeak(0.03);
const larger = directPeak(0.15);
if (Math.abs(flat - 1) > 1e-12) throw new Error(`flat-pupil peak ${flat}`);
if (!(flat > small && small > larger)) throw new Error("direct peak must decrease with defocus");
if (Math.abs(small - marechalStrehl(0.03)) > 0.005) {
  throw new Error("small-phase direct peak and Marechal approximation diverge unexpectedly");
}
console.log(`PASS worker FFT convention: flat=${flat.toFixed(12)}, 0.03-wave=${small.toFixed(6)}, 0.15-wave=${larger.toFixed(6)}`);
