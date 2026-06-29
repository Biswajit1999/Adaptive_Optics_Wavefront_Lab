(() => {
  const canvas = document.getElementById('aoHeroCanvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  let state = { inputRms: 0.35, modalRms: 0.12, gain: 0.7, directPeak: 0.7, obscuration: 0.28 };
  let paused = reduceMotion;
  const pauseButton = document.getElementById('pauseHeroButton');

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  }

  function draw(now) {
    const { width, height } = resize();
    const time = paused ? 0 : now * 0.001;
    const cx = width * 0.63;
    const cy = height * 0.50;
    const radius = Math.min(width, height) * 0.34;
    context.clearRect(0, 0, width, height);
    const background = context.createRadialGradient(cx, cy, 12, cx, cy, radius * 1.6);
    background.addColorStop(0, 'rgba(46, 220, 255, 0.16)');
    background.addColorStop(0.45, 'rgba(62, 114, 255, 0.10)');
    background.addColorStop(1, 'rgba(4, 8, 24, 0)');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(cx, cy);
    context.rotate(-0.12 + Math.sin(time * 0.25) * 0.06);
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.clip();
    const rings = 18;
    for (let ring = rings; ring >= 1; ring -= 1) {
      const fraction = ring / rings;
      const phase = 0.5 + 0.5 * Math.sin(fraction * 18 + time * (0.8 + state.gain) + state.inputRms * 8);
      context.strokeStyle = `rgba(${Math.round(44 + 55 * phase)}, ${Math.round(120 + 125 * phase)}, 255, ${0.14 + 0.24 * phase})`;
      context.lineWidth = 1.4 + phase * 1.6;
      context.beginPath();
      context.arc(0, 0, radius * fraction, 0, Math.PI * 2);
      context.stroke();
    }
    context.rotate(time * 0.12);
    context.strokeStyle = `rgba(89, 242, 193, ${0.20 + 0.35 * state.gain})`;
    context.lineWidth = 1.2;
    for (let i = 0; i < 4; i += 1) {
      context.save();
      context.rotate((Math.PI / 2) * i);
      context.beginPath();
      context.moveTo(radius * state.obscuration * 0.7, 0);
      context.lineTo(radius, 0);
      context.stroke();
      context.restore();
    }
    const obstruction = radius * Math.max(0.1, state.obscuration * 0.72);
    const core = context.createRadialGradient(0, 0, 2, 0, 0, obstruction * 1.3);
    core.addColorStop(0, 'rgba(2, 5, 18, 1)');
    core.addColorStop(0.7, 'rgba(4, 10, 28, 0.96)');
    core.addColorStop(1, 'rgba(8, 25, 58, 0)');
    context.fillStyle = core;
    context.beginPath();
    context.arc(0, 0, obstruction * 1.3, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.fillStyle = 'rgba(226, 246, 255, 0.92)';
    context.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText('PUPIL / VISUAL CONTEXT', 24, 30);
    context.fillStyle = 'rgba(148, 177, 204, 0.9)';
    context.font = '12px system-ui, sans-serif';
    context.fillText('Control-linked illustration — not an atmospheric phase-screen simulation.', 24, 52);
    requestAnimationFrame(draw);
  }

  window.addEventListener('ao:state', (event) => {
    state = { ...state, ...event.detail };
    const input = document.getElementById('heroInputRms');
    const residual = document.getElementById('heroResidualRms');
    const directPeak = document.getElementById('heroDirectPeak');
    if (input) input.textContent = `${state.inputRms.toFixed(3)} waves`;
    if (residual) residual.textContent = `${state.modalRms.toFixed(3)} waves`;
    if (directPeak) directPeak.textContent = state.directPeak.toFixed(3);
  });

  pauseButton?.addEventListener('click', () => {
    paused = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused ? 'Resume visual layer' : 'Pause visual layer';
  });
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
})();
