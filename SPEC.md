# Dangopoly: Nghệ Tĩnh Edition — Design Spec

> A property-trading board game set in Hà Tĩnh and Nghệ An, played in the browser.
> Status: **built (v1.0.0)**. This document now describes the finished game. Play at https://danglayloi1.github.io/dangopoly/
> Since v2.3.0 it is the first game in **Sân nhởi**, a hub of games (see §19).

---

## 1. Summary

| Topic | Decision |
|---|---|
| Platform | Web browser (PC + phone), no install |
| Players | 2–4, hot-seat (take turns on one device) |
| Language | Vietnamese + English, switchable at any time |
| Rules | Classic property-trading rules + Nghệ Tĩnh flavor (see the simplifications in §3) |
| Game end | Last player standing (everyone else bankrupt) |
| Money | Simplified đồng: `500k`, `2tr`, `15tr` |
| Visual style | Clean flat 2D, colorful, mobile-friendly |
| Tokens | Local icons |
| Saving | Auto-save in the browser; reopen page to continue |
| Polish | Dice + token animations, sound effects (mute button), confetti for the winner. No music. |
| Tutorial | Interactive guided first game with pop-up hints |
| Hosting | GitHub Pages, public repo `dangopoly`, auto-deploy on push |

---

## 2. The board — "from hometown to Vinh"

The board tells a story: you **start in Hà Tĩnh** (spaces 1–19), **cross Cầu Bến Thủy** (the corner at space 20),
and finish in **Nghệ An** (spaces 21–39), with Vinh city as the most expensive area.

All amounts are classic values × 10,000đ (e.g. classic $200 → **2tr**).

### Corners

| # | Name (VI) | English | Effect |
|---|---|---|---|
| 0 | Xuất phát | Start | Collect **2tr** each time you pass |
| 10 | Nhà tạm giữ | Jail / Just visiting | Only visiting unless sent here |
| 20 | Cầu Bến Thủy | Bến Thủy Bridge | Rest stop, nothing happens |
| 30 | Vào nhà tạm giữ | Go to Jail | Go directly to Jail, don't collect 2tr |

### All 40 spaces

| # | Space | Group | Price | House cost |
|---|---|---|---|---|
| 0 | **Xuất phát** | corner | — | — |
| 1 | Vườn bưởi Phúc Trạch (Hương Khê) | 🟫 Brown | 600k | 500k |
| 2 | Khí vận | card | — | — |
| 3 | Lò kẹo cu đơ | 🟫 Brown | 600k | 500k |
| 4 | Thuế thu nhập (Income tax) | tax | pay 2tr | — |
| 5 | Bến xe Hà Tĩnh | 🚌 Transport | 2tr | — |
| 6 | Suối nước nóng Sơn Kim | 🟦 Light blue | 1tr | 500k |
| 7 | Cơ hội | card | — | — |
| 8 | Hồ Kẻ Gỗ | 🟦 Light blue | 1tr | 500k |
| 9 | Cửa khẩu Cầu Treo | 🟦 Light blue | 1tr2 | 500k |
| 10 | **Nhà tạm giữ** | corner | — | — |
| 11 | Kỳ Anh | 🩷 Pink | 1tr4 | 1tr |
| 12 | Nhiệt điện Vũng Áng | ⚡ Utility | 1tr5 | — |
| 13 | Nghi Xuân | 🩷 Pink | 1tr4 | 1tr |
| 14 | Hồng Lĩnh | 🩷 Pink | 1tr6 | 1tr |
| 15 | Cảng Vũng Áng | 🚢 Transport | 2tr | — |
| 16 | Biển Thạch Hải | 🟧 Orange | 1tr8 | 1tr |
| 17 | Khí vận | card | — | — |
| 18 | Biển Thiên Cầm | 🟧 Orange | 1tr8 | 1tr |
| 19 | Biển Xuân Thành | 🟧 Orange | 2tr | 1tr |
| 20 | **Cầu Bến Thủy** | corner | — | — |
| 21 | Đảo chè Thanh Chương | 🟥 Red | 2tr2 | 1tr5 |
| 22 | Cơ hội | card | — | — |
| 23 | Thái Hòa | 🟥 Red | 2tr2 | 1tr5 |
| 24 | Vườn quốc gia Pù Mát | 🟥 Red | 2tr4 | 1tr5 |
| 25 | Ga Vinh | 🚆 Transport | 2tr | — |
| 26 | Biển Diễn Thành | 🟨 Yellow | 2tr6 | 1tr5 |
| 27 | Biển Cửa Hội | 🟨 Yellow | 2tr6 | 1tr5 |
| 28 | Thủy điện Bản Vẽ | 💧 Utility | 1tr5 | — |
| 29 | Biển Cửa Lò | 🟨 Yellow | 2tr8 | 1tr5 |
| 30 | **Vào nhà tạm giữ** | corner | — | — |
| 31 | Chợ Vinh | 🟩 Green | 3tr | 2tr |
| 32 | Đại học Vinh | 🟩 Green | 3tr | 2tr |
| 33 | Khí vận | card | — | — |
| 34 | Công viên trung tâm Vinh | 🟩 Green | 3tr2 | 2tr |
| 35 | Sân bay Vinh | ✈️ Transport | 2tr | — |
| 36 | Cơ hội | card | — | — |
| 37 | Sân vận động Vinh (SLNA) | 🟦 Dark blue | 3tr5 | 2tr |
| 38 | Phí cầu đường (Road toll) | tax | pay 1tr | — |
| 39 | Đường Quang Trung, Vinh | 🟦 Dark blue | 4tr | 2tr |

Town names have no "thị xã / thị trấn" prefix, because the 2025 administrative reorganization removed district-level units.

Rent tables follow the classic values × 10k and live in `src/data/board.ts`, where they're easy to tune.

