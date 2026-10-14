// Shared Web Audio engine. One context and one mute, with each study's synthesis ported
// unchanged onto its own bus (gains match the original studies' master levels).
(() => {
  const App = window.App = window.App || {};

  let ctx = null, out = null, muted = false;
  let wBus = null, cBus = null, mBus = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (_) { ctx = null; return null; }
      out = ctx.createGain(); out.gain.value = muted ? 0 : 1; out.connect(ctx.destination);
      wBus = ctx.createGain(); wBus.gain.value = 1; wBus.connect(out);                 // open-the-wallet (direct)
      const comp = ctx.createDynamicsCompressor();
      cBus = ctx.createGain(); cBus.gain.value = 0.6; cBus.connect(comp); comp.connect(out); // insert-the-coin
      mBus = ctx.createGain(); mBus.gain.value = 0.8; mBus.connect(out);               // shake-the-vending-machine
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const ready = () => ctx && !muted;

  // ---------- open-the-wallet: leather crinkle ticks ----------
  let wNoise = null;
  const wallet = {
    crinkle(strength) {
      if (!ready()) return;
      try {
        if (!wNoise) {
          wNoise = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
          const d = wNoise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        const t = ctx.currentTime;
        const src = ctx.createBufferSource(); src.buffer = wNoise;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.value = 2200 + Math.random() * 4500; bp.Q.value = 1.4 + Math.random() * 2;
        const g = ctx.createGain();
        const dur = 0.012 + Math.random() * 0.03;
        const peak = Math.min(0.11, 0.025 + strength * 0.08);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        src.connect(bp).connect(g).connect(wBus);
        src.start(t, Math.random() * 0.03, dur + 0.01);
      } catch (_) {}
    },
    // new for "pick up": the wallet drops back onto the ground — soft low thump + leather crinkle
    drop(v) {
      if (!ready()) return;
      try {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.35 * v), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g).connect(wBus); o.start(t); o.stop(t + 0.16);
        wallet.crinkle(0.5 * v);
      } catch (_) {}
    }
  };

  // ---------- insert-the-coin ----------
  const coin = (() => {
    let noiseBuf = null;
    function noise() {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; return n;
    }
    function env(g, t, peak, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    }
    // metal: inharmonic partials of a struck disc
    function ring(t, base, vol, decay, dest) {
      [1, 2.76, 5.4, 8.93].forEach((r, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = base * r * (1 + (Math.random() - .5) * 0.01);
        env(g, t, vol / (i + 1.3), decay / (1 + i * 0.6));
        o.connect(g); g.connect(dest || cBus); o.start(t); o.stop(t + decay + 0.05);
      });
    }
    function click(t, vol, freq, dur, dest) {
      const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
      env(g, t, vol, dur);
      n.connect(f); f.connect(g); g.connect(dest || cBus); n.start(t); n.stop(t + dur + 0.02);
    }
    function thump(t, vol, f0, f1, dur, dest) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      env(g, t, vol, dur);
      o.connect(g); g.connect(dest || cBus); o.start(t); o.stop(t + dur + 0.02);
    }
    function muffled(cut) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; f.connect(cBus); return f;
    }
    return {
      pickup() { if (!ready()) return; const t = ctx.currentTime;
        click(t, 0.22, 3200, 0.03); ring(t, 1850, 0.05, 0.12); },
      land(p) { if (!ready()) return; const t = ctx.currentTime;
        thump(t, 0.1 + 0.45 * p, 140, 55, 0.12); click(t, 0.35 * p, 2400, 0.04); ring(t + 0.002, 1650, 0.12 * p, 0.35); },
      snap() { if (!ready()) return; const t = ctx.currentTime;
        click(t, 0.4, 4200, 0.025); ring(t, 2300, 0.15, 0.26); thump(t, 0.18, 320, 180, 0.05); },
      drop(delay) { if (!ready()) return; const m = muffled(2200);
        let t = ctx.currentTime + delay;
        thump(t, 0.65, 130, 42, 0.16, m); click(t, 0.42, 1400, 0.035, m); ring(t, 1500, 0.14, 0.12, m);
        t += 0.045; ring(t, 1700, 0.05, 0.08, m); click(t, 0.12, 1800, 0.02, m); },
      accept() { if (!ready()) return; const t = ctx.currentTime + 0.01;
        thump(t, 0.4, 85, 40, 0.22); click(t, 0.18, 900, 0.05);
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 660;
        g.gain.setValueAtTime(0.0001, t + 0.12); g.gain.exponentialRampToValueAtTime(0.05, t + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        o.connect(g); g.connect(cBus); o.start(t + 0.12); o.stop(t + 0.45); }
    };
  })();

  // ---------- shake-the-vending-machine ----------
  const machine = (() => {
    let noiseBuf = null, lastKnock = 0;
    function buf() {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    }
    function noise(t, dur, o) {
      const src = ctx.createBufferSource(); src.buffer = buf();
      const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.freq, t);
      if (o.freq1) f.frequency.exponentialRampToValueAtTime(o.freq1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + (o.attack || 0.002));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(mBus);
      src.start(t, Math.random() * 0.5, dur + 0.05);
    }
    function tone(t, dur, f0, f1, type, gain) {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(mBus); o.start(t); o.stop(t + dur + 0.05);
    }
    const S = {
      // hand meets heavy metal cabinet
      grab() {
        if (!ready()) return; const t = ctx.currentTime;
        tone(t, .12, 120, 75, 'sine', .3);
        noise(t, .07, { type: 'lowpass', freq: 800, gain: .12 });
      },
      // the raised foot lands back on the floor; cans clink inside
      knock(s) {
        if (!ready()) return; const t = ctx.currentTime;
        if (t - lastKnock < .09) return; lastKnock = t;
        tone(t, .2, 95, 50, 'triangle', .45 * s);
        noise(t, .13, { type: 'lowpass', freq: 450, gain: .3 * s });
        noise(t + .01, .16, { type: 'bandpass', freq: 2200 + Math.random() * 900, q: 14, gain: .09 * s });
        noise(t + .03, .12, { type: 'bandpass', freq: 3400 + Math.random() * 900, q: 16, gain: .05 * s });
      },
      // plastic chip bag crinkle: a cluster of tiny bright bursts
      crinkle(a) {
        if (!ready()) return; const t = ctx.currentTime;
        const n = 2 + Math.round(Math.min(a, 1.4) * 3);
        for (let i = 0; i < n; i++) {
          const dt = Math.random() * 0.06;
          noise(t + dt, .015 + Math.random() * .03,
            { type: 'bandpass', freq: 3000 + Math.random() * 5000, q: 1.5 + Math.random() * 2, gain: (.05 + Math.random() * .08) * Math.min(a, 1.3) });
        }
      },
      // bag breaks free, then slides down past the shelves
      pop() {
        if (!ready()) return; const t = ctx.currentTime;
        S.crinkle(1.3);
        tone(t, .09, 240, 520, 'sine', .14);
        noise(t + .05, .38, { type: 'bandpass', freq: 600, freq1: 2200, q: 1.2, gain: .07, attack: .08 });
      },
      // bag lands in the tray and hits the flap
      thud(v, first) {
        if (!ready()) return; const t = ctx.currentTime;
        tone(t, .22, 110, 46, 'sine', .55 * v);
        noise(t, .15, { type: 'lowpass', freq: 380, gain: .3 * v });
        if (first) noise(t + .02, .14, { type: 'bandpass', freq: 1500, q: 9, gain: .12 * v });
        S.crinkle(.9 * v);
      }
    };
    return S;
  })();

  App.Sound = {
    unlock: ensure,
    get muted() { return muted; },
    setMuted(m) { muted = m; if (out) out.gain.value = m ? 0 : 1; },
    wallet, coin, machine
  };
})();
