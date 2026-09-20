// Static contract for the deployed observation-first browser document.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function count(pattern) {
  const matches = index.match(pattern);
  return matches ? matches.length : 0;
}

function expectExactly(label, pattern, expected) {
  const actual = count(pattern);
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

function expectIncludes(label, text) {
  if (!index.includes(text)) throw new Error(`Missing HTML contract text: ${label}`);
}

expectExactly('doctype', /<!doctype html>/gi, 1);
expectExactly('html start tag', /<html\b/gi, 1);
expectExactly('head start tag', /<head\b/gi, 1);
expectExactly('body start tag', /<body\b/gi, 1);
expectExactly('main start tag', /<main\b/gi, 1);
for (const id of ['incoming', 'mirror', 'residual', 'psf', 'history', 'research-evidence']) {
  expectExactly(`${id} surface`, new RegExp(`id="${id}"`, 'g'), 1);
}
expectIncludes('released data default', 'SIMULATION MODE');
expectIncludes('effective sample rate', '9.999 Hz effective sample rate');
expectIncludes('temporal inference boundary', 'not a temporal-spectrum or closed-loop bandwidth product');
expectIncludes('failed temporal gate', '<strong>Temporal gate: FAIL.</strong>');
expectIncludes('machine-readable evidence', 'research/generated/telemetry-decimation-audit.json');
expectIncludes('maturity graph', 'assets/research-maturity-before-after.svg');

console.log('PASS observation-first HTML, evidence, and inference-boundary contract');
