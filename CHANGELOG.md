# Changelog

<!-- SPDX-License-Identifier: Apache-2.0 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Redo** button next to Undo; any new step clears the redo stack.
- Toasts can carry an **Undo** button (6 s, held open on hover or focus). Adopting, Random, Reset genome, Reset genes, Apply formulas, loading a genome code or a kept specimen, and removing a shelf item all offer it.
- Keyboard shortcuts: `1`–`6` adopt, `N` new litter, `K` keep, `Z` / `⌘Z` undo, `⇧Z` / `⇧⌘Z` / `Ctrl+Y` redo, `R` random, `S` spin, `M` morph, `?` lists them (also via **Keyboard shortcuts** in the footer).
- Adopting pulses the specimen plate and announces the new parent in the toast region.
- **Keep** reads "Kept · K4" while the current parent is already on the shelf. A full shelf says which item it dropped, with Undo.
- README: About (with footer links), How to use, Privacy and API keys, licence footer.

### Fixed

- Litter thumbnails are dimmed with a thin progress bar until the new litter renders, so a new label never sits over the previous litter's picture.
- **Large view** no longer shows on phones (`.btn` display rule overrode `.only-wide`).
- Camera **Reset** and the `0` key both return to the default camera (azimuth, elevation and distance).
- Snapshot and shader downloads are named `consculpta-…` instead of `noise-sculpture-…`.
- Genome summary shows the parent's node count, noise cost and block instead of a fixed "formula · 25 genes".
- Stage zoom controls move to the top edge on narrow stages so they no longer collide with the specimen plate.
- Lede capitalisation; gene label "Colour spread" matches the British spelling used elsewhere.
- E2E first-visit test waits for full legacy app bootstrap (footer + default specimen) so slow CI WebGL init does not hit the 60s test timeout.

### Changed

- **Large view** defaults to off on first visit (`nsb.big` unset); only `nsb.big === '1'` restores the previous large layout.
- Default parent specimen is the maintainer showcase (G5 · 39E1 export): pinned `nsb3` code, formulas in `docs/fixtures/default-specimen-39E1.glsl`, initial camera from that export. **Reset genome** returns to this specimen (via `startGenome()`).

### Changed

- Footer “how it works” and credits paragraphs link to verified references (simplex noise, isosurfaces, ray marching, webgl-noise, cosine palettes, Shadertoy, MIT).
- Site footer adds an inline GitHub icon link to the repository and a `© <year> carlok` line.
- AI breeder defaults to **off** on first visit when no `nsb.ai` setting is stored; saved preferences are unchanged.

### Added

- Phase 2 engine: modular `src/engine/*` (rng, noise, ops, parse, print, evaluate, codegen-glsl, genome, analysis, evolve, palette), Vite IIFE bundle for the legacy site, Vitest unit and fast-check property tests, coverage thresholds on `src/engine/**`, HTML coverage report on Pages at `/consculpta/coverage/`.
- [REUSE.toml](REUSE.toml) annotation for maintainer showcase image `docs/images/specimen-01.png`.

### Fixed

- Legacy site: `#sheet` modal visible on load because `.sheet { display: grid }` overrode the HTML `[hidden]` attribute; restored with `[hidden] { display: none !important }`.
- User-facing product name is **Consculpta** (replacing “Noise Sculpture Breeder” in the live UI).

### Added

- Playwright smoke test: Pages-style `/consculpta/` load with no blocking Snapshot dialog and no console errors.
- Dependabot groups weekly npm dev-dependency and GitHub Actions updates into one PR each (low open-PR limit).

### Added (earlier)

- Phase 0 walking skeleton: `legacy/` extract of prototype CSS and scripts, `docs/PARITY.md`, Vitest characterization tests, vendored fonts under `third_party/`, GitHub Pages workflow deploying the legacy app with local fonts, `docs/DECISIONS.md`.
- Project licence Apache-2.0; repository public on GitHub Pages.
- Host-embedded artifact provider removed from product scope (Anthropic API and OpenAI-compatible only).
- Planned Podman `containers/` dev setup in a later phase; self-hosting API proxy out of scope.

### Changed

- **Language policy:** provider-neutral AI breeder copy; removed `BRIEF.md` and the duplicate root prototype HTML; stripped host-artifact code paths from `legacy/app.js`.
