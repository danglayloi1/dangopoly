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

New to the game? Press **🎓 Hướng dẫn chơi** on the start screen for a guided practice game.

### Screenshots of a scene

With `npm run dev` running, this plays a scripted scene in Microsoft Edge and saves pictures to
`screenshots/` (not committed). Scenes: `trade`, `jail`, `save`, `motion`, `tutorial`, `audit`.

```bash
npm run shots -- tutorial            # desktop size
npm run shots -- tutorial --mobile   # phone size
npm run shots -- audit --dark        # every main screen in dark mode, plus a long random game
```

The app icons and the link-preview picture in `public/` are made by `node scripts/make-assets.mjs`
(also needs `npm run dev` running); run it again only when the look changes.

### Artwork

The look follows Đông Hồ folk prints (tranh Đông Hồ): paper texture, ink outlines, and in dark
mode, lacquer (sơn mài). The four pictures in `src/assets/art/` (the start-screen banner, the
middle of the board, and the two card decks) were made with an AI image tool, then shrunk to WebP:

```bash
node scripts/optimize-art.mjs <folder with board.png, banner.png, chance.png, community.png>
```

## Deploying

Every push to the `main` branch runs the tests, builds the site, and publishes it to GitHub Pages
automatically (see [.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

## Project layout

| Folder | What's inside |
|---|---|
| `src/engine/` | Game rules, with no UI code |
| `src/data/` | The board, tokens, and other fixed game data |
| `src/ui/` | React screens: setup, board, player list, history |
| `src/i18n/` | Vietnamese and English text |
| `src/tutorial/` | The guided first game: its steps and the hint card |
| `src/assets/art/` | The folk-art pictures |
| `scripts/` | The screenshot tool, and helpers for icons and artwork |
| `tests/` | Unit tests (Vitest) |
| `public/` | Static files such as the icon |
