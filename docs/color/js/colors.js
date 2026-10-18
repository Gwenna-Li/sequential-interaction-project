// Colour controls for the colour version (Refinement panel).
//   Machine body  : every red cabinet part is re-tinted from its original shade, so the
//                   darker shelves / side column / tray keep their relationship to the body.
//   Product blocks: the 15 packages behind the glass become light / base / dark tones of
//                   the chosen colour (the chips bag is separate art and is not touched).
//   Wallet        : every leather surface, including the generated edge layers, is
//                   re-tinted from its original brown; stitching and coins stay as they are.
// reset() restores the exact original colours.
(() => {
  const App = window.App;

  const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const parseColor = c => {
    c = c.trim();
    if (c[0] === '#') return hexToRgb(c.length === 4 ? '#' + [...c.slice(1)].map(x => x + x).join('') : c);
    const m = c.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : null;
  };
  const toHex = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToRgb([h, s, l]) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  // move v (0..1) the way ref -> target moved, staying in range and keeping order
  const shift = (v, ref, target) => target >= ref
    ? v + (1 - v) * (ref >= 1 ? 0 : (target - ref) / (1 - ref))
    : v * (ref <= 0 ? 1 : target / ref);

  // A group of [element, attribute] pairs re-tinted relative to one reference colour.
  function tinter(entries, refHex) {
    const ref = rgbToHsl(hexToRgb(refHex));
    const items = entries.map(([el, attr]) => {
      const orig = el.getAttribute(attr);
      return { el, attr, orig, hsl: rgbToHsl(parseColor(orig)) };
    });
    return {
      ref: refHex,
      apply(hex) {
        const t = rgbToHsl(hexToRgb(hex));
        for (const it of items) {
          const [h, s, l] = it.hsl;
          it.el.setAttribute(it.attr, toHex(hslToRgb([h + (t[0] - ref[0]), shift(s, ref[1], t[1]), shift(l, ref[2], t[2])])));
        }
      },
      reset() { for (const it of items) it.el.setAttribute(it.attr, it.orig); }
    };
  }

  // ---- vending machine body
  const MACHINE_DEFAULT = '#b8483d';
  const machine = tinter([...document.querySelectorAll('#machine .vm-body')].map(el => [el, 'fill']), MACHINE_DEFAULT);

  // ---- product blocks
  const PRODUCT_DEFAULT = '#7f9c88';                 // the sage block; the default palette is mixed
  const products = [...document.querySelectorAll('#machine .vm-product')].map(el => ({ el, orig: el.getAttribute('fill') }));
  const lightOf = { '#7f9c88': 0, '#d9c7a8': 1, '#5f7d9c': -1 };   // base / lighter / darker slots
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function setProducts(hex) {
    const c = hexToRgb(hex);
    const tone = { 0: c, 1: mix(c, [255, 255, 255], .45), '-1': mix(c, [0, 0, 0], .28) };
    for (const p of products) p.el.setAttribute('fill', toHex(tone[lightOf[p.orig.toLowerCase()] ?? 0]));
  }
  function resetProducts() { for (const p of products) p.el.setAttribute('fill', p.orig); }

  // ---- wallet leather (art + the edge layers wallet.js generated at load)
  const WALLET_DEFAULT = '#8a522d';                  // outside of the cover
  const LEATHER = ['#6e3f22', '#4f2b16', '#b97a4b', '#a5653b', '#965834', '#5a3119', '#ad6c40',
                   '#9d5d35', '#8f532f', '#834a29', '#8a522d', '#b47a4c'];
  const walletEntries = [];
  document.querySelectorAll('#wstage [fill], #wstage [stroke]').forEach(el => {
    for (const attr of ['fill', 'stroke']) {
      const v = (el.getAttribute(attr) || '').toLowerCase();
      if (LEATHER.includes(v)) walletEntries.push([el, attr]);
    }
  });
  // generated thickness layers: base layers and cover slices (fills are rgb(...))
  document.querySelectorAll('#base > g:not(#coins) path, #coverWrap .slice path').forEach(el => walletEntries.push([el, 'fill']));
  const wallet = tinter(walletEntries, WALLET_DEFAULT);

  App.colors = {
    defaults: { machine: MACHINE_DEFAULT, products: PRODUCT_DEFAULT, wallet: WALLET_DEFAULT },
    setMachine: hex => machine.apply(hex),
    setProducts,
    setWallet: hex => wallet.apply(hex),
    reset() { machine.reset(); resetProducts(); wallet.reset(); }
  };
})();
