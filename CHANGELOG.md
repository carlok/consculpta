# Changelog

<!-- SPDX-License-Identifier: Apache-2.0 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Phase 0 walking skeleton: `legacy/` extract of prototype CSS and scripts, `docs/PARITY.md`, Vitest characterization tests, vendored fonts under `third_party/`, GitHub Pages workflow deploying the legacy app with local fonts, `docs/DECISIONS.md`.
- Project licence Apache-2.0; repository public on GitHub Pages.
- Host-embedded artifact provider removed from product scope (Anthropic API and OpenAI-compatible only).
- Planned Podman `containers/` dev setup in a later phase; self-hosting API proxy out of scope.

### Changed

- **Phase 1 scaffold:** Biome, TypeScript `checkJs`, Vite dev shell, Makefile, `ci.yml`, Dependabot; `npm run check` on Pages.
- **Language policy:** provider-neutral AI breeder copy; removed `BRIEF.md` and the duplicate root prototype HTML; stripped host-artifact code paths from `legacy/app.js`.
