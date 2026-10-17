# Changelog

<!-- SPDX-License-Identifier: Apache-2.0 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Phase 3 renderer: `src/render/*` (shader, gl, camera, scheduler, png, tiler), GLSL under `src/render/glsl/`, vendored MIT `third_party/webgl-noise`, Vite `legacy/render.bundle.js`, `glslangValidator` in CI, Playwright noise-parity e2e.
- **Redo** button next to Undo; any new step clears the redo stack.
- Toasts can carry an **Undo** button (6 s, held open on hover or focus). Adopting, Random, Reset genome, Reset genes, Apply formulas, loading a genome code or a kept specimen, and removing a shelf item all offer it.
- Keyboard shortcuts: `1`–`6` adopt, `N` new litter, `K` keep, `Z` / `⌘Z` undo, `⇧Z` / `⇧⌘Z` / `Ctrl+Y` redo, `R` random, `S` spin, `M` morph, `?` lists them (also via **Keyboard shortcuts** in the footer).
- Adopting pulses the specimen plate and announces the new parent in the toast region.
- **Keep** reads "Kept · K4" while the current parent is already on the shelf. A full shelf says which item it dropped, with Undo.
- Genome editor: Strands, Surface, Contours and Block use segmented choices instead of continuous sliders. Thickness, Contours and Surface dim (with the reason in a tooltip and for screen readers) when the current surface does not use them; Surface genes are reordered so related ones sit together.
- Formula editors flag parse errors as you type (`aria-invalid`, message in the status line) and apply with `⌘/Ctrl+Enter`.
- Engine exports `DISCRETE`, `STRANDS_ON` and `STRANDS_OFF`.
- Stage overlay holds icon toggles for Spin, Morph and Fullscreen next to zoom and a camera-reset icon; the action bar keeps specimen actions, export, and Large view.
- **Copy link** in the genome code row: the URL carries the genome in its hash (`#nsb3…`). Opening it loads that specimen, keeps yours one Undo away, and clears the hash.
- The litter and the last 15 parents are saved with the session, so a reload shows the same six offspring and Undo still works.
- Snapshot size, frame and smoothing are remembered (`nsb.snap`). The shader sheet shows the line count and an **Open Shadertoy** link.
- Stage shows "compiling formula…" over the old picture while a new parent's shader compiles (after 180 ms), and a clear message if it fails.
- Two fingers dragged up or down tilt the camera on touch screens.
- The orbit hint fades after your first orbit or zoom and stays hidden on this device (`nsb.hinted`).
- On phones the mutation label sits as a chip on each thumbnail so the tag is no longer truncated; zoom buttons and shelf remove buttons are larger on touch screens.
- README: About (with footer links), How to use, Privacy and API keys, licence footer.

### Changed

- Legacy boot marks the footer and core UI state before enqueueing litter thumbnails, and litter shader compiles happen incrementally in the frame loop (avoids blocking first paint on six parallel compiles).

### Fixed

- Litter thumbnails are dimmed with a thin progress bar until the new litter renders, so a new label never sits over the previous litter's picture.
- **Large view** no longer shows on phones (`.btn` display rule overrode `.only-wide`).
- Camera **Reset** and the `0` key both return to the default camera (azimuth, elevation and distance).
- Snapshot and shader downloads are named `consculpta-…` instead of `noise-sculpture-…`.
- Genome summary shows the parent's node count, noise cost and block instead of a fixed "formula · 25 genes".
- Stage zoom controls move to the top edge on narrow stages so they no longer collide with the specimen plate.
- Side by side, the stage column now stays in view at laptop heights (sticky from 600 px tall instead of 860 px); the stage shrinks to fit the window height.
- Lede capitalisation; gene label "Colour spread" matches the British spelling used elsewhere.
- E2E first-visit test waits for full legacy app bootstrap (footer + default specimen) so slow CI WebGL init does not hit the 60s test timeout.

### Changed

- The Snapshot / Shader code sheet is a native modal `<dialog>`: focus stays inside, the page behind is inert, Escape closes it.
- The mouse wheel over the stage scrolls the page unless the stage is engaged (clicked or focused, fullscreen) or ⌘/Ctrl is held; a tip explains this. Trackpad pinch still zooms.
- Spin and morph stop drawing while the stage is scrolled out of view, leaving the GPU to litter thumbnails.
- AI breeder moves below the shelf and genome; when off it shows one line instead of a status, a button and a paragraph that all said "off".
- Shorter lede on phones; the GPU name moves from the header to the footer.
- Offspring buttons announce their tag and mutation label to screen readers.
- **Large view** defaults to off on first visit (`nsb.big` unset); only `nsb.big === '1'` restores the previous large layout.
- Default parent specimen is the maintainer showcase (G5 · 39E1 export): pinned `nsb3` code, formulas in `docs/fixtures/default-specimen-39E1.glsl`, initial camera from that export. **Reset genome** returns to this specimen (via `startGenome()`).
- Footer “how it works” and credits paragraphs link to verified references (simplex noise, isosurfaces, ray marching, webgl-noise, cosine palettes, Shadertoy, MIT).
- Site footer adds an inline GitHub icon link to the repository and a `© <year> carlok` line.
- AI breeder defaults to **off** on first visit when no `nsb.ai` setting is stored; saved preferences are unchanged.

### Added

- Phase 2 engine: modular `src/engine/*` (rng, noise, ops, parse, print, evaluate, codegen-glsl, genome, analysis, evolve, palette), Vite IIFE bundle for the legacy site, Vitest unit and fast-check property tests, coverage thresholds on `src/engine/**`, HTML coverage report on Pages at `/consculpta/coverage/`.
- [REUSE.toml](REUSE.toml) annotation for maintainer showcase image `docs/images/specimen-01.png`.

### Fixed

- Legacy site: `#sheet` modal visible on load because `.sheet { display: grid }` overrode the HTML `[hidden]` attribute; restored with `[hidden] { display: none !important }`.
- User-facing product name is **Consculpta** (replacing “Noise Sculpture Breeder” in the live UI).

## [0.1.0] - 2026-10-17

### Added

- Phase 0 walking skeleton: root `index.html`, `legacy/` site, vendored fonts, Vitest characterization of `legacy/engine.js`, Playwright smoke test, GitHub Actions CI and Pages deploy to `/consculpta/`.
