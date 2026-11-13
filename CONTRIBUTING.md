# Contributing to Consculpta

<!-- SPDX-License-Identifier: Apache-2.0 -->

Thank you for helping improve [Consculpta](https://github.com/carlok/consculpta). The project is maintained by [@carlok](https://github.com/carlok) on GitHub.

## Before you start

- Read [README.md](README.md) for product context and [docs/DECISIONS.md](docs/DECISIONS.md) for maintainer defaults.
- Coding agents should read [AGENT.md](AGENT.md).
- Security vulnerabilities: follow [SECURITY.md](SECURITY.md)—do not file public issues for them.

## Development setup

1. Install **Node.js 22.x**.
2. Clone the repository and install dependencies:

   ```bash
   npm ci
   ```

3. On Linux, install **glslang** for shader validation (CI uses `glslang-tools`):

   ```bash
   sudo apt-get install -y glslang-tools   # Debian/Ubuntu
   ```

4. For end-to-end tests, install the Playwright browser once:

   ```bash
   npx playwright install chromium
   ```

## Running tests and coverage

```bash
npm run check    # lint, typecheck, legacy bundle build, GLSL check, coverage
npm run e2e      # Playwright (also run locally before opening a PR)
```

Individual steps: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run coverage`, `npm run glsl`.

**Coverage expectation:** Vitest measures **`src/engine/**`** with thresholds of **≥90% lines** and **≥85% branches**. Engine changes should include tests so coverage does not drop. HTML reports are written under `coverage/` (published on GitHub Pages from `main`).

Optional local dev server: `npm run dev`.

## Coding standards

- Format and lint with Biome (`npm run lint`; fix with `npm run lint:fix`). `legacy/` app sources are excluded until the UI refactor.
- Typecheck: `npm run typecheck`.
- Match existing module layout under `src/`. Add SPDX headers on new files where the surrounding code uses them.
- Do not commit secrets, API keys, or machine-specific configuration.

## Pull request flow

1. Branch from `main` (forks welcome).
2. Make focused changes; avoid unrelated refactors.
3. Run `npm run check` and `npm run e2e` locally.
4. Open a pull request against `main` and fill in [.github/pull_request_template.md](.github/pull_request_template.md).
5. CI must pass (lint, typecheck, `check`, and e2e jobs—see [.github/workflows/ci.yml](.github/workflows/ci.yml)).
6. Maintainer review via GitHub; questions go to [@carlok](https://github.com/carlok).

By contributing, you agree that your contributions are licensed under the project’s [Apache-2.0](LICENSE) licence.
