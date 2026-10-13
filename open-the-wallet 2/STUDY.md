# Study: Open the wallet

Source artifact: https://claude.ai/artifact/4XzRvQo39atKhwCfMv3Arw
Entry file: `index.html` (single self-contained file, ~445 lines)

## What the study does

A closed bifold wallet lies on the table with its free edge slightly raised and gently glowing. The user grabs that edge and drags it to the left, folding the cover open in 3D around the center hinge. The leather creases and crinkles as it moves. Opened far enough, the wallet falls fully open and three coins tucked in the right-hand pocket give a small staggered hop as they settle. Let go too early and it folds closed again; let go midway and it stays partly open.

## Visual and interactive components

| Component | What it is | Where |
|---|---|---|
| Stage | `#stage`, 400×260 aspect box, scales to viewport | lines 28–33, 84 |
| Base (right half) | `<svg id="base">`: back panel, right flap, pocket, center fold | lines 86–139 |
| Flap shadow | `#flapShadow` under the right flap | line 93 |
| Coins | `#coins`: three tilted coins with contact shadows, each `.coin` animatable | lines 101–127 |
| Pocket | Two layered pocket shapes in front of the coins | lines 130–131 |
| Interior shade | `#innerShade`, darkens the interior while closed | line 134 |
| Fold line | Center fold + buckling `#foldInner` | lines 137–138 |
| Cover | `#coverWrap` (perspective) › `#cover` (rotateY, preserve-3d) | lines 141–190 |
| Inside face | `#inner` — left half's interior with card slots | lines 144–163 |
| Outside face | `#outer` — the closed flap, pre-rotated 180° | lines 165–188 |
| Signifier | `#edgeGlow`, pulsing highlight on the free edge | line 181, CSS 52–53 |
| Grab strip | Invisible `.hit` rect along the free edge | line 186 |
| Thickness slices | 12 generated layers per half (built in JS) | lines 234–267 |
| Reset | `#reset`, bottom-right | lines 193–197 |

## User actions, feedback, states and transitions

**Actions**
- Pointer: press on the cover (any `.hit` region, including the wide strip along the free edge) and drag horizontally. Release to let go.
- Reset button closes the wallet again.

**Feedback**
- Contact: free edge lifts ~9°, the outside face darkens slightly, a crinkle tick.
- Dragging: the cover tracks the pointer so the edge stays under the finger (angle computed with `acos`), with slight leathery lag, tiny noise-driven jitter and wobble. Crinkle ticks fire in proportion to travel. Crease lines near the fold change shape, the fold line buckles, faces shade as they turn edge-on, the interior brightens as it is revealed.
- Edge glow hides as soon as the wallet opens more than ~6%.
- Completion: three quick crinkles, cover springs fully flat, coins play a staggered `settle` hop (CSS keyframes).

**States**
`phi` is the cover angle: 176° closed (resting slightly raised) → 0° fully open. Progress `p = 1 − phi/180`.
```
closed (rest 176°) ──grab──▶ dragging ──release──▶ p ≥ 0.80 → complete (open flat, coins settle)
                                 │                p < 0.35 → spring closed
                                 │                otherwise → stays part-open, sags 5°
                                 └── p ≥ 0.96 while dragging → complete immediately
done ──Reset──▶ closed
```
Flags: `dragging`, `done`; stage classes `dragging` / `done` drive the cursor.

## Where it is implemented

| Behavior | Function / block | Lines |
|---|---|---|
| Constants (`REST_CLOSED`, `HALF`) and state | | 215–221 |
| Value noise for crinkly irregularity | `hash`, `noise` | 224–225 |
| Crease path elements | `mk()` | 228–231 |
| Leather thickness layers (base + cover slices) | | 234–267 |
| Perspective sizing | `sizePerspective()` | 269–273 |
| Pointer → viewBox x, hinge-edge math | `toVB`, `edgeX` | 275–279 |
| Crinkle sound | `audioInit()`, `crinkle()` | 282–308 |
| Grab | `pointerdown` | 311–323 |
| Drag → angle, crinkle ticks, auto-complete | `pointermove` | 325–337 |
| Release decision | `release()` | 339–351 |
| Completion | `complete()` | 353–363 |
| Reset | | 365–372 |
| Springs, 3D transforms, shading, creases, fold, glow | `frame()` | 375–442 |
| Coin settle animation, glow pulse, reduced-motion overrides | CSS | 52–62, 76–79 |

**Integration hooks for a sequence:** `complete()` is the completion point (wallet open, coins revealed). That's where to signal the next study — e.g. hand a coin to "Insert the coin".

## Known differences from the sibling studies
- No mute button (sound is only the crinkle; it initializes on first press).
- No keyboard interaction; the cover is pointer-only.

## Accessibility and motion
- `prefers-reduced-motion`: no springs (angle snaps to target), no jitter, no glow pulse, no coin hop.
- Light/dark theme via `prefers-color-scheme` or `data-theme` on `<html>` (page background and reset button; the wallet art is fixed greyscale).

## Dependencies and assets
- None. No libraries, fonts, images or audio files. Inline SVG art; Web Audio synthesis.
- Requires CSS 3D transforms (`preserve-3d`, `backface-visibility`), `dvh` units and Pointer Events.

## Running it
Open `index.html` directly in a browser, or serve the folder:
```
npx serve .        # or: python3 -m http.server
```
