# Brief: turn `noise-sculpture-breeder.html` into a free-software project published on GitHub Pages

You are a senior engineer taking a working single-file prototype and turning it into a clean, tested, self-contained free-software project.

**The goal is a public GitHub Pages site**, `https://<owner>.github.io/<repo>/`, built, tested and deployed by GitHub Actions on every push to `main`. The repository is the source of that site. Containers are an optional convenience for local development, not part of the delivery path.

Read this whole brief before writing code. Ask the maintainer only about the open decisions listed at the end. Use sensible defaults for everything else and record them in `docs/DECISIONS.md`.

## 1. What the app is

`noise-sculpture-breeder.html` is a browser app for interactive evolution of 3D sculptures.

- **Sculptures:** each one is the region where a formula over 3D simplex noise rises above an iso level inside a sphere, cube or drum.
- **Formulas:** expression trees with these operations:
  - noise: `noise`, `fbm`
  - shaping: `sin`, `abs`, `neg`, `soft`, `gauss`, `scale`
  - combining: `add`, `sub`, `mul`, `min`, `max`, `smin`
  - space transforms: `twist`, `rotx`, `roty`, `rotz`, `mirx`, `miry`, `mirz`, `warp`, `zoom`
- **Genome:** a shape formula, a colour formula and 25 scalar genes. The genes cover iso level, thickness, surface mode, contours, block, block size, edge fade, cosine palette a/b/c/d, hue shift, colour mix, colour spread, gloss, light angle and strands.
- **Rendering:** each formula is compiled to GLSL ES 3.00 and sphere-traced in WebGL 2, with bisection refinement, tetrahedral normals, soft shadows, ambient occlusion and an ACES-style tone curve.
- **Analysis:** before compiling, the app evaluates each formula in JavaScript on 520 sample points. This normalises it (mean and spread), estimates a Lipschitz bound for a safe raymarch step, and rejects empty, solid or too-fine results. The JavaScript simplex noise is an exact port of the GLSL one. It matches to about 0.002 because one constant is rounded to float32 with `Math.fround`, exactly as the GPU stores it.
- **Evolution:** each litter has six offspring. Mutation operators are tweak, swap, graft, wrap and hoist, plus scalar mutation and an occasional switch to strands. Subtree crossover uses kept specimens from the shelf. There are also undo, Reset genes, Reset genome, Random, and genome codes (`nsb3.` + base64url JSON; older 24-gene codes still decode).
- **AI breeder:** an optional second breeder, which can be turned on and off. On its turn it receives a contact-sheet image of the litter (JPEG, numbered 1–6), the formulas, the human's recent picks and its own carried-over taste notes. It returns JSON: favourite, ranking, critique, direction, its own offspring formula, an optional palette and a strands flag. It then either adds its offspring to the litter or chooses the next parent after a 5-second countdown the human can cancel. Providers:
  - **Claude in claude.ai:** the artifact runtime `window.claude.use('sample')`, with model and effort. This only works when the page runs as a claude.ai artifact.
  - **Anthropic Messages API:** key, model, `output_config.effort` from low to max, endpoint, and the `anthropic-dangerous-direct-browser-access` header.
  - **OpenAI-compatible `/chat/completions`:** base URL, optional key, model, optional `reasoning_effort`, and an image toggle.
- **Notes:** the AI's notes appear in a log. Each note auto-closes 12 seconds after it arrives, and the list has a Show/Hide toggle.
- **Views:**
  - The main view orbits and zooms (wheel, pinch, buttons, keys) and goes fullscreen.
  - A "Large view" layout toggle switches between full width and side by side.
  - Rendering resolution adapts while the view is moving.
  - Thumbnails render through an offscreen framebuffer.
  - The program cache compiles in parallel through `KHR_parallel_shader_compile`.
- **Export:** 4K or 8K PNG snapshots in 16:9, square or 9:16, with 1 or 4 samples per pixel. The image is rendered in GPU tiles and streamed into a hand-written PNG encoder (deflate through `CompressionStream`, CRC-32 chunks, Sub filter). The zoomable preview has Fit and 100%. A standalone Shadertoy shader can also be exported.
- **Look:** light and dark themes driven by CSS tokens, Gloock, Schibsted Grotesk and Martian Mono fonts, and a "specimen bench" layout.

