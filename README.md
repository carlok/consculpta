# Consculpta

Interactive evolution of 3D sculptures from formulas over simplex noise, raymarched in WebGL 2.

- **Live site:** https://carlok.github.io/consculpta/ (legacy UI until the refactored app ships)
- **Licence:** [Apache-2.0](LICENSE)

## Development

```bash
npm ci
npm run check    # lint, typecheck, unit tests
npm run dev      # Vite dev server (refactored shell under src/)
```

The Pages deployment still serves the root `index.html` and `legacy/` tree. See [docs/DECISIONS.md](docs/DECISIONS.md) for maintainer decisions and the phased plan.
