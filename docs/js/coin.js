// Step 3 — Insert. insert-the-coin, ported. The coin is taken straight out of the wallet's
// pocket (the same coin the user just revealed) and its "home" is that pocket: a miss springs it
// back into the wallet. The slot is the panel on the vending machine, framed close by the camera.
(() => {
  const App = window.App;
  const Sound = App.Sound.coin;
  const reduced = App.reduced;

  const app = document.getElementById('app');
  const coin = document.getElementById('coin');
  const face = coin.querySelector('.face');
  const pose = document.getElementById('walletPose');
  const plate = document.getElementById('slotPlate');
  const dipEl = document.getElementById('slotDip');
  const outline = document.getElementById('slotOutline');
  const glint = document.getElementById('slotGlint');
  const lip = document.getElementById('slotLip');
  const wcoins = Array.from(document.querySelectorAll('.wcoin'));

  let geo = { home: { x: 0, y: 0 }, size: 60, slot: { x: 0, y: 0 }, sc: 1, plate: { l: 0, t: 0, r: 0, b: 0 } };
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, k: 180, c: 22, tilt: 0, lift: 1, liftT: 1 };
  let mode = 'idle', grab = { dx: 0, dy: 0 }, inserted = false, active = false;
  let retDir = { x: 0, y: 0 }, prevAlong = 0, bounces = 0;
  let cur = -1;     // which wallet coin is in hand

  function measure() {
    const st = app.getBoundingClientRect();
    geo.size = App.COIN_U * pose.getBoundingClientRect().width / 400;
    coin.style.width = coin.style.height = geo.size + 'px';
    if (cur >= 0) {
      const r = wcoins[cur].querySelector('.coin').getBoundingClientRect();
      geo.home = { x: r.left - st.left + r.width / 2, y: r.top - st.top + r.height / 2 };
    }
    const p = plate.getBoundingClientRect();
    geo.sc = p.width / 80;
    geo.slot = { x: p.left - st.left + p.width / 2, y: p.top - st.top + p.height / 2 };
    geo.plate = { l: p.left - st.left, t: p.top - st.top, r: p.right - st.left, b: p.bottom - st.top };
  }

  function render() {
    const half = geo.size / 2;
    coin.style.transform = `translate(${s.x - half}px, ${s.y - half}px) rotate(${s.tilt}deg) scale(${s.lift})`;
  }

  function overPlate(x, y) {
    const m = geo.size * 0.3, p = geo.plate;
    return x > p.l - m && x < p.r + m && y > p.t - m && y < p.b + m;
  }

  function proximity() {
    if (active) return;
    let p = 0;
    if (mode === 'drag') {
      const d = Math.hypot(s.x - geo.slot.x, s.y - geo.slot.y);
      p = Math.max(0, Math.min(1, 1 - d / (geo.size * 3)));
      if (overPlate(s.x, s.y)) p = 1;
    }
    const v = Math.round(138 - p * 88);
    outline.style.stroke = `rgb(${v},${v},${v})`;
    outline.setAttribute('stroke-width', (1.5 + p * 1.5).toFixed(2));
  }

  // lift a coin out of the pocket: the drawn coin hides, the coin in hand appears in its place
  function takeFromWallet(i) {
    if (mode === 'return') backInPocket();
    cur = i;
    measure();
    wcoins[i].style.visibility = 'hidden';
    Object.assign(s, { x: geo.home.x, y: geo.home.y, tx: geo.home.x, ty: geo.home.y, vx: 0, vy: 0,
      tilt: parseFloat(wcoins[i].dataset.tilt) || 0, lift: 1, liftT: 1 });
    coin.style.visibility = 'visible';
    render();
  }
  function backInPocket() {
    mode = 'idle';
    coin.style.visibility = 'hidden';
    coin.classList.remove('lifted');
    if (cur >= 0) wcoins[cur].style.visibility = '';
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (mode !== 'gone' && mode !== 'idle') {
      const steps = 4, h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const ax = s.k * (s.tx - s.x) - s.c * s.vx;
        const ay = s.k * (s.ty - s.y) - s.c * s.vy;
        s.vx += ax * h; s.vy += ay * h;
        s.x += s.vx * h; s.y += s.vy * h;
      }
      // weight: tilt with horizontal velocity, settle when not dragging
      const tiltT = mode === 'drag' ? Math.max(-9, Math.min(9, s.vx * 0.012)) : (mode === 'insert' ? 0 : s.vx * 0.006);
      s.tilt += (tiltT - s.tilt) * Math.min(1, dt * 14);
      s.lift += (s.liftT - s.lift) * Math.min(1, dt * 30);
      render();

      if (mode === 'return') {
        const dx = s.x - s.tx, dy = s.y - s.ty;
        const along = dx * retDir.x + dy * retDir.y;
        if ((prevAlong < 0) !== (along < 0)) {
          const v = Math.hypot(s.vx, s.vy);
          if (v > 120 && bounces < 3) { Sound.land(Math.min(1, v / 1400)); bounces++; }
        }
        prevAlong = along;
        if (Math.hypot(dx, dy) < 0.5 && Math.hypot(s.vx, s.vy) < 5) backInPocket();
      }

      if (mode === 'insert' && !inserted) {
        const d = Math.hypot(s.tx - s.x, s.ty - s.y), v = Math.hypot(s.vx, s.vy);
        if (d < 4 && v < 220) { s.x = s.tx; s.y = s.ty; s.vx = s.vy = 0; s.tilt = 0; render(); sink(); }
      }
    }
    if (App.step === 3) proximity();
    requestAnimationFrame(tick);
  }

  function onDown(e) {
    if (mode === 'insert' || mode === 'gone') return;
    e.preventDefault();
    coin.setPointerCapture(e.pointerId);
    const st = app.getBoundingClientRect();
    grab.dx = (e.clientX - st.left) - s.x;
    grab.dy = (e.clientY - st.top) - s.y;
    mode = 'drag';
    s.k = reduced ? 900 : 170; s.c = reduced ? 60 : 21;   // heavy follow with slight lag
    s.liftT = 1.05; s.lift = 1.03;                        // immediate pick-up response
    s.ty -= geo.size * 0.03; s.y -= geo.size * 0.02;
    coin.classList.add('lifted');
    Sound.pickup();
  }
  function onMove(e) {
    if (mode !== 'drag') return;
    const st = app.getBoundingClientRect();
    s.tx = (e.clientX - st.left) - grab.dx;
    s.ty = (e.clientY - st.top) - grab.dy;
  }
  function onUp() {
    if (mode !== 'drag') return;
    coin.classList.remove('lifted');
    s.liftT = 1;
    if (overPlate(s.x, s.y)) {
      mode = 'insert';
      s.tx = geo.slot.x; s.ty = geo.slot.y;
      s.k = reduced ? 900 : 760; s.c = reduced ? 60 : 50;   // short, decisive snap
    } else {
      mode = 'return';
      { const dx = geo.home.x - s.x, dy = geo.home.y - s.y, L = Math.hypot(dx, dy) || 1;
        retDir = { x: dx / L, y: dy / L }; prevAlong = -L; bounces = 0; }
      s.tx = geo.home.x; s.ty = geo.home.y;
      s.k = reduced ? 900 : 190; s.c = reduced ? 60 : 13;   // weighted bounce home
    }
  }

  function sink() {
    inserted = true;
    coin.classList.add('flat');
    Sound.snap();
    const edge = (16 * geo.sc) / geo.size * 0.9;
    const dur = reduced ? 160 : 300;
    Sound.drop(dur * 0.55 / 1000);
    const a = face.animate([
      { transform: 'scale(1,1)', filter: 'brightness(1)', opacity: 1, easing: 'cubic-bezier(.5,0,1,.5)' },
      { transform: `scale(${edge},1)`, filter: 'brightness(.85)', opacity: 1, offset: .45, easing: 'cubic-bezier(.7,0,1,.6)' },
      { transform: `scale(${edge * .6},.78) translateY(6%)`, filter: 'brightness(.15)', opacity: 0 }
    ], { duration: dur, fill: 'forwards' });
    a.onfinish = () => { mode = 'gone'; coin.style.visibility = 'hidden'; accept(); };
  }

  function accept() {
    active = true;
    Sound.accept();
    if (!reduced) {
      dipEl.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(4px)', offset: .18, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { transform: 'translateY(0)' }
      ], { duration: 240 });
    }
    glint.animate([{ opacity: 0 }, { opacity: .4, offset: .3 }, { opacity: 0 }], { duration: reduced ? 200 : 520, easing: 'ease-out' });
    outline.style.stroke = '#f4f4f4';
    outline.setAttribute('stroke-width', '2');
    lip.setAttribute('opacity', '1');
    App.emit('accepted');
  }

  function reset() {
    face.getAnimations().forEach(a => a.cancel());
    coin.classList.remove('flat', 'lifted');
    coin.style.visibility = 'hidden';
    inserted = false; active = false; mode = 'idle'; cur = -1;
    lip.setAttribute('opacity', '0.6');
    outline.style.stroke = '#8a8a8a';
    outline.setAttribute('stroke-width', '1.5');
    wcoins.forEach(w => { w.style.visibility = ''; });
  }

  wcoins.forEach((w, i) => {
    w.addEventListener('pointerdown', e => {
      if (App.step !== 3 || mode === 'drag' || mode === 'insert' || mode === 'gone') return;
      takeFromWallet(i);
      onDown(e);
    });
    w.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && App.step === 3 && (mode === 'idle' || mode === 'return')) {
        e.preventDefault();
        if (mode === 'idle' || cur !== i) takeFromWallet(i);
        mode = 'insert'; s.tx = geo.slot.x; s.ty = geo.slot.y; s.k = 140; s.c = 24;
      }
    });
  });
  coin.addEventListener('pointerdown', e => { if (App.step === 3) onDown(e); });
  coin.addEventListener('pointermove', onMove);
  coin.addEventListener('pointerup', onUp);
  coin.addEventListener('pointercancel', onUp);

  App.on('resize', () => {
    measure();
    if (mode === 'return') { s.tx = geo.home.x; s.ty = geo.home.y; s.x = s.tx; s.y = s.ty; s.vx = s.vy = 0; }
    else if (mode === 'insert') { s.tx = geo.slot.x; s.ty = geo.slot.y; if (inserted) { s.x = s.tx; s.y = s.ty; } }
    render();
  });

  App.coin = { measure, reset };
  requestAnimationFrame(t => { last = t; tick(t); });
})();
