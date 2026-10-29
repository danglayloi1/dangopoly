# Dangopoly: Nghệ Tĩnh Edition

A property-trading board game set in Hà Tĩnh and Nghệ An, played in the browser.
2–4 players take turns on one device, or play online from their own phones, in Vietnamese,
Tiếng Nghệ (the Nghệ Tĩnh dialect: *mi, răng, rứa, nỏ, nhởi…*) or English.

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

**Open rooms:** the Online screen lists the rooms open right now: join one that's waiting for
players, or watch any game being played (hosts can keep their room off the list).

**Online extras:** tap 😊 to send a quick reaction (15 emoji, 8 Nghệ phrases like *Răng rứa?*) that
pops up on every phone, or to throw a dép, a bánh chưng or a flower at someone's token; tap 💬 to chat with the room, in the lobby and during the game (new messages
also pop up on screen during the game); after a game
the host can start **a new game in the same room**.

**Chế độ Việt:** optional rules ticked when setting up: Tết lì xì (every 5 rounds the richest helps the
poorest), Ăn vạ (a once-a-game tantrum knocks 20% off a debt), Mặc cả (haggle before buying) and 11 funny
Cơ hội / Khí vận cards.

**Game types:** classic (until one player is left), a round limit, or a time limit; with a limit the
richest player wins. Turn on **🏮 Lễ hội xứ Nghệ** and every 3rd round a festival changes one rule for
that round. At the end, a summary shows the ranking, a chart of everyone's wealth, titles and stats.

After **Vào chơi**, the menu offers: play on one device, **play against the computer** (1–3 bots,
each Dễ, Vừa or Khó), play online, the guided practice game
(**🎓 Hướng dẫn chơi**), **Thành tích** (records and 18 badges for everyone who plays on this device), and settings (language, six color themes with previews, effect speed, sound volume).

**Music:** the 🎵 button in the corner opens a Spotify player with Nghệ Tĩnh folk songs (dân ca ví giặm),
or any Spotify playlist you paste in. Nothing is loaded from Spotify until you open it. The player in
the page plays whole songs only when this browser is logged in to Spotify and lets it use that login
inside other sites (many phone browsers don't); otherwise 30-second previews. **Mở trong app Spotify**
plays it in the Spotify app instead.

### Screenshots of a scene

With `npm run dev` running, this plays a scripted scene in Microsoft Edge and saves pictures to
`screenshots/` (not committed). Scenes: `trade`, `jail`, `save`, `motion`, `tutorial`, `audit`, `theme`,
`modes` (round and time limits, festivals, the summary), `effects` (each effect frozen mid-way), `bots` (you against two computer players), `fun` (dice under the table, a bot talking), `viet` (each Chế độ Việt rule on screen), `records` (badges, the
summary picture and the records screen), `layout` (cards fitting small boards, the phone
player strip, screen transitions; add `--mobile`), `online` (three phones in one room; needs
`npm run server` too), `live` (the published site).

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

### The online room server

Online play goes through a small server in `server/` (a Cloudflare Worker; see SPEC.md §10).
To run it on this computer and check it with three pretend phones:

```bash
npm run server         # starts it at http://localhost:8787 (leave it running)
npm run server:check   # in another terminal: plays a short online game against it
```

## Deploying

Every push to the `main` branch runs the tests, builds the site, and publishes it to GitHub Pages
automatically (see [.github/workflows/deploy.yml](.github/workflows/deploy.yml)).
The room server deploys to Cloudflare the same way once the Cloudflare secrets are set
(see [.github/workflows/server.yml](.github/workflows/server.yml)).

## Project layout

| Folder | What's inside |
|---|---|
| `src/engine/` | Game rules, with no UI code |
| `src/data/` | The board, tokens, and other fixed game data |
| `src/ui/` | React screens: setup, board, player list, history |
| `src/i18n/` | Vietnamese, Tiếng Nghệ (`nghe.ts`) and English text |
| `src/tutorial/` | The guided first game: its steps and the hint card |
| `src/assets/art/` | The folk-art pictures |
| `src/net/` | Messages between phones and the room server |
| `server/` | The online room server (Cloudflare Worker + Durable Object) |
| `scripts/` | The screenshot tool, and helpers for icons and artwork |
| `tests/` | Unit tests (Vitest) |
| `public/` | Static files such as the icon |
