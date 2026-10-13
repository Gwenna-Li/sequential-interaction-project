# Study: Insert the coin

Source artifact: https://claude.ai/artifact/8JvWuVb28JqEjsdEGfEVNZ
Entry file: `index.html` (single self-contained file, ~380 lines)

## What the study does

A coin sits beside a vending-machine coin slot. The user picks the coin up and drags it to the slot. As the coin gets closer, the slot plate's outline darkens and thickens. Dropping it over the plate snaps it into the slot, where it turns edge-on and disappears with a muffled drop; the machine then acknowledges it (a small dip, a glint, a lit outline, a soft chime). Dropping it anywhere else sends it springing back to its starting spot.

## Visual and interactive components

| Component | What it is | Where |
|---|---|---|
| Layout | `#stage` flex container; `.row` holds the coin's home spot and the slot. Size scales from `--s` | lines 10, 22–25, 50–68 |
| Home spot | Invisible `#home` box that defines the coin's resting position | line 52 |
| Slot panel | `<svg id="slot">` containing `#machine` (panel, plate, opening) | lines 53–67 |
| Proximity outline | `#inner-outline` — darkens/thickens as the coin approaches | line 62 |
| Glint | `#glint` — white flash over the opening on accept | line 64 |
| Lip | `#lip` — highlight on the opening, brightens on accept | line 65 |
| Coin | `#coin` (HTML div, `role="button"`, `tabindex="0"`) wrapping `.face` + SVG coin art | lines 70–85 |
| Controls | `#mute` and `#reset`, bottom-right | lines 87–93 |
| Styles + theme tokens | Light/dark variables, lifted/flat shadow states | lines 7–47 |

## User actions, feedback, states and transitions

**Actions**
- Pointer: press the coin, drag, release.
- Keyboard: focus the coin and press Enter or Space to insert it automatically.
- Mute toggles sound; Reset brings the coin back.

**Feedback**
- Pick-up: coin scales to 1.05, lifts with a bigger drop shadow, tiny "pickup" click.
- Dragging: coin follows the pointer on a spring (slight lag reads as weight) and tilts with horizontal velocity (±9°).
- Proximity: outline grey goes from 138 → 50 and stroke 1.5 → 3 as distance falls within 3× coin size; maxed when over the plate.
- Miss: spring back home with overshoot, up to 3 "land" clinks on each pass through home.
- Hit: fast decisive snap to slot center, "snap" click, then a 300 ms squash to edge-on + darken + fade, muffled "drop" inside the machine.
- Accept: machine dips 4 px, glint flashes, outline turns near-white, lip goes full opacity, thump + 660 Hz chime.

**States** (`mode`)
```
idle ──pointerdown──▶ drag ──release over plate──▶ insert ──settled at slot──▶ (sink anim) ──▶ gone + accepted
  ▲                     │                                                                         │
  └──── return ◀────────┘ release elsewhere (springs home, then idle)                               │
  └────────────────────────────────────────── Reset ─────────────────────────────────────────────┘
Keyboard Enter/Space in idle/return ──▶ insert
```
Flags: `inserted` (sink started), `active` (machine accepted; freezes proximity styling).

## Where it is implemented

| Behavior | Function / block | Lines |
|---|---|---|
| Sound engine (pickup, land, snap, drop, accept) | `Sound` IIFE, Web Audio | 110–180 |
| State + spring params | `VB`, `s`, `mode`, flags | 183–187 |
| Layout measurement (home, slot center, plate rect) | `measure()` | 189–202 |
| Draw coin transform | `render()` | 204–207 |
| Drop-target hit test | `overPlate()` | 209–212 |
| Proximity outline feedback | `proximity()` | 214–225 |
| Spring physics, tilt, return bounces, insert detection | `tick()` | 228–262 |
| Pick up / drag / drop decision | `onDown()`, `onMove()`, `onUp()` | 264–299 |
| Edge-on disappearance | `sink()` | 301–314 |
| Machine acknowledgement (completion) | `accept()` | 316–330 |
| Reset | `reset()` | 332–344 |
| Listeners (pointer, keyboard, reset, mute) | | 346–363 |
| Resize handling | | 365–371 |

**Integration hooks for a sequence:** `accept()` is the completion point (coin accepted). That's where to signal the next study.

## Accessibility and motion
- Coin is focusable with a visible focus ring; Enter/Space inserts it.
- `prefers-reduced-motion`: stiff, critically-damped springs, shorter sink, no machine dip, no reset fade-in.
- Light/dark theme via `prefers-color-scheme` or `data-theme` on `<html>`.

## Dependencies and assets
- None. No libraries, fonts, images or audio files. Inline SVG art; Web Audio synthesis (unlocked on first interaction).
- Uses the Web Animations API (`element.animate`) and Pointer Events.

## Running it
Open `index.html` directly in a browser, or serve the folder:
```
npx serve .        # or: python3 -m http.server
```