**Left out on purpose:** memorials and religious or historic sites (Làng Sen Kim Liên, Ngã ba Đồng Lộc,
Khu lưu niệm Nguyễn Du, Chùa Hương Tích, Đền Cuông). Buying them and charging rent would feel disrespectful.
They can still appear respectfully in cards and the tutorial, e.g. *"Visit Ngã ba Đồng Lộc to pay respects."*

---

## 3. Rules

### Turn flow
1. Roll 2 dice and move. **Doubles** → roll again. **3 doubles in a row** → go to Jail.
2. Resolve the space you land on:
   - **Unowned property** → buy it at list price, or skip. **No auctions**: a skipped property stays with the bank.
   - **Owned by someone else** → pay rent (none if it's mortgaged).
   - **Card space** → draw from that deck and follow it.
   - **Tax** → pay the bank.
   - **Go to Jail** → go directly to Jail.
3. Before ending your turn, you may **build, sell houses, mortgage, unmortgage, or trade**.

### Rent
- **Property:** base rent, **doubled** if the owner has the whole color set and no houses on it, then higher rent with 1–4 houses or a hotel.
- **Transport:** 250k / 500k / 1tr / 2tr for owning 1 / 2 / 3 / 4 of them.
- **Utility:** dice total × 40k (own 1) or × 100k (own both).

### Houses and hotels
- You can only build on a **full color set** with **no mortgaged property** in it.
- **Even building:** no property in a set may have 2+ more houses than another in the same set.
- 4 houses → can upgrade to 1 hotel.
- No limit on the bank's supply of houses (a simplification of the classic rules).

### Raising money
- **Sell houses** back to the bank at **half** what they cost (even-selling rule applies).
- **Mortgage** a property: get **half** its price, and it earns no rent. To unmortgage, pay the half back **+10%**.
  A set has to have its houses sold before any property in it can be mortgaged.

### Trading
- On your turn, offer any player a deal: properties + money + "Ra tù miễn phí" cards, in either direction.
- The other player accepts or declines on the same screen.
- Properties with houses can't be traded; sell the houses first.

### Jail
- To get out: **pay 500k**, **roll doubles** (up to 3 tries), or **use a "Ra tù miễn phí" card**.
- After 3 failed tries you must pay 500k and move.
- You still collect rent while in jail.

### Bankruptcy and winning
- If you owe more than you can raise by selling houses and mortgaging, you're **bankrupt**.
  - If you owe another player, everything you own goes to them.
  - If you owe the bank, your properties return to the bank, unowned.
- The last player who isn't bankrupt **wins**.

### Starting money
**15tr** per player by default (the classic amount). The setup screen, and the host in an online room, can also pick **10tr / 20tr** or type any amount from 1 to 100 triệu.

### Simplifications compared with the classic rules
- **No auctions:** a property nobody buys stays with the bank.
- **No limit** on the bank's supply of houses and hotels.
- **Bankruptcy to a player:** mortgaged properties pass on still mortgaged, without the 10% interest.
- **Bankruptcy to the bank:** properties go back on sale instead of being auctioned.
- **"Đám cưới" card:** a player who can't afford the 100k gift gives what they have (nobody goes bankrupt on someone else's turn).
- **"Mất điện!" card:** uses the dice already rolled instead of rolling again.

---

## 4. Cards

16 per deck, all listed in `src/data/cards.ts`, shuffled from the game seed. A few examples:

**Cơ hội (Chance)**: movement and luck
- Đi tắm biển Cửa Lò → advance to Biển Cửa Lò.
- Đi tàu Thống Nhất → advance to the nearest transport space; pay double rent if it's owned.
- Không đội mũ bảo hiểm → fine 150k.
- Trúng mùa bưởi Phúc Trạch → collect 500k.
- Lạc đường trong thành Vinh → go back 3 spaces.
- Ra tù miễn phí → keep this card.
- Lũ miền Trung → pay 250k per house and 1tr per hotel for repairs.
- Về Xuất phát → advance to Start and collect 2tr.

**Khí vận (Community Chest)**: money events
- SLNA vô địch! → collect 200k.
- Bán kẹo cu đơ cho khách du lịch → collect 500k.
- Đóng học phí Đại học Vinh → pay 500k.
- Đám cưới → every player gives you 100k as a wedding gift.
- Đi khám ở bệnh viện → pay 1tr.
- Khao cả nhóm cháo lươn Vinh (Cơ hội) → pay 500k to each player.
- Dâng hương tại Ngã ba Đồng Lộc → pay 100k for incense and flowers.
- Ra tù miễn phí → keep this card.

---

## 5. Tokens
Each player picks one (2–4 players, 16 choices):
**Nón lá** · **Con trâu** · **Quả cam Xã Đoài** · **Bóng đá SLNA** · **Gói kẹo cu đơ** · **Xe đạp** ·
**Bát cháo lươn** · **Gà trống** · **Ấm chè xanh** · **Heo đất** · **Con hến sông Lam** · **Mũ cối**, and four
meme-style ones of our own: **Chó Shiba liếc** (a side-eye Shiba) · **Ếch cười** · **Mèo khóc** · **Vịt cao su**.

Drawn as simple flat SVG icons on a disc of the player's color. There are 14 colors: 8 plain ones and 6 two-color
ones (Đỏ vàng, Biển và cát, Lúa chín, Sen hồng lá xanh, Đêm trăng, Kẹo dừa), whose disc is split diagonally.
The strip along an owned place's edge alternates both colors, a player's line on the results chart (and in the
shared picture) is dashed with the second color, and the owner dot on the place card is split like the
token; elsewhere (borders, text) a two-color choice uses its first color.

**Whose turn** is shown with the player's token: on the card games' felt ("Lượt của …", pulsing on your own
turn) with a gold "Đang đánh" tag on that seat, and in Dangopoly with a gold "Đang đi" tag on that player's card.

---

## 6. Tutorial
An **interactive guided first game** (21 steps, `src/tutorial/script.ts`), started from **🎓 Hướng dẫn chơi**:
- The dice are scripted, so the tutorial always hits the same situations:
  buy a property, pay rent, draw a card, complete a set, build a house, get sent to Jail, make a trade, mortgage a property.