**Inside the HTML file:**
- The first `<script>` is a pure engine (the `ENGINE` IIFE: noise port, parser and printer, GLSL codegen, JS evaluator, genome, analysis, evolution, codec).
- The second `<script>` is the app: GLSL templates, renderer, state, UI, AI providers, snapshot.
- The CSS sits in one `<style>` block with design tokens at the top.
- Fonts load from Google Fonts. Nothing else is external.

## 2. Ground rules

1. **Behaviour parity first.** Before refactoring, write a feature-parity checklist (`docs/PARITY.md`) and characterization tests that pin the current behaviour:
   - parse/print round trips
   - genome codes, including a legacy 24-gene code
   - noise values at fixed points
   - viability decisions for a fixed set of formulas
   - the exact request bodies each provider sends

   Refactor only with those tests green. Change behaviour only in a deliberate, separate commit, recorded in `CHANGELOG.md`.
2. **Static site, zero runtime dependencies.** The shipped site is plain modern JavaScript (ES modules), CSS and GLSL served as static files: no server code and no backend. Dev tooling may use npm packages; pin exact versions with a lockfile.
3. **Self-contained.**
   - No CDN and no third-party requests at runtime, except the AI provider the user configures.
   - Vendor the fonts (SIL OFL 1.1) and third-party GLSL, each with its licence text, under `third_party/`.
   - Once loaded, the site works offline (see the PWA item in §7).
4. **Types without a build-time language switch.** Use JSDoc types checked by `tsc --noEmit` with `checkJs` and `strict`. If you have a strong reason to use TypeScript source instead, record it in `docs/DECISIONS.md`.
5. **Pure core, thin shell.**
   - Everything that can be pure is pure and lives outside the DOM and WebGL: engine, PNG encoding, prompt building, reply parsing, provider request building, state migrations, URL and share-link codec.
   - Side effects sit behind small injected interfaces (`fetch`, storage, clock, random source, GL context).
6. **No invented facts.** Every reference in the docs must be verified (DOI, arXiv ID or official URL) before it is included. Anything you cannot verify goes in a clearly marked "unverified" list for the maintainer.
7. **Small, reviewable commits** with Conventional Commit messages, one phase at a time (see §10). The site must be deployable at the end of every phase.

## 3. Target layout

