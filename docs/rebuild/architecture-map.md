# Current Architecture Map

Phase 0 deliverable · recorded 2026-07-10 at `main` d923f63 + uncommitted hardening pass · `src/` = 7,832 lines / 57 files

This maps the app as it exists today. Per plan §3, these are reference implementations — their APIs, file locations, and visual output are not binding on the rebuild.

## Entry

- `src/main.tsx` (19) — fonts + global CSS, `initHashSync()` before render, `<App/>` inside `AppErrorBoundary` under StrictMode.
- `src/App.tsx` (87) — boot: `initializeStorage()` (schema check → `StorageRecovery` reset screen on `incompatible`), then items/sheets/preferences init, reduced-motion sync into nav. Renders `<Canvas shadows dpr={[1,1.5]} frameloop="demand" gl={{antialias:false}} camera={{fov:34, near:0.08, far:30}}>` + 2D `Overlay`.

## Scene (`src/scene/`)

| Module | Lines | Responsibility |
|---|---|---|
| `CameraRig.tsx` | 169 | **The camera to preserve** — see below. |
| `stations.ts` | 60 | 7-station spatial IA: `{pos, tgt, name}` framings + move library (`dolly/crane/pedestal/arc/pull`) + `transitionFor(from,to)` precedence. |
| `easing.ts` | 48 | `easeCamera = cubicBezier(0.22,1,0.36,1)` (Newton-Raphson); `settle(k, amount, apex)` overshoot profile for doors/drawer/key. |
| `Experience.tsx` | 65 | Scene assembly: fog, one shadow-casting warm key + fills, procedural Environment, Room, Wardrobe, DustMotes, frozen ContactShadows, CameraRig, EffectComposer (Bloom/Vignette/ACES). |
| `Wardrobe.tsx` | **773** | **The monolith** (plan forbids recreating it): parametric cabinet, doors (107°, hinge-pivoted), brass-plaque `Hotspot` nav, drawer/tray geometry, per-panel grain rotation, and `Choreography` (lines ~327–404) — key turn, door swing (right leads, left +90 ms, camera departs 250 ms after doors start), drawer slide, picture-light warm-up. |
| `garments/Rail.tsx` | 202 | Station 1: hangers, swing-tags, owned/wishlist split at a brass divider, hover sway, focus slide-forward, multi-select. |
| `garments/Shelves.tsx` | 149 | Station 2: folded cloth blocks + standing prop cards. |
| `garments/MirrorOutfit.tsx` | 73 | Station 3: worn cutouts composed flat head-to-toe in the door mirror, layered by `LAYER_SLOT` (3D mannequin was cut deliberately). |
| `garments/Pinboard3D.tsx` | 72 | Station 5: saved sheet PNGs pinned to the right door (texture X-flipped vs door rotation). |
| `garments/GarmentCutout.tsx` | 76 | Cutout PNG on a curved cloth plane; wishlist = translucent. |
| `garments/illustrate.ts` | 523 | Procedural "product photos" for 12 garment shapes on `STUDIO_BG` grey (honest keying field for the worker). |
| `FrameDriver.tsx` | 34 | `frameloop="demand"` governor: `invalidate()` at ~60 fps (30 reduced). Timing is wall-clock, so behavior survives the cap. |
| `materials/woods.ts` | 152 | Oak/walnut/brass material hooks, per-panel grain rotation, plaque canvas textures. |
| `Room/Spot/DustMotes` | 111 | Environment support. |

## State (zustand, `src/state/`)

- `navigation.ts` (131) — station, `doorPhase` FSM (closed→unlocking→opening→open), `pendingStation` deep-link consumed at `_arrive()`, `fullMotion` (+`?motion=` override), `cutSerial` crossfade trigger, two-way hash sync. Dev handle `window.__nav`.
- `items.ts` (186) — first-run seeding through the real cutout pipeline, `addItem`, `importLine`, ownership toggle, filtering; validated persistence. `window.__items`.
- `sheets.ts` (305) — style sheets: per-count auto-layout templates, 40-deep undo/redo, PNG export to IndexedDB. `window.__sheets`.
- `selection.ts` (32), `tryOn.ts` (44, `LAYER_SLOT` map), `preferences.ts` (73), `reset.ts` (19).

Plan §10.2 note: server data, transient UI state, and persistence are currently mixed in these stores — the rebuild separates them (server-state library + zustand for transient only).

