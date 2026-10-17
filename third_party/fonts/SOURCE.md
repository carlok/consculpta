# Vendored web fonts

<!-- SPDX-License-Identifier: Apache-2.0 -->

These files are served at runtime from `third_party/fonts/` (see `fonts.css`). They replace the Google Fonts links in the prototype.

| Family | Package | Version | Licence | Upstream |
|--------|---------|---------|---------|----------|
| Gloock | `@fontsource/gloock` | 5.2.5 | [SIL OFL 1.1](gloock/LICENSE) | [google/fonts](https://github.com/google/fonts/tree/main/ofl/gloock) |
| Schibsted Grotesk | `@fontsource/schibsted-grotesk` | 5.2.5 | [SIL OFL 1.1](schibsted-grotesk/LICENSE) | [google/fonts](https://github.com/google/fonts/tree/main/ofl/schibstedgrotesk) |
| Martian Mono | `@fontsource/martian-mono` | 5.2.5 | [SIL OFL 1.1](martian-mono/LICENSE) | [google/fonts](https://github.com/google/fonts/tree/main/ofl/martianmono) |

## Files included

Latin `woff2` subsets only, matching the prototype’s Google Fonts request:

- Gloock 400
- Schibsted Grotesk 400, 500, 600
- Martian Mono 400, 500

## Local modifications

None. Files are copied verbatim from the Fontsource npm packages.
