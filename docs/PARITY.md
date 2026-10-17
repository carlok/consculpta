# Feature parity checklist

<!-- SPDX-License-Identifier: Apache-2.0 -->

This list mirrors [BRIEF.md §1](../BRIEF.md). Check items only when the refactored site matches the prototype behaviour (phase 0 pins behaviour with characterization tests against `legacy/`).

Maintainer decisions that **narrow** the prototype are marked **removed** below (see [DECISIONS.md](DECISIONS.md)).

## Sculptures and formulas

- [ ] Sculptures are the region where a shape formula over 3D simplex noise rises above an iso level inside a sphere, cube, or drum.
- [ ] Formula language: `noise`, `fbm`, `sin`, `abs`, `neg`, `soft`, `gauss`, `scale`, `add`, `sub`, `mul`, `min`, `max`, `smin`, space ops (`twist`, `rotx`, `roty`, `rotz`, `mirx`, `miry`, `mirz`, `warp`, `zoom`), leaves `x`, `y`, `z`, `r`, numeric constants.

## Genome

- [ ] Shape formula + colour formula + 25 scalar genes (iso, thickness, surface mode, contours, block, block size, edge fade, cosine palette a/b/c/d, hue shift, colour mix, colour spread, gloss, light angle, strands).
- [ ] Genome codes: `nsb3.` + base64url JSON; legacy 24-gene codes still decode (strands gene padded).

## Rendering and analysis

- [ ] Formulas compile to GLSL ES 3.00; sphere tracing with bisection, tetrahedral normals, soft shadows, AO, ACES-style tone mapping.
- [ ] Pre-compile JS analysis on 520 sample points: normalisation, Lipschitz step bound, reject empty/solid/too-fine; JS simplex noise matches GLSL (~0.002) with `Math.fround` on the lattice constant.

## Evolution

- [ ] Litters of six offspring; operators tweak, swap, graft, wrap, hoist; scalar mutation; occasional strands switch.
- [ ] Crossover from shelf specimens; undo; Reset genes; Reset genome; Random.

## AI breeder

- [ ] Optional second breeder; contact sheet JPEG (numbered 1–6), formulas, human picks, carried taste notes.
- [ ] JSON reply: favourite, ranking, critique, direction, offspring formula, optional palette, strands flag.
- [ ] Roles: add offspring to litter or choose next parent after 5s countdown (cancellable).
- [ ] Providers: Anthropic Messages API and OpenAI-compatible `/chat/completions` (user-configured endpoints from the browser).
- [x] **Removed:** Claude in claude.ai artifact provider (`window.claude.use('sample')`) — not shipped; UI will hide/remove this option in a later phase. Legacy `noise-sculpture-breeder.html` / `legacy/app.js` may still contain dead code until then.
- [ ] Notes log with 12s auto-close and Show/Hide toggle.

## Views and export

- [ ] Main view orbit/zoom (wheel, pinch, buttons, keys), fullscreen.
- [ ] Large view layout toggle (full width vs side by side).
- [ ] Adaptive resolution while moving; thumbnail offscreen FBO; `KHR_parallel_shader_compile` program cache.
- [ ] 4K/8K PNG export (16:9, square, 9:16; 1 or 4 spp); tiled GPU render; hand-written PNG encoder (`CompressionStream`, CRC-32, Sub filter).
- [ ] Zoomable preview Fit/100%; Shadertoy shader export.

## Look and feel

- [ ] Light/dark themes via CSS tokens; Gloock, Schibsted Grotesk, Martian Mono; specimen-bench layout.

## Phase 0 characterization coverage (tests)

| Area | Status |
|------|--------|
| Parse/print round trips | Covered in `tests/legacy/engine.test.js` |
| Genome encode/decode + legacy 24-gene code | Covered |
| Noise at fixed points | Covered |
| Viability for fixed formulas | Covered |
| Provider request bodies (Anthropic, OpenAI-compatible) | Covered in `tests/legacy/provider-requests.test.js` |
| Claude artifact provider | **Removed** — out of scope; not characterized in phase 0 |

Remaining rows in this table are unchecked until later phases add rendering, UI, and e2e parity.
