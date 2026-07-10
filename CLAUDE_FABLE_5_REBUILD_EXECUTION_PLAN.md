# The Wardrobe: Full Rebuild Execution Plan

## Handoff for Claude Fable 5

This document is the complete implementation brief for the next version of The Wardrobe. It is intended to be usable without access to the conversation that produced it.

You will receive three attached folders:

1. `the-wardrobe/` - the current working application and the repository to improve.
2. `DigiDrobe Prep/` - the original product brief, camera specification, style guide, merge notes, mockup, and an older source snapshot.
3. `wardrobe MJ/` - the approved Midjourney visual-development package. This is the primary visual reference for the redesign.

The user wants a major redesign and production rebuild, not a cosmetic pass. Preserve the main-menu camera movement and its interaction quality. Everything else may be rethought, replaced, reorganized, or removed when that creates a better product.

---

## 1. Mission

Build a production-capable personal wardrobe application that feels like a contemporary fashion archive rather than an antique wardrobe, a Three.js demo, or a conventional SaaS dashboard.

The finished product must combine:

- A memorable desktop 3D menu with choreographed camera movement.
- Fast, legible, task-oriented 2D workspaces for real wardrobe management.
- A mobile experience designed around touch and daily use, not a compressed desktop canvas.
- Real accounts, private cloud persistence, image storage, saved outfits, style boards, and useful insights.
- Honest integrations and states. Production must never present fabricated receipt, retailer, or price data as real.
- A visual language derived from the Midjourney references, translated into a coherent system rather than copied as screenshots.

The primary end-to-end success path is:

> Create or sign into an account -> add a real garment photo -> process and review the cutout -> save it -> find it in Collection -> use it in an Outfit -> return later on another device and see the same data.

That flow must be reliable before secondary features are considered finished.

---

## 2. Source Authority and Conflict Rules

When the attached materials disagree, use this order of authority:

1. The user's latest direction in this document: full redesign, keep main-menu camera movement.
2. `wardrobe MJ/references/midjourney/` for the new visual language.
3. This execution plan for product, architecture, behavior, and build order.
4. `DigiDrobe Prep/the-wardrobe-camera-motion-spec.md` and the current camera implementation for motion quality.
5. The remaining `DigiDrobe Prep/` documents for product history and useful concepts.
6. The current `the-wardrobe/` implementation as a code reference, not as a design authority.

Important consequences:

- The old dark oak and walnut treatment is superseded by the modern atelier direction.
- The old seven-station structure is not binding. Physical station ideas can survive while the information architecture is simplified.
- The old statement that v1 has no backend, accounts, or mobile layout is obsolete.
- The Midjourney desktop and mobile images are composition references only. They do not contain complete or usable UI.
- Midjourney-generated text, icons, controls, geometry mistakes, material seams, and baked lighting must not be copied.

---

## 3. Current Application Audit

### What is worth retaining

The current repository contains several strong technical ideas:

- `src/scene/CameraRig.tsx` implements interruptible camera flights along quadratic Bezier arcs.
- The camera target leads position by about 80 ms, which gives the movement its cinematic pan-then-dolly character.
- Flights settle with a subtle overshoot, retain world-up, and avoid camera roll.
- `src/scene/stations.ts` centralizes station framings and transition types.
- `src/state/navigation.ts` supports deep links, browser history, interruption, door state, and reduced motion.
- The application already separates storage, image, email, and price behavior behind adapter concepts.
- Image blobs are kept out of `localStorage` and stored in IndexedDB.
- The app has useful early concepts for garment cutouts, owned versus wishlist status, outfits, price insights, and style boards.
- The production build and nine unit tests currently pass.

Treat those as reference implementations. Do not assume their APIs, file locations, or visual output must remain unchanged.

### What must change

The current application is still a prototype:

- Persistence is browser-local. There are no real user accounts, cloud data, cross-device sync, or server authorization.
- The default capsule, receipts, prices, and retailer listings are generated or mocked.
- The Gmail adapter is only a TODO stub.
- Background removal is primarily a chroma-key worker and is not adequate for arbitrary real-world photos.
- The core item model is too small for a useful wardrobe product.
- Server data, transient UI state, and persistence concerns are mixed into Zustand stores.
- `src/scene/Wardrobe.tsx` is a large monolith and `src/ui/panels.css` has grown into a large global stylesheet.
- The app waits while demo garments are generated. In the current browser smoke suite, three of four end-to-end tests time out while the UI remains on `Preparing garments`; first-run work is blocking entry behavior.
- Mobile is a responsive retrofit around a desktop 3D concept, not a designed mobile product.
- The old visual treatment is brown-heavy, dim, and period-furniture oriented compared with the Midjourney package.
- The current outfit representation and style editor are promising prototypes, but do not yet meet production editing, persistence, undo, accessibility, or export requirements.
- The current price experience can be mistaken for live data even though it is deterministic sample data.
- Production code splitting, monitoring, security headers, backups, deployment environments, and operational documentation are incomplete.

### Baseline verification recorded during this audit

- `npm test`: 9 tests passed.
- `npm run build`: passed.
- Build warning: the Three.js vendor chunk is over the default 500 kB warning threshold before gzip.
- `npm run test:e2e`: 1 passed and 3 failed because the first-run garment preparation did not complete before entry expectations.

Do not hide or delete this baseline. Use it to demonstrate measurable improvement.

---

## 4. Product Decisions for the Rebuild

### 4.1 Preserve the camera grammar, not the old coordinates

Keep the recognizable qualities of the current main-menu camera:

- Choreographed position and look-target movement.
- Slightly arced paths.
- Target lead.
- Short anticipation before departure.
- Soft arrival and 2 percent settle.
- Interruption from the current camera state.
- Fixed portrait-style FOV during travel.
- Zero roll.
- Browser back and forward support.
- Reduced-motion crossfade.
- Stable scene geometry in frame throughout the move.

Do not freeze the old station coordinates, wardrobe proportions, door angles, or transition matrix. Re-author those for the new cabinet and new information architecture.

### 4.2 Simplify top-level navigation

The old Rail and Shelves stations duplicate the same user need. Use five clear product destinations plus the overview:

| Destination | Physical metaphor | Primary job |
|---|---|---|
| Overview | Closed or fully composed wardrobe | Orientation and camera-led menu |
| Collection | Rail, shelves, and archive drawers | Search, browse, filter, edit, and select garments |
| Outfit Studio | Mirror and dress form | Assemble, save, and revisit outfits |
| Style Studio | Linen pinboard | Create editorial boards and exports |
| Insights | Ledger drawer | Understand value, wear, gaps, and purchase behavior |
| Add / Import | Post tray and camera surface | Add photographs, URLs, or supported receipts |

Account and settings are global application controls, not a camera station.

Use plain labels such as `Collection` and `Insights` in operational UI. Physical names such as `The Rail` or `The Ledger` may appear as subtle scene labels, but the user must never need to decode the metaphor to complete a task.

### 4.3 Use 3D for identity and orientation, 2D for work

The 3D world should make the product distinctive. It should not make routine tasks slow.

- Desktop overview and destination changes use the persistent 3D scene.
- Collection, item detail, import, outfit editing, boards, insights, and settings use real semantic 2D controls over or beside the scene.
- Task workspaces may expand and reduce the visible 3D area when more room is needed.
- Mobile is 2D-first. Use a small live or static wardrobe header where it adds identity, then prioritize native-feeling lists, trays, forms, and bottom navigation.
- Every 3D navigation action must have a semantic DOM equivalent for keyboard and assistive technology.

