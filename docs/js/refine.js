// Refinement panel: three sliders wired to the real behaviour.
//   Wallet opening angle  -> App.wallet.setOpenAngle   (how far the cover opens, live)
//   Machine shake amount  -> App.machine.setShakePx    (sideways slide while shaking)
//   Chip falling speed    -> App.machine.setFallSpeed  (speed of the fall + tray bounce)
// Defaults reproduce the prototype exactly. Interaction triggers are not touched.
(() => {
  const App = window.App;
  const btn = document.getElementById('refineBtn');
  const panel = document.getElementById('refine');
  const open = document.getElementById('rfOpen'), openOut = document.getElementById('rfOpenOut');
  const openNote = document.getElementById('rfOpenNote');
  const shake = document.getElementById('rfShake'), shakeOut = document.getElementById('rfShakeOut');
  const fall = document.getElementById('rfFall'), fallOut = document.getElementById('rfFallOut');
  const reset = document.getElementById('rfReset');
  const toolsBtn = document.getElementById('toolsBtn');
  const toolsPanel = document.getElementById('tools');

  // the shake default is the study's slide measured on this screen
  let shakeCustom = false;
  const shakeDefault = () => Math.max(0, Math.min(30, Math.round(App.machine.defaultShakePx)));

  function showOpen() {
    openOut.textContent = open.value + '°';
    openNote.hidden = +open.value >= 90;
  }
  function showShake() { shakeOut.textContent = shake.value + ' px'; }
  function showFall() { fallOut.textContent = fall.value === '5' ? '5 (default)' : fall.value; }

  open.addEventListener('input', () => { App.wallet.setOpenAngle(+open.value); showOpen(); });
  shake.addEventListener('input', () => { shakeCustom = true; App.machine.setShakePx(+shake.value); showShake(); });
  fall.addEventListener('input', () => { App.machine.setFallSpeed(+fall.value); showFall(); });

  function defaults() {
    open.value = 180; App.wallet.setOpenAngle(180); showOpen();
    shakeCustom = false; shake.value = shakeDefault(); App.machine.setShakePx(null); showShake();
    fall.value = 5; App.machine.setFallSpeed(5); showFall();
  }
  reset.addEventListener('click', defaults);
  // until the shake slider is moved, its reading follows the screen size
  App.on('resize', () => { if (!shakeCustom) { shake.value = shakeDefault(); showShake(); } });

  function setOpen(on) {
    panel.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on && !toolsPanel.hidden) { toolsPanel.hidden = true; toolsBtn.setAttribute('aria-expanded', 'false'); }
  }
  btn.addEventListener('click', () => setOpen(panel.hidden));
  toolsBtn.addEventListener('click', () => { if (!toolsPanel.hidden) setOpen(false); });

  defaults();
})();
