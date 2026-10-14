// Steps 1 + 2 — Pick up and Open.
// "Open" is open-the-wallet, ported as-is. "Pick up" had no study; it borrows that study's
// language: a pulsing edge signifier, an edge that stays under the finger (acos mapping),
// a contact lift, crinkle ticks in proportion to travel and the same release thresholds.
(() => {
  const App = window.App;
  const Snd = App.Sound.wallet;
  const reduced = App.reduced;

  const pose = document.getElementById('walletPose');
  const tiltEl = document.getElementById('walletTilt');
  const shadowEl = document.getElementById('wShadow');
  const stage = document.getElementById('wstage');
  const wrap = document.getElementById('coverWrap');
  const cover = document.getElementById('cover');
  const creasesIn = document.getElementById('creasesIn');
  const creasesOut = document.getElementById('creasesOut');
  const shadeIn = document.getElementById('shadeInRect');
  const shadeOut = document.getElementById('shadeOutRect');
  const innerShade = document.getElementById('innerShade');
  const flapShadow = document.getElementById('flapShadow');
  const foldInner = document.getElementById('foldInner');
  const edgeGlow = document.getElementById('edgeGlow');
  const coins = document.getElementById('coins');
  const pickGlow = document.getElementById('pickGlow');
  const pickHit = document.getElementById('pickHit');

  // ---- open (study state) ----
  const REST_CLOSED = 176;   // closed, free edge resting slightly raised
  const HALF = 140;          // hinge-to-edge width in viewBox units

  let phi = REST_CLOSED, vel = 0, target = REST_CLOSED;
  let lift = 0, liftTarget = 0;
  let dragging = false, done = false;
  let grabX = 0, grabEdge = 0, lastP = 0, crinkleAcc = 0;

  // ---- pick up ----
  const TILT_MAX = 56;       // near edge lifted toward the viewer, pivoting on the far edge
  const CLOSED_TOP = 52, CLOSED_H = 158;   // closed wallet's far edge and depth, viewBox units
  let th = 0, thV = 0, thT = 0, thLift = 0, thLiftT = 0;
  let picking = false, picked = false;
  let pGrabY = 0, pGrabEdge = 0, pLastP = 0, pAcc = 0;
  let held = 0, heldT = 0, shade = 1, shadeT = 1;

  const crinkle = s => Snd.crinkle(s);

  // value noise for crinkly irregularity
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1; };

  // build crease paths
  const mk = (g, n) => Array.from({ length: n }, () => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); g.appendChild(p); return p;
  });
  const cIn = mk(creasesIn, 4), cOut = mk(creasesOut, 4);

  // ---- thickness: stacked leather layers (oblique extrusion toward bottom-right) ----
  const TV = { x: 2.5, y: 9 };
  const N = 12;
  const NS = 'http://www.w3.org/2000/svg';
  const sliceFill = t => { const v = Math.round(0x8e - t * 0x30); return `rgb(${v},${v},${v})`; };
  const sliceStroke = i => i === 0 ? ' stroke="#000" stroke-width="2"'
    : (i === Math.floor(N / 2) ? ' stroke="#b4b4b4" stroke-width="1.2" stroke-dasharray="4 3"' : '');
  const RIGHT_SIL = 'M200 60 L336 52 A10 10 0 0 1 346 62 L348 196 A10 10 0 0 1 338 206 L200 210 Z';
  const BACK_SIL = 'M200 60 H330 A10 10 0 0 1 340 70 V200 A10 10 0 0 1 330 210 H200 Z';
  const LEFT_SIL = 'M70 60 H200 V210 H70 A10 10 0 0 1 60 200 V70 A10 10 0 0 1 70 60 Z';

  const baseSvg = document.getElementById('base');
  const baseLayers = document.createElementNS(NS, 'g');
  let bl = '';
  for (let i = 0; i < N; i++) {
    const t = 1 - i / (N - 1);
    const f = sliceFill(t), s = sliceStroke(i);
    bl += `<g transform="translate(${(TV.x * t).toFixed(2)} ${(TV.y * t).toFixed(2)})">` +
          `<path d="${BACK_SIL}" fill="${f}"${s}/><path d="${RIGHT_SIL}" fill="${f}"${s}/></g>`;
  }
  baseLayers.innerHTML = bl;
  baseSvg.insertBefore(baseLayers, baseSvg.querySelector(':scope > rect'));

  const slices = [];
  for (let i = 0; i < N; i++) {
    const t = 1 - i / (N - 1);
    const d = document.createElement('div');
    d.className = 'slice';
    d.innerHTML = `<svg viewBox="0 0 400 260" aria-hidden="true"><path d="${LEFT_SIL}" fill="${sliceFill(t)}"${sliceStroke(i)}/></svg>`;
    wrap.insertBefore(d, cover);
    slices.push({ el: d, t });
  }

  function sizePerspective() { wrap.style.perspective = (stage.clientWidth * 2.2) + 'px'; }
  sizePerspective();
  App.on('resize', sizePerspective);

  const toVB = e => {
    const r = stage.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * 400;
  };
  const edgeX = a => 200 - HALF * Math.cos(a * Math.PI / 180);

  // =================== STEP 1: PICK UP ===================
  // Screen height of the closed wallet's depth (the pose is untilted; the tilt lives on a child).
  const closedH = () => pose.getBoundingClientRect().height * CLOSED_H / 260;

  pickHit.addEventListener('pointerdown', e => {
    if (App.step !== 1 || picked || picking) return;
    e.preventDefault();
    picking = true;
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
    pGrabY = e.clientY;
    pGrabEdge = closedH() * Math.cos(th * Math.PI / 180);
    pLastP = th / TILT_MAX;
    thLiftT = 1;             // on contact: the near edge lifts a little
    thV = 0;
    crinkle(0.6);
  });

  function pickMove(e) {
    // near edge projects to H·cos(θ) below the far edge; keep it under the finger
    const H = closedH();
    const edge = pGrabEdge + (e.clientY - pGrabY);
    const c = Math.max(-1, Math.min(1, edge / H));
    thT = Math.min(TILT_MAX, Math.acos(c) * 180 / Math.PI);
    const p = thT / TILT_MAX;
    const dp = Math.abs(p - pLastP); pLastP = p;
    pAcc += dp;
    while (pAcc > 0.018 + Math.random() * 0.02) { pAcc -= 0.02; crinkle(Math.min(1, dp * 25)); }
    if (p >= 0.96) completePickup();
  }

  function pickRelease() {
    if (!picking) return;
    picking = false;
    stage.classList.remove('dragging');
    thLiftT = 0;
    if (picked) return;
    const p = th / TILT_MAX;
    if (p >= 0.8) completePickup();
    else { thT = 0; crinkle(0.4); }     // let go too early: it falls back onto the ground
  }

  function completePickup() {
    if (picked) return;
    picked = true; picking = false; thLiftT = 0;
    stage.classList.remove('dragging');
    thT = 0;                           // levels out in the hand
    heldT = 1;
    crinkle(0.9); setTimeout(() => crinkle(0.5), 70); setTimeout(() => crinkle(0.3), 160);
    App.emit('picked');
  }

  // =================== STEP 2: OPEN (open-the-wallet) ===================
  stage.addEventListener('pointerdown', e => {
    if (App.step !== 2 || done || !e.target.classList || !e.target.classList.contains('hit')) return;
    e.preventDefault();
    dragging = true;
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
    grabX = toVB(e);
    grabEdge = edgeX(phi);
    liftTarget = 1;
    vel = 0;
    crinkle(0.6);
  });

  function openMove(e) {
    const ex = grabEdge + (toVB(e) - grabX);
    const c = Math.max(-1, Math.min(1, (200 - ex) / HALF));
    const raw = Math.acos(c) * 180 / Math.PI;
    target = Math.min(REST_CLOSED, raw);
    const p = 1 - target / 180;
    const dp = Math.abs(p - lastP); lastP = p;
    crinkleAcc += dp;
    while (crinkleAcc > 0.018 + Math.random() * 0.02) { crinkleAcc -= 0.02; crinkle(Math.min(1, dp * 25)); }
    if (p >= 0.96) complete();
  }

  function release() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('dragging');
    liftTarget = 0;
    if (done) return;
    const p = 1 - phi / 180;
    if (p >= 0.8) complete();
    else if (p < 0.35) { target = REST_CLOSED; crinkle(0.4); }
    else { target = Math.min(REST_CLOSED, phi + 5); }
  }

  function complete() {
    if (done) return;
    done = true; dragging = false; liftTarget = 0;
    stage.classList.remove('dragging');
    stage.classList.add('done');
    target = 0;
    crinkle(0.9); setTimeout(() => crinkle(0.5), 70); setTimeout(() => crinkle(0.3), 160);
    setTimeout(settleCoins, reduced ? 0 : 260);
    App.emit('opened');
  }

  function settleCoins() {
    coins.classList.remove('settle'); void coins.getBBox(); coins.classList.add('settle');
  }

  stage.addEventListener('pointermove', e => {
    if (picking) pickMove(e);
    else if (dragging) openMove(e);
  });
  const up = () => { pickRelease(); release(); };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  // Keyboard: Enter / Space performs the current step
  tiltEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (App.step === 1 && !picked && !picking) {
      e.preventDefault();
      crinkle(0.6);
      thT = TILT_MAX;
      setTimeout(completePickup, reduced ? 0 : 420);
    } else if (App.step === 2 && !done && !dragging) {
      e.preventDefault();
      complete();
    }
  });

  // ---- render loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;

    // --- pick-up tilt ---
    if (picking) {
      th += (thT - th) * Math.min(1, dt * 22);
      thV = 0;
    } else if (reduced) {
      th = thT; thV = 0;
    } else {
      const k = picked ? 90 : 120, c = picked ? 12 : 8;
      thV += (-k * (th - thT) - c * thV) * dt; th += thV * dt;
      if (!picked && th < 0) {
        // the near edge lands back on the ground
        if (thV < -25) Snd.drop(Math.min(1, -thV / 260));
        th = 0; thV = -thV * 0.28;
        if (Math.abs(thV) < 6) thV = 0;
      }
      if (Math.abs(th - thT) < 0.02 && Math.abs(thV) < 0.02) { th = thT; thV = 0; }
    }
    thLift += (thLiftT - thLift) * Math.min(1, dt * 14);
    held += (heldT - held) * Math.min(1, dt * 6);
    shade += (shadeT - shade) * Math.min(1, dt * 3);
    const shownTh = th + thLift * 6;
    tiltEl.style.transform = shownTh > 0.01 ? `rotateX(${shownTh.toFixed(2)}deg)` : '';

    // --- open (study) ---
    if (dragging) {
      phi += (target - phi) * Math.min(1, dt * 22);
      vel = 0;
    } else if (reduced) {
      phi = target; vel = 0;
    } else {
      const k = done ? 90 : 60, c = done ? 11 : 13;
      const acc = -k * (phi - target) - c * vel;
      vel += acc * dt; phi += vel * dt;
      if (Math.abs(phi - target) < 0.02 && Math.abs(vel) < 0.02) { phi = target; vel = 0; }
    }
    lift += (liftTarget - lift) * Math.min(1, dt * 14);

    const p = Math.max(0, Math.min(1, 1 - phi / 180));
    const bend = Math.sin(Math.PI * p);
    const jit = dragging && !reduced ? noise(p * 55) * 1.4 * bend : 0;
    const shown = phi - lift * 9 + jit;
    const ry = dragging ? noise(p * 30 + 7) * 0.6 * bend : 0;

    const k = stage.clientWidth / 400;
    const rise = Math.max(0, Math.min(1, 1 - p));
    const ox = -TV.x * rise * k, oy = -TV.y * rise * k;
    const rot = `rotateY(${shown}deg) rotateX(${ry}deg) translateY(${-lift * 1.5}px)`;
    cover.style.transform = `translate(${ox}px, ${oy}px) ${rot}`;
    for (const s of slices) {
      s.el.style.transform = `translate(${ox + TV.x * s.t * k}px, ${oy + TV.y * s.t * k}px) ${rot}`;
    }

    const s = Math.abs(Math.sin(shown * Math.PI / 180));
    shadeIn.setAttribute('opacity', (s * 0.75).toFixed(3));
    shadeOut.setAttribute('opacity', (s * 0.75 + lift * 0.08).toFixed(3));
    innerShade.setAttribute('opacity', (0.38 * Math.pow(1 - p, 1.4)).toFixed(3));
    flapShadow.setAttribute('opacity', (0.6 + 0.4 * bend).toFixed(3));

    const crease = bend * 0.9 + lift * 0.35;
    for (let i = 0; i < 4; i++) {
      const off = 8 + i * 13 + noise(i * 3.1 + p * 18) * 3 * crease;
      const b = (5 + i * 2.5) * crease * (0.6 + 0.6 * noise(i * 5.7 + p * 26));
      const y1 = 62 + i * 9 + noise(i + p * 9) * 6, y2 = 208 - i * 7;
      const ym = 135 + noise(i * 2 + p * 14) * 25;
      const op = (0.12 + 0.28 * crease) * (1 - i * 0.18);
      cIn[i].setAttribute('d', `M${200 - off} ${y1} Q${200 - off - b} ${ym} ${200 - off + b * 0.3} ${y2}`);
      cOut[i].setAttribute('d', `M${200 + off} ${y1} Q${200 + off + b} ${ym} ${200 + off - b * 0.3} ${y2}`);
      cIn[i].setAttribute('stroke-opacity', op.toFixed(3));
      cOut[i].setAttribute('stroke-opacity', op.toFixed(3));
      cIn[i].setAttribute('stroke-width', (1 + 0.6 * crease).toFixed(2));
      cOut[i].setAttribute('stroke-width', (1 + 0.6 * crease).toFixed(2));
    }
    const fb = 3 * bend + 1.5 * lift;
    foldInner.setAttribute('d', `M204 62 Q${204 + fb} ${110 + noise(p * 20) * 10} 204 135 Q${204 - fb * 0.6} ${165 + noise(p * 23 + 4) * 10} 204 208`);

    // signifiers: each edge glows only while its step is the current one
    edgeGlow.style.display = (p > 0.06 || done || App.step !== 2) ? 'none' : '';
    pickGlow.style.display = (App.step === 1 && !picked && shownTh < 4) ? '' : 'none';

    // ground shadow: tight on the ground, spreads and drifts as the wallet leaves it
    const lifted = Math.sin(Math.min(90, shownTh) * Math.PI / 180);
    const off = (1.5 + lifted * 10 + held * 16) * k;
    shadowEl.style.left = (50 - 35 * p) + '%';
    shadowEl.style.width = (37 + 35 * p) + '%';
    shadowEl.style.transform = `translate(${(off * 0.45).toFixed(2)}px, ${off.toFixed(2)}px)`;
    shadowEl.style.filter = `blur(${(2 + lifted * 5 + held * 12) * k}px)`;
    shadowEl.style.opacity = ((0.3 - held * 0.12 - lifted * 0.06) * shade).toFixed(3);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  App.wallet = {
    settleCoins,
    fadeShadow() { shadeT = 0; },
    reset() {
      done = false; dragging = false; picking = false; picked = false;
      stage.classList.remove('done', 'dragging');
      coins.classList.remove('settle');
      phi = target = REST_CLOSED; vel = 0; lift = liftTarget = 0; lastP = 0; crinkleAcc = 0;
      th = thT = thV = 0; thLift = thLiftT = 0; pAcc = 0;
      held = heldT = 0; shade = shadeT = 1;
    }
  };
})();