### 4.4 Build an honest MVP

Do not ship fake production integrations.

- Manual photo upload is a real MVP feature.
- Camera capture on supported mobile browsers is a real MVP feature.
- Cloud save, item editing, deletion, outfits, boards, and user data controls are real MVP features.
- Receipt email scanning is only live when secure OAuth and parsing are connected.
- Retail price comparison is only live when a legitimate provider is connected.
- A provider that is not configured produces a disabled or coming-later state in production, not sample results.
- Sample data may exist only in an explicit development or demo environment.

---

## 5. New Information Architecture

Use real routes rather than hashes as the primary application URL. Keep camera state synchronized with route state.

Recommended routes:

```text
/auth/sign-in
/auth/callback
/app
/app/collection
/app/collection/:itemId
/app/outfits
/app/outfits/new
/app/outfits/:outfitId
/app/style
/app/style/new
/app/style/:boardId
/app/insights
/app/import
/app/import/:jobId
/app/settings/profile
/app/settings/preferences
/app/settings/connections
/app/settings/data
```

Behavior rules:

- `/app` frames the overview.
- Navigating to a feature route moves the camera to its physical destination when full motion is enabled.
- Deep links open the correct workspace directly. The wardrobe scene may load progressively behind it.
- Browser back and forward update both workspace and camera.
- Item detail is addressable and shareable within the account, not an unrouteable transient panel.
- Closing a detail view returns to the previous collection filter and scroll position.
- Authentication redirects preserve the intended destination.
- Configure the production host with an SPA fallback for direct route loads.

---

## 6. Visual Direction

### 6.1 Overall character

The new direction is a contemporary fashion archive with architectural discipline:

- Pale quarter-sawn oak for selected cabinet surfaces and interior craft.
- Ebonized timber or blackened structural members for contrast and precision.
- Translucent woven linen, reeded glass, or textile-backed panels.
- Aged brass for hardware, rails, thin rules, and selected highlights.
- Matte charcoal and warm grey architectural surroundings.
- Bottle green for storage, ownership, success, and restrained selected states.
- Oxblood for destructive actions, exceptional emphasis, and occasional material detail.
- Soft northern daylight balanced with warm internal cabinet task lights.
- Large areas of calm negative space.
- Garments spaced like an archive or editorial collection, never a crowded shop rail.

The result should be brighter, cleaner, more precise, and less brown than the current app.

### 6.2 Avoid the gold cast

Several Midjourney frames lean heavily yellow because of generated lighting. The asset log explicitly records this as a problem.

- Brass must read as aged metal, not yellow paint.
- Linen must remain ivory or warm neutral, not gold.
- Oak should remain pale and legible.
- Use warm cabinet lights locally while keeping neutral daylight and charcoal surroundings.
- Calibrate final color from side-by-side screenshots, not from one generated frame.

### 6.3 Coherent cabinet design

The generated frames do not depict one perfectly consistent piece of furniture. Resolve them into one designed object:

- An ebonized outer structural frame with slim architectural reveals.
- Pale oak shelves, selected dividers, and tactile interior elements.
- Aged brass handles, rail, hinges, pins, and ruler details.
- Translucent linen or reeded panels with a restrained brass or dark frame.
- Dark neutral interior back panels so real garments remain legible.
- Integrated linear lights with believable housings.
- One consistent plinth, depth, hinge system, and module grid across all destinations.

Create a cabinet elevation and module plan before final geometry. Do not assemble seven unrelated generated cabinets.

### 6.4 Typography

Fraunces and Inter remain suitable, but use them more selectively than the old UI:

- Fraunces for the wordmark, major workspace titles, saved outfit titles, and editorial captions.
- Inter for all operational UI, body text, forms, metadata, tables, filters, and controls.
- Do not set all operational labels in widely tracked small caps.
- Use normal case for scan-heavy interfaces.
- Do not use viewport-scaled font sizes.
- Body text must remain readable at 16 px on mobile and at least 14 px in dense desktop controls.
- Letter spacing must be zero except for the wordmark and rare short labels.

### 6.5 UI surfaces

- Treat linen as a working material, not a reason to put every section in a cream card.
- Page sections are unframed and full-width within the workspace.
- Cards are reserved for repeated garments, outfits, saved boards, and modal dialogs.
- Use a maximum 8 px radius; compact operational elements should usually use 4-6 px.
- Avoid cards inside cards.
- Use thin dark or brass dividers, material changes, spacing, and alignment for hierarchy.
- Use subtle texture only where it survives compression and does not reduce legibility.
- Never use glassmorphism, gradient orbs, bokeh decoration, purple-blue gradients, or generic dashboard-card grids.

### 6.6 Controls

- Use Lucide icons for familiar actions.
- Icon buttons require accessible names and tooltips when meaning is not obvious.
- Use a segmented control for grid/list/rail views and owned/wishlist/all modes.
- Use checkboxes for multi-select and toggles for binary preferences.
- Use menus for category, season, occasion, and sort option sets.
- Use sliders or steppers only for numeric editing such as scale or board zoom.
- Destructive actions use an explicit confirmation dialog and oxblood emphasis.
- Touch targets must be at least 44 by 44 CSS pixels on mobile.

### 6.7 Initial token roles

Do not blindly reuse the old hex values. Sample and calibrate from the actual reference files, then validate contrast. Start with these roles:

```css
:root {
  --room: /* matte charcoal, neutral rather than brown */;
  --room-raised: /* lighter charcoal workspace chrome */;
  --oak-pale: /* sampled from pale quarter-sawn oak */;
  --ebonized: /* sampled from ebonized timber */;
  --linen: /* sampled from warm tailoring linen */;
  --linen-raised: /* cleaner reading surface */;
  --ink: /* deep neutral ink */;
  --ink-muted: /* accessible secondary text */;
  --brass: /* aged brass, controlled saturation */;
  --bottle: /* owned, selected, success */;
  --oxblood: /* danger and rare editorial accent */;
  --line-light: /* border on light surfaces */;
  --line-dark: /* border on dark surfaces */;
  --focus: /* high-contrast keyboard focus */;
}
```

Define semantic roles such as `--surface`, `--text`, `--danger`, and `--success` separately from raw material colors. Do not use brass for small body text because it often fails contrast.

---

## 7. Midjourney Asset Translation Map

The path names below are relative to `wardrobe MJ/references/midjourney/`.