- A pop-up points at the relevant button and explains it in one or two sentences, in the current language.
- It can be skipped at any time, and replayed from the main menu.

---

## 7. Tech plan

| Part | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Typed like C++; catches bugs early |
| Build tool | **Vite** | Fast dev server, simple static build for GitHub Pages |
| UI | **React** | Board, panels, and dialogs as components |
| Game logic | Pure TS **state machine** (`state + action → new state`) | Easy to test, save, and replay; feels like a CP simulation |
| Randomness | Seedable RNG | Lets the tutorial script the dice; reproducible bugs |
| Tests | **Vitest** | Unit tests for every rule |
| Save | `localStorage` | Auto-save after every action |
| i18n | One typed dictionary per language (`src/i18n/strings.ts`) | Lightweight; the compiler checks both languages have every text |
| Sound | Sounds generated with the Web Audio API | No audio files to download or license |
| Screenshots | `playwright-core` driving Microsoft Edge | Scripted scenes with checks (`npm run shots`) |
| Deploy | GitHub Actions → GitHub Pages | Push to `main` → the site updates |

```
dangopoly/
├─ src/
│  ├─ engine/     # pure game rules: state, actions, reducer, rng (no UI)
│  ├─ data/       # board.ts, cards.ts, tokens.ts
│  ├─ i18n/       # strings.ts: Vietnamese and English text
│  ├─ ui/         # React components: Board, PlayerList, Dice, TradeDialog, sound, animations...
│  └─ tutorial/   # scripted steps and the hint card
├─ scripts/       # screenshots.mjs, make-assets.mjs (icons, link preview)
├─ tests/
└─ .github/workflows/deploy.yml
```

---

## 8. Milestones (all done)

Built in this order; trading came before jail and cards, because without it games often stalled with no complete color sets. Each milestone was a pull request and a release.

1. ✅ **Setup** (v0.1.0): project, GitHub repo, auto-deploy to GitHub Pages.
2. ✅ **Core engine** (v0.2.0): board, dice, movement, buying, rent, Start salary, bankruptcy, with tests.
3. ✅ **Playable board UI** (v0.3.0): hot-seat turns for 2–4 players, VI/EN switch.
4. ✅ **Building and money** (v0.4.0): houses, hotels, sell-back, mortgage.
5. ✅ **Trading** (v0.5.0).
6. ✅ **Jail and cards** (v0.6.0).
7. ✅ **Auto-save** (v0.7.0).
8. ✅ **Animations + sound** (v0.8.0).
9. ✅ **Interactive tutorial** (v0.9.0).
10. ✅ **Polish + final release** (v1.0.0): dark-mode and phone audit, winner screen, link preview, home-screen icon.

---

