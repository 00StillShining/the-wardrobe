# Assets & licenses

| Asset | Source | License | Used for |
|---|---|---|---|
| `public/textures/oak/*` — Oak Veneer 01 (diffuse, normal GL, roughness, 1k JPG) | [Poly Haven](https://polyhaven.com/a/oak_veneer_01) | CC0 | Wardrobe exterior oak panels |
| `public/textures/dark/*` — Dark Wood (diffuse, normal GL, roughness, 1k JPG) | [Poly Haven](https://polyhaven.com/a/dark_wood) | CC0 | Interior back panel, plinth, floor |
| Fraunces Variable | [Google Fonts via Fontsource](https://fontsource.org/fonts/fraunces) | OFL 1.1 | Headings, wordmark, engraved plaque |
| Inter Variable | [Google Fonts via Fontsource](https://fontsource.org/fonts/inter) | OFL 1.1 | Labels, metadata, small caps |

Environment lighting is procedural (drei `<Lightformer>` rig) — no HDRI file.
All other geometry is authored in code; no external models yet.

The dress form (Station 3) is procedural (lathe torso + turned-wood stand).
To swap in a CC0 humanoid mannequin, set `FORM_GLTF` in
`src/scene/garments/DressForm.tsx` to the model URL and drop the file in
`public/models/` — no other code changes needed. Source a headed CC0 mannequin
from Sketchfab (CC0 filter) or Poly Pizza and credit it here with its license.