| Asset | Use it for | Do not use it for |
|---|---|---|
| `00-direction-exploration/direction-c-glass-brass-wardrobe.png` | Modular frame, fashion-laboratory precision, translucent panels, high contrast, gallery lighting | Final color balance or literal geometry |
| `01-master-style/master-style-frame.jpg` | Primary material balance, negative space, object scale, off-center editorial framing | A background image behind operational UI |
| `02-station-keyframes/01-closed-wardrobe-entry.png` | Closed silhouette, floor contact, entry calm, seam lighting | Exact door construction |
| `02-station-keyframes/02-open-wardrobe-collection.png` | Collection density, garment spacing, two-sided archive composition | Exact number of rails or items |
| `02-station-keyframes/03-shelves-accessories.png` | Lit module rhythm, folded storage, shelf proportions | A separate top-level Shelves product route |
| `02-station-keyframes/04-mirror-outfit-studio.png` | Dress-form silhouette and full-height working area | Literal generated outfit controls |
| `02-station-keyframes/05-ledger-insights.png` | Strongest functional metaphor: shallow drawer, linen work surface, brass ruler, analytical calm | Generated marks or fake financial data |
| `02-station-keyframes/06-pinboard-style-studio.png` | Large linen canvas, refined negative space, physical pins and swatches | Final layout without reviewing alternatives; the asset log notes this choice was accidental |
| `02-station-keyframes/07-post-tray-import.png` | Private capture station, camera and tray metaphor, organized review surface | A mail-room interface or literal generated camera UI |
| `03-desktop-layouts/desktop-collection-workspace.png` | Scene plus workspace relationship and practical density | Pixel layout; it did not achieve the requested 2/3 plus 1/3 split |
| `03-desktop-layouts/desktop-garment-detail.png` | One hero garment with focused inspection | Ecommerce product-page conventions |
| `03-desktop-layouts/desktop-outfit-studio.png` | Full-height dress form plus control surface | Generated pseudo-controls or rounded container silhouette |
| `04-mobile-layouts/mobile-collection.png` | Compact wardrobe identity above fast native collection UI | A literal phone-shaped wardrobe or always-live full-screen 3D |
| `04-mobile-layouts/mobile-add-flow.png` | Large image review and strong confirmation hierarchy | Hiding fields or controls because the image omits text |
| `04-mobile-layouts/mobile-outfit-studio.png` | Vertical garment focus and bottom control tray | Literal equipment-like knobs, drawers, or fake UI |
| `05-material-tiles/*` | Color, grain, weave, and pattern direction | Finished production PBR assets |
| `06-launch-images/*` | Future campaign imagery, social crops, or a carefully licensed static fallback | In-app workspace backgrounds |

Asset rules:

1. Read each matching `.txt` sidecar before using an image.
2. Preserve the asset log and source metadata.
3. Confirm Midjourney commercial rights for the user's plan before public use.
4. The six material images have unverified seams and no roughness, normal, or displacement maps.
5. Prefer licensed, truly seamless PBR materials color-matched to the references for production 3D.
6. If deriving maps from a Midjourney tile, test all seams at multiple repeats under neutral light before approval.
7. Do not bake generated shadows or yellow lighting into albedo textures.
8. Do not ship a generated layout image as the UI itself.
9. Do not use generated pseudo-text or icons.
10. Keep launch imagery out of the critical application bundle.

---

## 8. Application Shell

### Desktop

The desktop app should use a persistent full-viewport scene with a restrained semantic shell:

- Top bar: wordmark, current destination, global Add action, notifications or processing status when needed, account menu.
- Primary navigation: a slim left rail or lower edge control with clear icon plus text destinations.
- Scene region: normally 58-66 percent of usable width in Collection and Outfit Studio.
- Workspace region: normally 34-42 percent, with a practical minimum width around 400 px.
- Expandable workspaces: Style Studio, data-heavy Insights, and long settings forms may take most or all of the content area while retaining a small visual connection to the scene.
- No floating UI should cover the garment or object currently being inspected.
- Resizing a panel must not change the scene framing unexpectedly; camera framing accounts for the reserved UI safe area.

### Mobile

Use a purpose-built mobile shell:

- Persistent bottom navigation with no more than five primary destinations.
- A central Add action may be visually prominent but must remain a normal accessible button.
- Collection is the default daily-use screen.
- Use a compact wardrobe header or static scene crop only where it supports orientation.
- Do not run expensive 3D continuously behind forms, lists, or editors.
- Item detail, import review, Outfit Studio, Style Studio, and settings use full-screen routes or sheets.
- Respect safe-area insets and browser chrome.
- Keep primary commands reachable near the bottom without obscuring content.

### Responsive breakpoints

Define breakpoints by layout need, not by device name. At minimum test:

- 390 x 844 phone.
- 430 x 932 large phone.
- 768 x 1024 tablet portrait.
- 1024 x 768 tablet landscape.
- 1280 x 800 laptop.
- 1440 x 900 desktop.
- 1728 x 1117 large desktop.

---

## 9. Screen and Workflow Specifications

### 9.1 Entry and main-menu camera

Purpose: establish identity quickly and provide an elegant route into real work.

Required behavior:

- Show a complete, grounded closed wardrobe or composed overview immediately.
- Render meaningful HTML UI before heavy scene assets finish.
- Do not generate demo garments during boot.
- If signed out, present a concise sign-in or account-creation path without turning the screen into a marketing landing page.
- If signed in, the main action opens the wardrobe and takes the user to Collection.
- Destination navigation remains available in semantic DOM.
- The door ritual may play once per deliberate session entry, not every time the user returns from a feature.
- Returning to overview uses the preserved pull-back camera character.
- Deep links do not force the user through the door ritual before showing requested data.
- A WebGL fallback uses a static approved image plus fully functional 2D navigation.

Acceptance criteria:

- The shell is usable even if the 3D bundle fails.
- No first-run task blocks the Enter or Open action.
- No visible geometry pop-in after the scene reports ready.
- Camera transition duration is at most 1.4 seconds.
- Spam-clicking destinations retargets smoothly.
- Reduced-motion mode uses a short crossfade and disables idle movement.
- The destination's final frame is composition-worthy at every tested desktop size.

### 9.2 Authentication and onboarding

Keep onboarding short and connected to value.

Recommended flow:

1. Sign in or create an account using email magic link or another approved provider.
2. Ask only for display name, default currency, locale, and motion preference when not inferable.
3. Offer `Add first item` as the primary action and `Explore empty wardrobe` as secondary.
4. After the first saved item, land in Collection with that item selected.

Requirements:

- Authentication loading, expired link, duplicate account, offline, and provider error states.
- Preserve the intended route across authentication.
- Do not require a tutorial carousel.
- Explain storage and privacy at the point it matters, not in a long feature tour.
- Onboarding completion is stored per account.
- Guest or demo mode, if retained, must be visibly separate from a real account and must not imply sync.
- Provide keyboard focus management and screen-reader announcements for each step.

### 9.3 Collection

Collection replaces the old top-level Rail and Shelves split.

Core controls:

- Search by item name, brand, notes, and tags.
- Filter by ownership, category, subcategory, color, season, occasion, size, brand, status, and date added.
- Sort by newest, oldest, name, brand, price, recently worn, most worn, and least worn where data exists.
- Segmented view control: Grid, Rail, and List. Mobile may omit Rail if it harms usability.
- Multi-select with bulk ownership, archive, tag, outfit, board, and delete actions.
- Clear active-filter summary and one-command reset.
- Saved scroll position and filters when returning from detail.

Garment tiles:

- Use the real cutout as the first visual signal.
- Show name and brand without hover dependence.
- Show ownership or processing state without relying on color alone.
- Keep tile dimensions stable while images load.
- Use skeletons with the same dimensions.
- Do not put each tile inside another decorative card.
- Use virtualization or pagination for large wardrobes.

3D relationship:

- The scene can display a curated subset or current filter as garments on rails and shelves.
- The 2D collection remains the authoritative complete list.
- A wardrobe containing hundreds of items must not create hundreds of live Three.js meshes.
- Selecting a garment can focus or highlight its scene representation when one exists.

