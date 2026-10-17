// Tool panel: live background colour. Sets the page's --bg token on <html>, so every
// surface that already uses it (page background, progress bar) follows at once.
// Interactions are untouched. The choice is remembered in this browser only.
(() => {
  const root = document.documentElement;
  const btn = document.getElementById('toolsBtn');
  const panel = document.getElementById('tools');
  const input = document.getElementById('bgColor');
  const hex = document.getElementById('bgHex');
  const reset = document.getElementById('bgReset');
  const KEY = 'wallet-to-chips-color:bg';
  const HEX = /^#[0-9a-f]{6}$/i;

  const toHex = c => {
    const m = String(c).match(/\d+(\.\d+)?/g);
    if (!m) return '#f4efe7';
    return '#' + m.slice(0, 3).map(n => Math.round(+n).toString(16).padStart(2, '0')).join('');
  };
  // the theme's own background (light or dark), read once any override is removed
  const themeBg = () => {
    const v = getComputedStyle(root).getPropertyValue('--bg').trim();
    return HEX.test(v) ? v.toLowerCase() : toHex(getComputedStyle(document.body).backgroundColor);
  };

  let custom = null;
  function apply(c) {
    custom = c;
    if (c) root.style.setProperty('--bg', c); else root.style.removeProperty('--bg');
    const cur = c || themeBg();
    input.value = cur;
    hex.textContent = cur.toUpperCase();
    reset.disabled = !c;
  }
  function save(c) {
    try { if (c) localStorage.setItem(KEY, c); else localStorage.removeItem(KEY); } catch (_) {}
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) {}
  apply(HEX.test(saved || '') ? saved : null);

  input.addEventListener('input', () => { apply(input.value); save(input.value); });
  reset.addEventListener('click', () => { apply(null); save(null); });

  // keep the swatch in step with the theme when no colour has been picked
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!custom) apply(null); });

  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) input.focus({ preventScroll: true });
  }
  btn.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('pointerdown', e => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
})();