## 9. GitHub
- Account: [danglayloi1](https://github.com/danglayloi1)
- Repo: `danglayloi1/dangopoly`
- Live game: https://danglayloi1.github.io/dangopoly/

---

## 10. Online play

Friends play from their own phones. One player creates a room and shares its code or link; everyone else joins from the link. Hot-seat play on one device stays as it is.

### How it works

```
 phone A ─┐                          ┌──────────────────────────────┐
 phone B ─┼─ WebSocket ─ Worker ─────┤ Room (Durable Object)        │
 phone C ─┘   (moves in,             │  seats, lobby, GameState      │
               state out)            │  runs the same engine code    │
                                     └──────────────────────────────┘
```

- **Server:** a Cloudflare Worker with one *Durable Object* per room, on Cloudflare's free plan. The room keeps the seats and the `GameState` and runs the same `applyAction` as the browser, so all phones see the same game and a move is only accepted if it's allowed.
- **Who may move:** the player whose turn it is; the player in debt while a debt is open; the player a trade is offered to, for the answer. Nobody else. Dice are always rolled by the server.
- **Seats and reconnecting:** joining gives the phone a secret seat key (kept in that browser). A phone that sleeps, reloads or loses signal reconnects with it and gets its seat back. Others see it as offline meanwhile.
- **Rooms:** 6-letter codes without look-alike letters (no I, O, 0, 1). A room is deleted after 7 days without moves.
- **Privacy:** no accounts; a room holds only the names and the game. The Spotify panel is unaffected.
- **Limits:** 2–4 players per room; messages over 8 KB are refused.

### Milestones

11. ✅ **Game server** (no release: nothing changed for players yet): the who-may-move rule in the engine; the room logic as plain TypeScript with tests; the Worker and Durable Object around it; deploy from GitHub Actions.
12. ✅ **Online screens** (v1.3.0): "Chơi online" on the start screen (create or join), the lobby (name, token, color; the host starts; first-turn dice for everyone), the game screen in online mode (only your own buttons; trade offers pop up on the other player's phone), offline markers, rejoin by link, QR code; screenshots of 2–4 phones playing.

---

## 11. Game types, festivals and the summary

- **Classic:** play until one player is left.
- **Round limit** (10/15/20/30): a round ends when play comes back to the first player. After the last round, the richest player wins.
- **Time limit** (20/30/45/60 min): when time is up, the game ends at the start of the next turn and the richest player wins. A saved local game's clock doesn't run while it's closed. Online, only the room server's clock decides.
- **Wealth** = cash + land at its price (half if mortgaged) + houses at their cost. Ties go to more cash.
- **Festivals** (optional): rounds 3, 6, 9… each have one of 16, picked by the game's seeded random numbers. It lasts that round.

  | Festival | Effect |
  |---|---|
  | Lễ hội Đền Cuông | rent ×2 on one random color set |
  | Lễ hội Làng Sen | double salary at Xuất phát |
  | Mùa gió Lào | no building |
  | Lễ hội Đền Chiêu Trưng | the bank gives everyone 1tr |
  | Lễ hội du lịch biển Cửa Lò | rent ×2 on the six beaches |
  | Mùa cưới | transport rent ×2 |
  | Nắng nóng tháng Sáu | utility rent ×2 |
  | Mùa mưa bão | all rent halved |
  | Chợ phiên | houses cost half |
  | Hội vật làng | rolling doubles wins 500k |
  | Lễ ân xá | everyone in jail is set free |
  | Năm được mùa | no taxes |
  | Lễ hội Đền Hồng Sơn | drawing a card also gives 500k |
  | Góp tiền sửa đình làng | everyone gives 500k to the bank (or what they have) |
  | Tương thân tương ái | everyone gives 300k to the poorest player |
  | Mùa lúa chín | lifting a mortgage costs no interest |
- **Summary** at the end:
  - how the game ended, and the ranking by wealth;
  - a chart of each player's wealth at the start of every round;
  - titles for the single leader of each stat;
  - a stats table: rent paid and received, land bought, houses built, laps, doubles, jail, trades, cards.

### Online extras
- **Quick reactions:** 8 hand-drawn stickers (a sobbing buffalo, a rooster in sunglasses, a tooth broken on kẹo cu đơ, Mệ wagging her finger…), 15 emoji and 8 Nghệ phrases, such as *Răng rứa?*, *Giỏi rứa!*, *Chộ chưa!* and *Thôi chết rồi!*. The room passes them to every phone without storing them, at most one every 1.2 s per phone.
- **Chat:** available in the lobby and during the game, from the 💬 button, which shows an unread count.
  - The room keeps the last 30 messages, so a phone that comes back sees them.
  - Each message is at most 200 characters, with control and invisible characters removed, and is shown as plain text.
  - At most one message per second per phone.
  - During a game, a new message from someone else also **pops up** with the reactions: the sender's token,
    name and the message (two lines at most) for 5 seconds. Tapping it opens the chat. No pop-ups while the
    chat is open, and none on the sender's own phone.
  - Only one of the 😊 palette and the chat is open at a time: opening one closes the other.
- **Rematch:** after the game, the host's "Ván mới cùng phòng" takes the room back to the lobby, with the same seats and choices. The host can change the settings and start again.
- **Room list ("Phòng đang mở"):** the Online screen lists the rooms open right now, refreshed every 5 seconds.
  - Each row shows whose room it is, the players' tokens, whether it is waiting (Đang chờ), playing (Đang chơi,
    with the round) or finished (Đã xong), how many are playing and watching, and the code.
  - **Vào** joins a room that is waiting and has a free seat; **Xem** watches any room.
  - Waiting rooms come first (those with a free seat first), then games being played, then finished ones.
    Only rooms with someone connected are listed, at most 50.
  - Rooms are listed unless the host unticks **"Hiện phòng trong danh sách"** in the lobby; then only the link
    or code opens the room.
  - How it works: one more Durable Object (`RoomDirectory`) keeps the list. Each room sends it a short
    listing whenever something on it changes (and every 30 minutes, so a quiet game stays listed), and
    nothing when only the game moves on. `GET /rooms` on the room server returns the list, to the game's own
    pages only. A listing nobody has refreshed for 2 hours is dropped.
- **Watching:** anyone without a seat watches. They see the game as it is played but get no buttons, and a
  note at the bottom says so. The players see how many are watching (👁 in the top bar, and in the lobby).
- **Throwing things:** in a game, the 😊 palette has a "Ném" row: a dép (slipper), a bánh chưng or a flower.
  Pick one, then a player: it flies in an arc from your token to theirs, spinning, and lands with "Bộp!",
  "Huỵch!" or "Thơm ghê!" while their token flinches. The room passes it to every phone without storing
  it, at most one throw every 3 seconds per phone. Just for fun: nothing in the game changes.

---

## 12. Effects and animation speed

After each move, effects play on the board at the same time as the sounds:
- a **red seal** stamped on a property just bought;
- **coins flying** for rent, tax, salary and card money, with −amount where they leave and +amount where they land;
- **dust** where a house or the đình goes up;
- **bars** coming down on the jail corner;
- a bankrupt token **tearing** like paper;
- a **festival banner** with lanterns unrolling across the screen, and **lucky money** raining down for Đền Chiêu Trưng.

The **dice** are 3D cubes: they spin while rolling, then turn to show the result, with the 1 and 4 in red. **Tokens** hop in an arc and squash a little as they land.

**Settings → Hiệu ứng chuyển động** sets the speed: Bình thường, Nhanh (twice as fast), or Tắt (nothing moves; results show at once). A device set to "reduce motion" always counts as Tắt.

## 13. Look: themes, titles and icons

**Settings → Giao diện** shows a tile per theme, each a small preview of its paper, a card and its colors:
- **Theo thiết bị**: Giấy dó by day, Sơn mài when the device is in dark mode;
- **Giấy dó** (light) and **Sơn mài** (dark lacquer; the board picture turns to evening, with the moon);
- **Tết**: warm paper, red and gold, apricot blossoms (hoa mai) on the wallpaper;
- **Chàm**: indigo like the Hàng Trống prints, with waves;
- **Tương phản cao**: black on white with no textures, the easiest to read.

The theme button in the header goes through them in that order. Titles (the logo, screen titles, the
winner, the festival banner) are written in a brush font (Water Brush). Every symbol in the game is a
drawn icon in the folk colors instead of an emoji. On the board picture, birds cross the sky and light
glints on the Lam River (still when motion is off).

## 14. Small screens, cards and moving between screens

- **Cơ hội / Khí vận cards** are printed like folk cards: the picture on the left, the words in a gold
  frame with gold corners on the right, so a card and a space for sale fit inside the board even on a
  phone or a short laptop screen. Both pictures load when a game opens; if one still can't load (for
  example a page left open across a new release), the card shows a drawn pattern in the deck's color
  instead of a broken image. Property cards get the same gold corners and a mark under the name.
- **On a small board** the turn and the dice share one line, and the space for sale fits on one line.
- **Phones:** the players sit two by two under the board as small chips (token, name, money, and a
  colored dot with a count for each set they own). Tapping the dots opens that player's places across
  the whole width. Tablets show the full player cards two by two.