Acceptance criteria:

- Search and filters remain responsive with at least 1,000 seeded test items.
- Empty results distinguish an empty wardrobe from filters with no matches.
- Bulk actions are reversible where practical or explicitly confirmed.
- Keyboard users can reach every item and action.
- Collection remains fully usable without WebGL.

### 9.4 Garment detail

Layout:

- Large inspectable original or cutout image.
- Clear identity block: name, brand, category, ownership.
- Organized editable metadata, not a marketing product page.
- Related usage: outfits, style boards, wear history, and source.
- Contextual command bar: Edit, Add to outfit, Add to board, Move to wishlist/owned, Archive, Delete.

Fields for the production model:

- Name and brand.
- Category and subcategory.
- Ownership status: owned, wishlist, archived.
- Garment template or layer type.
- Size.
- Primary color and extracted palette.
- Season and occasion tags.
- Material or fabric notes.
- Purchase price, currency, purchase date, merchant, and product URL.
- Notes.
- Original image, cutout, and processing status.
- Wear count and last worn date.

Behavior:

- Edit uses schema validation and clear unsaved-change handling.
- Optimistic updates roll back on failure.
- Delete confirms the item, dependent outfit references, board references, and image cleanup behavior.
- Prefer archive over delete for ordinary removal.
- Replace or reprocess image without creating a duplicate garment.
- Signed image URLs refresh without breaking the view.

### 9.5 Add and import

This is a core product workflow, not a small modal.

Supported MVP sources:

- Choose a photo.
- Capture a photo on supported mobile devices.
- Add without a photo and attach one later.
- Optional development sample import, excluded from production.

Post-MVP sources behind typed adapters:

- Product URL.
- Receipt image or PDF.
- Connected email receipt provider.
- Batch import.

MVP flow:

1. Choose or capture image.
2. Validate file type, size, dimensions, and orientation.
3. Upload the original to private storage.
4. Create a durable import job.
5. Remove the background and generate normalized cutout and thumbnails.
6. Show progress that survives route changes.
7. Present before-and-after review.
8. Allow crop, rotate, retry, and a simple keep-original fallback.
9. Suggest metadata only when a real classifier exists; otherwise use sensible defaults.
10. Review required fields.
11. Save idempotently.
12. Confirm success and open the new item in Collection.

Required states:

- Drag-over.
- File rejected.
- Uploading with byte progress.
- Queued.
- Processing.
- Background removal failed.
- Processing timed out.
- Review ready.
- Saving.
- Saved.
- Offline before upload.
- Connection lost during upload.
- Retry without duplicate records.
- Cancel and cleanup.

Image requirements:

- Accept JPEG, PNG, and WebP initially.
- Set a documented size limit, initially 15 MB unless the backend dictates otherwise.
- Correct EXIF orientation and strip unnecessary metadata.
- Keep the original privately.
- Generate a normalized transparent cutout, a display WebP, and small thumbnails.
- Record width, height, byte size, MIME type, and processing version.
- Do not treat a rectangular original photo as a successful cutout.
- Keep image processing behind a replaceable service interface.

### 9.6 Outfit Studio

The visual reference is the mirror and dress-form station, but the interaction must be practical.

Core workflow:

- Create a new outfit from Collection selection or from the studio.
- Search and filter a horizontal or side garment tray.
- Add and remove garments.
- Place garments into typed layer slots.
- Reorder compatible layers.
- Show conflicts and unavailable combinations clearly.
- Save name, occasion, season, notes, and optional planned date.
- Save a cover composition.
- Duplicate and edit existing outfits.
- Log an outfit as worn, creating wear events for included items.

Rendering strategy:

- Do not promise physically accurate virtual try-on from a front cutout.
- Use a refined editorial layering composition on a dress form or mirror surface.
- Prove the layering approach with varied real cutouts before building all controls.
- A 2D canvas or controlled WebGL plane composition is acceptable and may be more accurate than fake low-poly clothing meshes.
- Wishlist pieces retain a distinct treatment and are not counted as owned value.

Controls:

- Garment tray.
- Layer list with drag reorder where valid.
- Hide/show or remove.
- Undo and redo.
- Clear outfit.
- Save and duplicate.
- Total purchase value, labeled accurately.

Mobile:

- Composition occupies the upper area.
- Garment tray and layer controls use a bottom sheet.
- Primary Save command remains reachable.
- Avoid literal knobs, dials, or equipment-like controls.

### 9.7 Style Studio

Style Studio is an editorial composition tool, not a scrapbook.

Use a proven canvas/editor library such as React Konva or Fabric after a short spike. Do not hand-roll selection handles, transforms, and export unless the chosen library demonstrably cannot meet requirements.

Required element types:

- Garment cutout.
- Color or fabric swatch.
- Uploaded inspiration image.
- Serif caption.
- Optional simple rule or background block.

Required editor behavior:

- Select, multi-select, drag, resize, rotate, duplicate, delete, lock, hide, and reorder.
- Undo and redo with a bounded history.
- Keyboard delete, arrow nudge, and modifier behavior on desktop.
- Snap to edges, centers, grid, and neighboring elements.
- Zoom and pan without changing export coordinates.
- Autosave draft state.
- Explicit saved state and last-saved indicator.
- Recoverable error when an image cannot load.
- Deterministic high-resolution export.
- Export result must match the editor.
- Persist a structured document model, not only a flattened image.
- Generate a cover thumbnail separately.

Default auto-layout:

- Work for 1-8 selected garments.
- Prioritize outerwear, tops, and bottoms as hero pieces.
- Use generous negative space.
- Use at most a few palette swatches.
- Avoid random rotation and clutter.
- Produce an acceptable result before manual adjustment.

### 9.8 Insights

Replace the prototype's fabricated retailer comparison with insights based on the user's real data.

MVP insights:

- Total owned items.
- Recorded wardrobe purchase value, clearly labeled as incomplete when prices are missing.
- Category distribution.
- Color distribution.
- Most and least worn items.
- Items not worn within a chosen period.
- Cost per wear where both price and wear data exist.
- Purchase cadence.
- Wishlist count and recorded value.
- Data-completeness prompts that link directly to editable items.

Interaction:

- Date-range or period control where relevant.
- Accessible chart summaries and table alternatives.
- Drill from an insight to a filtered Collection.
- Use the ledger drawer and brass ruler as visual framing, not as a reason to make charts illegible.
- Keep the layout dense, calm, and comparison-friendly.

Future provider-backed insight:

- Price observations and retailer links may be added only through a legitimate provider or user-entered observation.
- Do not implement generic scraping as a launch dependency.

### 9.9 Account and settings

Use routed settings sections rather than one crowded modal.

Profile:

- Display name.
- Avatar optional.
- Email and authentication providers.
- Default currency and locale.

Preferences:

- Reduced motion.
- 3D quality: Auto, High, Reduced.
- Default Collection view.
- Optional notification preferences when notifications exist.

Connections:

- Email receipt connection status.
- Last successful sync.
- Reconnect and disconnect.
- Exact permission scope.
- No connection UI when the feature is not compiled or configured.

Data and privacy:

- Storage usage summary.
- Export account data.
- Export garment metadata.
- Download original images where supported.
- Delete account and all associated data.
- Sign out.
- Clear explanation of local cache versus cloud data.

