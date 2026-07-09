// Run with: node tools/validate_html_contract.js
// Lightweight static contract for the browser document structure.

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
expectExactly('laboratory section', /id="laboratory"/g, 1);
expectExactly('input phase canvas', /id="inputCanvas"/g, 1);
expectExactly('corrected phase canvas', /id="correctedCanvas"/g, 1);
expectExactly('PSF canvas', /id="psfCanvas"/g, 1);
expectExactly('MTF canvas', /id="mtfCanvas"/g, 1);
expectExactly('budget canvas', /id="budgetCanvas"/g, 1);
expectIncludes('central obstruction uses radius wording', 'Central obstruction radius');
expectIncludes('four-vane control uses half-width wording', 'Four-vane half width');
expectIncludes('direct PSF and Marechal separation', 'The displayed peak metric is not the same as the compact Marechal diagnostic.');
expectIncludes('error-budget separation', 'The scalar fitting, servo-lag, and WFS-noise terms are not injected into the displayed pupil or PSF.');

console.log('PASS AO HTML structure and science-label contract');
