# The Wardrobe - Midjourney Visual Development Pack

This pack is for visual development, not final UI generation. Midjourney should
define the atmosphere, material balance, lighting, spatial composition, and
editorial character. Final layouts, controls, typography, 3D geometry, and PBR
materials will be rebuilt in code.

## Target Direction

- Product model: immersive 3D wardrobe shell with focused 2D workspaces.
- Visual mood: modern atelier, tactile and editorial rather than nostalgic.
- Palette: pale oak, ebonized wood, aged brass, warm linen, matte charcoal,
  bottle green, and restrained oxblood.
- Lighting: soft northern daylight with warm internal wardrobe lighting.
- Composition: calm, inspectable, and spacious enough for operational UI.
- Mobile: lightweight wardrobe overview with purpose-built 2D workflows.

## Before You Begin

1. Run the three direction prompts in Round 1 without references.
2. Choose one image that best captures the product's future visual language.
3. Upload that image as a Style Reference for all later rounds.
4. Replace `[STYLE_REF_URL]` with the image URL when working in Discord, or
   place the image in the Style Reference field on midjourney.com.
5. Keep the selected prompt, seed, model version, and reference images with
   every exported image.

Recommended starting parameters:

```text
--ar 16:9 --stylize 150 --chaos 8 --raw
```

Use this shared exclusion block when a prompt does not already include one:

```text
--no people, hands, readable text, logos, watermark, neon, purple glow, blue glow, bokeh, fantasy ornament, baroque carving, clutter
```

For consistent Style Reference results, start near `--sw 120`. Increase toward
200 only when later images drift away from the approved look.

## Round 1 - Choose The Visual Direction

Generate each prompt at least twice. Select one direction before continuing.

### Direction A - Modern Atelier (Recommended)

```text
visual development keyframe for a premium digital wardrobe application, a monumental freestanding wardrobe designed as a contemporary fashion atelier, pale quarter-sawn oak exterior, ebonized timber interior, brushed aged brass fittings, warm linen paper details, matte charcoal architectural room, bottle green and oxblood accents used sparingly, soft northern daylight meeting warm internal cabinet lighting, quiet editorial composition, tactile natural materials, restrained luxury, highly legible forms, realistic product visualization, front three-quarter view, generous negative space, no interface, no people, no readable text --ar 16:9 --stylize 150 --chaos 12 --raw --no logos, watermark, neon, purple glow, blue glow, bokeh, baroque carving, clutter
```

### Direction B - Luxury Heritage

```text
visual development keyframe for a private couture wardrobe room, architectural English cabinetmaking interpreted with modern restraint, deep walnut, blackened oak, unlacquered brass, ivory linen, oxblood leather details, cinematic pools of warm light, tailored proportions, dramatic shadows with clearly visible garments and controls, sophisticated heritage atmosphere without ornament or nostalgia, realistic product visualization, front three-quarter view, no interface, no people, no readable text --ar 16:9 --stylize 175 --chaos 12 --raw --no logos, watermark, neon, purple glow, blue glow, bokeh, baroque carving, clutter
```

### Direction C - Fashion Laboratory

```text
visual development keyframe for an experimental digital wardrobe studio, precise modular cabinetry, pale timber, black lacquer, translucent glass, stainless steel and brushed brass, bright editorial colour accents, crisp gallery lighting, fashion archive meets contemporary creative software, expressive but highly organized, strong negative space, realistic product visualization, front three-quarter view, no interface, no people, no readable text --ar 16:9 --stylize 180 --chaos 18 --raw --no logos, watermark, purple gradient, blue glow, bokeh, science fiction machinery, clutter
```

## Round 2 - Master Style Reference

After selecting the best Round 1 image, rerun this prompt with that image as a
Style Reference. This becomes the master look-development frame.

```text
hero visual development frame for The Wardrobe, a premium personal fashion archive presented as a life-size contemporary atelier cabinet, closed exterior and a subtle glimpse of the interior, pale quarter-sawn oak balanced with ebonized wood, aged brass hardware, warm linen, matte charcoal room, restrained bottle green and oxblood accents, soft northern daylight, warm practical lights, tactile realistic materials, calm editorial art direction, centered architectural composition, full object visible, floor contact and believable scale, ample negative space around the object, no interface, no people, no readable text --ar 16:9 --stylize 125 --chaos 5 --raw --sref [STYLE_REF_URL] --sw 120 --no logos, watermark, neon, purple glow, blue glow, bokeh, fantasy ornament, clutter
```

Selection criteria:

- The wardrobe reads immediately at thumbnail size.
- Materials remain distinguishable in both highlights and shadows.
- The scene is not dominated by one family of brown tones.
- There is room for UI without covering the product.
- The design looks feasible to model with Three.js primitives and textures.

