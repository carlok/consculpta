# Changelog

<!-- SPDX-License-Identifier: Apache-2.0 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
