# sequential-interaction-project
Code repository for IXD 107 working with claude code

## Wallet to Chips — sequence prototype

One continuous interaction built from three studies:
**Pick up → Open → Insert → Shake.**

- `docs/` — the finished static site for GitHub Pages (`docs/index.html`, plain CSS/JS, no build step).
  Publish with *Settings → Pages → Deploy from a branch → `/docs`*.
- `studies/` — the original studies, extracted from the ZIPs, for reference.

| Step | Source study | Gesture |
|---|---|---|
| 1. Pick up | new, built from *open-the-wallet*'s edge behaviour | Drag the wallet's glowing near edge upward; past 80% it rises into the hand |
| 2. Open | *open-the-wallet* | Drag the glowing free edge left |
| 3. Insert | *insert-the-coin* | Drag a coin from the wallet into the coin slot |
| 4. Shake | *shake-the-vending-machine* | Hold the machine and rock it left/right until the chips fall |

When the chips land, an **Again** button restarts from the wallet on the ground.

Source files in `docs/js/`: `sound.js` (shared Web Audio), `world.js` (camera + layout),
`wallet.js` (steps 1–2), `coin.js` (step 3), `machine.js` (step 4), `sequence.js` (step order).
