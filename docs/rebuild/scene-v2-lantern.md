# Scene v2 — The Lantern

Ground-up remodel (user-directed, 2026-07-10) replacing the v1-derived armoire. Design
authority: `01-master-style/master-style-frame.jpg` + `02-station-keyframes/01-closed-wardrobe-entry.png`.
The references depict a **lantern, not an armoire**: a thin dark case with slim brass frame
lines holding large translucent woven-linen panels that transmit interior light; when closed,
the wardrobe glows.

## The object

**W 2.40 × H 2.30 × D 0.65**, floating on a 0.035 shadow-gap over a recessed dark base.
Case shell 0.045 thin, near-black (#232324, subtle sheen), front perimeter lined with 0.012
brass edge strips.

| Module | Width | Front | Behaviour |
|---|---|---|---|
| A (left) | 1.10 | двойные hinged doors: slim brass frames + full-height **translucent ivory linen** panels, center brass pull plates | swing open 105°, right leads |
| B (centre) | 0.75 | open garment bay — linen-lined walls, brass rail, warm glow strip | always open; garments hang here |
| C (right) | 0.55 | **golden woven-cane** panel in brass frame | slides right (0.5 m) for Style Studio |

Interior: woven-linen walls (ivory), oak only as shelf + rail accents. Base drawer (Insights):
full-width shallow, bottle-felt surface + brass ruler, glides +0.4.

Surroundings: warm-grey wall (#8a887f), pale floor (#b9b4a6), flat woven rug under the
cabinet, raking daylight parallelogram on the wall (art-directed gradient card), deep shadow
above. Freestanding slim brass **leaning mirror** left of the cabinet (Outfit Studio);
wall-mounted brass **post tray** right (Add / Import).

## Light

Soft daylight key (directional, large soft shadow) + sky ambient; interior glow: emissive
strip per bay + warm point lights — the closed linen panels transmit it (MeshPhysical
transmission; quality 'reduced' falls back to emissive linen). Subtle Bloom (high threshold)
sells the lantern; gentle vignette. No motion blur, no flares.

## Camera v2 (grammar preserved, everything re-authored)

Five-beat anatomy, 80 ms target lead, 2% settle, interruption from current state, FOV 34
locked, ≤1.4 s — unchanged as the house signature. New framings are frontal and formal like
the references:

| Station | pos | tgt | Move in |
|---|---|---|---|
| overview | (0.35, 1.32, 5.0) | (0, 1.26, 0.35) | pull |
| collection | (0.05, 1.38, 3.3) | (0, 1.3, 0.32) | dolly |
| outfits (mirror) | (0.9, 1.3, 3.6) | (-1.78, 1.22, 0.5) | arc |
| style (cane) | (-0.9, 1.32, 3.5) | (1.38, 1.28, 0.42) | arc |
| insights (drawer) | (0.25, 1.5, 2.9) | (-0.15, 0.38, 0.55) | crane, drawer leads 0.22 s |
| import (tray) | (-0.5, 1.28, 3.1) | (2.0, 1.18, 0.12) | pedestal |

## Choreography v2

- **First entry set piece**: interior glow ramps 0→1 (0.4 s) → linen doors swing (right
  leads by 90 ms) while the cane panel slides 0.15 s later → camera departs at the 0.25 s
  anticipation beat.
- Cane panel slides open for Style (and closes when leaving); drawer glides for Insights.
- Idle life: garment sway (±0.8°, 5 s), dust motes in the daylight shaft, barely-perceptible
  glow breathing. All wall-clock driven, demand-loop safe, dead under reduced motion.

Gate: side-by-side against the two reference frames, plus the standard behavioral checks.
