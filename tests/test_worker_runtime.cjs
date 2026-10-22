"use strict";
// Exercise the deployed worker, not a duplicate FFT or controller implementation.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const payload = JSON.parse(fs.readFileSync(path.join(root, "data/observations/ciao1_aot_telemetry.json")));
let listener, failFetch = true, messages = [];
const context = vm.createContext({
  console, performance, Float64Array, Float32Array, Uint8Array,
  fetch: async () => {
    if (failFetch) return { ok: false, status: 503 };
    return { ok: true, json: async () => payload };
  },
  self: {
    AOScienceCore: require("../assets/js/science-core.js"),
    addEventListener: (name, callback) => { listener = callback; },
    postMessage: message => messages.push(message),
    setInterval: () => 1,
  },
  importScripts: () => {},
});
vm.runInContext(fs.readFileSync(path.join(root, "assets/js/physicsWorker.js"), "utf8"), context);
const run = source => vm.runInContext(source, context);
const close = (a,b,tol=1e-10) => assert.ok(Math.abs(a-b) < tol, a+" != "+b);


async function main() {
  await assert.rejects(run("loadObservation()"), /HTTP 503/);
  failFetch = false;
  const observation = await run("loadObservation()");
  assert.equal(observation.frameCount, 300, "failed fetch must permit retry");
  context.observation = observation;
  run("runtime.observation = observation; runtime.parameters = sanitise({});");
  listener({ data: { type:"seekObservation", frame:299 } });
  assert.equal(messages.at(-1).telemetry.sourceFrameIndex,14950);
  listener({ data: { type:"seekObservation", frame:999 } });
  assert.equal(messages.at(-1).telemetry.frame,299);
  listener({ data: { type:"seekObservation", frame:-8 } });
  assert.equal(messages.at(-1).telemetry.frame,0);

  close(run("computePsf(new Float64Array(GRID_SIZE*GRID_SIZE),basis.mask).normalisedPeak"),1);
  close(run("computePsf(new Float64Array(GRID_SIZE*GRID_SIZE).fill(0.137),basis.mask).normalisedPeak"),1);
  // Independent pupil phasor sum for a small defocus: on-axis peak.
  const sample = run(`(() => {
    const phase = Float64Array.from(basis.values[0], x=>0.03*x);
    return { phase, mask:basis.mask, peak:computePsf(phase,basis.mask).normalisedPeak };
  })()`);
  let re=0, im=0, count=0;
  sample.phase.forEach((w,i)=>{ if(sample.mask[i]) { re+=Math.cos(2*Math.PI*w); im+=Math.sin(2*Math.PI*w); count++; } });
  close(sample.peak,(re*re+im*im)/(count*count));
  close(sample.peak,Math.exp(-((2*Math.PI*0.03)**2)),0.001);

  // Independent direct DFT cross-check of the actual worker 2-D FFT at every 4x4 bin.
  const size=4, input=Array.from({length:16},(_,i)=>Math.sin(i*.71)+i*.03);
  context.fftInput=input;
  const actual=run("(() => {const re=Float64Array.from(fftInput),im=new Float64Array(16);fft2d(re,im,4);return {re,im};})()");
  for(let ky=0;ky<size;ky++) for(let kx=0;kx<size;kx++){
    let re=0,im=0;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++){
      const angle=-2*Math.PI*(kx*x+ky*y)/size;
      re+=input[y*size+x]*Math.cos(angle);im+=input[y*size+x]*Math.sin(angle);
    }
    close(actual.re[ky*size+kx],re);close(actual.im[ky*size+kx],im);
  }

  // A proportional-only accumulating correction can remove static error.
  const residual=run(`(() => {
    runtime.parameters=sanitise({modelOverlay:true,turbulence:0,sensorNoise:0,kp:0.1,ki:0,kd:0,latency:0});
    runtime.mode="model";resetController();
    for(let i=0;i<1000;i++) advanceController();
    return coefficientRms(currentCoefficients().residual);
  })()`);
  assert.ok(residual<1e-10);
  run("runtime.parameters=sanitise({modelOverlay:true,wavelength:1000});resetController();for(let i=0;i<12;i++) advanceController();runtime.running=false;emitModelFrame()");
  const first=messages.at(-1).telemetry;
  listener({data:{type:"setConversionWavelength",wavelengthNm:2000}});
  const second=messages.at(-1).telemetry;
  close(second.timeSeconds,first.timeSeconds);
  close(second.residualOpdNm,2*first.residualOpdNm);
  close(second.psfPeak,first.psfPeak);
  close(second.residualRms,first.residualRms);
  console.log("PASS deployed worker: retry, seek, flat/piston/defocus PSF, independent DFT, static feedback and OPD conversion");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
