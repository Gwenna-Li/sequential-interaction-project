// Step 4 — Shake. shake-the-vending-machine (updated study), ported. The machine lives in the
// world SVG (world units = the study's units), so its physics and tuning are unchanged.
// The study's intro ("coin accepted, item vending") is held until startIntro() is called,
// which the sequencer does as soon as the coin has been accepted.
(() => {
  const App = window.App;
  const Snd = App.Sound.machine;
  const reduced = App.reduced;

  const svg = document.getElementById('world');
  const machine = document.getElementById('machine');
  const bagStuck = document.getElementById('bagStuck');
  const bagTray = document.getElementById('bagTray');
  const body = document.body;

  // Geometry (vending machine coordinates)
  const FOOT_L = { x: 80, y: 566 }, FOOT_R = { x: 320, y: 566 };
  const START = { x: 176, y: 175 };                  // bag standing on its shelf before vending
  const STUCK = { x: 176, y: 250, r: 16 };           // bag caught on the shelf edge
  const BAG_SCALE = 0.25;
  const WINDOW_BOTTOM = 450;
  const TRAY = { x: 175, rest: 503, r: 82 };          // bag lying in the tray
  const NEED = 12;                                    // direction reversals to free the bag
  const REVERSAL = 24;                                // svg units of travel per reversal
  const MAX_TILT = reduced ? 6 : 11;

  let S;
  function initial() {
    return {
      mode: 'intro', locked: true, holding: false, reported: false, introGo: false,
      intro: { t: 0, y: START.y, vy: 0, r: 0, whir: false },
      ang: 0, angV: 0, angPrevV: 0, tx: 0, txV: 0, ty: 0, tyV: 0,
      startX: 0, curX: 0, lastX: 0, speed: 0,
      dir: 0, ext: 0, shakes: 0, lastRev: 0, ready: false, readyT: 0,
      b: { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0 },
      f: { x: 0, y: 0, r: 0, vy: 0, vr: 0 },
      t: { y: 0, vy: 0, r: 0, bounces: 0 },
      key: { active: false, side: 0, timer: null }
    };
  }
  S = initial();

  function svgX(clientX, clientY) {
    const p = svg.createSVGPoint(); p.x = clientX; p.y = clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse()).x;
  }

  // ---------- Input ----------
  function press(x) {
    if (S.locked || App.step !== 4) return;
    S.holding = true; S.startX = S.curX = S.lastX = x;
    S.dir = 0; S.ext = x;
    // contact: a small nudge so the machine reads as movable
    S.angV += (Math.random() < .5 ? -1 : 1) * 22;
    S.tyV += 40;
    S.b.vy -= 18; S.b.vr += (Math.random() - .5) * 40;
    body.classList.add('holding');
    Snd.grab();
  }
  function move(x) {
    if (!S.holding || S.locked) return;
    S.curX = x;
    // count direction reversals
    if (S.dir === 0) {
      if (Math.abs(x - S.ext) > REVERSAL / 2) { S.dir = Math.sign(x - S.ext); S.ext = x; }
    } else if (S.dir === 1) {
      if (x > S.ext) S.ext = x;
      else if (S.ext - x > REVERSAL) { reversal(); S.dir = -1; S.ext = x; }
    } else {
      if (x < S.ext) S.ext = x;
      else if (x - S.ext > REVERSAL) { reversal(); S.dir = 1; S.ext = x; }
    }
  }
  function reversal() {
    // only count real swings: the machine must actually be tilted, and not too fast
    const now = performance.now();
    if (S.ready || (Math.abs(S.ang) < 1.2 && Math.abs(S.angV) < 15) || now - S.lastRev < 90) return;
    S.lastRev = now;
    S.shakes++;
    const p = S.shakes / NEED;
    // the bag hops and twists a little more each time
    S.b.vy -= 45 + 70 * p;
    S.b.vr += (Math.random() - .5) * (60 + 160 * p);
    S.b.vx += (Math.random() - .5) * 40 * p;
    Snd.crinkle(0.5 + p * 0.8);
    if (S.shakes >= NEED) S.ready = true;   // bag lets go on the next swing back through centre
  }
  function release() {
    if (!S.holding) return;
    S.holding = false;
    body.classList.remove('holding');
    if (S.mode === 'stuck' && !S.ready) { S.shakes = 0; S.dir = 0; }   // effort lost, bag settles back
  }
  function release_bag() {
    S.mode = 'falling'; S.locked = true;
    S.f.x = STUCK.x + S.b.x; S.f.y = STUCK.y + S.b.y; S.f.r = STUCK.r + S.b.r;
    S.f.vy = -110; S.f.vr = (Math.random() < .5 ? -1 : 1) * (160 + Math.random() * 120);
    S.holding = false; body.classList.remove('holding'); body.classList.add('done');
    Snd.pop();
  }

  machine.addEventListener('pointerdown', e => {
    if (e.button !== 0 || App.step !== 4) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    press(svgX(e.clientX, e.clientY));
  });
  svg.addEventListener('pointermove', e => { if (S.holding) move(svgX(e.clientX, e.clientY)); });
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('lostpointercapture', release);

  // keyboard: alternate arrow keys to shake
  machine.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (App.step !== 4) return;
    e.preventDefault();
    if (S.locked) return;
    const side = e.key === 'ArrowRight' ? 1 : -1;
    if (!S.holding) { press(0); S.key.active = true; }
    if (S.key.active) { move(side * 60); }
    clearTimeout(S.key.timer);
    S.key.timer = setTimeout(() => { if (S.key.active) { S.key.active = false; release(); } }, 700);
  });
  machine.addEventListener('blur', () => { if (S.key.active) { S.key.active = false; release(); } });

  function reset() {
    clearTimeout(S.key.timer);
    S = initial();
    body.classList.remove('holding', 'done');
    body.classList.add('intro');
    bagStuck.setAttribute('visibility', 'visible');
    bagTray.setAttribute('visibility', 'hidden');
  }

  // ---------- Simulation ----------
  function step(dt) {
    // pointer speed for a bit of unpredictable wobble
    const dx = S.curX - S.lastX; S.lastX = S.curX;
    S.speed = S.speed * 0.8 + Math.abs(dx) / dt * 0.2;

    // machine tilt
    let target = 0, txT = 0, tyT = 0;
    if (S.holding && !S.locked) {
      const d = S.curX - S.startX;
      target = Math.max(-MAX_TILT, Math.min(MAX_TILT, d * 0.2));
      txT = Math.max(-14, Math.min(14, d * 0.07));
      tyT = 2;
      S.angV += (Math.random() - .5) * Math.min(S.speed, 1500) * (reduced ? 0 : 0.035);
    }
    const k = 170, c = reduced ? 22 : 7.5;
    const angA = k * (target - S.ang) - c * S.angV;
    const prevAng = S.ang;
    S.angV += angA * dt; S.ang += S.angV * dt;
    if ((prevAng > 0) !== (S.ang > 0) && Math.abs(S.angV) > 18)
      Snd.knock(Math.min(1, Math.abs(S.angV) / 140));
    S.txV += (220 * (txT - S.tx) - 16 * S.txV) * dt; S.tx += S.txV * dt;
    S.tyV += (400 * (tyT - S.ty) - 18 * S.tyV) * dt; S.ty += S.tyV * dt;
    if (S.ready && S.mode === 'stuck') {
      S.readyT += dt;
      if ((prevAng > 0) !== (S.ang > 0) || S.readyT > 1.2) release_bag();
    }

    if (S.mode === 'intro') {
      // coin already in: the spiral turns, the bag starts to drop... and catches
      const I = S.intro;
      if (S.introGo) {
        I.t += dt;
        if (I.t > 0.6 && !I.whir) { I.whir = true; Snd.whir(1.0); }
        if (I.t < 1.6) {
          if (I.t > 0.6) {
            const k2 = (I.t - 0.6) / 1.0;
            I.y = START.y + k2 * 7 + (Math.random() - .5) * 1.4;
            I.r = k2 * 4 + (Math.random() - .5) * 2 * k2;
          }
        } else {
          I.vy += 1700 * dt; I.y += I.vy * dt;
          I.r += (24 - I.r) * Math.min(1, dt * 7);
          if (I.y >= STUCK.y) {
            S.mode = 'stuck'; S.locked = false; body.classList.remove('intro');
            S.b.x = 0; S.b.y = 0; S.b.r = I.r - STUCK.r;
            S.b.vy = 170; S.b.vr = 140; S.b.vx = (Math.random() - .5) * 40;
            S.angV += 7; S.tyV += 25;
            Snd.snag();
            App.emit('snagged');
          }
        }
      }
    }
    else if (S.mode === 'stuck') {
      const p = S.shakes / NEED;
      const bx0 = p * 3, by0 = p * 15, br0 = p * 10;
      const drive = (0.6 + p) * (reduced ? .4 : 1);
      const b = S.b;
      b.vx += (-300 * (b.x - bx0) - 11 * b.vx - angA * 0.007 * drive * 60) * dt;
      b.vy += (-320 * (b.y - by0) - 12 * b.vy) * dt;
      b.vr += (-280 * (b.r - br0) - 9 * b.vr - angA * 0.01 * drive * 60) * dt;
      // rattle: the bag jitters in its slot whenever the machine is moving
      if (S.holding) {
        const energy = Math.min(1, Math.min(S.speed, 1500) / 900 + Math.abs(S.angV) / 120);
        const amt = energy * (0.6 + p) * (reduced ? .3 : 1);
        b.vr += (Math.random() - .5) * amt * 280;
        b.vx += (Math.random() - .5) * amt * 100;
        b.vy += (Math.random() - .5) * amt * 80;
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      b.x = clamp(b.x, -10, 10); b.y = clamp(b.y, -14, 24); b.r = clamp(b.r, -18, 34);
    }
    else if (S.mode === 'falling') {
      const f = S.f;
      f.vy += 1700 * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.y > WINDOW_BOTTOM + 70) {
        S.mode = 'tray';
        bagStuck.setAttribute('visibility', 'hidden');
        bagTray.setAttribute('visibility', 'visible');
        S.t.y = 455; S.t.vy = 420; S.t.r = 30;
      }
    }
    else if (S.mode === 'tray') {
      const t = S.t;
      t.vy += 1700 * dt; t.y += t.vy * dt;
      t.r += (TRAY.r - t.r) * Math.min(1, dt * 9);
      if (t.y >= TRAY.rest) {
        t.y = TRAY.rest;
        if (t.vy > 60) {
          // thud: the machine wobbles once more as the bag lands
          Snd.thud(Math.min(1, t.vy / 650), t.bounces === 0);
          if (t.bounces === 0) S.angV += (Math.random() < .5 ? -1 : 1) * 26;
          S.tyV += t.vy * 0.12;
          t.vy = -t.vy * 0.33; t.bounces++;
        } else { t.vy = 0; S.mode = 'done'; }
      }
    }
    if (S.mode === 'done' && !S.reported) { S.reported = true; App.emit('shaken'); }
    S.angPrevV = S.angV;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- Render ----------
  function render() {
    const piv = S.ang >= 0 ? FOOT_R : FOOT_L;
    machine.setAttribute('transform',
      `translate(${S.tx.toFixed(2)},${S.ty.toFixed(2)}) rotate(${S.ang.toFixed(3)},${piv.x},${piv.y})`);
    if (S.mode === 'intro') {
      bagStuck.setAttribute('transform',
        `translate(${START.x},${S.intro.y.toFixed(2)}) rotate(${S.intro.r.toFixed(2)}) scale(${BAG_SCALE})`);
    } else if (S.mode === 'stuck') {
      bagStuck.setAttribute('transform',
        `translate(${(STUCK.x + S.b.x).toFixed(2)},${(STUCK.y + S.b.y).toFixed(2)}) rotate(${(STUCK.r + S.b.r).toFixed(2)}) scale(${BAG_SCALE})`);
    } else if (S.mode === 'falling') {
      bagStuck.setAttribute('transform',
        `translate(${S.f.x.toFixed(2)},${S.f.y.toFixed(2)}) rotate(${S.f.r.toFixed(2)}) scale(${BAG_SCALE})`);
    } else {
      bagTray.setAttribute('transform',
        `translate(${TRAY.x},${S.t.y.toFixed(2)}) rotate(${S.t.r.toFixed(2)}) scale(${BAG_SCALE})`);
    }
  }

  let last = performance.now();
  let nextRattle = 0;
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    const n = 3; for (let i = 0; i < n; i++) step(dt / n);
    render();
    // continuous bag rattle while the machine is being shaken
    if (S.holding && S.mode === 'stuck') {
      const e = Math.min(1, Math.min(S.speed, 1500) / 900 + Math.abs(S.angV) / 120);
      if (e > .15 && now > nextRattle) {
        Snd.crinkle(e * (0.35 + 0.6 * S.shakes / NEED));
        nextRattle = now + 70 + Math.random() * 90 - e * 30;
      }
    }
    requestAnimationFrame(frame);
  }
  render();
  requestAnimationFrame(frame);

  body.classList.add('intro');
  App.machine = { reset, startIntro() { S.introGo = true; }, get stuck() { return S.mode !== 'intro'; } };
})();