- **Moving between screens:** a new screen slides in from the right, going back slides in from the
  left, and a game or room rises into place. It follows the animation speed setting.

## 15. Computer players

**Chơi với máy** on the menu opens the setup with you and two computer players. On either setup screen,
any seat can be switched between **Người** and **Máy**. A computer player gets a local nickname (Cu Đơ,
Nhút, Hến, Bưởi) and a level:

| | Dễ | Vừa | Khó |
|---|---|---|---|
| Keeps in hand | 500k | 1tr5 | 2tr, more when others have built (up to 6tr) |
| Buys | most places, at random | whatever leaves its reserve | the same |
| Stretches its budget to complete or block a set | no | yes | yes |
| Builds | sometimes, up to 3 houses | up to 4 houses | up to the đình |
| Leaves jail early | no | with a card or plenty of cash | early in the game; stays in late |
| Trades | says yes easily | minds what you gain | minds it fully and wants a margin |

Any bot pays its debts by mortgaging spare places first, then selling houses, and declares
bankruptcy only when even everything it owns wouldn't cover the debt. It also offers to buy the
pieces it is missing from a set when one player holds them all. To another bot it offers the least that
bot would accept; to a person, a premium over the price. After an offer it waits about two rounds
before offering again.

Bots are part of the engine (`engine/bot.ts`): given the game, the next action for the bot whose move
it is. Its choices depend only on the game, so the same game always plays out the same way. On screen,
a bot moves after a short pause once the last move has played out (following the animation speed), and
nobody gets buttons while it plays. Bots are saved with the game. In a test of 150 three-bot games,
every game finished and Khó won about half.

**Online**, the host adds computer players in the lobby (**Thêm máy chơi cùng**), picks each one's level
and can take one out again; a bot takes a free seat, nickname, token and color. Other phones see the bot
and its level. The room server plays them, not a phone, so it doesn't matter who is connected:
- The room's alarm fires when a bot's move is due: the time the last move takes to play out on a phone
  at normal speed (`showMs` in `ui/motion.ts`), plus the same short pause as on one device. Phones set to
  faster animations just finish sooner. The same alarm still deletes a room after a week without changes.
- With nobody connected, bots wait, and carry on when someone comes back. A person's move still waits
  for that person, as in any online game.
- Bots don't keep a room or become its host: when the last person leaves the lobby, the room closes.

## 16. Records, badges and the summary picture

**Thành tích** on the menu shows everyone who has finished a game on this device: games, wins and best
fortune, and their **badges** (19, earned once each and kept with the date). Records are kept by name,
ignoring case and extra spaces, in this browser only. Computer players get none. A game is recorded the
moment it ends: on one device for every person at the table, online for this phone's own player. The
tutorial doesn't count.

| Badge | How |
|---|---|
| Trận thắng đầu | win a game |
| Lão làng | finish 10 games |
| Dựng đình | end a game owning a đình |
| Đủ bộ | end a game with a whole color set |
| Chúa đất | own 10 or more places |
| Vua thu tô | collect 10tr in rent in one game |
| Đại gia | end a game worth 40tr or more |
| Tay đổ đôi | roll 8 doubles in one game |
| Khách quen nhà tạm giữ | go to jail 3 times in one game |
| Lái buôn | agree 3 trades in one game |
| Vua lễ hội | win a game with festivals on |
| Thắng chớp nhoáng | win a classic game within 25 rounds |
| Hạ máy khó | win a game against a Khó bot |
| Một chọi ba | beat three bots at once |
| Chơi online | finish an online game |
| Tay trắng vẫn vui | go bankrupt (a silly one) |
| Thánh xui | pay 15tr in rent in one game (a silly one) |
| Đi dạo cho vui | finish a game without buying a single place (a silly one) |

The end-of-game summary lists the **new badges**. It can be turned into a **picture** (1080×1350 PNG,
always in Giấy dó colors): the ranking with each player's token, the wealth chart, titles and new
badges, and the board's river painting when there is room. The picture is drawn as soon as the summary
opens, because browsers only let a page share or copy right after a tap:
- **Chia sẻ ảnh** opens the phone's share sheet (shown where the browser can share files);
- **Sao chép ảnh** puts the picture on the clipboard, to paste into a chat (shown where the browser can
  copy images);
- **Lưu ảnh** saves the file.