```
<repo>/
├─ .github/
│  ├─ workflows/
│  │  ├─ ci.yml            # PRs and pushes: lint, typecheck, unit+coverage, glsl, build, e2e
│  │  ├─ pages.yml         # push to main (and manual): build site + coverage, deploy to GitHub Pages
│  │  └─ release.yml       # tags v*: single-file HTML, SBOM, checksums → GitHub Release
│  ├─ dependabot.yml       # npm + github-actions
│  └─ ISSUE_TEMPLATE/, pull_request_template.md
├─ src/
│  ├─ engine/            # pure, no DOM, no GL; 100% unit-testable
│  │  ├─ rng.js            mulberry32, gaussian, pick
│  │  ├─ noise.js          JS port of the GLSL simplex noise + fbm (keep Math.fround)
│  │  ├─ ops.js            operator table (kinds, params, ranges) and formula-language docs
│  │  ├─ parse.js          tokenizer + parser with precise error messages
│  │  ├─ print.js          print + pretty-print
│  │  ├─ evaluate.js       tree → JS closure
│  │  ├─ codegen-glsl.js   tree → GLSL function (SSA-style temporaries)
│  │  ├─ genome.js         scalar genes, defaults, encode/decode (nsb3 + legacy), tag
│  │  ├─ analysis.js       sampling, normalisation, Lipschitz estimate, occupancy, viability, fitIso, uniforms
│  │  ├─ evolve.js         mutate, crossover, randomGenome, startGenome, formula bank
│  │  └─ palette.js        cosine palette helpers (CSS gradient, gene mapping)
│  ├─ render/
│  │  ├─ glsl/             noise3D.glsl (vendored, header kept), prelude.glsl, field.glsl, shade.glsl
│  │  ├─ shader.js         assembles fragment shaders from templates + generated code
│  │  ├─ gl.js             context, program cache (LRU), parallel compile, FBO, readback
│  │  ├─ camera.js         orbit/zoom state and input mapping (pure where possible)
│  │  ├─ scheduler.js      frame loop, adaptive resolution, thumbnail queue
│  │  └─ snapshot/
│  │     ├─ png.js         crc32, chunks, row filtering, streaming encoder (pure)
│  │     └─ tiler.js       tile plan + supersample box filter (pure) + GL driver
│  ├─ breeder/
│  │  ├─ prompt.js         buildPrompt (pure)
│  │  ├─ reply.js          parseReply (whole / fenced / embedded JSON)
│  │  ├─ verdict.js        apply a verdict to a litter → new litter + log entry (pure)
│  │  ├─ sheet.js          contact-sheet image composition
│  │  └─ providers/
│  │     ├─ index.js       common interface: ask({prompt, image, signal}) → {json, who}
│  │     ├─ claude-artifact.js   window.claude.use('sample') adapter (only active inside claude.ai)
│  │     ├─ anthropic.js   request builder (pure) + transport
│  │     └─ openai-compat.js request builder (pure) + transport
│  ├─ state/
│  │  ├─ store.js          versioned localStorage schema + migrations (nsb.v3, nsb.ai, nsb.keys, legacy nsb.key)
│  │  ├─ history.js        undo stack + lineage
│  │  ├─ share.js          genome ⇄ URL fragment (#g=nsb3.…) codec (pure)
│  │  └─ session.js        app state + tiny event emitter
│  ├─ ui/
│  │  ├─ styles/           tokens.css, base.css, layout.css, components.css
│  │  ├─ components/       stage, litter, curator, notes, shelf, genome, snapshot-sheet, viewer, toast, shortcuts
│  │  └─ i18n/             en.js, it.js (all user-facing strings live here)
│  ├─ about/               about.html: how it works, references, credits, licence (static, generated from docs where sensible)
│  └─ main.js              wiring only
├─ public/                 favicon, icons, manifest.webmanifest, social preview image, robots.txt
├─ third_party/            webgl-noise (MIT), fonts (OFL) — each with LICENSE and SOURCE.md
├─ tests/
│  ├─ unit/                mirrors src/
│  ├─ property/            fast-check properties
│  ├─ glsl/                generated shaders validated with glslangValidator
│  └─ e2e/                 Playwright specs + fixtures (fake AI servers)
├─ scripts/                inline-single-file.mjs, render-social-preview.mjs, check-offline.mjs
├─ docs/                   ARCHITECTURE.md, FORMULA_LANGUAGE.md, AI_BREEDER.md, REFERENCES.md, PARITY.md, DECISIONS.md, DEPLOY.md
├─ containers/             optional: Containerfile + compose.yaml for local dev with Podman (not used by CI)
├─ LICENSE, NOTICE, REUSE.toml, README.md, CONTRIBUTING.md, SECURITY.md, CHANGELOG.md, CITATION.cff
└─ package.json, package-lock.json, vite.config.js, vitest.config.js, playwright.config.js, tsconfig.json, eslint config, Makefile
```

## 4. Tooling

- **Vite** for the dev server and build. Use `base: './'` (relative), so the same build works under the Pages sub-path `/<repo>/`, at a custom domain root, and from `file://`. Build two targets:
  1. **The site** in `dist/site/`: the app at `index.html`, `about.html`, hashed assets, vendored fonts, the manifest and service worker, and the coverage report under `coverage/`. This is what gets deployed to Pages.
  2. **A single self-contained file**, `dist/noise-sculpture-breeder.html`, with all JS, CSS, GLSL and fonts inlined. It is attached to GitHub Releases. It must open from `file://` and must keep working as a claude.ai artifact, where the artifact runtime provides Claude.

  Prefer a small in-repo inlining script (`scripts/inline-single-file.mjs`) over an extra plugin. If you use a plugin, justify it in `DECISIONS.md`.
- **Vitest** for unit and property tests, with `@vitest/coverage-v8`. Use `fast-check` for property tests and `happy-dom` (or jsdom) for the few DOM-level unit tests.
- **Playwright** for end-to-end tests in Chromium with WebGL through SwiftShader: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Test against `vite preview` of the production build, served under the same sub-path Pages will use, to catch base-path bugs. Firefox and WebKit are a stretch goal.
- **glslang** (`glslangValidator`, Khronos) to validate generated GLSL ES 3.00 fragment shaders. In CI, install it from the Ubuntu runner's package manager or a pinned release.
- **ESLint and Prettier**, or Biome as a single tool. Also `tsc --noEmit` for types and `reuse lint` for licensing metadata.
- **npm scripts are the source of truth**: `dev`, `test`, `coverage`, `e2e`, `lint`, `typecheck`, `glsl`, `build`, `build:single`, `preview`, `check`, where `check` runs everything CI runs. A thin `Makefile` mirrors them. Podman is an option, never a requirement:
  - **Native:** Node LTS plus `npm ci`.
  - **Containers:** `make podman-dev` and `make podman-check` use `containers/` (rootless, images pinned by digest, workspace mounted with `:Z`). They give contributors an environment identical to CI without installing Node or browsers.
  - Optionally add a `.devcontainer/` for Codespaces using the same image.

