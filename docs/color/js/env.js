// Environment selector (colour version): Supermarket / Street / Cinema Entrance.
// Each environment is a backdrop group in the world SVG, drawn behind the machine with
// pointer-events off, so switching never touches the wallet, coin, machine or chips and
// never interrupts a drag. The choice is remembered in this browser.
(() => {
  const App = window.App;
  const app = document.getElementById('app');
  const ENVS = ['supermarket', 'street', 'cinema'];
  const groups = Object.fromEntries(ENVS.map(n => [n, document.getElementById('env-' + n)]));
  const buttons = [...document.querySelectorAll('[data-env-choice]')];
  const KEY = 'wallet-to-chips-color:env';

  function set(name) {
    if (!groups[name]) name = ENVS[0];
    for (const n of ENVS) groups[n].setAttribute('display', n === name ? 'inline' : 'none');
    app.dataset.env = name;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.envChoice === name)));
    try { localStorage.setItem(KEY, name); } catch (_) {}
  }
  buttons.forEach(b => b.addEventListener('click', () => set(b.dataset.envChoice)));

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) {}
  set(saved || ENVS[0]);

  App.env = { set, get current() { return app.dataset.env; } };
})();