A line under the buttons says what happened (copied, saved, or that this browser won't copy).


## 17. Just for fun

None of these change the rules; they're there to make people laugh.

- **Computer players talk.** Each of the four has a character: Cu Đơ shows off, Hến counts every đồng,
  Nhút panics, Bưởi is kind to everyone (a renamed bot gets a character by its seat). After a move has
  played out, a bot it concerned says one line, in Nghệ dialect (English in English), as a speech-bubble
  sticker at the top: about going bankrupt, winning, jail, a trade it answered, rent paid or received,
  buying, building, doubles, losing the dice or getting out of jail (the biggest thing first). Small things get a
  remark only about half the time, so they don't chatter. `ui/botLines.ts` holds the lines and picks
  them (tested); `BotTalk.tsx` shows them.
- **Dice off the table.** About one roll in 40, the dice go off the table and the roll doesn't count
  (`diceFumbled` in `engine/rng.ts`; the log entry says how). It happens one of three ways, each
  a 3-second scene in the middle of the board while the buttons wait. The dice roll under the
  table and the player's token peeks after them ("Mô rồi?"), or Con Vàng the dog runs off with
  them, or a hen pecks them away. Then the same player presses **Gieo lại** and rolls fresh dice.
  Dice chosen on purpose (the tutorial) never go off the table, and in jail it doesn't use up an
  attempt. It comes from the game's seeded randomness, so every phone online sees the same mishap.
- **Throwing things** online, and three **silly badges**: see sections 11 and 16.

## 18. Chế độ Việt

Four optional rules with a Vietnamese twist, ticked one by one when setting up a game (on one device or
in an online lobby). With none ticked, a game is exactly the classic one: same rules, same card shuffle.

| Rule | What happens |
|---|---|
| **Tết lì xì** | Every 5th round it's Tết: the richest player (by wealth) gives the poorest lì xì of a tenth of the gap between them, rounded to 100k, at most 3tr and no more than the cash they hold. A red banner with hoa mai, and the money flies across. A catch-up rule dressed as a custom. |
| **Ăn vạ** | Once a game, a player who can't pay a debt can throw a tantrum: whoever is owed lets 20% go (rounded to 10k). Only offered when the cash really isn't there. A "Không trả! Không trả!" sticker shakes on the board. |
| **Mặc cả** | Before buying, a player may haggle once: half the time the price drops 20% ("Bớt 20%!"), half the time the seller sulks and adds 10% ("Lên giá 10%!"). The old price shows struck through. The outcome comes from the game's own random numbers, so it is the same on every phone. |
| **Thẻ vui** | 11 extra Cơ hội / Khí vận cards with silly stories: "Mẹ gọi về ăn cơm" (home to Xuất phát, no salary), "Bị chó nhà hàng xóm đuổi" (3 spaces on), "Trúng số… vé năm ngoái" (nothing happens), "Ăn cháo lươn quên mang ví" (pay the player before you 200k), and more. They come after the classic cards in each deck, so without them a deck shuffles exactly as before. |

Computer players use them too: they haggle over a place they want when they could still pay if the
seller sulks (easy bots now and then). Khó bots keep their tantrum for when they would otherwise go
bankrupt; the others throw it the first time they're short. The room server accepts the options and the two
new moves (`HAGGLE`, `AN_VA`) and nothing else; a haggled price always comes from the game, never from a phone.

### Nhiệm vụ bí mật (secret missions)

A fifth Chế độ Việt option. Each player gets two secret missions, nobody sharing one, from 14 written for
this board. Finishing one pays **3tr** at once, and a banner reveals it to everyone; the player cards show
progress ("1/2"). At the end, the summary reveals everyone's missions.

| Mission | Do this |
|---|---|
| Người Hà Tĩnh / Người xứ Nghệ | own 3 places in Hà Tĩnh (before Cầu Bến Thủy) / in Nghệ An (after it) |
| Dân phố Vinh | own 2 places in Vinh city |
| Mê biển | own 2 beaches |
| Điện nước đầy đủ | own both the power plant and the dam |
| Ông trùm vận tải | own 2 transport spaces |
| Gom đủ bộ | own a whole color set |
| Thợ xây | build 3 houses |
| Chủ nợ khó tính | make someone go bankrupt |
| Đi khắp xứ Nghệ | pass Xuất phát 3 times |
| Túi rủng rỉnh | hold 25tr in cash at once |
| Thu tô | collect 5tr in rent |
| Tay đổ đôi | roll doubles 3 times |
| Khách quen | go to jail twice |

**Keeping them secret:**
- **On one device**, "Nhiệm vụ" in the bar under the top asks whose missions to show, then says "Đưa máy
  cho Đăng. Người khác quay đi chỗ khác nhé!" before anything appears.
- **Online**, it shows the phone's own missions. The room server blanks out every other player's unfinished
  missions in what it sends each phone (spectators see none), and reveals them all once the game is over.
- The room also deals missions from its own secure randomness, not from the game's random numbers: every
  phone receives those, and they can be run backwards.

A new badge, **Điệp viên**, goes with finishing both missions in one game (19 badges in all).

### On the roads: Kẹt xe giờ cao điểm and Trâu đi lạc

Two more Chế độ Việt options; with them, there are seven.

**Kẹt xe giờ cao điểm (rush-hour traffic).**
- **When:** two rounds in every four (2–3, 6–7, …) are rush hour. The status bar shows "Giờ cao điểm", and
  the three jam spots are hatched: Bến xe Hà Tĩnh, Cầu Bến Thủy and Chợ Vinh.
- **What happens:** a dice move that *passes through* a jam spot stops there (landing exactly on one is just
  landing). The player then chooses:
  - **Gọi xe ôm** (300k): go the rest of the way;
  - **Chờ hết kẹt**: stay on the jam spot and land there as usual.
- **Bots** take the xe ôm when they can spare the money; easy bots on a whim.

**Trâu đi lạc (wandering buffalo).**
- **When:** as a round starts, a buffalo turns up 2 times in 5, on a random space that isn't a corner, for
  that round. A swaying buffalo sticker marks it.
- **What happens:** landing there means dealing with it first:
  - **Dắt trâu về** (200k): the buffalo leaves, then the landing goes on as usual (buy, rent, card…);
  - **Cưỡi trâu** (free): it carries you 2–11 spaces on ("Ụm bò!"), passing Xuất phát pays as usual, and
    you land where it stops.
- **Bots** lead it home when they can spare the money, and ride it otherwise.

In the engine, both are new phases (`inJam`, `buffalo`) with two actions each (`XE_OM` / `WAIT_IN_JAM`,
`LEAD_BUFFALO` / `RIDE_BUFFALO`); the room server accepts those and nothing more. Every dice move now goes
through `moveByDice`, where jams are checked; outside rush hour it moves and lands exactly as before.

---

## 19. Sân nhởi, the hub

Dangopoly is the first game of **Sân nhởi** ("the playground" in Nghệ), a hub for more games from
Nghệ Tĩnh. The site stays at the same address.
- **Entry screen** shows the hub's name. **Vào chơi** opens the hub, which has a card per game: Dangopoly
  (with "Có ván đang dở" when a game is saved) and a dashed **Trò mới · Sắp có** card for what's coming.
- **Each game keeps its own menu.** Dangopoly's menu is unchanged; its back button returns to the hub,
  and the hub's back button to the entry screen. Room links (`?room=…`) still open the room directly.
- **Shared by every game:** language, colors, sound, animation speed and music. Settings are on the hub
  too. Records, saves and online rooms are Dangopoly's for now.
- **Online:** since v2.5.0 a room plays one game, chosen when it's created (`kind`: Dangopoly or Tiến lên;
  rooms from before have none and play Dangopoly). The room list says which.