## Round 3 - Wardrobe Object Consistency

Use the approved master frame as both the Style Reference and, when available,
an Omni Reference. Omni Reference currently requires Midjourney V7.

Discord suffix:

```text
--sref [STYLE_REF_URL] --sw 120 --oref [WARDROBE_REF_URL] --ow 140 --v 7
```

Keep Omni weight below 400 unless testing deliberately. The wardrobe should
stay recognizable, but exact hardware and proportions will still be rebuilt in
3D rather than copied blindly from generated images.

## Round 4 - Station Keyframes

Generate every keyframe with the same Style Reference. Use the Omni Reference
suffix where object consistency is more important than generation speed.

### 1. Closed Wardrobe / Entry

```text
front-facing product keyframe of the approved contemporary wardrobe standing closed in a quiet architectural room, complete wardrobe visible from cornice to feet, pale oak doors with slim ebonized reveals, aged brass key and handles, warm light leaking subtly through the door seam, soft northern daylight, matte charcoal and warm grey surroundings, grounded floor shadows, restrained editorial luxury, clear silhouette at thumbnail size, no interface, no people, no readable text --ar 16:9 --stylize 110 --chaos 4 --raw --sref [STYLE_REF_URL] --sw 120 --no logos, watermark, neon, blue glow, purple glow, bokeh, clutter
```

### 2. Open Wardrobe / Collection

```text
product keyframe of the approved wardrobe fully open as a contemporary personal fashion archive, hanging rail and shelving shown together, garments spaced like an editorial collection rather than a shop display, pale oak frame, ebonized interior, aged brass rails, warm linen details, softly lit garment silhouettes in varied restrained colours, strong depth and negative space, operational panel space reserved on the right side, highly inspectable materials and clothing, no interface, no people, no readable text --ar 16:9 --stylize 115 --chaos 5 --raw --sref [STYLE_REF_URL] --sw 120 --no logos, watermark, neon, blue glow, purple glow, bokeh, clutter
```

### 3. Shelves / Accessories

```text
close spatial keyframe inside the approved wardrobe focused on shelves for folded knitwear, shoes, bags, jewellery and accessories, carefully spaced museum-like presentation, pale oak shelf edges, dark timber back panel, aged brass labels without writing, warm integrated lighting, linen trays, bottle green and oxblood accents, high material clarity, room for a narrow contextual drawer on the right, no interface, no people, no readable text --ar 16:9 --stylize 120 --chaos 6 --raw --sref [STYLE_REF_URL] --sw 120 --no logos, watermark, retail store, clutter, neon, bokeh
```

### 4. Mirror / Outfit Studio

```text
visual development keyframe for an Outfit Studio built into the approved wardrobe, full-height softly illuminated mirror beside a refined neutral dress form, layered garments presented clearly from head to toe, ebonized wood frame, pale oak structure, brushed brass controls, warm linen platform, directional gallery lighting, balanced empty space for a full-height outfit drawer, modern fashion editorial atmosphere, no person, no readable text, no interface --ar 16:9 --stylize 125 --chaos 6 --raw --sref [STYLE_REF_URL] --sw 120 --no face, hands, logos, watermark, neon, purple glow, blue glow, bokeh, clutter
```

### 5. Ledger / Insights

```text
visual development keyframe for a wardrobe insights station, a wide shallow accounts drawer integrated into the approved wardrobe, linen ledger paper, brass ruler details, garment swatches, subtle price history marks without readable text, dark timber and pale oak architecture, bottle green and oxblood data accents, focused task lighting, calm analytical mood, generous clear surface for a 2D insights workspace, no people, no readable text, no interface --ar 16:9 --stylize 105 --chaos 5 --raw --sref [STYLE_REF_URL] --sw 120 --no calculator, office desk, logos, watermark, neon, bokeh, clutter
```

### 6. Pinboard / Style Studio

```text
visual development keyframe for a fashion style studio integrated into the approved wardrobe, oversized linen pinboard, garment cutouts, fabric swatches and editorial photographs arranged with refined negative space, pale oak frame, blackened timber, aged brass pins, warm directional studio light, tactile collage materials, blank paper only with no readable text, enough space for a structured editing toolbar, no people, no interface --ar 16:9 --stylize 145 --chaos 8 --raw --sref [STYLE_REF_URL] --sw 120 --no logos, watermark, neon, purple glow, blue glow, bokeh, scrapbook clutter
```

### 7. Post Tray / Import