## 5. Tests and coverage

**Coverage thresholds**, enforced in `vitest.config.js` and CI:
- `src/engine/**`, `src/render/snapshot/png.js`, `src/breeder/**` except `sheet.js`, and `src/state/**`: ≥ 90% lines and ≥ 85% branches.
- Overall: ≥ 80% lines.
- GL-bound and DOM-bound modules may be excluded from unit coverage only if Playwright specs cover them; list each exclusion with its reason in `vitest.config.js`.
- The HTML coverage report is published with the site at `/<repo>/coverage/`, and the README shows a coverage badge generated in CI. Don't use a third-party coverage service unless the maintainer asks.

**Engine:**
- `print(parse(s)) === s` for printed trees; also a property over random `grow(d)` trees.
- Parser error messages for each class of mistake: arity, unknown function, non-numeric parameter, unclosed parenthesis, trailing text.
- Parameter clamping and integer seeds.
- **Noise parity:** JS `snoise` against GLSL `snoise`, rendered and read back in Playwright at ≥ 64 points, with max error ≤ 0.003. Include a regression test showing the error without `Math.fround` is large, so nobody "simplifies" it away.
- Codegen: every operator compiles; across 500 random and mutated genomes, every shader passes `glslangValidator`.
- Analysis: deterministic sampling (seeded); the flat formula is rejected; occupancy bounds for solid, shell, contours and strands; `fitIso` reaches its targets for a fixed formula set.
- Evolution with a seeded RNG: `mutate` always returns a viable genome within its attempt budget; label distribution; strands flip rate around 8%; crossover keeps the tree-size limits.
- Codec and share links: encode/decode round trip, legacy 24-gene codes, rejection of malformed codes, and URL-fragment round trip.

**PNG:**
- CRC-32 against known vectors.
- A streamed tiny image decoded with a dev-only PNG decoder (`fast-png` or `pngjs`), with exact pixels.
- Odd sizes where the edge tiles are partial; supersample box-filter maths.

**Breeder:**
- Prompt snapshot test.
- `parseReply` on raw JSON, fenced JSON, JSON embedded in prose, and invalid replies.
- Verdict application:
  - In the "adds an offspring" role, the AI's offspring replaces its lowest-ranked slot and never its favourite.
  - In the "chooses the next parent" role, the countdown is driven by an injected clock.
  - Taste notes are capped at 5.
  - Agreement statistics count only while the breeder is on.
- **Provider request builders, with exact bodies and headers:**
  - Anthropic: `output_config.effort` only when set; `max_tokens` mapping (16000 for default and high, 32000 for xhigh and max, 8000 otherwise); image block first; browser-access header.
  - OpenAI-compatible: `reasoning_effort` only when set; `Authorization` only when a key is present; image as a `data:` URL only when the image toggle is on.
  - Endpoint normalisation: trailing slashes, `/v1`, full `/messages` or `/chat/completions` paths.
- Error mapping: a network or CORS failure produces a human message; an HTTP error surfaces the server's message.

**State:** migrations from every stored shape the prototype wrote (`nsb.v3`, `nsb.ai`, `nsb.keys`, legacy `nsb.key`, `nsb.big`, `nsb.logHidden`). An API key is never written unless "remember" is on.

**End-to-end** (Playwright against the built site under the Pages sub-path, with fake AI servers via `page.route` and a stub `window.claude` for artifact mode):
- load, then adopt, undo, keep, crossover labels, Random, Reset genes, Reset genome
- formula editor apply and errors
- opening a share link restores the specimen
- AI breeder on/off; all three providers; model fallback message in artifact mode
- note auto-close (fake timers) and the list toggle
- snapshot at a test size decodes; a stale render clears after the parent changes
- zoom controls and the Large view toggle
- light and dark themes; a phone viewport of 400 px
- the service worker serves the app offline after a first load
- `about.html` and `coverage/` resolve under the sub-path
- no console errors and no requests to third-party hosts (assert on the network log)