---

## 20. Tiến lên

The second game in the hub: southern Tiến lên, played against one to three computer players on one device,
or online. Its menu has **Chơi với máy** and **Chơi online**.
- **Cards:** a normal 52-card deck, 13 each (with fewer than four players the rest stay in the box).
  From lowest to highest: 3 … 10, J, Q, K, A, 2 (*heo*); suits break ties ♠ < ♣ < ♦ < ♥.
- **Combinations:** a single (*rác*), a pair (*đôi*), three of a kind (*sám*), four of a kind (*tứ quý*), a
  straight (*sảnh*, 3+ ranks in a row, no 2s), or pairs in a row (*đôi thông*, 3+ pairs, no 2s).
- **Turns:** in the first game, whoever holds the lowest card dealt leads, and that play must include it; later
  the last winner leads. Beat the play on the table with the same shape and size, higher, or pass. Passing
  leaves the round; when everyone else has passed, whoever played last leads anything.
- **Bombs (*chặt*):** three pairs in a row beat a single 2; four of a kind beats a 2, a pair of 2s, or three pairs
  in a row; four pairs in a row beat all of those.
- **Winning on the deal (*tới trắng*):** four 2s, a dragon (3 to A), six pairs, or five pairs in a row.
- **End:** the game goes on until one player is left (*bét*). Each game gives n − place points (3, 2, 1, 0 with
  four players), added up over the match; **Ván mới** deals again, and the winner leads.
- **Screen:** the others around the top with how many cards they hold, the play to beat on green felt, the last
  few moves, and your hand at the bottom. Tap cards to choose them; **Gợi ý** picks the cheapest legal play
  (tap again for the next), **Bỏ lượt** passes, **Đánh** plays. The 13 cards overlap more on narrow screens.
- **Bots** get rid of low cards first, in as few plays as possible, keep 2s and bombs until someone is about to
  go out, and don't break up pairs and runs. Dễ is careless and rarely wins; Khó doesn't yet play better
  than Vừa (in 400 test games they won about as often).
- **Code:** `src/games/tienlen/` holds the rules as a pure state machine like Dangopoly's (`applyTienLen`), the
  bots, and the words in three languages; the screens are in `src/ui/tienlen/`. Not yet: keeping a match when
  you leave it on one device.
- **Online:** the same rooms as Dangopoly (link, QR code, room list, chat, reactions; no throwing, since there's
  no board). The lobby has no options; the host adds computer players if seats are free, and starts. Each phone
  plays its own seat, and only the host deals the next game.
  - **Hidden cards:** the room server keeps the game. Each phone receives its own hand and, for everyone else,
    one `HIDDEN_CARD` (−1) per card held, so it can count them but not see them; watchers get only counts.
    The random state is left out too (`rngState: 0`), so the next deal can't be worked out.
  - The room checks each move: only the player whose turn it is plays or passes, and only cards they hold.
  - Computer players are played by the room, as in Dangopoly, about a second after the last play.

---

## 21. Crazy Eights (Tám Điên)

The third game in the hub, for players who want something like UNO: the classic game UNO grew out of, with
a normal deck and the usual action cards. Against one to three computer players, or online.
- **Deal:** 7 cards each between two players, 5 each with more. A card is turned up to start the pile (never
  an 8: one goes back into the deck).
- **A turn:** play a card of the suit to follow or the same rank as the top card. **8s** are wild and name the
  next suit. A **2** makes the next player draw two, unless they add a 2 of their own (then the next draws
  four, and so on). A **queen** skips the next player. An **ace** turns the direction around; with two players
  an ace or a queen means playing again.
- **Can't (or won't) play?** Draw one card. If it fits, it may be played at once, or pass; otherwise the turn
  ends. When the deck runs out, the pile under its top card is shuffled back in.
- **Scoring:** the first to empty their hand wins the game and scores the cards left in everyone else's: 8s
  50, 10s and pictures 10, aces 1, the rest their number. Points add up over the match; **Ván mới** deals
  again, and the winner starts.
- **Screen:** the same table as Tiến lên: the deck (tap to draw) and the pile on the felt, with the suit to
  follow, the cards waiting from 2s, and the direction. Cards that can't be played now are faded; tapping
  one that can plays it (an 8 first asks for the suit).
- **Bots** keep their 8s while another card fits, stay in the suit they hold most of, play a 2 or a queen on a
  player about to go out, and get rid of the cards that would score most. The game is mostly luck: in 400 test
  games every level won about as often.
- **Online:** like Tiến lên's rooms. Each phone receives its own hand; everyone else's cards and the deck come
  as `HIDDEN_CARD` counts, and the random state is left out. The card a player has just drawn stays theirs.
- **Code:** `src/games/eights/` (rules, bots, words), `src/ui/eights/` (screens); the setup and the game menu
  are shared with Tiến lên (`TienLenSetup`, `CardGameMenu`).

---

## 22. Tutorials for the card games