Danger-zone actions require fresh confirmation and a clear account-recovery policy.

### 9.10 Empty, loading, error, and offline states

Every major screen needs an explicit state matrix.

General rules:

- Skeletons reserve final dimensions.
- Spinners are used only for short indeterminate operations.
- Long processing jobs show named stages and can continue in the background.
- Errors identify what failed, what data is safe, and what action is available.
- Retry must be idempotent.
- Empty states include the next useful command but avoid long feature explanations.
- Toasts confirm short-lived success; important failures remain visible inline.
- Route-level error boundaries prevent one editor or scene failure from blanking the app.
- An offline banner does not cover navigation or primary actions.
- Do not silently discard unsaved editor or form work.

Minimum explicit states:

| Surface | Empty | Loading | Error |
|---|---|---|---|
| Collection | No items; Add first item | Stable garment tile skeletons | Retry query; retain filters |
| Filtered Collection | No matches; clear filters | Existing results may remain during refetch | Keep previous data when safe |
| Item detail | Item missing or archived | Image and metadata skeleton | Return to Collection and retry |
| Import | No active job; choose source | Upload and processing stages | Retry, replace image, or cancel |
| Outfits | No outfits; create one | Stable outfit thumbnails | Retry without losing draft |
| Style boards | No boards; create one | Stable board thumbnails | Recover draft or retry |
| Insights | Not enough data | Chart skeletons | Show unaffected metrics |
| Settings | Not applicable | Section-level saving state | Inline save failure and retry |
| 3D scene | Static fallback | Progressive scene load | 2D app remains usable |

---

## 10. Backend and Data Architecture

### 10.1 Recommended production foundation

Use Supabase as the default backend unless the user supplies an existing backend:

- Supabase Auth for account identity.
- Postgres for relational data.
- Row Level Security for per-user authorization.
- Private Supabase Storage buckets for originals, cutouts, thumbnails, and exports.
- Database migrations committed to the repository.
- Generated database types consumed by the client.
- Server or edge functions for privileged orchestration.
- A dedicated processing adapter or worker for heavy image work.

Do not put a service-role key, OAuth client secret, refresh token, or paid-provider secret in the browser bundle.

If a different backend is selected, preserve the same repository and service boundaries.

### 10.2 Client state boundaries

Use the right tool for each state type:

- TanStack Query or an equivalent server-state library for authenticated remote data, caching, mutations, retries, and invalidation.
- Zustand only for transient client state such as camera destination, selected IDs, panel state, editor tool mode, and unsaved composition history.
- React Hook Form plus Zod, or equivalent typed form and schema validation, for forms.
- Database-generated types at persistence boundaries.
- Domain mappers so database rows are not passed directly through the entire UI.

Do not use one global Zustand store as a database cache.

### 10.3 Service boundaries

Create typed interfaces for:

```text
AuthService
ProfileRepository
WardrobeRepository
OutfitRepository
StyleBoardRepository
WearRepository
ImportJobRepository
MediaService
ImageProcessingService
ReceiptImportService
PriceObservationService
AnalyticsService
```

Provide explicit production and local-test implementations. Development mocks must be opt-in and impossible to confuse with production data.

### 10.4 Data model

Use UUID primary keys, `created_at`, `updated_at`, and user ownership on all top-level records. Add indexes for every foreign key and common filter.

#### `profiles`

- `id` references auth user.
- `display_name`.
- `avatar_path` nullable.
- `default_currency`.
- `locale`.
- `reduced_motion`.
- `quality_preference`.
- `default_collection_view`.
- `onboarding_completed_at`.
- timestamps.

#### `wardrobe_items`

- `id`, `user_id`.
- `name`, `brand`.
- `category`, `subcategory`.
- `template` or `layer_type`.
- `ownership_status`: owned, wishlist, archived.
- `size` nullable.
- `primary_color` nullable.
- `palette` JSON array with validation.
- `seasons` and `occasions` as validated arrays or normalized tags.
- `material_notes` nullable.
- `notes` nullable.
- `price_paid` nullable numeric.
- `currency`.
- `purchased_at` nullable.
- `merchant` nullable.
- `product_url` nullable.
- `source_type`: manual, camera, url, receipt, email, import.
- `last_worn_at` nullable.
- `wear_count` may be cached but must be derivable from wear events.
- `processing_status`.
- `version` or another optimistic-concurrency field.
- timestamps and optional `deleted_at` for soft deletion.

#### `item_images`

- `id`, `user_id`, `item_id`.
- `kind`: original, cutout, display, thumbnail.
- `storage_path`.
- `mime_type`, `width`, `height`, `bytes`.
- `processing_version`.
- `status` and error code.
- timestamps.

#### `outfits`

- `id`, `user_id`.
- `name`.
- `occasion`, `season`, `notes`, and planned date nullable.
- `cover_image_path` nullable.
- timestamps and optional soft delete.

#### `outfit_items`

- `outfit_id`, `item_id` composite uniqueness.
- `layer_slot`.
- `sort_order`.
- composition values when needed: normalized x, y, scale, rotation.

#### `style_boards`

- `id`, `user_id`.
- `title`.
- `document_version`.
- `canvas_width`, `canvas_height`.
- `cover_image_path`, `export_image_path` nullable.
- timestamps and optional soft delete.

#### `board_elements`

- `id`, `board_id`, `user_id`.
- `kind`.
- normalized transform values.
- `z_index`, `locked`, `hidden`.
- `item_id` or media path nullable.
- style payload validated by kind.

#### `wear_events`

- `id`, `user_id`.
- `worn_at`.
- `outfit_id` nullable.
- notes nullable.

Use a join table such as `wear_event_items` when an event is not tied to one saved outfit.

#### `import_jobs`

- `id`, `user_id`.
- `source_type`.
- `status`: created, uploading, queued, processing, review, saving, complete, failed, cancelled.
- `progress`.
- `original_path`.
- `result_payload` with a versioned schema.
- safe `error_code` and user-facing message key.
- `idempotency_key` unique per user.
- timestamps and expiry/cleanup metadata.

#### Optional integration tables

- `email_connections` with provider identity and server-only encrypted token references.
- `receipts` and `receipt_line_items` for parsed imports.
- `price_observations` for provider or user-entered price history.

### 10.5 Authorization and RLS

Required rules:

- A user can select, insert, update, and delete only rows they own.
- Child rows must validate ownership through their parent and their own `user_id` where present.
- Storage paths start with the authenticated user ID.
- Storage policies prevent listing or reading another user's folder.
- Signed URLs are short-lived and renewed by the client service.
- Service-role access exists only in trusted server code.
- Test RLS using two real test users and attempted cross-user reads and mutations.
- Soft-deleted rows are excluded from ordinary queries.
- Account deletion removes database rows and storage objects through a durable cleanup process.

### 10.6 Image processing architecture

The existing browser worker is useful as a local fallback, but not sufficient as the only production strategy.

Define one `ImageProcessingService` contract with adapters for:

- Client-side processing using `@imgly/background-removal` or another approved model.
- A production server endpoint backed by a dedicated worker or approved provider.
- A deterministic test adapter.

Recommended production flow:

