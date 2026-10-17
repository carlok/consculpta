# Project decisions

<!-- SPDX-License-Identifier: Apache-2.0 -->

Recorded defaults for the maintainer to confirm or override. Open items from [BRIEF.md § Open decisions](../BRIEF.md) are marked **TBD**.

## Repository and hosting

| Decision | Choice | Notes |
|----------|--------|-------|
| GitHub owner | `carlok` | From maintainer |
| Repository name | `consculpta` | From maintainer |
| GitHub Pages URL | `https://carlok.github.io/consculpta/` | Project Pages sub-path |
| Repository visibility | Public | GitHub Pages enabled at `https://carlok.github.io/consculpta/` |
| Custom domain | **TBD** | No `CNAME` until maintainer decides |

## Licence and compliance

| Decision | Choice | Notes |
|----------|--------|-------|
| Project licence | **Apache-2.0** | See [LICENSE](../LICENSE); SPDX `Apache-2.0` on project-authored files |
| Third-party licences | Per component | Fonts: SIL OFL 1.1 under `third_party/fonts/`; future GLSL noise: MIT |
| `SECURITY.md` / `CITATION.cff` contact | **TBD** | Maintainer name and contact |

## Product scope

| Decision | Choice | Notes |
|----------|--------|-------|
| Claude.ai artifact mode | **Dropped** | No `window.claude.use('sample')`, no `claude-artifact.js`, no artifact e2e; legacy HTML may still contain it until UI phase |
| AI providers in scope | Anthropic API + OpenAI-compatible | Browser calls user-configured endpoints only |
| Single-file HTML release | `file://` only | Must open offline from disk; not required to run inside claude.ai |
| `containers/` Podman dev environment | **Include** (planned phase) | Rootless Podman `Containerfile` + compose per brief §4; not part of phase 0 |
| Self-hosting API proxy | **Skipped** | Keys stay in the browser; no `proxy/` directory or server-side key storage |

## Phase 0 (walking skeleton)

| Decision | Choice | Notes |
|----------|--------|-------|
| Deployed site | Legacy `index.html` + `legacy/*` + vendored fonts | Until phase 5 replaces UI |
| Runtime fonts | Vendored under `third_party/fonts/` (SIL OFL 1.1) | No Google Fonts requests |
| Unit tests | Vitest `3.2.4`, exact lockfile | Characterization against `legacy/engine.js` |
| Provider request tests | Mirror of `legacy/app.js` in `tests/fixtures/legacy-provider-requests.mjs` | Replaced when breeders split in phase 4 |
| Pages workflow | `.github/workflows/pages.yml` runs tests; deploy on `main` only | PRs run tests without deploy |