Each card game's menu has **Hướng dẫn chơi**, like Dangopoly's: a short guided first game on the real table,
you against Cu Đơ, with a fixed deal (`src/games/tienlen/lesson.ts`, `src/games/eights/lesson.ts`, `src/games/maume/lesson.ts`, `src/games/phao/lesson.ts`).
- A hint at the top says what to do, step by step (in all three languages), and the cards to play glow.
  A step that only explains has **Tiếp**; a step that asks for a move refuses any other ("Chưa phải nước
  này"), then plays Cu Đơ's scripted replies one by one.
- **Tiến lên** (7 steps): the order of the cards, leading with the 3♠, beating a card, passing, a 2 (heo), a
  straight, and a pair to go out; the last step names the rest (triples, fours, pairs in a row, bombs).
- **Crazy Eights** (10 steps): following the number, then the suit, a queen, a 2, drawing (and playing the
  card drawn), and an 8 to go out; the last step adds aces and the scoring.
- **Màu Mè** (10 steps): the four colors, following the color, then the number, Chặn, +2, drawing (and playing
  the card drawn), "Báo!" at one card, and a +4 to go out; the last step adds Quay and the scoring.
- **Pháo Tết** (6 steps): the firecrackers and the bucket, peeking (a firecracker on top), dodging it, Cu Đơ
  putting it out and hiding it again, taking his last card with a pair, drawing, and Cu Đơ blowing up; the
  last step names Đẩy, Xóc, Rút đáy and Xin.
- The last step offers **Chơi với máy**, straight to a real game. The moves are real moves through each game's
  rules; a test plays every lesson through, so a rule change that breaks a lesson fails the tests.

---

## 23. Màu Mè

The fourth game in the hub (since v2.8.0): a color-matching card game in the family of Crazy Eights, with its
own deck. It is our own design and look, not a copy of any branded game: the colors are the folk-print ones
(**Son** vermilion ●, **Nghệ** turmeric ▲, **Lá** leaf ■, **Chàm** indigo ◆), each with a shape so the cards
read without the colors. Against one to three computer players, or online.
- **Deck (104):** per color, two of each number 1–9 and two each of **Chặn** ⊘ (skip), **Quay** ⇄ (reverse) and
  **+2**; then four **Đổi màu** ✦ (wild) and four **+4** (wild, the next player draws four).
- **Deal:** 7 cards each; a number card is turned up to start the pile.
- **A turn:** play a card of the color to follow or with the same face as the top card (numbers by number,
  action cards by kind). Wild cards go on anything and name the next color. Chặn skips the next player; Quay
  turns the direction around (with two players it works like Chặn).
- **Draws add up:** a +2 may be answered with another +2 or a +4, a +4 only with another +4; whoever can't
  (or won't) draws the lot and loses the turn.
- **Can't (or won't) play?** Draw one card; if it fits, play it at once or pass. When the deck runs out, the
  pile under its top card is shuffled back in.
- **Báo!** At one card the game calls it for the player: a gold badge on their seat and a line in the log.
- **Scoring:** the first to empty their hand scores the cards left in everyone else's: numbers as printed,
  action cards 20, wild cards 50. Points add up over the match; **Ván mới** deals again, the winner starts.
- **Cards:** the whole card in its color with a cream cartouche (cut corners, like a seal); action cards have
  an ink cartouche; wild cards are ink black with the four colors. The back is ink with a gold frame and the
  four shapes. The pile sits on a ring of the color to follow. The colors stay the same in the dark theme;
  text on turmeric is ink, not cream, so it stays readable.
- **Bots** pass draws on when they can (a +2 before a +4), keep wild cards while another card fits, stay in
  the color they hold most of, hit a player about to go out with Chặn, Quay, +2 or +4, and name the color they
  hold most of. Easy bots play any card that fits and name a color at random.
- **Online:** like the other card rooms (`kind: 'maume'`, `RoomView.maume`): each phone receives its own
  hand; everyone else's cards and the deck come as `HIDDEN_CARD` counts, the random state is left out, and the
  card a player has just drawn stays theirs.
- **Code:** `src/games/maume/` (cards, rules, bots, words, tutorial), `src/ui/maume/` (cards and screens); the
  setup and the game menu are shared (`TienLenSetup`, `CardGameMenu`).

---

## 24. Pháo Tết

The fifth game in the hub (since v2.9.0): a push-your-luck card game in the "don't draw the bomb" family, with
our own theme, cards and drawings: Tết in a Nghệ village, where the deck hides lit firecrackers. Against one
to three computer players, or online.
- **Deck (49):** 3 **Pháo** (firecrackers), 6 **Xô nước** (buckets of water), 4 each of **Né** (end the turn
  without drawing), **Đẩy** (end the turn without drawing; the next player takes two turns), **Nhòm** (look at
  the top three cards), **Xóc** (shuffle the deck), **Rút đáy** (end the turn by drawing the bottom card) and
  **Xin** (take a random card from someone), and 4 each of four Nghệ foods (**bánh chưng**, **kẹo cu đơ**,
  **cam Vinh**, **nhút**): a pair of the same takes a random card from someone.
- **Deal:** a bucket and five other cards each; then one firecracker fewer than the players and two spare
  buckets are shuffled into the rest. The table shows how many firecrackers are in how many cards.
- **A turn:** play any number of cards, then draw the top card to end it. A firecracker blows you up (out of
  the game, hand and all) unless you have a bucket: it's used up, and you hide the firecracker back in the deck
  wherever you like (on top, 2nd, 3rd, at the bottom, or anywhere at random). Nobody else learns where.
- **Winning:** the last player left wins the game (one point); **Ván mới** deals again, the winner starts.
- **Cards:** cream paper with a band in the card's color (red firecrackers, blue buckets, gold actions, green
  foods) and a small woodblock-style drawing of each (`PhaoArt`); the back is red lacquer with a gold
  firecracker. Tapping a card says what it does, with **Đánh** (or whom to take from); tapping one food picks
  its pair. A firecracker going off shows a big **ĐÙNG!** burst and shakes the seat; one put out, a splash.
- **Bots** are fair: they only know their own hand, what everyone can count and what their own Nhòm showed.
  They take cards first, peek when the odds are bad, get out of drawing a firecracker they saw (Đẩy, Né, Xóc,
  Rút đáy), and hide a put-out firecracker on top (hard), near the top (normal) or anywhere (easy).
- **Online:** `kind: 'phao'`, `RoomView.phao`. Each phone receives its own hand; everyone else's cards and
  the deck come as `HIDDEN_CARD` counts, the random state is left out, and a Nhòm's cards only go to whoever
  played it. The room waits a little longer before a bot moves after a bang.
- **Code:** `src/games/phao/` (cards, rules, bots, words, tutorial), `src/ui/phao/` (cards, drawings and screens).
