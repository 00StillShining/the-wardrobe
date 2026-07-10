# Rebuild Source Inventory

Phase 0 deliverable · recorded 2026-07-10 · companion to `CLAUDE_FABLE_5_REBUILD_EXECUTION_PLAN.md`

All three attachment roots were confirmed present and inventoried read-only. Nothing was modified, moved, or deleted in either external folder.

## Source authority (conflict resolution order)

1. The user's latest direction in the execution plan: full redesign, keep main-menu camera movement.
2. `~/Documents/wardrobe MJ/references/midjourney/` — the new visual language.
3. `CLAUDE_FABLE_5_REBUILD_EXECUTION_PLAN.md` — product, architecture, behavior, build order.
4. `~/Documents/DigiDrobe Prep/the-wardrobe-camera-motion-spec.md` + the current camera implementation — motion quality.
5. Remaining `~/Documents/DigiDrobe Prep/` documents — product history and useful concepts.
6. Current `~/the-wardrobe/` implementation — code reference only, not a design authority.

---

## Root 1: `~/the-wardrobe/` (the repository)

- Branch `main` at `d923f63` ("Perf pass — run light + cool without changing the look").
- **Dirty worktree**: 25 modified files (+1,416/−1,086) and 13 untracked paths — one coherent production-hardening pass dated Jul 9–10 (storage schema versioning + validation + recovery, honest sample-data gating, onboarding/settings/empty states, manual add-item flow with photo upload, accessibility pass, dependency slimming, unit + e2e test infrastructure). Full audit in `docs/rebuild/baseline-2026-07-10.md`.
- Stack: Vite 5, React 18, TS 5.6 strict, **R3F v8 line** (fiber 8.17 / three 0.169 / drei 9.114 / postprocessing 2.16), zustand 4, framer-motion 11, idb-keyval, lucide-react, Fraunces + Inter via Fontsource.
- `src/` = 7,832 lines / 57 files. Architecture map in `docs/rebuild/architecture-map.md`.
- Camera behavioral references to preserve: `src/scene/CameraRig.tsx`, `src/scene/stations.ts`, `src/scene/easing.ts`, `src/state/navigation.ts`, `src/scene/Wardrobe.tsx` (`Choreography`), `src/scene/FrameDriver.tsx`.

## Root 2: `~/Documents/DigiDrobe Prep/` (product history)

| File | Role in the rebuild |
|---|---|
| `the-wardrobe-camera-motion-spec.md` (102 ln) | **Authority #4.** Single source of truth for motion grammar: dolly-pan house move; FOV locked 32–38° in travel; one camera curve `cubic-bezier(0.22,1,0.36,1)`; durations 0.7–0.9 s adjacent / 1.0–1.2 s standard / 1.4 s hard ceiling; five-beat anatomy (anticipate → depart with **80 ms target lead** → arced travel → arrive → **2% overshoot settle**); ≤60°/s pan; zero roll; no blur/shake; always interruptible from current state; reduced-motion = 300 ms crossfade only; per-transition QA checklist. Parameter bands are IA-independent — preserve verbatim. Station-pair examples (Rail↔Shelves etc.) need re-mapping to the new five destinations. |
| `STYLE_GUIDE.md` (191 ln) | Historical visual system (dark oak / dim atelier / 9 tokens). **Palette + materials + dark-room treatment superseded** by the Midjourney direction. Still-valid carryovers: two-easing-curve rule, Fraunces/Inter split (with the plan's revised usage — no tracked small-caps for operational UI), settle-everything motion character, forbidden list (glassmorphism, purple gradients, rounded-2xl cards…), diegetic-first instinct, framer-motion `x:'-50%'` centering gotcha. |
| `MERGE_GUIDE.md` (372 ln) | Written for merging this UI onto an existing backend. Superseded as a plan, but its engineering warnings transfer: R3F v8-vs-9 differences, never two copies of `three`, zustand singleton discipline, CORS taints canvases (breaks bg-removal + PNG export), `useObjectUrl` key-vs-URL short-circuit, fonts before export, `frameloop="demand"` hidden-tab gotcha, desktop-first overlays need a real responsive pass. Also the tuned perf recipe (dpr [1,1.5], one shadow key @2048, frozen ContactShadows, multisampling 2). |
| `the-wardrobe-inspiration-and-techniques.md` (86 ln) | Reference catalogue (RDR2 wardrobe, Clueless closet, bruno-simon, Indyx/Whering/ShopLook) + technique map per station. Useful concepts; visual taste sections superseded. |
| `the-wardrobe-claude-code-prompt.md` (165 ln) | The original v1 build prompt. **Statements now obsolete**: seven-station IA "is the information architecture"; "no backend in v1"; no accounts; mobile out of scope; locked v1 stack. Kept for history and for its acceptance-criteria style. |
| `the-wardrobe-2d-mockup.svg` / `.png` (1600×1130 / 2333×1647) | V1 spatial-map mockup (seven stations, old 7-token palette). Historical only. |
| `the-wardrobe-ui/` (63 files) | Older source snapshot (Jul 7), pre-hardening. Superseded by the live repo; secondary reference only. |

## Root 3: `~/Documents/wardrobe MJ/` (Midjourney visual-development package — Authority #2)

**48 files, ~75.4 MB: 23 images + 23 `.txt` sidecars (perfect 1:1) + `ASSETS.md` (master log) + a self-contained HTML gallery index.** All 23 assets in `ASSETS.md`'s index resolve path-for-path. Generated 2026-07-10 across an 8-round pack; folders 00–06 map to pack rounds 1, 2, 4, 5, 6, 7, 8. Keyframe/layout/launch rounds ran **V7** (Omni Reference unavailable on the account's V8); unreferenced rounds (Direction C, material tiles) ran V8. **Seeds were never captured** — reproducibility is prompt + reference URLs (in each sidecar), not seeds.