## 6. GitHub Actions and GitHub Pages

**`ci.yml`** runs on `pull_request` and `push`:
- **Jobs:**
  - `lint`, `typecheck`, `test` (unit, property and coverage with thresholds), `glsl`
  - `build`: both targets, plus a check that the build makes no third-party requests and that every asset URL is relative
  - `e2e`: Playwright with browsers cached, against `vite preview` of the build
  - `reuse`
- Upload the built site and the Playwright report as workflow artifacts. Pages has no built-in pull-request previews; a reviewer downloads the artifact. A preview deployment is an optional extra.
- Cache npm and Playwright browsers. Use `concurrency` to cancel superseded runs.

**`pages.yml`** runs on `push` to `main` and `workflow_dispatch`:
1. Check out the code, install with `npm ci`, run `npm run check` (the same gate as CI), then build the site.
2. Copy the coverage HTML report into `dist/site/coverage/`.
3. Render the social preview image with Playwright from a fixed showcase genome (`scripts/render-social-preview.mjs`), so the link preview always matches the current renderer.
4. `actions/configure-pages`, then `actions/upload-pages-artifact` with path `dist/site`, then `actions/deploy-pages`.
5. Settings: permissions `contents: read`, `pages: write` and `id-token: write`; environment `github-pages` with the deployed URL as output; `concurrency: { group: pages, cancel-in-progress: false }`.
6. **Smoke test after deploy:** a short Playwright check against the live URL. It must load, compile the first shader and log no console errors. A failure marks the run red.

**`release.yml`** runs on tags `v*`: build the single-file HTML, generate an SBOM (CycloneDX or SPDX), compute SHA-256 checksums, and create a GitHub Release with these assets and the matching `CHANGELOG.md` section.

**Supply-chain hygiene:**
- Pin every third-party action by full commit SHA, with the version in a comment.
- Grant each job the minimum `permissions`.
- Dependabot opens update PRs for `npm` and `github-actions`.
- Never run `npm install` without the lockfile in CI.
- Optional: build provenance attestation for release assets with `actions/attest-build-provenance`.

**Static-hosting constraints and how to handle them:**
- **No custom HTTP headers on Pages.** Put the Content-Security-Policy in a `<meta http-equiv>` tag:
  - `default-src 'self'`
  - `script-src 'self'`, with no `unsafe-eval` and no inline scripts in the site build
  - `style-src 'self'`
  - `img-src 'self' data: blob:`
  - `font-src 'self'`
  - `worker-src 'self' blob:`
  - `connect-src 'self' https: http://localhost:* http://127.0.0.1:*`, because AI endpoints are user-configured. Document why.

  `frame-ancestors` cannot be set from a meta tag; note that in `SECURITY.md`. The single-file build has inline code by nature, so it gets its own, looser meta CSP.
- **Sub-path hosting:** all asset, manifest, service-worker and font URLs are relative. The service worker scope is the repo path. Test this in e2e (§5).
- **HTTPS page calling local model servers:** browsers apply mixed-content and local-network-access rules to `http://localhost` calls from a public HTTPS origin, and the local server must allow the origin `https://<owner>.github.io` in CORS (for Ollama, `OLLAMA_ORIGINS`). Document this in the README and in-app. Recommend running the site locally (`npm run preview` or Podman) when using local models.
- **Custom domain:** support an optional `CNAME` via a repository variable, so the workflow writes it only when set.

**Repository settings the maintainer must change** (list them in `docs/DEPLOY.md`; you cannot change them yourself):
- Settings → Pages → Source: **GitHub Actions**
- branch protection on `main` requiring `ci`
- Dependabot alerts and security updates turned on
- a repository description and topics, with the Pages URL as the website
- the social preview image

## 7. UX and UI improvements

Keep the visual identity:
- the specimen-bench layout
- the token palette (paper/panel/ink/muted/rule, blue accent, terracotta for the AI)
- the type trio: Gloock for display, Schibsted Grotesk for body, Martian Mono for data
- light and dark themes

Then improve:

