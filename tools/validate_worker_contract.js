#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const worker = fs.readFileSync(path.join(root, "assets/js/physicsWorker.js"), "utf8");
const core = fs.readFileSync(path.join(root, "assets/js/science-core.js"), "utf8");

function requireText(label, source, text) {
  if (!source.includes(text)) throw new Error(`${label}: missing ${text}`);
}

requireText("worker/core linkage", worker, 'importScripts("science-core.js")');
requireText("payload gate", worker, "validateTelemetryPayload(payload)");
requireText("deployed Marechal", worker, "marechalStrehl(residualRms)");
requireText("deployed PID", worker, "pidIncrement({");
for (const duplicate of ["function zernikeNoll(", "function coefficientRms(", "function gaussian("]) {
  if (worker.includes(duplicate)) throw new Error(`worker duplicates tested core: ${duplicate}`);
}
for (const implementation of ["function zernikeNoll(", "function pidIncrement(", "function validateTelemetryPayload("]) {
  requireText("tested core implementation", core, implementation);
}

console.log("PASS worker uses the tested science core without divergent implementations");