```text
visual development keyframe for a garment import station built into the approved wardrobe, elegant shallow post tray holding a few receipts and one garment photograph, compact camera and scanning surface implied through physical design, pale oak, ebonized wood, aged brass, linen paper, soft warm task light, organized and private atmosphere, clear open surface reserved for an upload and review drawer, no people, no hands, no readable text, no interface --ar 16:9 --stylize 110 --chaos 5 --raw --sref [STYLE_REF_URL] --sw 120 --no mail room, office, logos, watermark, neon, bokeh, clutter
```

## Round 5 - Hybrid Product Layout References

These images are composition references only. Do not copy generated controls,
icons, or text. We will rebuild all UI using the actual design system.

### Desktop Collection Workspace

```text
concept frame for a premium digital wardrobe application, approved 3D wardrobe collection scene occupying the left two thirds, confident full-height linen workspace on the right third, structured garment grid with image placeholders and blank metadata lines, compact command bar, generous spacing, crisp charcoal controls, aged brass selection accents, bottle green status accent, modern atelier editorial layout, practical software density, no readable text, no fake logos --ar 16:9 --stylize 80 --chaos 4 --raw --sref [STYLE_REF_URL] --sw 100 --no marketing website, hero banner, dashboard cards, gradients, neon, bokeh
```

### Desktop Garment Detail

```text
concept frame for a garment detail workspace inside a premium digital wardrobe application, approved 3D wardrobe softly visible behind, large garment cutout with accurate silhouette, organized detail inspector for category, brand, ownership, price, colours and source, clear edit and delete command positions, linen and charcoal surfaces, brass and bottle green accents, quiet editorial software design, no readable text, no fake logos --ar 16:9 --stylize 75 --chaos 4 --raw --sref [STYLE_REF_URL] --sw 100 --no ecommerce product page, marketing layout, floating cards, gradients, neon, bokeh
```

### Desktop Outfit Studio

```text
concept frame for a focused outfit-building application, full-height dress form and mirror composition on the left, structured layer list and garment strip on the right, clear outfit total and save controls, approved modern atelier materials, linen workspace, matte charcoal tool surfaces, brass selection accents, bottle green success state, practical editorial software layout, no readable text, no fake logos --ar 16:9 --stylize 85 --chaos 4 --raw --sref [STYLE_REF_URL] --sw 100 --no ecommerce page, dashboard cards, gradients, neon, bokeh
```

## Round 6 - Mobile Composition References

The phone experience is 2D-first. The wardrobe remains a compact visual anchor,
not the only way to reach routine tasks.

### Mobile Collection

```text
mobile application concept for a premium personal wardrobe, compact cropped view of the approved wardrobe at the top, fast native garment collection below with image tiles, filter chips represented only as blank shapes, persistent bottom navigation, linen background, charcoal controls, aged brass selection detail, bottle green status accent, dense but calm modern atelier design, realistic phone viewport, no readable text, no fake logos --ar 9:16 --stylize 70 --chaos 4 --raw --sref [STYLE_REF_URL] --sw 100 --no marketing landing page, oversized hero, floating cards, gradients, neon, bokeh
```

### Mobile Add Flow

```text
mobile application concept for adding a garment to a premium personal wardrobe, large garment image preview, clearly grouped upload, name, category, price and ownership controls represented without readable labels, strong primary confirmation area, linen and charcoal modern atelier design, aged brass and bottle green accents, generous touch targets, realistic phone viewport, no readable text, no fake logos --ar 9:16 --stylize 65 --chaos 3 --raw --sref [STYLE_REF_URL] --sw 100 --no ecommerce checkout, floating cards, gradients, neon, bokeh
```

### Mobile Outfit Studio

```text
mobile application concept for building an outfit, upper half showing a clean layered dress-form composition, lower half showing a horizontal garment tray and compact layer controls, persistent bottom navigation, linen workspace, charcoal tool bar, aged brass selection state, bottle green confirmation state, practical modern atelier software design, no readable text, no fake logos --ar 9:16 --stylize 75 --chaos 4 --raw --sref [STYLE_REF_URL] --sw 100 --no social feed, ecommerce page, gradients, neon, bokeh
```

## Round 7 - Material Source Tiles

These are colour and pattern sources only. They are not finished PBR materials.
We will test the seams, normalize colour, and derive proper roughness, normal,
and displacement maps separately.

Do not upscale generated tiles before checking the seam.

### Pale Quarter-Sawn Oak

```text
flat orthographic material scan of pale quarter-sawn European oak veneer, refined straight grain with subtle medullary rays, low contrast honey and neutral beige colour, untreated matte finish, completely even diffuse lighting, no perspective, no objects, no shadows, no vignette, seamless architectural material source --ar 1:1 --tile --stylize 45 --chaos 3 --raw --no knots, boards, plank seams, furniture, text, watermark
```

### Ebonized Timber