1. **Layout:** stage on the left with the litter right beside it, and side panels as tabs (Genome, AI breeder, Shelf, Export) instead of one long column. Keep the full-width "Large view" toggle, and remember the choice.
2. **Share links:** a "Share" button copies a URL with the genome in the fragment (`#g=nsb3.…`). Opening such a link loads that specimen as the parent. On a public site this becomes the main way people show each other what they bred.
3. **Keyboard:** 1–6 adopt, K keep, U undo, R random, S snapshot, Space spin, +/− zoom, 0 reset view, ? opens a shortcuts sheet. Visible focus everywhere, a logical tab order, and ARIA names on every control.
4. **Lineage strip:** clickable ancestors of the current specimen, so you can return to any of them. Undo stays.
5. **Session import/export:** a JSON file holding the shelf, the lineage, the AI's notes and settings without keys. Include a gallery view of kept specimens with batch snapshot.
6. **Status and feedback:**
   - a clear "compiling formula…" state on the stage
   - non-blocking toasts
   - actionable errors, such as how to fix CORS for local servers
   - a friendly fallback page when WebGL 2 is missing
7. **First run:** a dismissible three-step hint: pick an offspring, keep favourites, turn on the AI breeder.
8. **About page:** `about.html` explains how it works in plain language with a small diagram, then gives references, credits, the licence, and links to the repository and releases.
9. **Performance:** run formula analysis in a Web Worker so mutation never causes jank; keep adaptive resolution.
10. **i18n:** English by default, plus Italian, with all strings in `src/ui/i18n/`.
11. **Accessibility:** respect `prefers-reduced-motion` (no auto-spin), contrast AA in both themes, no information carried by colour alone, and a Lighthouse accessibility score of at least 95 measured in CI (Lighthouse CI or Playwright plus axe-core).
12. **PWA:** a manifest, icons and a service worker that caches the app shell, scoped to the repo path, so the site installs and works offline. Show an in-app notice when a new version is available.
13. **Social metadata:** Open Graph and Twitter card tags pointing at the rendered preview image, plus a favicon set.

## 8. AI breeder: providers, privacy, security

- Keep the three providers behind one interface. Request building is pure; the transport is injected.
- **On the Pages site,** the Anthropic API and OpenAI-compatible providers are the relevant ones. "Claude in claude.ai" appears only when the page runs as an artifact (when `window.claude` exists); otherwise it is hidden or explained, as the prototype does.
- **Artifact mode,** in the single-file build: only the claude.ai provider can work there, because the host blocks other network access.
- **Keys:**
  - Keep them in memory by default.
  - Write them to `localStorage` only when "Remember the key on this device" is ticked.
  - Never log them; redact them from error messages.
  - Say clearly in the UI and the README that on a public site the key goes straight from the visitor's browser to the provider, and nowhere else.
- **Optional, self-hosting only, after Pages is live:** a tiny proxy (`proxy/`, Node built-ins only) that keeps keys server-side. It is never part of the Pages deployment. Skip it unless the maintainer asks.
- **`SECURITY.md`:**
  - the threat model: a key in the browser, a prompt injection arriving through model output, a malicious share link
  - mitigations: model output and share links are treated as data, formulas are parsed by the strict parser with size and cost limits, nothing is evaluated as code
  - CSP limits on Pages
  - how to report issues

## 9. Documentation, credits and references

- **`README.md`:**
  - a live demo link and a Pages deployment badge
  - CI and coverage badges
  - screenshots and a short GIF
  - what the app is
  - how to run it locally, natively or with Podman
  - the single-file download from Releases
  - keyboard shortcuts
  - the AI providers and their privacy implications
  - licence, credits, and "how it works" in plain language
- **`docs/DEPLOY.md`:** how the Pages workflow works, the one-time repository settings, a custom domain, and how to roll back by re-running an earlier deployment.
- **`docs/ARCHITECTURE.md`:**
  - a Mermaid module diagram
  - the data flow, from genome through analysis, codegen, shader and frame
  - the snapshot pipeline
  - the AI turn sequence
  - the CI and deploy pipeline
