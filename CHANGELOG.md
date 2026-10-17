# Changelog

<!-- SPDX-License-Identifier: Apache-2.0 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Phase 3 renderer: `src/render/*` (shader, gl, camera, scheduler, png, tiler), GLSL under `src/render/glsl/`, vendored MIT `third_party/webgl-noise`, Vite `legacy/render.bundle.js`, `glslangValidator` in CI, Playwright noise-parity e2e.
- README: About (with footer links), How to use, Privacy and API keys, licence footer.

### Changed

- Legacy boot marks the footer and core UI state before enqueueing litter thumbnails, and litter shader compiles happen incrementally in the frame loop (avoids blocking first paint on six parallel compiles).

### Fixed

- E2E first-visit test waits for full legacy app bootstrap (footer + default specimen) so slow CI WebGL init does not hit the 60s test timeout.

### Changed

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
