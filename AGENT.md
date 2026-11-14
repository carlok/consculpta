# Guidance for coding agents

<!-- SPDX-License-Identifier: Apache-2.0 -->

This file is for automated and human agents working in [carlok/consculpta](https://github.com/carlok/consculpta). It complements [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Hard rules

- **Coverage before commit:** When you change behaviour in `src/engine/**`, add or extend tests and run `npm run coverage`. Aim to **increase or preserve** line and branch coverage (thresholds: ≥90% lines, ≥85% branches on `src/engine/**`). Do not open a PR that lowers coverage.
- **No secrets:** Never commit API keys, tokens, or credentials. Do not commit host-specific values (personal paths, machine names, private URLs). User API keys belong only in browser `localStorage` on the live site, not in the repo.
- **General public docs:** Keep README, issue templates, and user-facing copy provider-neutral and environment-agnostic. Maintainer contact is GitHub [@carlok](https://github.com/carlok); the only email in the repo is the Code of Conduct enforcement address in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Do not change [LICENSE](LICENSE) or third-party licence files unless explicitly asked.

## Setup

- **Node.js:** 22.x (matches CI).
- **Install:** `npm ci`
- **GLSL validation:** `npm run glsl` needs `glslangValidator` on your PATH (CI installs `glslang-tools` via apt).

## Commands (same as CI)

| Command | What it does |
|---------|----------------|
| `npm run lint` | Biome check on `src/`, `tests/`, `scripts/`, root `*.js` (`legacy/` is excluded). |
| `npm run lint:fix` | Biome write fixes. |
| `npm run typecheck` | TypeScript `tsc --noEmit` with `checkJs` on `src/`. |
| `npm run test` | Vitest unit, property, parity, and legacy tests (`tests/**/*.test.js`). |
| `npm run coverage` | Vitest with v8 coverage on `src/engine/**` (enforces thresholds). |
| `npm run glsl` | Fragment shader probe via `glslangValidator`. |
| `npm run build:legacy` | Vite IIFE bundles → `legacy/engine.bundle.js`, `render.bundle.js`, `audio.bundle.js`. |
| `npm run check` | `lint` + `typecheck` + `build:legacy` + `glsl` + `coverage` (CI “test” job and Pages workflow). |
| `npm run e2e` | Playwright (`tests/e2e/`); starts `scripts/e2e-pages-server.mjs` on port 4173. Install browsers once: `npx playwright install chromium`. |
| `npm run dev` | Vite dev server for the refactored shell. |

**Before pushing:** run `npm run check`, then `npm run e2e` (CI runs both). On Linux, install `glslang-tools` if `glsl` fails.

## Repository layout

```
index.html, legacy/          # GitHub Pages shell and bundles served in production
src/engine/                  # Formula engine (coverage thresholds apply here)
src/render/                  # WebGL raymarcher and PNG export
src/audio/                   # Experimental sound (Tone.js)
tests/unit/, tests/legacy/   # Vitest
tests/e2e/                   # Playwright smoke and noise-parity
tests/parity/                # Engine vs frozen legacy snapshot
third_party/                 # Vendored fonts, VCSL samples, webgl-noise GLSL
scripts/                     # Build and CI helpers
docs/                        # Maintainer decisions, images, fixtures
.github/workflows/           # ci.yml (lint, typecheck, check, e2e), pages.yml
```

Product behaviour for the live site is driven by root `index.html` and `legacy/*.bundle.js` built from `src/`. See [docs/DECISIONS.md](docs/DECISIONS.md) for pinned defaults and scope.

## Conventions

- **Licence:** Apache-2.0; use `// SPDX-License-Identifier: Apache-2.0` on new project-authored files where neighbours do.
- **Style:** Biome preset, 2-space indent, 100-column line width, single quotes in JS.
- **Modules:** `"type": "module"`; prefer small focused modules under `src/`.
- **Engine changes:** Keep parity with `legacy/engine.snapshot.js` where parity tests apply; run full `npm run check`.
- **Dependencies:** Dev-only in `package.json`; Dependabot manages bumps (grouped PRs).

## Pull requests

Fork or branch from `main`, follow [CONTRIBUTING.md](CONTRIBUTING.md), use the PR template, and ensure CI is green. Security issues: [SECURITY.md](SECURITY.md)—not public issues.
