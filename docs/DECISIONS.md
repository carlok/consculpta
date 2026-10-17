# Project decisions

<!-- SPDX-License-Identifier: Apache-2.0 -->

Maintainer choices and project defaults. Items marked **TBD** need a maintainer answer.

## Repository and hosting

| Decision | Choice | Notes |
|----------|--------|-------|
| GitHub owner | `carlok` | |
| Repository name | `consculpta` | |
| Product name (user-facing) | **Consculpta** | Page title, headings, exports; not “Noise Sculpture Breeder” |
| GitHub Pages URL | `https://carlok.github.io/consculpta/` | Project Pages sub-path |
| Repository visibility | Public | |
| Custom domain | **TBD** | No `CNAME` until decided |

## Licence and compliance

| Decision | Choice | Notes |
|----------|--------|-------|
| Project licence | **Apache-2.0** | [LICENSE](../LICENSE); SPDX on project-authored files |
| Third-party licences | Per component | Fonts: SIL OFL 1.1; future GLSL noise: MIT |
| Showcase renders (`docs/images/`) | Maintainer-owned | Listed in [REUSE.toml](../REUSE.toml); `specimen-01.png` is **Apache-2.0** (may switch to CC-BY-4.0 for later images — update REUSE + this table) |
| `SECURITY.md` / `CITATION.cff` contact | **TBD** | Maintainer name and contact |
| Engineering brief in repo | **Removed** | Internal phase plan lived in `BRIEF.md`; removed from the tree to avoid stale references. Phases are tracked in commits, `CHANGELOG.md`, and PRs. |

## Communication and naming

| Decision | Choice | Notes |
|----------|--------|-------|
| Provenance / origin story | **Not documented** | No maintainer account, host product, or prototype-origin notes in docs, README, UI, or commits |
| AI breeder wording | **Provider-neutral** | UI and docs say “AI breeder” / “the model”; Anthropic appears only as the API provider name |
| Host-embedded artifact provider | **Dropped** | Anthropic API + OpenAI-compatible endpoints only |

## Product scope

| Decision | Choice | Notes |
|----------|--------|-------|
| AI providers in scope | Anthropic API + OpenAI-compatible | Browser calls user-configured endpoints |
| Single-file HTML release | `file://` as **`consculpta.html`** | Offline open; planned in release phase (filename fixed in advance) |
| `containers/` Podman dev environment | **Include** (later phase) | Rootless Podman per tooling plan; not phase 0–1 |
| Self-hosting API proxy | **Skipped** | No `proxy/`; keys stay in the browser |

## Tooling (phase 1)

| Decision | Choice | Notes |
|----------|--------|-------|
| Linter / formatter | Biome `2.5.15` | `legacy/` excluded until UI refactor |
| Typecheck | TypeScript `7.x`, `checkJs` + `strict` on `src/` | |
| Bundler | Vite `8.x`, `base: './'` | Dev shell at `src/index.html`; `npm run build:engine` → `legacy/engine.bundle.js` |
| CI | lint, typecheck, coverage (engine thresholds), e2e | Pages runs `npm run check`, publishes `coverage/` at `/consculpta/coverage/` |
| Dependabot | npm + github-actions, weekly | **Grouped:** one PR for all npm dev deps, one for all Actions; `open-pull-requests-limit: 2` per ecosystem |

## Phase 0 (walking skeleton)

| Decision | Choice | Notes |
|----------|--------|-------|
| Deployed site | Root `index.html` + `legacy/*` + vendored fonts | Until UI refactor |
| Unit tests | Vitest `3.2.4` + lockfile | Characterization against `legacy/engine.js` |

## Phase 2 (engine)

| Decision | Choice | Notes |
|----------|--------|-------|
| Engine layout | `src/engine/*` modules | rng, noise, ops, parse, print, evaluate, codegen-glsl, genome, analysis, evolve, palette (+ tree helpers) |
| Legacy site engine | **Modular IIFE bundle** | `index.html` loads `legacy/engine.bundle.js` built from `src/engine/`; behaviour matches frozen `legacy/engine.snapshot.js` (parity tests) |
| Coverage | `src/engine/**` | Vitest ≥90% lines, ≥85% branches; HTML report on Pages |

## Default specimen and layout (maintainer UI)

| Decision | Choice | Notes |
|----------|--------|-------|
| First-visit parent genome | Pinned `nsb3` in `src/engine/default-specimen.js` | Reconstructed from `docs/fixtures/default-specimen-39E1.glsl`; `startGenome()` and **Reset genome** use this specimen |
| Short tag | **74C8** with current encode | Maintainer export label “39E1”; same formulas/uniforms, tag is hash of `nsb3` string |
| First-visit camera | azimuth **4.4434**, elevation **0.3615**, distance **3.55** | From shader export; overridden when `nsb.v3` is stored |
| Large view default | **Off** (side-by-side) | `localStorage.nsb.big === '1'` enables; absent or `0` keeps layout compact |
