// The sequencer: one linear path, Pick up → Open → Insert → Shake. Only the current step
// accepts input; each step's completion point unlocks the next. Transitions (rise into hand,
// camera pan + push-in, pull-back) play between steps while input is closed.
(() => {
  const App = window.App;
  const W = App.world;

  const app = document.getElementById('app');
  const items = Array.from(document.querySelectorAll('#progress li'));
  const live = document.getElementById('live');
  const again = document.getElementById('again');
  const soundBtn = document.getElementById('sound');
  const tiltEl = document.getElementById('walletTilt');
  const machine = document.getElementById('machine');
  const wcoins = Array.from(document.querySelectorAll('.wcoin'));

  const TEXT = {
    1: { live: 'Step 1 of 4, pick up. Drag the glowing near edge of the wallet upward to lift it off the ground.',
         label: 'Wallet lying on the ground. Drag its glowing near edge upward to pick it up, or press Enter.' },
    2: { live: 'Step 2 of 4, open. Drag the glowing edge of the wallet to the left to open it.',
         label: 'Closed wallet in hand. Drag its glowing edge to the left to open it, or press Enter.' },
    3: { live: 'Step 3 of 4, insert. Drag a coin from the wallet into the coin slot.' },
    4: { live: 'Step 4 of 4, shake. The chips are stuck. Hold the vending machine and rock it left and right until they fall.' },
    5: { live: 'The chips dropped into the tray. Press Again to start over.' }
  };

  App.kbd = false;
  document.addEventListener('pointerdown', () => { App.kbd = false; App.Sound.unlock(); }, true);
  document.addEventListener('keydown', e => {
    App.kbd = true;
    if (e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) App.Sound.unlock();
  }, true);

  // n = the step shown as current; busy = a transition is playing and input is closed
  function setStep(n, busy = false) {
    App.step = busy ? 0 : n;
    for (let i = 1; i <= 5; i++) app.classList.toggle('step-' + i, !busy && i === n);
    app.classList.toggle('busy', busy);
    items.forEach((li, i) => {
      const k = i + 1;
      li.dataset.state = k < n ? 'done' : (k === n ? 'current' : 'todo');
      if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });

    // only the current step's control is in the tab order
    tiltEl.tabIndex = (!busy && (n === 1 || n === 2)) ? 0 : -1;
    if (TEXT[n] && TEXT[n].label) tiltEl.setAttribute('aria-label', TEXT[n].label);
    wcoins.forEach(w => {
      if (!busy && n === 3) { w.setAttribute('tabindex', '0'); w.setAttribute('role', 'button'); }
      else { w.removeAttribute('tabindex'); w.removeAttribute('role'); }
    });
    machine.tabIndex = (!busy && n === 4) ? 0 : -1;
    again.tabIndex = (!busy && n === 5) ? 0 : -1;
    again.classList.toggle('show', !busy && n === 5);

    if (busy) return;
    if (TEXT[n]) live.textContent = TEXT[n].live;
    if (App.kbd) {
      const el = n <= 2 ? tiltEl : n === 3 ? wcoins.find(w => w.style.visibility !== 'hidden') : n === 4 ? machine : again;
      if (el) el.focus({ preventScroll: true });
    }
  }

  // 1 → 2: the wallet rises off the ground into the hand
  App.on('picked', async () => {
    setStep(2, true);
    await W.poseTo('hand', 700, App.ease.outBack);
    setStep(2);
  });

  // 2 → 3: coins settle, then the camera pans to the vending machine and pushes in on the coin slot
  App.on('opened', async () => {
    setStep(3, true);
    await App.delay(900);
    App.wallet.fadeShadow();
    const held = W.poseTo('insert', 2500);
    await W.camTo('machine', 1400);
    await App.delay(200);
    await W.camTo('slot', 1000);
    await held;
    App.coin.measure();
    App.wallet.settleCoins();          // a small hop: "these can be taken"
    setStep(3);
  });

  // 3 → 4: the machine accepts the coin; the camera pulls back and the wallet goes to the side
  App.on('accepted', async () => {
    setStep(4, true);
    await App.delay(700);
    await Promise.all([W.camTo('machine', 1200), W.poseTo('pocket', 1200)]);
    setStep(4);
  });

  // 4 → end: the bag has settled in the tray
  App.on('shaken', async () => {
    setStep(5, true);
    await App.delay(800);
    setStep(5);
  });

  // Again: back to the wallet on the ground with all three coins
  again.addEventListener('click', async () => {
    if (App.step !== 5) return;
    setStep(5, true);
    app.classList.add('fade');
    await App.delay(380);
    App.wallet.reset();
    App.coin.reset();
    App.machine.reset();
    W.snapTo('wallet', 'ground');
    setStep(1);
    app.classList.remove('fade');
  });

  soundBtn.addEventListener('click', () => {
    const off = soundBtn.getAttribute('aria-pressed') !== 'true';
    soundBtn.setAttribute('aria-pressed', String(off));
    soundBtn.setAttribute('aria-label', off ? 'Unmute sound' : 'Mute sound');
    App.Sound.setMuted(off);
  });

  setStep(1);
})();