- **`docs/FORMULA_LANGUAGE.md`:** grammar (EBNF), each operator with parameter ranges, examples, and limits (34 nodes, a cost of 9 noise evaluations).
- **`docs/AI_BREEDER.md`:** the prompt contract (input and JSON schema), the roles, taste notes, failure modes, and the provider settings.
- **`CITATION.cff`** so people can cite the project. **`NOTICE` and `third_party/*/SOURCE.md`:** origin, version or commit, licence, and any local modifications.
- **`docs/REFERENCES.md`**, also rendered on `about.html`: a bibliography. Verify each entry and add DOIs or arXiv IDs:
  - **Noise:**
    - K. Perlin, "An Image Synthesizer", SIGGRAPH 1985
    - K. Perlin, "Improving Noise", SIGGRAPH 2002
    - K. Perlin, "Noise hardware", in *Real-Time Shading* SIGGRAPH course notes, 2001 (simplex noise)
    - S. Gustavson, "Simplex noise demystified", 2005
    - I. McEwan, D. Sheets, M. Richardson, S. Gustavson, "Efficient computational noise in GLSL", *Journal of Graphics Tools* 16(2), 2012, with the webgl-noise repository (MIT)
    - K. Spencer, OpenSimplex / OpenSimplex2: related work, and the subject of the Wikipedia image that inspired the project
  - **Rendering:**
    - J. C. Hart, "Sphere tracing: a geometric method for the antialiased ray tracing of implicit surfaces", *The Visual Computer* 12(10), 1996
    - Inigo Quilez's articles on cosine palettes, smooth minimum, SDF normals (tetrahedron technique), soft shadows, distance functions, domain warping and fbm
    - K. Narkowicz, "ACES Filmic Tone Mapping Curve", 2016
  - **Interactive and artificial evolution:**
    - R. Dawkins, *The Blind Watchmaker*, 1986 (biomorphs)
    - K. Sims, "Artificial Evolution for Computer Graphics", SIGGRAPH 1991 (the closest ancestor: evolving expression trees for images)
    - J. R. Koza, *Genetic Programming*, 1992
    - H. Takagi, "Interactive evolutionary computation", *Proceedings of the IEEE* 89(9), 2001
    - J. Secretan et al., "Picbreeder", CHI 2008 / *Evolutionary Computation* 2011
    - J. Clune and H. Lipson, EndlessForms, 2011
  - **Language models as variation operators and judges of taste:**
    - J. Lehman et al., "Evolution through Large Models", 2022
    - E. Meyerson et al., "Language Model Crossover", 2023
    - B. Romera-Paredes et al., "Mathematical discoveries from program search with large language models" (FunSearch), *Nature* 2024
    - J. Zhang et al., "OMNI: Open-endedness via Models of human Notions of Interestingness", 2023
    - AlphaEvolve (Google DeepMind), 2025
  - **Learning material and tools:**
    - P. Gonzalez Vivo and J. Lowe, *The Book of Shaders*, chapter 11 (Noise)
    - glslViewer
    - Shadertoy (the export target)
  - **Specifications:**
    - WebGL 2.0 and GLSL ES 3.00 (Khronos), `KHR_parallel_shader_compile`
    - PNG (W3C), zlib and deflate (RFC 1950 and RFC 1951)
    - the WHATWG Compression Standard (`CompressionStream`)
    - the Web App Manifest and Service Workers (W3C)
  - **APIs and platform:**
    - the Anthropic Messages API (effort parameter, vision, browser CORS header)
    - the OpenAI Chat Completions API (`reasoning_effort`, image input)
    - GitHub Pages and GitHub Actions documentation
  - **Fonts:** Gloock, Schibsted Grotesk and Martian Mono, each with its designer and SIL OFL 1.1 licence.
- If the maintainer wants it, add a provenance note to README, CREDITS and the about page saying the first prototype was built with Claude in claude.ai.

## 10. Work plan (one PR or commit series per phase; deployable after each)

0. **Inventory and walking skeleton:**
   - extract the two scripts and the CSS verbatim into `legacy/`
   - write `docs/PARITY.md`
   - add characterization tests against the legacy engine
   - add a minimal `pages.yml` that deploys the legacy page unchanged with fonts vendored, so the Pages URL is live from day one