```text
flat orthographic material scan of ebonized ash wood, visible elegant linear grain beneath a charcoal black stain, subtle warm undertone, matte open-pore finish, completely even diffuse lighting, no perspective, no objects, no shadows, no vignette, seamless architectural material source --ar 1:1 --tile --stylize 40 --chaos 3 --raw --no plank seams, furniture, text, watermark
```

### Warm Tailoring Linen

```text
flat macro material scan of fine warm ivory tailoring linen, tight natural weave, understated irregular fibres, premium matte textile, completely even diffuse lighting, no folds, no perspective, no objects, no shadows, seamless fabric material source --ar 1:1 --tile --stylize 35 --chaos 3 --raw --no stains, embroidery, text, watermark
```

### Dark Bottle-Green Wool

```text
flat macro material scan of dark bottle-green brushed wool suiting, dense short fibres, subtle tonal depth, luxurious matte textile, completely even diffuse lighting, no folds, no perspective, no objects, no shadows, seamless fabric material source --ar 1:1 --tile --stylize 40 --chaos 3 --raw --no pattern, lint, stains, text, watermark
```

### Oxblood Leather

```text
flat macro material scan of deep oxblood vegetable-tanned leather, fine natural grain, restrained low sheen, subtle tonal variation, completely even diffuse lighting, no seams, no stitching, no perspective, no objects, no shadows, seamless material source --ar 1:1 --tile --stylize 40 --chaos 3 --raw --no scratches, embossing, text, watermark
```

### Editorial Fabric Pattern

```text
refined small-scale woven textile pattern for a modern fashion atelier, warm ivory ground, restrained bottle green and oxblood geometric marks, subtle irregular hand-drawn quality, sophisticated editorial rhythm, low contrast, flat colour, no lighting, no perspective, seamless repeating fabric pattern --ar 1:1 --tile --stylize 90 --chaos 8 --raw --no flowers, paisley, logos, letters, text, watermark
```

## Round 8 - Brand And Launch Imagery

Only run this round after the in-product visual language is approved.

### Launch Hero

```text
full-bleed editorial product photograph of the approved contemporary wardrobe standing open in a dark modern atelier room, real garments visible and inspectable, pale oak and ebonized timber, aged brass, warm linen, bottle green and oxblood accents, soft northern daylight and warm internal light, premium fashion archive atmosphere, object centered with the lower section of the room still visible, clean negative space for a short headline, no people, no readable text, no logos --ar 16:9 --stylize 130 --chaos 5 --raw --sref [STYLE_REF_URL] --sw 130 --no split layout, floating cards, gradients, neon, bokeh, watermark
```

### Social Portrait

```text
editorial portrait crop of the approved contemporary wardrobe interior, beautifully spaced garments, tactile pale oak, ebonized timber and aged brass, linen details, bottle green and oxblood accents, soft directional fashion-studio lighting, strong depth, realistic materials, no people, no readable text, no logos --ar 4:5 --stylize 140 --chaos 6 --raw --sref [STYLE_REF_URL] --sw 130 --no gradients, neon, bokeh, watermark
```

## Selection Rubric

Score every candidate from 1 to 5 in each category:

| Criterion | Question |
|---|---|
| Product clarity | Is the wardrobe or workflow immediately understandable? |
| Implementation feasibility | Can we reproduce the important forms in Three.js and CSS? |
| Material balance | Are timber, linen, metal, charcoal, and accents distinct? |
| Operational space | Is there room for real UI without obscuring the product? |
| Consistency | Does it belong to the same product as the master frame? |
| Restraint | Does it avoid visual noise, effects, and decorative excess? |
| Mobile usefulness | Can its hierarchy survive a narrow viewport? |

Reject candidates that rely on impossible geometry, illegible darkness,
generated typography, excessive ornament, or purely atmospheric blur.

## Required Handoff

Place selected originals in this structure when ready:

```text
references/midjourney/
  01-master-style/
  02-station-keyframes/
  03-desktop-layouts/
  04-mobile-layouts/
  05-material-tiles/
  06-launch-images/
```

For every selected asset, keep a small text file with:

- Original prompt.
- Model version.
- Seed.
- Style Reference URL and weight.
- Omni Reference URL and weight, when used.
- Generation date.
- Any edit or upscale applied afterward.

Export original PNG or JPEG files rather than screenshots. Do not remove the
original generation metadata until the asset has been recorded in `ASSETS.md`.

## Privacy And Rights Check

- Use only reference images you own or have permission to upload.
- Do not upload private user wardrobe photographs for this visual sprint.
- Midjourney creations may be public and remixable depending on your plan and
  settings. Use Stealth where appropriate and avoid shared Discord channels for
  confidential visual development.
- Before shipping a generated image, confirm your subscription and company
  usage meet the current Midjourney commercial terms.