1. Client requests an upload target.
2. Client uploads original directly to private object storage.
3. Client creates or confirms an idempotent import job.
4. A trusted function validates ownership and enqueues processing.
5. Worker fetches the original, normalizes orientation, removes the background, extracts palette, and writes derivatives.
6. Worker updates the job to review and records processing version.
7. Client receives status through polling or a subscription.
8. User reviews and saves the item.

Do not use a heavy edge runtime for image work until memory, duration, and binary-library limits have been tested. Edge functions may orchestrate a separate worker.

### 10.7 Email receipt integration

Treat email access as a security-sensitive optional integration:

- Use OAuth Authorization Code with PKCE where appropriate.
- Perform token exchange server-side.
- Store refresh tokens encrypted and never return them to the browser.
- Request the narrowest read-only scope that supports the feature.
- Show connection scope and revocation controls.
- Parse email in a sandboxed server process.
- Proxy or fetch remote product images server-side to avoid CORS and tracking issues.
- Use an allowlist or strong sanitization for HTML.
- Make receipt parsing confidence visible and require review before saving.
- Build provider-specific adapters. Do not claim a universal receipt parser.

This is a post-core phase unless credentials and provider approval are already available.

### 10.8 Price data

- Remove the deterministic sample retailer listings from production.
- Use manually recorded purchase prices for MVP insights.
- Add live price observations only when the user chooses a legitimate product-data or affiliate provider.
- Store provider source, currency, URL, and observed timestamp.
- Normalize currency before comparison and label the conversion source and date.
- Never present a stale observation as a current live price.

---

## 11. Frontend Architecture

Keep React, TypeScript, React Three Fiber, Drei, Framer Motion, Zustand, and Lucide unless a measured reason requires change. Avoid a broad dependency upgrade during the first visual slice.

Recommended structure:

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
    error-boundaries/
    layouts/
  features/
    auth/
    onboarding/
    collection/
    items/
    import/
    outfits/
    style-studio/
    insights/
    settings/
  scene/
    Experience.tsx
    camera/
    wardrobe/
    stations/
    materials/
    quality/
  services/
    auth/
    data/
    media/
    processing/
    integrations/
  stores/
    navigation.ts
    selection.ts
    editor.ts
  shared/
    ui/
    hooks/
    lib/
    validation/
  styles/
    tokens.css
    globals.css