1. **Scaffold:** tooling, configs, npm scripts and Makefile; `ci.yml` with lint, typecheck and unit tests; Dependabot; actions pinned by SHA.
2. **Engine:** split the `ENGINE` IIFE into `src/engine/*` with tests; hit the coverage thresholds; publish the coverage report on Pages.
3. **Renderer:** GLSL into `.glsl` files (keep the webgl-noise header); `gl.js`, `scheduler.js`, camera; the snapshot PNG encoder and tiler with tests; noise-parity and glslang checks.
4. **Breeder:** prompt, reply, verdict and providers with exact request tests; fake-server end-to-end tests.
5. **UI split:** components, styles and i18n; reach parity with the prototype (all of `PARITY.md` checked). The Pages site now serves the new build.
6. **UX improvements** from §7, each behind its own commit with an end-to-end test: share links, keyboard shortcuts, lineage, about page, PWA, social preview and the rest.
7. **Release and hygiene:** `release.yml` with the single-file build, SBOM, checksums and optional attestation; the post-deploy smoke test; Lighthouse and axe checks; optional `containers/` for Podman users.
8. **Docs and compliance:** README, docs, REFERENCES (verified), NOTICE, REUSE metadata, SECURITY, CONTRIBUTING, CITATION, CHANGELOG.

## 11. Definition of done

- Every push to `main` that passes CI deploys to `https://<owner>.github.io/<repo>/` automatically, and the post-deploy smoke test passes.
- `npm ci && npm run check` passes on a clean machine with Node LTS. `make podman-check` passes on a machine with only Podman, if containers are included.
- The coverage thresholds in §5 are met; the coverage report is live at `/<repo>/coverage/`.
- Every item in `docs/PARITY.md` is checked.
- The live site makes no third-party requests except the configured AI provider. It works offline after the first visit, and share links work.
- `dist/noise-sculpture-breeder.html` is attached to each release, opens from `file://`, and still works as a claude.ai artifact (sample capability).
- `reuse lint` passes. Every vendored file has a licence and a source note. `docs/REFERENCES.md` contains only verified entries, plus a separate unverified list if needed.
- There are no console errors in the end-to-end runs or the smoke test. Lighthouse accessibility is at least 95 in both themes.

## 12. Gotchas learned from the prototype

- **Noise constant:** the JS noise needs `const n_ = Math.fround(0.142857142857)`. In double precision `7*n_` floors to 0 at some lattice points and the JS values blow up to about ±4.7; GLSL stores the constant as float32 and doesn't have this problem.
- **Framebuffer readback:** `readPixels` reads from the bottom-left. The thumbnail and tile path flips `gl_FragCoord` (`uFlip`) and uses `uOff` for tile offsets inside a larger virtual resolution. Keep that, and test a non-square partial edge tile.
- **Compilation:** shaders compile per formula. Use `KHR_parallel_shader_compile` with a non-blocking ready check, and an LRU program cache of about 30 entries. Never block the frame loop on `LINK_STATUS`.
- **Stale snapshots:** the snapshot result must be tied to the specimen it rendered. Opening Snapshot after the parent changes must clear the old render; that was a real bug.
- **Model output is data:**
  - Parse it with the strict parser.
  - Enforce the size limit (34 nodes) and cost limit (9) before `fitIso`.
  - If the formula is constant or too fine, drop the AI's offspring and log why.
  - Ignore a stale reply if the litter changed while the AI was thinking.
- **Share links get the same treatment:** strict decode and the same limits, never evaluation.
- **Notes:** the auto-close timer pauses while the note is hovered or focused; a note the user opened stays open.
- **Strands:** strands draw where `length(vec2(n − iso, n2 − iso)) < 1.5·thickness`, with `n2` evaluated at a fixed rotated and offset copy of space. Viability uses the same test on the sample points.
- **Headless CI:** CI runners have no GPU, so WebGL runs on SwiftShader. Keep test render sizes small (thumbnails at 200 px, snapshot tests at 400 px) so jobs stay fast. Headless runs also hang on network fonts; vendored fonts remove that.
- **Pages sub-path:** absolute URLs (`/assets/...`) break under `/<repo>/`. The service worker scope, the manifest `start_url` and `scope`, and font URLs in CSS are the usual culprits.
- **CORS:** pages opened from `file://` have origin `null`, while the Pages site has origin `https://<owner>.github.io`. Local model servers must allow whichever one is used.

## Open decisions for the maintainer (ask before phase 1)

1. Licence for the project code. Suggested default: GPL-3.0-or-later, which is compatible with the MIT and OFL third-party parts.
2. Repository name and owner, which fix the Pages URL. Also whether to use a custom domain.
3. Whether to keep the claude.ai artifact mode as a first-class release target (recommended) or as a best-effort extra.
4. Whether to include the optional `containers/` (Podman) setup and the optional self-hosting proxy.
5. The maintainer name and contact for `SECURITY.md` and `CITATION.cff`.
