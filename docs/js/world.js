// Camera, layout and the shared event bus.
// The world (ground + vending machine) is one SVG; the camera is its viewBox.
// The wallet is held in screen space (it is "in hand"), so it has its own poses.
(() => {
  const App = window.App = window.App || {};
  App.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  App.step = 0;

  const handlers = {};
  App.on = (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); };
  App.emit = (name, ...args) => { (handlers[name] || []).forEach(fn => fn(...args)); };
  App.delay = ms => new Promise(r => setTimeout(r, App.reduced ? Math.min(ms, 150) : ms));

  const ease = App.ease = {
    inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    outBack: t => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };

  const app = document.getElementById('app');
  const world = document.getElementById('world');
  const pose = document.getElementById('walletPose');

  // Diameter of a pocket coin, in wallet viewBox units (r 62 at ~0.44 scale)
  App.COIN_U = 2 * 62 * 0.44;

  let vw = 1, vh = 1, L = null;
  const cam = { s: 1, cx: 0, cy: 0 };
  const P = { tx: 0, ty: 0, sc: 1 };
  App.camName = 'wallet';
  App.poseName = 'ground';
  let gen = 0;

  // Line weights: when the camera pushes in on the coin slot, the machine's outlines keep the
  // weight they have in the full view instead of ballooning (the slot panel keeps its own art).
  const strokeEls = [];
  document.querySelectorAll('#machine [stroke-width], #bagArt [stroke-width]').forEach(el => {
    if (el.closest('#slotPanel')) return;
    strokeEls.push([el, parseFloat(el.getAttribute('stroke-width'))]);
  });
  let lastF = -1;

  function layout() {
    vw = app.clientWidth || innerWidth; vh = app.clientHeight || innerHeight;
    const W0 = Math.max(240, Math.min(vw, vh * 1.15, 780));     // wallet stage width (400 viewBox units)
    const k = W0 / 400;
    pose.style.width = W0 + 'px';
    pose.style.height = (W0 * 0.65) + 'px';
    pose.style.perspective = (W0 * 2.2) + 'px';

    const sM = Math.min(vw / 600, vh / 630);                     // full vending machine in view
    const land = vw >= vh * 1.05;
    let kB, bx, by, px, py;
    if (land) { kB = Math.min(0.5 * vw / 288, 0.62 * vh / 160, 1.5); bx = vw * 0.3; by = vh * 0.56; px = vw * 0.72; py = vh * 0.5; }
    else      { kB = Math.min(0.9 * vw / 288, 0.3 * vh / 160, 1.5);  bx = vw * 0.5; by = vh * 0.74; px = vw * 0.5;  py = vh * 0.34; }
    // insert-the-coin proportions: the coin is 0.41 of the slot panel's width
    const D = App.COIN_U * kB;
    const panel = D / 0.41;
    const sSlot = (panel * 240 / 248) / 39;                       // slot panel is 39 machine units wide
    const kC = Math.min(0.3 * vw, 0.36 * vh * 288 / 160, 300) / 288;

    L = {
      W0, k,
      cams: {
        wallet:  { s: sM,    px: -700,  py: 566, sx: vw / 2, sy: vh * 0.22 },
        machine: { s: sM,    px: 200,   py: 300, sx: vw / 2, sy: vh / 2 + Math.min(24, vh * 0.03) },
        slot:    { s: sSlot, px: 302.5, py: 193, sx: px,     sy: py }
      },
      poses: {
        ground: { u: 274, v: 131, x: vw / 2, y: vh * 0.6,  sc: 0.86 },
        hand:   { u: 239, v: 131, x: vw / 2, y: vh * 0.54, sc: 1 },
        insert: { u: 204, v: 131, x: bx,     y: by,        sc: kB / k },
        pocket: { u: 60,  v: 214, x: 16 + 6 * kC, y: vh - 16, sc: kC / k }
      }
    };
    App.L = L;
  }

  function camFrom(f) { return { s: f.s, cx: f.px - (f.sx - vw / 2) / f.s, cy: f.py - (f.sy - vh / 2) / f.s }; }
  function poseTL(p) { return { tx: p.x - p.u * L.k * p.sc, ty: p.y - p.v * L.k * p.sc, sc: p.sc }; }

  function applyCam() {
    const w = vw / cam.s, h = vh / cam.s;
    world.setAttribute('viewBox', `${(cam.cx - w / 2).toFixed(3)} ${(cam.cy - h / 2).toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`);
    const f = Math.min(1, L.cams.machine.s / cam.s);
    if (Math.abs(f - lastF) > 0.002) {
      lastF = f;
      for (const [el, w0] of strokeEls) el.style.strokeWidth = f === 1 ? '' : (w0 * f).toFixed(3) + 'px';
    }
  }
  function applyPose() {
    pose.style.transform = `translate(${P.tx.toFixed(2)}px, ${P.ty.toFixed(2)}px) scale(${P.sc.toFixed(4)})`;
  }

  function tween(dur, fn, ez) {
    const g = gen;
    return new Promise(res => {
      if (App.reduced || dur <= 0) { fn(1); res(); return; }
      const t0 = performance.now();
      const f = now => {
        if (g !== gen) { res(); return; }
        const t = Math.min(1, (now - t0) / dur);
        fn(ez(t));
        if (t < 1) requestAnimationFrame(f); else res();
      };
      f(t0);
    });
  }

  // Zoom is log-linear and the framing's focus point travels in a straight line on screen.
  function camTo(name, dur, ez = ease.inOut) {
    App.camName = name;
    const to = L.cams[name];
    const s0 = cam.s, s1 = to.s;
    const sx0 = (to.px - cam.cx) * s0 + vw / 2, sy0 = (to.py - cam.cy) * s0 + vh / 2;
    return tween(dur, e => {
      const s = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * e);
      const sx = sx0 + (to.sx - sx0) * e, sy = sy0 + (to.sy - sy0) * e;
      cam.s = s; cam.cx = to.px - (sx - vw / 2) / s; cam.cy = to.py - (sy - vh / 2) / s;
      applyCam();
    }, ez);
  }

  function poseTo(name, dur, ez = ease.inOut) {
    App.poseName = name;
    const a = { ...P }, b = poseTL(L.poses[name]);
    return tween(dur, e => {
      P.tx = a.tx + (b.tx - a.tx) * e;
      P.ty = a.ty + (b.ty - a.ty) * e;
      P.sc = Math.exp(Math.log(a.sc) + (Math.log(b.sc) - Math.log(a.sc)) * e);
      applyPose();
    }, ez);
  }

  function snapTo(camName, poseName) {
    gen++;
    if (camName) App.camName = camName;
    if (poseName) App.poseName = poseName;
    Object.assign(cam, camFrom(L.cams[App.camName])); applyCam();
    Object.assign(P, poseTL(L.poses[App.poseName])); applyPose();
  }

  App.world = { camTo, poseTo, snapTo };

  layout();
  snapTo();

  addEventListener('resize', () => {
    layout();
    snapTo();
    App.emit('resize');
  });
})();
