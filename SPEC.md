# Dangopoly: Nghệ Tĩnh Edition — Design Spec

> A property-trading board game set in Hà Tĩnh and Nghệ An, played in the browser.
> Status: **draft for review**. Nothing is coded yet.

---

## 1. Summary

| Topic | Decision |
|---|---|
| Platform | Web browser (PC + phone), no install |
| Players | 2–4, hot-seat (take turns on one device) |
| Language | Vietnamese + English, switchable at any time |
| Rules | Classic property-trading rules + Nghệ Tĩnh flavor |
| Game end | Last player standing (everyone else bankrupt) |
| Money | Simplified đồng: `500k`, `2tr`, `15tr` |
| Visual style | Clean flat 2D, colorful, mobile-friendly |
| Tokens | Local icons |
| Saving | Auto-save in the browser; reopen page to continue |
| Polish | Dice + token animations, sound effects (mute button). No music. |
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

Rent tables follow the classic values × 10k and will live in `src/data/board.ts`, where they're easy to tune.

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
**15tr** per player.

---

## 4. Cards (draft — full lists of 16 each written during development)

**Cơ hội (Chance)**: movement and luck
- Đi tắm biển Cửa Lò → advance to Biển Cửa Lò.
- Đi tàu Thống Nhất → advance to the nearest transport space; pay double rent if it's owned.
- Không đội mũ bảo hiểm → fine 150k.
- Trúng mùa bưởi Phúc Trạch → collect 1tr.
- Lạc đường ở Vinh → go back 3 spaces.
- Ra tù miễn phí → keep this card.
- Lũ miền Trung → pay 250k per house and 1tr per hotel for repairs.
- Về Xuất phát → advance to Start and collect 2tr.

**Khí vận (Community Chest)**: money events
- SLNA vô địch! → collect 500k.
- Bán kẹo cu đơ cho khách du lịch → collect 200k.
- Học bổng Đại học Vinh → collect 1tr.
- Đám cưới → every player gives you 100k as a wedding gift.
- Viện phí → pay 500k.
- Đãi bạn cháo lươn → pay 50k to each player.
- Dâng hương tại Ngã ba Đồng Lộc → pay 100k for incense and flowers.
- Ra tù miễn phí → keep this card.

---

## 5. Tokens
Each player picks one (2–4 players, 6 choices):
**Nón lá** · **Con trâu** · **Quả cam Xã Đoài** · **Bóng đá SLNA** · **Gói kẹo cu đơ** · **Xe đạp**

Drawn as simple flat SVG icons, each with its own player color.

---

## 6. Tutorial
An **interactive guided first game**:
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
| i18n | Simple `vi.json` / `en.json` dictionaries | Lightweight, no big library |
| Sound | Small Web Audio helper + short free-licensed SFX | Dice, coins, jail door |
| Deploy | GitHub Actions → GitHub Pages | Push to `main` → the site updates |

```
dangopoly/
├─ src/
│  ├─ engine/     # pure game rules: state, actions, reducer, rng (no UI)
│  ├─ data/       # board.ts, cards.ts, tokens.ts
│  ├─ i18n/       # vi.json, en.json
│  ├─ ui/         # React components: Board, PlayerPanel, Dice, TradeDialog...
│  ├─ tutorial/   # scripted steps
│  └─ audio/
├─ tests/
└─ .github/workflows/deploy.yml
```

---

## 8. Milestones

1. **Setup**: install Node/Git, scaffold the project, create the GitHub repo, put a "hello" page online.
2. **Core engine**: board, dice, movement, buying, rent, Start salary, bankruptcy, with tests.
3. **Playable board UI**: hot-seat turns for 2–4 players. *First version you can actually play.*
4. **Building and money**: houses, hotels, sell-back, mortgage.
5. **Jail and cards**.
6. **Trading**.
7. **Auto-save + language switch**.
8. **Animations + sound**.
9. **Interactive tutorial**.
10. **Polish + final deploy**: phone layout, testing with friends.

---

## 9. GitHub
- Account: [danglayloi1](https://github.com/danglayloi1)
- Repo: `danglayloi1/dangopoly`
- Live game URL (after deploy): https://danglayloi1.github.io/dangopoly/
