# Design

Visual system of record for THE WARDROBE rebuild. Generated from the real tokens in
`src/revamp/styles/tokens.css` (Phase 1). The legacy system in `src/ui/tokens.css` is
superseded and remains only until the rebuild replaces the legacy app.

## Theme

Modern atelier — a contemporary fashion archive. Charcoal architectural chrome around ivory
linen workspaces; pale oak, ebonized timber, aged brass, bottle green and oxblood as material
accents. Brighter, cleaner and deliberately less brown than the v1 antique-wardrobe look.

Two surface contexts, flipped by `[data-surface="light" | "dark"]`. Raw material colors never
reach components; only semantic roles do.

## Color

Sampled 2026-07-10 from the Midjourney material tiles (reference-free, color-true). The
station keyframes measure gold-cast (hue ~54°) and were deliberately NOT sampled for surfaces.

| Material | Token | Value |
|---|---|---|
| Pale quarter-sawn oak | `--oak` / `--oak-deep` | `#c9ab81` / `#a3854f` |
| Ebonized timber | `--ebonized` / `--ebonized-deep` | `#232323` / `#141414` |
| Tailoring linen | `--linen` / `--linen-raised` | `#ddd2bc` / `#ece5d5` |
| Aged brass | `--brass` / `--brass-bright` | `#a2823f` / `#c9a967` |
| Bottle green | `--bottle` / `--bottle-deep` | `#2e4636` / `#1b2f22` |
| Oxblood | `--oxblood` / `--oxblood-deep` | `#6f2a24` / `#451713` |
| Room charcoal | `--room` / `--room-raised` | `#1b1a17` / `#262420` |

Semantic roles (per context): `--surface`, `--surface-raised`, `--text`, `--text-muted`,
`--line`, `--accent` (bottle on light, brass-bright on dark), `--accent-ink`, `--accent-line`
(≥3:1 indicator lines), `--danger`, `--danger-ink`, `--success`, `--focus`, `--hover-veil`,
`--active-veil`.

Rules: bottle = ownership/selection/success; oxblood = destructive + rare editorial emphasis;
brass never carries small body text; no pure black anywhere; every text pair ≥4.5:1 and every
indicator/focus pair ≥3:1 — enforced by `tests/revampTokens.test.ts`.

## Typography

- `--font-serif`: Fraunces Variable (weight ~550) — wordmark, workspace titles, saved-outfit
  titles, editorial captions. Never in buttons, labels, or data.
- `--font-sans`: Inter Variable — all operational UI.
- Fixed rem scale: 12 / 13 / 14 / 16 / 18 / 21 / 26 / 32 (`--text-xs` … `--text-3xl`).
  No viewport-scaled type. Body ≥16px mobile; dense desktop controls ≥14px.
- Letter-spacing is 0 everywhere except `.wordmark` (0.3em, the single sanctioned tracked
  element). No small-caps label voice in the rebuild.

## Space, radius, elevation, z

- Spacing: 4px base scale, `--space-1` (4) … `--space-16` (64).
- Radius: `--radius-s/m/l` = 4/6/8px. 8px is the ceiling (tested).
- Elevation: umber-tinted shadows only (`--shadow-raised`, `--shadow-overlay`) — never black.
- z-scale: dropdown 100 → sticky 200 → backdrop 300 → modal 400 → toast 500 → tooltip 600.

## Motion

Two easing curves app-wide (the house grammar, preserved from v1):

- `--ease-camera: cubic-bezier(0.22, 1, 0.36, 1)` — 3D camera + physical choreography.
- `--ease-ui: cubic-bezier(0.32, 0.94, 0.6, 1)` — 2D UI, 150–300ms (`--dur-fast/ui/slow`).

Motion conveys state only. Reduced motion collapses every transition/animation
(globals.css) and will map camera flights to 300ms crossfades in Phase 2.

## Components

`src/revamp/shared/ui/` — Button (primary/ghost/quiet/danger × loading/disabled/touch),
IconButton (required accessible name), TextField/SelectField (label/hint/error wiring),
Checkbox, Switch, Segmented (radiogroup), Tabs (roving tabindex), Menu (fixed-position,
keyboard nav), Dialog/ConfirmDialog/Sheet (native `<dialog>`), Toast (polite live region),
Skeleton (reserves final dimensions), EmptyState, InlineError.

Controls are 36px tall on desktop density; on coarse pointers every control grows to the 44px
touch floor automatically via `@media (pointer: coarse)` (`--control-h`, `--control-h-touch`).
Cards are reserved for repeated garment/outfit/board tiles and dialogs — navigation and page
sections are unframed, separated by hairlines and space. Control boundaries (inputs, selects,
menu triggers, segmented groups) use `--line-strong` (≥3:1, WCAG 1.4.11); hairline dividers use
`--line`.

Sanctioned exceptions to the general rules (deliberate, not drift):

- **Radius ceiling (8px)** exempts intrinsic control shapes: the switch track/thumb and the
  mobile bottom-nav circular Add button (its prominence is sanctioned by plan §8).
- **Gradients/looping motion** are banned decoratively; the skeleton shimmer is the sole
  permitted use (functional loading feedback, disabled under reduced motion).
- **Fraunces on the Overview destination index**: the overview is the app's editorial identity
  surface (it becomes the 3D camera menu in Phase 2), so its destination labels are serif by
  design; the same labels in rail/bottom nav are operational and stay Inter.

## Shells

- Desktop (≥900px): 56px dark top bar (wordmark, global Add, settings) + 212px dark left rail
  + light workspace. Feature routes split scene 62% / workspace 38% (min 400px).
- Mobile (<900px): dark compact header + light content + dark bottom nav (Collection, Outfits,
  central circular Add, Style, Insights) with safe-area insets. 2D-first; no idle scene.

## Fixtures

`/app/fixtures` (revamp shell) renders every control in every state. Gate screenshots live in
`docs/rebuild/screens/phase1/`.