```

Architecture rules:

- Keep feature UI, queries, schemas, and tests close together.
- Split the 3D wardrobe into coherent modules. Do not recreate a 700-line cabinet component.
- Keep route state and camera destination synchronized through one typed registry.
- Use CSS modules or similarly scoped styles per feature plus global tokens. Do not rebuild another 1,500-line global panel stylesheet.
- Lazy-load task-heavy editors and secondary routes.
- Lazy-load the 3D scene so authentication and 2D shell do not wait for Three.js.
- Do not import Three.js into ordinary 2D route bundles.
- Keep all provider configuration behind environment validation.
- Add an `.env.example` containing names and descriptions, never secrets.
- Add a typed runtime-config module that fails clearly in production when required settings are absent.

---

## 12. 3D Scene Rebuild

### 12.1 Modules to preserve as behavioral references

Study these current files before changing them:

- `src/scene/CameraRig.tsx`
- `src/scene/stations.ts`
- `src/scene/easing.ts`
- `src/state/navigation.ts`
- `DigiDrobe Prep/the-wardrobe-camera-motion-spec.md`

Preserve their successful motion behavior with tests before deleting or reorganizing them.

### 12.2 Geometry plan

Build the cabinet in two steps:

1. Grey-box one coherent modular cabinet and prove every camera frame, UI safe area, door path, and drawer path.
2. Replace grey-box materials and simplified shapes with final crafted geometry and validated materials.

Prefer a clean GLB authored in Blender for the final cabinet if that workflow is available. If geometry remains procedural, split it by module and give every pivot, dimension, and material assignment a clear source of truth.

Required physical details:

- Believable panel thickness.
- Correct hinge pivots and door clearance.
- Consistent module grid.
- Beveled visible edges.
- Realistic rail and handle proportions.
- Light housings, not floating emissive strips.
- Floor contact and restrained shadows.
- Physically plausible translucent panels.
- Coherent grain direction and texture scale.

### 12.3 Lighting

- Neutral soft daylight provides the global shape.
- Warm cabinet practicals illuminate garments locally.
- One primary shadow-casting light wherever possible.
- Brass catches light without blooming.
- Avoid deep crushed blacks and broad yellow exposure.
- Tone mapping remains filmic and calibrated.
- Bloom, if retained, is subtle and disabled on reduced quality.
- Do not use motion blur, camera shake, lens flare, or speed effects.

### 12.4 Camera requirements

- FOV generally 32-38 degrees and fixed during travel.
- Adjacent move: about 0.7-0.9 seconds.
- Standard move: about 1.0-1.2 seconds.
- Overview or door sequence: no more than 1.4 seconds.
- Target begins about 80 ms before position.
- Quadratic arc control point keeps the cabinet in frame.
- Arrival includes subtle overshoot and settle.
- New navigation during a flight retargets immediately.
- UI fades during flight and settles after the camera.
- Camera never rolls or clips a door, panel, garment, or workspace safe area.
- Reduced motion disables flights, idle breathing, parallax, and object choreography that could discomfort the user.

### 12.5 Adaptive quality and fallback

Quality levels:

- High: full validated material set, primary shadows, restrained post-processing.
- Auto: choose DPR and effects from measured device capability and frame time.
- Reduced: lower DPR, smaller shadow maps, no bloom, simplified translucency, fewer live garments.
- Fallback: static image or CSS background with full 2D app.

Operational requirements:

- Pause or reduce rendering when the page is hidden.
- Do not continuously render the scene behind full-screen mobile workspaces.
- Use KTX2 or otherwise compressed textures for production where practical.
- Cap texture size based on visible screen contribution.
- Instance repeated hardware where it produces a real draw-call reduction.
- Limit live 3D garments to a curated set.
- Test the canvas for nonblank pixels and useful luminance variance, not merely DOM visibility.

---

## 13. Migration Strategy

The repository currently has a dirty working tree with substantial user changes. Preserve it.

Before implementation:

1. Run `git status` and inventory all modified and untracked files.
2. Do not use `git reset --hard`, `git checkout --`, or delete current changes.
3. Ask the user to approve a baseline checkpoint commit if the current work is not already safely committed.
4. Create a dedicated rebuild branch after the baseline is safe.
5. Record the current unit, build, and end-to-end results.

Implementation approach:

- Build the new application under a temporary `src/revamp/` or similarly isolated root.
- Keep the legacy app runnable behind a development switch during the first vertical slice.
- Port the camera behavior into the new scene deliberately; do not import the entire old UI by habit.
- Reuse types or utilities only after checking whether they fit the new product model.
- Migrate local prototype data only if a clear user need exists. Do not silently upload browser-local data to a new account.
- Offer an explicit local-data import path if preserving prototype wardrobes matters.
- Remove the legacy switch and obsolete source only after feature, visual, and data gates pass and the user approves the replacement.

---

## 14. Phased Execution Plan

Each phase must end in a runnable state. Do not build the entire product in one unreviewable change.

### Phase 0: Safety, inventory, and decision record

Deliverables:

- Preserve the current dirty worktree.
- Confirm all three attachment roots and every Midjourney asset.
- Create `docs/rebuild/source-inventory.md` with source authority and asset paths.
- Record baseline build, test, bundle, and e2e results.
- Record unresolved external decisions in `docs/rebuild/decisions.md`.
- Create the rebuild branch after user-approved checkpointing.

Gate:

- No user work lost.
- Current app remains runnable.
- Source hierarchy is documented.

### Phase 1: Product shell and design system

Deliverables:

- New semantic token system sampled from approved assets.
- Typography, spacing, border, focus, elevation, and motion tokens.
- Core controls: buttons, icon buttons, inputs, select/menu, checkbox, switch, segmented control, tabs, dialog, sheet, toast, skeleton, empty state, inline error.
- Desktop and mobile application shells with placeholder route content.
- Real responsive navigation.
- Story or fixture page covering all component states.
- Automated contrast checks where possible.

Gate:

- Screenshots at 1440 x 900 and 390 x 844 read as the same modern atelier system.
- UI is no longer visually dependent on the old brown paper-panel CSS.
- Components pass keyboard and focus checks.
- No nested-card or generic dashboard appearance.

### Phase 2: New wardrobe scene and preserved camera movement

Deliverables:

- Grey-box cabinet based on one coherent elevation.
- Overview plus five new destination framings.
- Rebuilt route-to-camera registry.
- Preserved interruptible camera grammar.
- Door and drawer choreography.
- UI safe-area-aware framing.
- Reduced-motion crossfade.
- Static/WebGL-failure fallback.
- Adaptive quality controls.

Gate:

- Capture every destination at all required desktop viewports.
- Verify nonblank canvas pixels and stable composition.
- No camera clipping across every route pair.
- Repeated rapid navigation does not snap or queue.
- Desktop scene holds target frame rate on the agreed reference machine.
- Mobile app remains usable with the scene disabled.

### Phase 3: Backend foundation and authentication

Deliverables:

- Supabase project wiring or approved backend equivalent.
- Environment validation and `.env.example`.
- Database migrations for profiles, items, images, outfits, boards, wear events, and import jobs.
- Auth routes and callback handling.
- RLS and storage policies.
- Generated client types.
- Query and repository foundation.
- Local test backend or isolated test schema.
- Two-user authorization tests.

Gate:

- User A cannot read or mutate User B data or storage.
- A signed-in session survives refresh.
- Deep-link authentication returns to the intended route.
- No privileged key is present in client output.
- Migrations can build a fresh environment from zero.

### Phase 4: Core vertical slice - add a garment and see it in Collection

Deliverables:

- Short onboarding flow.
- Manual upload and mobile capture.
- Durable import jobs.
- Image-processing adapter with a working approved implementation.
- Progress, retry, cancel, and review states.
- Garment metadata form and validation.
- Cloud item and image persistence.
- Collection grid with search, basic filter, and detail route.
- Item edit, archive, and delete.
- Cross-device refresh verification.

Gate:

- A fresh user can complete the primary end-to-end success path.
- Closing or navigating away during processing does not corrupt the job.
- Retry cannot create duplicate items.
- Arbitrary real test photographs produce usable cutouts or an honest recoverable fallback.
- Original and derivatives remain private.
- No sample garments appear in production mode.

### Phase 5: Collection depth and garment detail

Deliverables:

- Full filter and sort model.
- Grid, List, and approved Rail view.
- Stable virtualized large collection.
- Multi-select and bulk actions.
- Expanded item metadata and wear relationships.
- Preserved filter and scroll state.
- Scene subset synchronization.
- Complete empty, filtered-empty, loading, and query-error states.

Gate:

- 1,000-item performance fixture remains responsive.
- Every filter is reflected in accessible controls and clear reset behavior.
- Back from item detail restores context.
- The 2D collection remains complete without WebGL.

### Phase 6: Outfit Studio

Deliverables:

- Rendering spike with varied real cutouts.
- Typed layer and conflict model.
- Garment tray and filters.
- Add, remove, reorder, undo, redo, clear, save, duplicate.
- Outfit route and persistence.
- Cover generation.
- Wear logging.
- Desktop and mobile studio layouts.

Gate:

- Outfit edits persist exactly after refresh.
- Layering remains visually legible across varied categories and image proportions.
- Controls remain usable at 390 x 844.
- Outfit value and wishlist status are labeled correctly.
- No claim of photorealistic virtual try-on.

### Phase 7: Style Studio

Deliverables:

- Editor-library spike and recorded choice.
- Versioned board document model.
- Required element types.
- Transform, layer, lock, snap, zoom, undo, and redo behavior.
- Autosave and draft recovery.
- Deterministic high-resolution export.
- Saved-board grid and cover thumbnails.
- Mobile editing strategy with touch controls.

Gate:

- Export visually matches the editor at 2x resolution.
- Reopen produces the same element positions and layers.
- A default five-item layout looks intentional before manual edits.
- Dragging is responsive and does not fight scrolling or zoom.
- Broken images are recoverable without losing the board.

### Phase 8: Insights and wear history

Deliverables:

- Wear-event creation and editing.
- Real user-data metrics.
- Accessible charts and table alternatives.
- Drill-through to Collection filters.
- Data-completeness indicators.
- Ledger-drawer visual treatment without fake retailer data.
- Optional price-observation adapter disabled by default.

Gate:

- Every metric has a documented query and test fixture.
- Missing prices or wear data never produce misleading totals.
- Insight filters produce the correct Collection result.
- Charts remain readable without color.

### Phase 9: Account, settings, connections, and all system states

Deliverables:

- Routed profile, preferences, connections, and data settings.
- Motion and 3D quality preferences applied immediately and persisted.
- Data export.
- Account deletion and storage cleanup workflow.
- Sign-out behavior.
- Global offline handling.
- Route and component error boundaries.
- Notification and job-status center only if real background jobs require it.
- Production-disabled states for unavailable integrations.

Gate:

- Data export is complete and machine-readable.
- Account deletion is verified in database and object storage.
- No unavailable provider displays fabricated content.
- Important errors remain actionable after toast dismissal.

### Phase 10: Mobile, accessibility, performance, and reliability

Deliverables:

- Full responsive pass at every required viewport.
- Keyboard navigation and focus restoration.
- Screen-reader labels and non-3D navigation.
- Reduced-motion and reduced-quality verification.
- Image and route code splitting.
- Scene texture and draw-call budget.
- Web-vitals measurement.
- Cross-browser test suite.
- Visual regression screenshots.
- Canvas pixel checks.
- Failure injection for network, processing, expired auth, and storage errors.

Gate:

- WCAG 2.2 AA target for operational 2D UI.
- No incoherent overlap or clipped text at tested viewports.
- No console errors in normal workflows.
- No blank canvas or failed fallback.
- Performance budgets in Section 16 pass on the agreed test devices.
- Critical e2e suite is green in CI.

### Phase 11: Production deployment and launch readiness

Deliverables:

- Separate local, staging, and production configuration.
- CI for typecheck, unit, integration, e2e, build, and migration verification.
- Production host with SPA routing, HTTPS, security headers, and cache policy.
- Error monitoring and privacy-conscious analytics approved by the user.
- Backup and restore procedure.
- Database migration and rollback runbook.
- Import-job cleanup and retry operations.
- Domain, auth redirect URLs, email templates, and storage policies verified.
- Privacy, terms, support, and deletion paths supplied or explicitly tracked with the appropriate professional review.
- Final launch checklist signed off against real production configuration.

Gate:

- Staging smoke test passes from a fresh account on desktop and phone.
- Restore procedure has been tested, not only documented.
- Alerts reach the owner.
- Production contains no demo providers, sample receipts, fake price data, debug handles, or secrets.
- The user can create an account, add an item, create an outfit, export a board, export data, and delete the account.

---

## 15. Testing Strategy

### Unit tests

Cover:

- Domain mappers and validation.
- Camera transition selection and interpolation boundaries.
- Filter and sort logic.
- Layer compatibility.
- Auto-layout.
- Insights calculations.
- Import-job state transitions.
- Storage-path construction.
- Error normalization.

### Integration tests

Cover:

- Repository behavior against the test database.
- RLS with two users.
- Storage upload, signed read, and deletion.
- Import-job idempotency.
- Auth callback and route restoration.
- Outfit and board cascading behavior.
- Account export and deletion.

### End-to-end tests

Critical flows:

1. Sign up or sign in and complete onboarding.
2. Upload a valid garment and save it.
3. Reject an invalid image.
4. Fail and retry processing without duplication.
5. Search, filter, open, edit, archive, restore, and delete an item.
6. Create, edit, save, duplicate, and log an outfit.
7. Create, edit, reopen, and export a style board.
8. Drill from Insights into Collection.
9. Change reduced motion and 3D quality.
10. Export data and delete an account.
11. Deep-link to a feature and use browser back/forward.
12. Use the app with WebGL unavailable.
13. Use core mobile workflows at 390 x 844.

### Visual and 3D verification

- Screenshot every camera destination at desktop and laptop sizes.
- Screenshot every major 2D route at desktop and both phone sizes.
- Compare cabinet materials against master and station references side by side.
- Check canvas pixel variance and luminance to detect blank, black, or overexposed rendering.
- Record representative camera transitions and inspect clipping, acceleration, and settle.
- Check UI safe areas during the entire flight, not only at arrival.
- Verify actual garment images render, not placeholder planes.

---

## 16. Performance Budgets

Agree on a reference laptop and phone, then record results in CI or a repeatable local script.

Initial targets:

- 2D application shell interactive without waiting for the 3D bundle.
- Largest Contentful Paint under 2.5 seconds on a representative production connection where practical.
- Interaction to Next Paint under 200 ms for routine 2D actions.
- Cumulative Layout Shift under 0.1.
- Camera movement at a stable 60 fps on the reference laptop.
- Reduced scene at a stable 30 fps or better on supported mobile hardware.
- No continuous 3D rendering behind a fully obscuring mobile route.
- No uncompressed source image used where a derivative is sufficient.
- No single texture larger than its demonstrated visual need.
- Heavy editors and Three.js code loaded only for routes that need them.
- First-run onboarding never waits for sample generation.

Treat these as measurable gates, not aspirations. If a target is missed, record the profile and fix or consciously revise the target with the user.

---

## 17. Security, Privacy, and Operations

Required engineering controls:

- Validate MIME by content as well as extension.
- Enforce file size and image dimension limits server-side.
- Strip unnecessary EXIF metadata.
- Use private buckets and short-lived signed URLs.
- Apply rate limits to auth-sensitive, upload, processing, receipt, and provider endpoints.
- Use CSRF-safe OAuth state and exact redirect allowlists.
- Sanitize or sandbox receipt HTML.
- Never log tokens, signed URLs, raw private images, or sensitive email content.
- Redact safe error details before returning them to the client.
- Use Content Security Policy and other appropriate response headers.
- Keep dependencies audited and lockfiles committed.
- Back up Postgres and define retention.
- Track orphaned objects and failed jobs for cleanup.
- Make deletion durable and observable.
- Provide a support path for failed deletion or import jobs.

Privacy and legal copy should be reviewed by an appropriate professional before launch. Engineering must still provide accurate data inventory, retention behavior, export, and deletion mechanisms.

---

## 18. Explicit Non-Goals for the First Production Release

Unless the user reprioritizes them, defer:

- Social feed, public profiles, followers, comments, or outfit sharing network.
- Marketplace or checkout.
- Subscription billing.
- Generic retailer scraping.
- Photorealistic body-based virtual try-on.
- AI-generated 3D garment meshes.
- Automatic fashion advice presented as authoritative.
- Native mobile applications.
- Complex real-time collaboration in Style Studio.
- An elaborate marketing site before the application is usable.

These may have adapter seams or placeholders in planning documents, but should not expand the launch-critical path.

---

## 19. Claude Working Rules

1. Inspect before editing. Read the three folders and this file completely.
2. Preserve user changes. Never reset or overwrite the dirty worktree.
3. Keep the current app runnable until the new vertical slice passes its gate.
4. Do not treat Midjourney output as production UI or production PBR material.
5. Do not reuse the old visual system merely because it already exists.
6. Preserve the camera's behavior, not its old coordinates or cabinet.
7. Build semantic 2D workflows first-class; 3D must never be the only control surface.
8. Use proven libraries for editor transforms, charts, parsing, and other established problem domains.
9. Keep changes scoped to the active phase.
10. Do not introduce a component library or utility-CSS framework without a measured reason and user approval.
11. Do not add paid APIs without approval.
12. Keep production fail-closed when a provider is absent.
13. Never label sample data as live data.
14. Write migrations and tests with every backend phase.
15. Validate on real desktop and mobile viewports after every visual phase.
16. For 3D, verify screenshots and canvas pixels, not only DOM presence.
17. Fix layout overlap, clipped text, and inaccessible focus before moving on.
18. Run typecheck, unit tests, relevant e2e tests, and the production build before each phase report.
19. Report files changed, tests run, screenshots captured, known limitations, and the next gate.
20. Stop for user review at major visual gates, especially the design system, cabinet grey-box, final materials, and primary vertical slice.

---

## 20. Decisions and Credentials the User Must Eventually Supply

Claude should continue with local scaffolding and typed adapters while these are unresolved, but must not pretend they are configured:

- Approval of Supabase or details of an existing backend.
- Staging and production project credentials.
- Production domain and auth redirect URLs.
- Approved sign-in providers.
- Choice of production background-removal implementation or provider.
- Whether Gmail or another email provider is required for the first release.
- A legitimate price-data provider, or confirmation that price comparison is deferred.
- Error-monitoring and analytics choices.
- Email sender and transactional email templates.
- Midjourney commercial-use confirmation for any asset shipped publicly.
- Privacy, terms, retention, and support decisions.
- Reference devices and acceptable performance targets.

Record every decision in `docs/rebuild/decisions.md` with date, owner, and consequence.

---

## 21. First Instruction to Execute

Start with Phase 0 only.

1. Read this plan and all three attached folders.
2. Run `git status` and protect the existing dirty worktree.
3. Produce the source inventory, current architecture map, asset map, baseline test report, and decisions list.
4. Propose the exact rebuild branch and temporary `src/revamp/` entry strategy.
5. Do not begin broad visual or backend edits until the current state is safely checkpointed.
6. Then proceed to Phase 1 and present desktop and mobile design-system screenshots for approval.

The standard is not "looks more polished than the prototype." The standard is a coherent, usable fashion product whose 3D identity and operational software feel like one designed object.

