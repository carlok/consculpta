# Security policy

<!-- SPDX-License-Identifier: Apache-2.0 -->

## Supported versions

Security fixes are applied on the default branch (`main`) and released via GitHub Pages when merged. There is no separate versioned release channel.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Report vulnerabilities **privately** using [GitHub Security Advisories](https://github.com/carlok/consculpta/security/advisories/new) for this repository (Repository → **Security** → **Report a vulnerability**).

If you cannot use Security Advisories, contact the maintainer on GitHub: [@carlok](https://github.com/carlok) (e.g. a private gist or coordinated disclosure request via GitHub)—**not** by email in this document.

Include:

- A description of the issue and impact
- Steps to reproduce
- Affected paths (e.g. live site, build scripts, dependencies)
- Your preferred disclosure timeline, if any

We will acknowledge reports as soon as practical and work on a fix before public disclosure when appropriate.

## Scope notes

- Consculpta runs **entirely in the browser** on GitHub Pages; there is no project backend.
- Users may configure their own AI API keys in the client; those keys are never sent to the Consculpta repository or maintainers.
- Dependency updates are tracked via Dependabot; supply-chain issues may be fixed by bumping affected packages.