Asset map (paths relative to `references/midjourney/`; usage rules in plan §7):

| Asset | Sidecar flags |
|---|---|
| `00-direction-exploration/direction-c-glass-brass-wardrobe.png` | Round 1 winner; composition/material-contrast DNA only — its colour language was deliberately NOT carried forward. |
| `01-master-style/master-style-frame.jpg` | THE master frame (sref/oref source for the whole pack; only JPEG). First attempt at sw 120 had an **overpowering yellow/gold cast**; shipped version is sw 50 with yellow/amber/gold in `--no`. |
| `02-station-keyframes/01-closed-wardrobe-entry.png` | Clean pick. |
| `02-station-keyframes/02-open-wardrobe-collection.png` | Clean pick; right side deliberately reserved for operational panel space. |
| `02-station-keyframes/03-shelves-accessories.png` | Clean pick (`--no retail store`). |
| `02-station-keyframes/04-mirror-outfit-studio.png` | Index 2 chosen for cleanest dress-form silhouette. |
| `02-station-keyframes/05-ledger-insights.png` | Standout image of its round. |
| `02-station-keyframes/06-pinboard-style-studio.png` | ⚠ **Selected via coordinate mis-click, not comparison** — ASSETS.md says re-review its 3 sibling candidates before treating as final (tracked as decision D-14). |
| `02-station-keyframes/07-post-tray-import.png` | Clean pick (`--no mail room, office`). |
| `03-desktop-layouts/desktop-collection-workspace.png` | ⚠ The intended 2/3 + 1/3 split was **never achieved** in any candidate — closest approximation only; do not treat as pixel layout. |
| `03-desktop-layouts/desktop-garment-detail.png` | Chosen to avoid the literal desktop-monitor prop 2 siblings had. |
| `03-desktop-layouts/desktop-outfit-studio.png` | Sibling rejected for legible generated pseudo-text. |
| `04-mobile-layouts/mobile-add-flow.png` | Clean first pass. |
| `04-mobile-layouts/mobile-collection.png` | Sibling rejected for fake status-bar/nav text; chosen frame keeps controls as blank shapes. |
| `04-mobile-layouts/mobile-outfit-studio.png` | ⚠ **Corrected rerun** — first attempt hallucinated audio-mixer hardware (knobs/sliders/LCD); rerun extended the `--no` list. Never copy equipment-like controls. |
| `05-material-tiles/{pale-quartersawn-oak, ebonized-timber, warm-tailoring-linen, dark-bottlegreen-wool, oxblood-leather, editorial-fabric-pattern}.png` | ⚠ All six: colour/pattern source only — **not PBR**, no roughness/normal/displacement, **seams unverified**, explicit do-not-upscale-before-seam-check rule. |
| `06-launch-images/launch-hero.png` | Strongest sref weight in the pack (sw 130); sibling rejected for a red overlay artifact. Marketing only — never in the app bundle. |
| `06-launch-images/social-portrait.png` | Clean pick. |

Package-level notes:

- **Pack Round 3 is absent and unexplained** — no folder, no assets, no note (tracked as decision D-15).
- The root HTML index embeds **compressed base64 previews only** — production work must use the originals; its footer says so explicitly.
- Rights: ASSETS.md warns Midjourney creations may be public/remixable depending on plan; commercial terms must be confirmed before any public shipping (plan §20; decision D-10), and Stealth mode is recommended for future confidential rounds.
- Minor log drift (harmless, recorded for completeness): keyframe sidecars say account default "V8.1" vs ASSETS.md "V8"; the master-frame sidecar cites a "runner-up" discussion ASSETS.md doesn't contain.