## Adapters (`src/adapters/`)

| Adapter | Status |
|---|---|
| `storage/StorageAdapter.ts` + `validation.ts` | **Real**: localStorage JSON + IndexedDB blobs, `wardrobe:` namespace, schema v1 with `initializeStorage()` → `ready/migrated/incompatible`, object-URL cache, runtime type guards. |
| `images/ImageAdapter.ts` → `workers/bgRemoval.worker.ts` | **Real worker, mock-grade algorithm**: chroma-key vs known studio background + palette extraction in one pass. Not adequate for arbitrary photos (plan §10.6). |
| `email/EmailAdapter.ts` (`sampleEmailAdapter`) + `parse.ts` | Sample inbox rendering seed receipts as merchant-varied HTML; the parser itself is real. `GmailAdapter.ts` is a throwing stub with OAuth TODOs. |
| `prices/PriceAdapter.ts` (`samplePriceAdapter`) | Deterministic seeded sample listings + history; gated behind `showSampleData` (`src/config/runtime.ts`: DEV or `VITE_WARDROBE_DEMO=true`). |

## UI (`src/ui/`)

`Overlay.tsx` (181, chrome root + keyboard + lazy SheetEditor) · `PostTray.tsx` (362, receipt inbox + manual add w/ photo upload) · `SheetEditor.tsx` (291, full-screen editor) · `Ledger.tsx` (169) · `SettingsPanel.tsx` (128) · `SelectionTray.tsx` (92) · `MirrorPanel.tsx` (71) · `PinboardPanel.tsx` (59) · `AppErrorBoundary` (38) · `StationNav` (34) · `OnboardingPanel` (32) · `FilterToggle` (31) · `EmptyWardrobe` (14) · **`panels.css` 1,592 lines (global-stylesheet anti-pattern the rebuild replaces)** · `tokens.css` 201 (palette + the two easing curves).

## Camera preservation references (plan §12.1 — study before changing)

| Mechanism | Where |
|---|---|
| 80 ms target lead | `CameraRig.tsx` `TARGET_LEAD = 0.08` (~line 17); in-flight `kT = kP + lead/dur` (~128–129) |
| 2% settle overshoot | `OVERSHOOT = 0.02`; `overshootU()` rises to 1.02 at k=0.86, eases back (~30–35) |
| Quadratic bézier arcs | `arcPoint()` (~20–28); per-move control shaping `shapeCtrl()` (~38–69): arc swings through room centre, crane holds height early, pedestal rises toward viewer, pull is near-straight |
| Interruption from current state | new `Flight` authored from live `pos/tgt` refs, never queued or snapped (~103–123); reduced motion snaps + crossfade |
| Anticipation delay | `startAt = now + spec.delay`; ledger inbound has 0.22 s delay so the drawer moves first (`stations.ts` `transitionFor`, ~44–60) |
| Idle life | breathing dolly sin 6.4 s × 0.018 + damped mouse parallax; suppressed in flight, off under reduced motion (~140–152) |
| Scene-side choreography | `Wardrobe.tsx` `Choreography` (~327–404): key turn 0.45 s, right door leads 1.25 s / left +90 ms, camera departs +250 ms, drawer 0.9 s with `settle` |
| Nav state machine | `navigation.ts`: doorPhase FSM, `pendingStation` deep links, hash sync, `resolveFullMotion()` |
| Dev probe | `window.__rig` = `{pos, tgt, flying, station}` |

## Test + build infrastructure

- **Unit**: `npm test` → `scripts/run-tests.mjs` — finds `tests/**/*.test.ts`, bundles each with esbuild (transitive dep via vite — fragile, see decision D-17), runs `node --test`. 9 tests: receipt parsing ×3, selection, autoLayout ×2, preferences, storage init, validation.
- **E2E**: `npm run test:e2e` → Playwright chromium, `tests/e2e/wardrobe.smoke.spec.ts` (4 tests: full journey, phone-viewport containment, onboarding→add routing, newer-schema protection). `playwright.config.ts` boots `npm run dev` on 127.0.0.1:5183 (strictPort), test timeout 30 s.
- **Build**: `tsc -b && vite build`; manualChunks vendor-three / vendor-r3f / vendor-react; only `SheetEditor` is lazy-loaded.
