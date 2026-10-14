# Study: Shake the vending machine

Source artifact: https://claude.ai/artifact/JFKhtVoDfiqt74KXaNzCAj
Entry file: `index.html` (single self-contained file, ~490 lines)

## What the study does

A bag of chips is stuck on a shelf behind the vending machine's glass. The user grabs the machine and rocks it side to side. Each change of direction loosens the bag a little more; after enough shakes it breaks free, falls past the shelves, drops out of the window and lands in the pickup tray with a bounce. Letting go too early loses the progress and the bag settles back.

## Visual and interactive components

| Component | What it is | Where |
|---|---|---|
| Stage | One full-screen `<svg id="stage">` (viewBox `-90 8 580 584`) | line 49 |
| Bag art | Reusable `<g id="bagArt">` symbol, drawn once and instanced via `<use>` | lines 51–76 |
| Clip paths | `#windowClip` (glass window) and `#openingClip` (tray opening) | lines 77–78 |
| Machine | `<g id="machine">` — the draggable, focusable control (`role="button"`, `tabindex="0"`) | lines 80–147 |
| Focus ring | Dashed rect shown on `:focus-visible` | line 81 |
| Machine body | `#vmArt`: cabinet, feet, product grid, keypad, coin slot | lines 82–128 |
| Stuck bag | `<use id="bagStuck">`, clipped to the window | lines 129–131 |
| Tray (back) | `#tray` | lines 132–138 |
| Tray bag | `<use id="bagTray">`, hidden until the bag drops, clipped to the opening | lines 139–141 |
| Tray flap (front) | `#trayFront`, drawn over the tray bag | lines 142–146 |
| Controls | Mute toggle `#sound` and reset `#reset`, fixed top-right | lines 150–164 |
| Styles + theme tokens | Light/dark CSS variables, cursors, focus styles | lines 7–46 |

## User actions, feedback, states and transitions

**Actions**
- Pointer: press on the machine (left button / touch), then move left and right while holding. Release to let go.
- Keyboard: focus the machine and press ArrowLeft / ArrowRight alternately. A 700 ms pause counts as letting go.
- Mute button toggles sound; Reset button restores the initial state.

**Feedback**
- On grab: machine gets a small random nudge and settles, cursor changes to `grabbing`, low "grab" thump.
- While shaking: the machine tilts toward the drag (max 11°, pivoting on the foot that stays down), slides slightly, and wobbles with pointer speed. The bag jitters and twists in its slot, increasingly as progress builds. Continuous crinkle sounds scale with shake energy; a metallic "knock" plays when the machine rocks back through upright.
- Each counted shake: bag hops and twists more, crinkle sound.
- Release of the bag: "pop" + slide sound, bag falls with gravity and spin.
- Landing: thud(s), bag bounces with restitution 0.33, machine wobbles once more.

**States** (`S.mode`)
```
stuck ──(9 direction reversals while holding)──▶ falling ──(below window)──▶ tray ──(bounce settles)──▶ done
  ▲  holding=false resets S.shakes to 0                                                                  │
  └──────────────────────────────────── Reset button ──────────────────────────────────────────────────┘
```
- `S.holding` — pointer/keys are currently driving the machine.
- `S.locked` — set when the bag releases; further input is ignored until Reset.
- Body classes: `holding` (grabbing cursor), `done` (default cursor).

**Tuning constants** (lines 260–267): `NEED = 9` reversals, `REVERSAL = 26` SVG units of travel per reversal, `MAX_TILT = 11` (6 under reduced motion), bag/tray positions and scale.

## Where it is implemented

| Behavior | Function / block | Lines |
|---|---|---|
| Sound engine (grab, knock, crinkle, pop, thud) | `Snd` IIFE, Web Audio synthesis | 176–257 |
| Geometry + tuning constants | `FOOT_L/R`, `STUCK`, `TRAY`, `NEED`, … | 260–267 |
| State object | `initial()` | 270–282 |
| Screen → SVG coordinate mapping | `svgX()` | 284–287 |
| Grab | `press()` | 290–300 |
| Drag + reversal counting | `move()`, `reversal()` | 301–324 |
| Let go (progress reset) | `release()` | 325–330 |
| Bag breaks free (completion trigger) | `release_bag()` | 331–337 |
| Pointer listeners | | 339–348 |
| Keyboard shaking | | 351–361 |
| Reset / Mute | | 363–378 |
| Physics: tilt springs, bag rattle, fall, tray bounce | `step(dt)` | 381–449 |
| Draw transforms | `render()` | 453–467 |
| rAF loop (3 substeps), continuous rattle sound | `frame()` | 471–486 |

**Integration hooks for a sequence:** the bag is "won" when `release_bag()` runs and the interaction is fully finished when `step()` sets `S.mode = 'done'` (line 445). Those are the natural places to emit a completion event to the next study.

## Accessibility and motion
- Machine is a focusable `role="button"` with an aria-label explaining the gesture; keyboard arrows work.
- `prefers-reduced-motion`: smaller tilt, heavier damping, no random wobble, reduced rattle.
- Light/dark theme via `prefers-color-scheme` or `data-theme` on `<html>`.

## Dependencies and assets
- None. No libraries, fonts, images or audio files. All art is inline SVG; all sound is generated at runtime with the Web Audio API (starts on first user gesture).
- Requires a modern browser with Pointer Events, SVG `<use href>`, and Web Audio (falls back silently without it).

## Running it
Open `index.html` directly in a browser, or serve the folder:
```
npx serve .        # or: python3 -m http.server
```
