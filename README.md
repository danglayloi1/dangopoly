# Dangopoly: Nghệ Tĩnh Edition

A property-trading board game set in Hà Tĩnh and Nghệ An, played in the browser.
2–4 players take turns on one device, in Vietnamese or English.

**Play:** https://danglayloi1.github.io/dangopoly/

The full design is in [SPEC.md](SPEC.md).

## Running it on your computer

You need [Node.js](https://nodejs.org) (LTS).

```bash
npm install      # first time only: downloads the libraries
npm run dev      # starts the game at http://localhost:5173/dangopoly/
npm test         # runs the rule tests
npm run build    # builds the final website into dist/
```

## Deploying

Every push to the `main` branch runs the tests, builds the site, and publishes it to GitHub Pages
automatically (see [.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

## Project layout

| Folder | What's inside |
|---|---|
| `src/engine/` | Game rules, with no UI code |
| `src/` | React UI |
| `tests/` | Unit tests (Vitest) |
| `public/` | Static files such as the icon |
