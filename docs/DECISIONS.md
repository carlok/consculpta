# Project decisions

<!-- SPDX-License-Identifier: Apache-2.0 -->

Maintainer choices and project defaults. Items marked **TBD** need a maintainer answer.

## Repository and hosting

| Decision | Choice | Notes |
|----------|--------|-------|
| GitHub owner | `carlok` | |
| Repository name | `consculpta` | |
| GitHub Pages URL | `https://carlok.github.io/consculpta/` | Project Pages sub-path |
| Repository visibility | Public | |
| Custom domain | **TBD** | No `CNAME` until decided |

## Licence and compliance

| Decision | Choice | Notes |
|----------|--------|-------|
| Project licence | **Apache-2.0** | [LICENSE](../LICENSE); SPDX on project-authored files |
| Third-party licences | Per component | Fonts: SIL OFL 1.1; future GLSL noise: MIT |
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
| Single-file HTML release | `file://` | Offline open; planned in release phase |
| `containers/` Podman dev environment | **Include** (later phase) | Rootless Podman per tooling plan; not phase 0–1 |
| Self-hosting API proxy | **Skipped** | No `proxy/`; keys stay in the browser |

## Tooling (phase 1)

| Decision | Choice | Notes |
|----------|--------|-------|
| Linter / formatter | Biome `2.0.5` | `legacy/` excluded until refactor |
| Typecheck | TypeScript `5.9.3`, `checkJs` + `strict` on `src/` and `tests/` | |
| Bundler | Vite `7.1.9`, `base: './'` | Dev shell at `src/index.html` |
| CI | `.github/workflows/ci.yml` — lint, typecheck, unit tests | Pages workflow runs `npm run check` |
| Dependabot | npm + github-actions, weekly | |

## Phase 0 (walking skeleton)

| Decision | Choice | Notes |
|----------|--------|-------|
| Deployed site | Root `index.html` + `legacy/*` + vendored fonts | Until UI refactor |
| Unit tests | Vitest `3.2.4` + lockfile | Characterization against `legacy/engine.js` |
