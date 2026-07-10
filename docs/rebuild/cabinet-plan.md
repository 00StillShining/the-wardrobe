# Cabinet Elevation & Module Plan

Phase 2 deliverable (plan §6.3: one designed object, not seven stitched generated cabinets).
All dimensions in meters. Grey-box first; crafted geometry replaces it in a later pass with
the same pivots, dimensions and module grid.

## The object

A three-module wardrobe on a single plinth, ebonized structural frame with pale-oak interior.
Overall: **W 2.20 × H 2.35 × D 0.62**, plinth 0.09 high, wall-backed at z=0, front face z≈0.62,
centered on x=0. Frame members 0.06 thick; panels 0.024.

```
            ← 2.20 →
  ┌──────────────────────────────┐  2.35
  │ A 0.88   │ B 0.72 │ C 0.60   │
  │ hanging  │ shelf  │ archive  │
  │ bay      │ column │ rail     │
  │ (door L) │ (open) │ (door R) │
  │──────────┴────────┴──────────│
  │   ledger drawer (A+B) 0.14   │  ← shallow, slides +z
  └──────────────────────────────┘
  ▁▁▁▁▁▁▁▁▁ plinth 0.09 ▁▁▁▁▁▁▁▁▁
```

- **Module A (left, 0.88 w)** — full-height hanging bay behind the left door. Brass rail at
  y 1.72. The left door's interior face carries the **mirror** (Outfit Studio surface).
- **Module B (centre, 0.72 w)** — open shelf column, six oak shelves pitched 0.30 apart from
  y 0.42 to 1.92. No door; reeded-glass treatment comes with final materials.
- **Module C (right, 0.60 w)** — secondary/archive rail behind the right door. The right
  door's interior face carries the **linen pinboard** (Style Studio surface).
- **Ledger drawer** — spans A+B width at y 0.28–0.42, slides out +0.34 z (Insights).
- **Post tray return** — a side surface fixed to the right flank at y 0.98, 0.42×0.34,
  carrying the brass tray (Add / Import).
- **Doors** — hinge on the outer stiles (A: x −1.10, C: x +1.10), open outward to **107°**
  (v1's proven clearance). Right door leads by 90 ms in choreography, camera departs 250 ms
  after the doors start (preserved v1 timing).

## Destination framings (authored for the visible scene region)

The workspace panel covers the right 38% on feature routes; the rig applies a view offset so
these framings compose for the *visible* region — author them as full-frame.

| Station | Camera pos | Target | Doors/drawer |
|---|---|---|---|
| overview | (0.60, 1.50, 4.60) | (0, 1.22, 0.40) | closed (open after first entry) |
| collection | (−0.15, 1.42, 2.70) | (−0.30, 1.28, 0.30) | open |
| outfits | (1.15, 1.30, 2.35) | (−0.98, 1.24, 0.72) | open (left-door mirror) |
| style | (−1.20, 1.30, 2.40) | (1.02, 1.28, 0.70) | open (right-door pinboard) |
| insights | (0.05, 1.18, 1.80) | (−0.28, 0.44, 0.48) | open + drawer out |
| import | (0.92, 1.32, 1.95) | (1.28, 1.02, 0.52) | open |

Move grammar (ported, not re-invented): FOV 34 fixed; adjacent 0.85 s; standard dolly 1.1 s;
door-surface pairs arc 1.2–1.35 s; insights inbound crane 1.0 s with 0.22 s drawer
anticipation; import pedestal 0.95 s; overview pull 1.3 s; 1.4 s hard ceiling; 80 ms target
lead; 2% overshoot settle; zero roll; always interruptible from current state; reduced motion
= snap + 300 ms crossfade veil.

## Scene/shell contract

One persistent lazy-loaded Canvas lives in the shell behind the workspace. Desktop: overview
full-bleed (DOM overlay panel on the left), all five feature routes split 62/38. Settings and
fixtures cover the scene fully — the frame driver pauses invalidation there. Mobile: scene
not mounted (2D-first). WebGL unavailable or `?scene=off`: static charcoal fallback,
navigation stays fully functional in DOM.
