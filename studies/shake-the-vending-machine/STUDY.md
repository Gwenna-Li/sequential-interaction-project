# Study: Shake the vending machine

Source artifact: https://claude.ai/artifact/JFKhtVoDfiqt74KXaNzCAj
Entry file: `index.html` (single self-contained file, ~545 lines)

## What the study does

The study opens just after a coin has been accepted. The machine's motor whirs, the spiral turns, and the bag of chips starts to drop, then catches on the shelf edge behind the glass. The user then grabs the machine and rocks it side to side. Each real swing loosens the bag more. After enough swings the bag lets go on the next swing back through upright. It falls past the shelves, out of the window, and lands in the pickup tray with a bounce. Letting go before then loses the progress and the bag settles back.

## Visual and interactive components

| Component | What it is | Where |
|---|---|---|
| Stage | One full-screen `<svg id="stage">` (viewBox `-90 8 580 584`) | line 49 |
| Bag art | Reusable `<g id="bagArt">` symbol, instanced via `<use>` | lines 51–76 |
| Clip paths | `#windowClip` (glass window) and `#openingClip` (tray opening) | lines 77–78 |
| Machine | `<g id="machine">`: the draggable, focusable control (`role="button"`, `tabindex="0"`) | lines 80–147 |
| Focus ring | Dashed rect shown on `:focus-visible` | line 81 |
| Machine body | `#vmArt`: cabinet, feet, product grid, keypad, coin slot | lines 82–128 |
| Bag in window | `<use id="bagStuck">`, clipped to the window (used for intro, stuck and falling) | lines 129–131 |
| Tray (back) | `#tray` | lines 132–138 |
| Tray bag | `<use id="bagTray">`, hidden until the bag drops, clipped to the opening | lines 139–141 |
| Tray flap (front) | `#trayFront`, drawn over the tray bag | lines 142–146 |
| Controls | Mute toggle `#sound` and reset `#reset`, fixed top-right | lines 150–164 |
| Styles + theme tokens | Light/dark CSS variables, cursors (`intro`/`done` = default, `holding` = grabbing), focus styles | lines 7–46 |

## User actions, feedback, states and transitions

**Actions**
- Pointer: press on the machine (left button or touch), then move left and right while holding. Release to let go.
- Keyboard: focus the machine and press ArrowLeft / ArrowRight alternately. A 700 ms pause counts as letting go.
- Mute button toggles sound. Reset replays the intro from the start.
- Input is ignored during the intro (`S.locked = true`) and after the bag releases.

**Feedback**
- Intro (no input): after 0.6 s a relay click and motor whir play; the bag trembles and creeps down for 1 s, then drops under gravity and snags on the shelf edge with a "snag" sound, a crinkle, and a small nudge of the machine.
- Grab: small random nudge, cursor changes to `grabbing`, low "grab" thump.
- Shaking: the machine tilts toward the drag (tilt = drag distance × 0.2, max 11°, pivoting on the foot that stays down), slides slightly, and wobbles with pointer speed. The bag jitters and twists in its slot, more as progress builds. Continuous crinkle sounds scale with shake energy; a metallic "knock" plays when the machine rocks back through upright.
- Each counted swing: the bag hops and twists more, crinkle sound.
- Bag release: "pop" + slide sound, bag falls with gravity and spin.
- Landing: thud(s), bag bounces (restitution 0.33), the machine wobbles once more.

**What counts as a swing** (`reversal()`): a direction reversal after at least 24 SVG units of travel, only while the machine is actually tilted or moving (|angle| ≥ 1.2° or |angular velocity| ≥ 15), and at least 90 ms after the last counted swing. 12 swings are needed.

**States** (`S.mode`)
```
intro ──(motor turns, bag drops and snags; ~1.6 s + fall)──▶ stuck
stuck ──(12 counted swings)──▶ stuck + ready ──(next swing through upright, or 1.2 s)──▶ falling
falling ──(below window)──▶ tray ──(bounce settles)──▶ done
Letting go while stuck and not ready resets the swing count to 0.
Reset (any state) ──▶ intro
```
- `S.holding`: pointer or keys are currently driving the machine.
- `S.locked`: true during intro and after release; input is ignored.
- `S.ready`: enough swings counted; letting go no longer loses progress.
- Body classes: `intro`, `holding`, `done`.

**Tuning constants** (lines 279–287): `START` (bag on shelf before vending), `STUCK` (caught position), `NEED = 12` swings, `REVERSAL = 24` SVG units per swing, `MAX_TILT = 11` (6 under reduced motion), tray position and bag scale.

## Where it is implemented

| Behavior | Function / block | Lines |
|---|---|---|
| Sound engine | `Snd` IIFE, Web Audio synthesis | 176–276 |
| ↳ grab, knock, crinkle | | 216, 222, 231 |
| ↳ whir (coin accepted, motor turns) | `whir(d)` | 241 |
| ↳ snag (bag catches) | `snag()` | 253 |
| ↳ pop, thud | | 260, 267 |
| Geometry + tuning constants | `FOOT_L/R`, `START`, `STUCK`, `TRAY`, `NEED`, … | 279–287 |
| State object (starts in `intro`) | `initial()` | 290–303 |
| Screen → SVG coordinate mapping | `svgX()` | 305–309 |
| Grab | `press()` | 311–321 |
| Drag + reversal detection | `move()` | 322–335 |
| Swing validation + progress | `reversal()` | 336–349 |
| Let go (progress reset unless ready) | `release()` | 350–355 |
| Bag breaks free | `release_bag()` | 356–362 |
| Pointer listeners | | 364–373 |
| Keyboard shaking | | 375–386 |
| Reset (back to intro) / Mute | | 388–404 |
| Physics loop | `step(dt)` | 407–501 |
| ↳ tilt springs + knock | | 407–432 |
| ↳ ready → release on next centre crossing | | 427–430 |
| ↳ intro: whir, creep, drop, snag | | 434–455 |
| ↳ stuck rattle, falling, tray bounce, `done` | | 456–499 |
| Draw transforms (intro / stuck / falling / tray) | `render()` | 505–522 |
| rAF loop (3 substeps), continuous rattle sound | `frame()` | 524–541 |

**Integration hooks for a sequence:** the intro represents "coin accepted, item vending". When this follows the coin study, the coin study's `accept()` leads straight into this intro. To start this study from outside, reset to `initial()` (as the Reset handler does). The bag is won when `release_bag()` runs, and the interaction is finished when `step()` sets `S.mode = 'done'` (line 497). Those are the places to emit completion events.

## Accessibility and motion
- The machine is a focusable `role="button"` with an aria-label explaining the gesture; arrow keys work (each key press moves 60 units, enough to count as a swing).
- `prefers-reduced-motion`: smaller tilt, heavier damping, no random wobble, reduced rattle.
- Light/dark theme via `prefers-color-scheme` or `data-theme` on `<html>`.

## Dependencies and assets
- None. No libraries, fonts, images or audio files. All art is inline SVG; all sound is generated at runtime with the Web Audio API.
- Browsers block audio until a user gesture, so the intro's whir and snag may be silent the very first time the page loads; they play after Reset once the user has interacted.
- Requires a modern browser with Pointer Events, SVG `<use href>`, and Web Audio (falls back silently without it).

## Running it
Open `index.html` directly in a browser, or serve the folder:
```
npx serve .        # or: python3 -m http.server
```
