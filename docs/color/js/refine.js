// Refinement panel: three sliders wired to the real behaviour.
//   Wallet opening angle  -> App.wallet.setOpenAngle   (how far the cover opens, live)
//   Machine shake amount  -> App.machine.setShakePx    (sideways slide while shaking)
//   Chip falling speed    -> App.machine.setFallSpeed  (speed of the fall + tray bounce)
//   Side tilt intensity   -> App.machine.setSideIntensity  (left/right tilt + wobble)
//   Forward/back tilt     -> App.machine.setPitchIntensity (up/down drag pitch)
//   Colours (colour version) -> App.colors (machine body, product blocks, wallet)
// Defaults reproduce the prototype exactly. Interaction triggers are not touched.
(() => {
  const App = window.App;
  const btn = document.getElementById('refineBtn');
  const panel = document.getElementById('refine');
  const open = document.getElementById('rfOpen'), openOut = document.getElementById('rfOpenOut');
  const openNote = document.getElementById('rfOpenNote');
  const shake = document.getElementById('rfShake'), shakeOut = document.getElementById('rfShakeOut');
  const fall = document.getElementById('rfFall'), fallOut = document.getElementById('rfFallOut');
  const side = document.getElementById('rfSide'), sideOut = document.getElementById('rfSideOut');
  const pitch = document.getElementById('rfPitch'), pitchOut = document.getElementById('rfPitchOut');
  const reset = document.getElementById('rfReset');
  // colour pickers (colour version only): each shows its swatch and current value
  const colorPickers = [
    { input: 'rfMachineColor', out: 'rfMachineColorOut', key: 'machine', set: 'setMachine' },
    { input: 'rfProductColor', out: 'rfProductColorOut', key: 'products', set: 'setProducts', defaultLabel: 'Mixed' },
    { input: 'rfWalletColor', out: 'rfWalletColorOut', key: 'wallet', set: 'setWallet' }
  ].map(c => ({ ...c, input: document.getElementById(c.input), out: document.getElementById(c.out) }));
  colorPickers.forEach(c => c.input.addEventListener('input', () => {
    App.colors[c.set](c.input.value);
    c.out.textContent = c.input.value.toUpperCase();
  }));
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
  side.addEventListener('input', () => { App.machine.setSideIntensity(+side.value); sideOut.textContent = side.value + '%'; });
  pitch.addEventListener('input', () => { App.machine.setPitchIntensity(+pitch.value); pitchOut.textContent = pitch.value + '%'; });

  function defaults() {
    open.value = 180; App.wallet.setOpenAngle(180); showOpen();
    shakeCustom = false; shake.value = shakeDefault(); App.machine.setShakePx(null); showShake();
    fall.value = 5; App.machine.setFallSpeed(5); showFall();
    side.value = 100; App.machine.setSideIntensity(100); sideOut.textContent = '100%';
    pitch.value = 100; App.machine.setPitchIntensity(100); pitchOut.textContent = '100%';
    App.colors.reset();
    colorPickers.forEach(c => {
      c.input.value = App.colors.defaults[c.key];
      c.out.textContent = c.defaultLabel || c.input.value.toUpperCase();
    });
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
