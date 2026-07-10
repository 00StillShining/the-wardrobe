# Product

## Register

product

## Users

A single owner and their personal wardrobe (private, per-account data; no social layer in v1). They are fashion-literate and care how things look, but they arrive with a task: add a garment they just bought, find something to wear, assemble an outfit, check what a piece cost and how often it's worn. Desktop is the immersive home (browsing, outfit and board composition, insights); mobile is the daily companion (quick capture, quick lookup) and is deliberately 2D-first.

## Product Purpose

The Wardrobe is a personal fashion archive: photograph a garment → automatic cutout → it lives in a searchable Collection → compose Outfits and editorial Style boards → understand value, wear, and gaps in Insights. Real accounts and private cloud persistence make the same wardrobe available on every device. Success = the primary path (sign in → add a real photo → review cutout → save → find in Collection → use in an Outfit → see it on another device) is reliable, fast, and pleasant. Source of truth for scope and behavior: `CLAUDE_FABLE_5_REBUILD_EXECUTION_PLAN.md`.

## Brand Personality

Modern atelier: precise, calm, editorial. A contemporary fashion archive with architectural discipline — pale quarter-sawn oak, ebonized timber, translucent linen, aged brass, matte charcoal, bottle-green and oxblood used sparingly. The 3D wardrobe gives the product its identity and orientation; operational surfaces stay quiet, legible, and fast. Visual authority: the Midjourney package at `~/Documents/wardrobe MJ/references/midjourney/` (translated into a system, never copied as screenshots).

## Anti-references

- An antique/period-furniture app: the old dark-oak, brown-heavy, dim treatment is explicitly superseded.
- A Three.js demo: no tech-demo staging, no floating emissive strips, no bloom-heavy showreel lighting.
- A generic SaaS dashboard: no identical card grids, no hero-metric tiles, no cards inside cards, no gradient orbs, no glassmorphism, no purple-blue gradients.
- An ecommerce product page: garment detail is an archive record, not a listing.
- Equipment-cosplay controls: no knobs, dials, or console hardware (a documented Midjourney hallucination to avoid).
- Fabricated liveness: production never presents sample receipt/retailer/price data as real.

## Design Principles

1. **3D for identity, 2D for work.** The scene orients and delights; every real task happens in fast semantic 2D. 3D is never the only control surface.
2. **The metaphor never blocks the task.** Plain labels (Collection, Insights) in operational UI; physical names are scene flavor only.
3. **Honest states everywhere.** Unconfigured providers read as disabled/coming-later; sample data is loudly sample; totals with missing data say so.
4. **Archive calm.** Generous negative space, editorial spacing, thin rules and material changes over boxes and borders; density where users compare, air where they browse.
5. **Preserved motion grammar.** The camera's five-beat choreography (80 ms target lead, arcs, 2% settle, interruptibility) is the house signature; UI motion is short, state-driven, and settles.

## Accessibility & Inclusion

- WCAG 2.2 AA target for all operational 2D UI (contrast validated in CI where possible).
- `prefers-reduced-motion` is first-class: camera flights become crossfades; idle motion disabled.
- Every 3D navigation action has a semantic DOM equivalent (keyboard + screen reader).
- Touch targets ≥ 44×44 CSS px on mobile; visible high-contrast keyboard focus everywhere.
- State never conveyed by color alone (ownership, processing, errors).
