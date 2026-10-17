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

  // Refinement: sideways slide while shaking (screen px; null = the study's 14 units)
  // and chip falling speed (1–10, 5 = the study's speed; scales the fall's time).
  const SLIDE_U = 14;
  let shakePx = null, fallSpeed = 5;
  const slideUnits = () => shakePx === null ? SLIDE_U : shakePx / App.L.cams.machine.s;

  // Push / pull. Side tilt intensity scales the existing left/right tilt and wobble
  // (1 = the study). Vertical drag tilts the machine forward (up) or backward (down);
  // the 2D art fakes that pitch by foreshortening from the feet, a slight width change,
  // face shading and a floor shadow.
  let sideI = 1, pitchI = 1;
  const PITCH_MAX = reduced ? 8 : 14;                 // degrees at 100%
  const PITCH_GAIN = 0.12;                            // degrees per unit of vertical drag
  const pitchShade = document.getElementById('vmPitchShade');
  const pitchStops = document.querySelectorAll('#vmPitchGrad stop');
  const floorShadow = document.getElementById('vmFloorShadow');
  const pitchScale = p => 1 + 0.16 * Math.sin(p * Math.PI / 180);
  // largest side tilt that keeps the cabinet's top corner on screen
  function safeTilt() {
    const half = svg.clientWidth / (2 * App.L.cams.machine.s) - 10;
    const room = half - Math.abs(S.tx);
    const w = 140 * pitchScale(Math.max(0, S.pitch));      // half-width of the cabinet
    for (let a = 30; a > 0; a -= 0.5) {
      const r = a * Math.PI / 180;
      if (120 + (w - 120) * Math.cos(r) + 536 * Math.sin(r) <= room) return a;
    }
    return 0;
  }

  let S;
  function initial() {
    return {
      mode: 'intro', locked: true, holding: false, reported: false, introGo: false,
      intro: { t: 0, y: START.y, vy: 0, r: 0, whir: false },
      ang: 0, angV: 0, angPrevV: 0, tx: 0, txV: 0, ty: 0, tyV: 0,
      pitch: 0, pitchV: 0, safe: MAX_TILT,
      startX: 0, curX: 0, lastX: 0, speed: 0, startY: 0, curY: 0,
      dir: 0, ext: 0, shakes: 0, lastRev: 0, ready: false, readyT: 0,
      b: { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0 },
      f: { x: 0, y: 0, r: 0, vy: 0, vr: 0 },
      t: { y: 0, vy: 0, r: 0, bounces: 0 },
      key: { active: false, side: 0, timer: null }
    };
  }
  S = initial();

  function svgPt(clientX, clientY) {
    const p = svg.createSVGPoint(); p.x = clientX; p.y = clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  // ---------- Input ----------
  function press(x, y = 0) {
    if (S.locked || App.step !== 4) return;
    S.holding = true; S.startX = S.curX = S.lastX = x;
    S.startY = S.curY = y;
    S.dir = 0; S.ext = x;
    // contact: a small nudge so the machine reads as movable
    S.angV += (Math.random() < .5 ? -1 : 1) * 22 * sideI;
    S.tyV += 40;
    S.b.vy -= 18; S.b.vr += (Math.random() - .5) * 40;
    body.classList.add('holding');
    Snd.grab();
  }
  function move(x, y) {
    if (!S.holding || S.locked) return;
    S.curX = x;
    if (y !== undefined) S.curY = y;
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
    if (S.ready || (Math.abs(S.ang) < 1.2 * sideI && Math.abs(S.angV) < 15 * sideI) || now - S.lastRev < 90) return;
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
    const p = svgPt(e.clientX, e.clientY);
    press(p.x, p.y);
  });
  svg.addEventListener('pointermove', e => {
    if (!S.holding) return;
    const p = svgPt(e.clientX, e.clientY);
    move(p.x, p.y);
  });
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('lostpointercapture', release);

  // keyboard: alternate left/right arrows to shake; up/down give a forward/backward push
  machine.addEventListener('keydown', e => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && App.step === 4) {
      e.preventDefault();
      if (!S.locked) S.pitchV += (e.key === 'ArrowUp' ? 1 : -1) * 90 * pitchI;
      return;
    }
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
    let target = 0, txT = 0, tyT = 0, pitchT = 0;
    if (S.holding && !S.locked) {
      const d = S.curX - S.startX;
      const maxT = Math.min(MAX_TILT * sideI, S.safe);
      target = Math.max(-maxT, Math.min(maxT, d * 0.2 * sideI));
      const pm = PITCH_MAX * pitchI;
      pitchT = Math.max(-pm, Math.min(pm, -(S.curY - S.startY) * PITCH_GAIN * pitchI));
      const su = slideUnits();
      txT = Math.max(-su, Math.min(su, d * 0.07 * su / SLIDE_U));
      tyT = 2;
      S.angV += (Math.random() - .5) * Math.min(S.speed, 1500) * (reduced ? 0 : 0.035) * sideI;
    }
    const k = 170, c = reduced ? 22 : 7.5;
    const angA = k * (target - S.ang) - c * S.angV;
    const prevAng = S.ang;
    S.angV += angA * dt; S.ang += S.angV * dt;
    // keep the top on screen even through the spring's overshoot
    if (Math.abs(S.ang) > S.safe) { S.ang = Math.sign(S.ang) * S.safe; S.angV *= -0.3; }
    if ((prevAng > 0) !== (S.ang > 0) && Math.abs(S.angV) > 18)
      Snd.knock(Math.min(1, Math.abs(S.angV) / 140));

    // forward / backward pitch: a looser spring, so it rocks back and settles
    const pc = reduced ? 24 : 8;
    const pitchA = 140 * (pitchT - S.pitch) - pc * S.pitchV;
    const prevPitch = S.pitch;
    S.pitchV += pitchA * dt; S.pitch += S.pitchV * dt;
    const pLim = Math.min(26, PITCH_MAX * 2) * 1.15;
    if (Math.abs(S.pitch) > pLim) { S.pitch = Math.sign(S.pitch) * pLim; S.pitchV *= -0.3; }
    if ((prevPitch > 0) !== (S.pitch > 0) && Math.abs(S.pitchV) > 40)
      Snd.knock(Math.min(0.7, Math.abs(S.pitchV) / 220));
    if (pitchT === 0 && Math.abs(S.pitch) < 0.01 && Math.abs(S.pitchV) < 0.05) { S.pitch = 0; S.pitchV = 0; }
    S.txV += (220 * (txT - S.tx) - 16 * S.txV) * dt; S.tx += S.txV * dt;
    // back exactly to centre once the shake has settled
    if (txT === 0 && Math.abs(S.tx) < 0.01 && Math.abs(S.txV) < 0.05) { S.tx = 0; S.txV = 0; }
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
      b.vy += (-pitchA * 0.004 * drive * 60) * dt;     // rocking front-to-back jostles it too
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
      const f = S.f, fdt = dt * fallSpeed / 5;
      f.vy += 1700 * fdt; f.y += f.vy * fdt; f.r += f.vr * fdt;
      if (f.y > WINDOW_BOTTOM + 70) {
        S.mode = 'tray';
        bagStuck.setAttribute('visibility', 'hidden');
        bagTray.setAttribute('visibility', 'visible');
        S.t.y = 455; S.t.vy = 420; S.t.r = 30;
      }
    }
    else if (S.mode === 'tray') {
      const t = S.t, fdt = dt * fallSpeed / 5;
      t.vy += 1700 * fdt; t.y += t.vy * fdt;
      t.r += (TRAY.r - t.r) * Math.min(1, fdt * 9);
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
    // pitch: foreshorten from the feet (y 566), a touch wider when leaning toward the viewer
    const pr = S.pitch * Math.PI / 180, ps = pitchScale(S.pitch);
    const pitchT = Math.abs(S.pitch) < 0.005 ? ''
      : ` translate(200,566) scale(${ps.toFixed(4)},${(Math.cos(pr) * ps).toFixed(4)}) translate(-200,-566)`;
    machine.setAttribute('transform',
      `translate(${S.tx.toFixed(2)},${S.ty.toFixed(2)}) rotate(${S.ang.toFixed(3)},${piv.x},${piv.y})${pitchT}`);
    // face shading: darker leaning forward (face turns down), lighter leaning back
    const sh = Math.min(0.28, Math.abs(Math.sin(pr)) * 0.9);
    const shadeCol = S.pitch > 0 ? '#000' : '#fff';
    pitchStops.forEach(st => st.setAttribute('stop-color', shadeCol));
    pitchShade.setAttribute('opacity', sh.toFixed(3));
    // floor shadow in front of the feet when the top comes toward the viewer
    const fwd = Math.max(0, Math.sin(pr));
    floorShadow.setAttribute('cx', (200 + S.tx).toFixed(2));
    floorShadow.setAttribute('rx', (150 * ps).toFixed(2));
    floorShadow.setAttribute('ry', (2 + 60 * fwd).toFixed(2));
    floorShadow.setAttribute('opacity', (Math.min(1, fwd * 6) * 0.2).toFixed(3));
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
    S.safe = Math.min(MAX_TILT * 2, safeTilt());
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
  App.machine = {
    reset, startIntro() { S.introGo = true; }, get stuck() { return S.mode !== 'intro'; },
    // the study's slide in screen px on this screen (the default for the shake slider)
    get defaultShakePx() { return SLIDE_U * App.L.cams.machine.s; },
    setShakePx(px) { shakePx = px === null ? null : Math.max(0, Math.min(30, +px)); },
    setFallSpeed(v) { fallSpeed = Math.max(1, Math.min(10, +v)); },
    setSideIntensity(pct) { sideI = Math.max(0.25, Math.min(2, pct / 100)); },
    setPitchIntensity(pct) { pitchI = Math.max(0, Math.min(2, pct / 100)); }
  };
})();
