// Plays scripted scenes in Microsoft Edge and saves screenshots, so changes can be checked
// without clicking through the game by hand.
//
//   npm run dev                      (in another terminal)
//   npm run shots -- trade           desktop screenshots of the trading scene
//   npm run shots -- trade --mobile  the same on a phone-sized screen (add --dark for dark mode)
//
// Pictures go to screenshots/<scene>[-mobile]/. Needs Microsoft Edge (installed on Windows).

import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.DANGOPOLY_URL ?? 'http://localhost:5173/dangopoly/';
const [scene = 'trade', ...flags] = process.argv.slice(2);
const mobile = flags.includes('--mobile');
const dark = flags.includes('--dark');
const outDir = path.join('screenshots', `${scene}${mobile ? '-mobile' : ''}${dark ? '-dark' : ''}`);

/** From the entry screen, through the menu, to one of its screens (e.g. /Chơi trên một máy/). */
async function openFromMenu(p, choice) {
  // Loading the same address again keeps the remembered screen, so start from a blank page.
  await p.goto('about:blank');
  await p.goto(BASE_URL);
  await p.getByRole('button', { name: /Vào chơi/ }).click();
  await p.getByRole('button', { name: choice }).click();
}

/** Starts the game from the setup form with the players in the listed order (no first-turn dice). */
async function startInListedOrder(p) {
  await p.getByRole('radio', { name: /Theo thứ tự trên/ }).click();
  await p.getByRole('button', { name: /Bắt đầu chơi/ }).click();
}

const scenes = {
  /** Checks the published site with real buttons only (no dev helpers there):
   *  DANGOPOLY_URL=https://danglayloi1.github.io/dangopoly/ npm run shots -- live */
  async live({ page, shot, click }) {
    const results = [];
    const check = (ok, what) => {
      results.push(ok);
      console.log(`${ok ? 'CHECK OK' : 'CHECK FAILED'}: ${what}`);
    };
    let errors = 0;
    page.on('pageerror', () => errors++);

    const response = await page.goto(BASE_URL);
    check(response?.ok(), `page loads (${response?.status()})`);
    check((await page.title()) === 'Dangopoly: Nghệ Tĩnh Edition', 'page title');
    const footer = await page.locator('footer').innerText();
    // The site should show the version in package.json, so a new release needs no change here.
    const { version } = JSON.parse(await readFile('package.json', 'utf8'));
    check(footer.includes(`v${version}`), `version v${version} on the start screen ("${footer}")`);
    for (const file of ['manifest.webmanifest', 'og-image.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.svg']) {
      const r = await page.request.get(new URL(file, BASE_URL).href);
      check(r.ok(), `${file} is served (${r.status()})`);
    }
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    check(ogImage === 'https://danglayloi1.github.io/dangopoly/og-image.png', 'link preview picture is set');
    await shot('entry-screen');

    // A short real game with the real buttons.
    await click(/Vào chơi/);
    await shot('menu');
    await click(/Chơi trên một máy/);
    const inputs = page.locator('.player-row input');
    await inputs.nth(0).fill('Đăng');
    await inputs.nth(1).fill('Lan');
    await click(/Bắt đầu chơi/);
    // Who goes first: the players roll (again after a tie) until one is highest, then start.
    for (let i = 0; i < 12 && !(await page.locator('.board').count()); i++) {
      await page.locator('.first-turn-actions .primary').click();
      await page.waitForTimeout(900);
    }
    check((await page.locator('.board').count()) === 1, 'dice decide who goes first, then the game starts');
    const order = ['Mua', 'Gieo', 'Trả', 'Nộp', 'Kết thúc', 'Bỏ qua'];
    for (let i = 0; i < 30; i++) {
      await page.waitForSelector('.board[data-busy="false"]', { timeout: 10_000 });
      const buttons = page.locator('.action-panel .action-buttons button');
      let clicked = false;
      for (const word of order) {
        const b = buttons.filter({ hasText: word }).first();
        if (await b.count()) {
          await b.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) break;
    }
    await page.waitForSelector('.board[data-busy="false"]', { timeout: 10_000 });
    await shot('after-30-moves');
    const owned = await page.locator('.cell.owned').count();
    check(owned > 0, `players bought property (${owned} spaces owned)`);

    // Leaving keeps the game; the theme button works.
    await click(/Trang chủ/);
    await page.waitForSelector('.saved-card');
    check(true, 'Trang chủ shows the saved game');
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole('button', { name: /Giao diện/ }).click();
    await page.getByRole('button', { name: /Giao diện/ }).click(); // auto → light → dark
    const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check(before !== after, 'theme button changes the colors');
    await shot('menu-dark-with-saved-game');

    // The tutorial starts.
    await click(/Hướng dẫn chơi/);
    await page.locator('.tutorial-bubble h2').waitFor();
    check(true, 'tutorial starts');
    await shot('tutorial');

    check(errors === 0, `no errors on the page (${errors})`);
    console.log(results.every(Boolean) ? 'ALL LIVE CHECKS PASSED' : 'SOME LIVE CHECKS FAILED');
  },

  /** In a browser that prefers dark: the theme button switches to light and dark, and is remembered. */
  async theme({ page, shot, startGame }) {
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const themeButton = page.getByRole('button', { name: /Giao diện/ }).first();
    await page.goto(BASE_URL);
    const auto = await bg();
    await shot('auto-follows-device');
    await themeButton.click(); // → light
    const light = await bg();
    await shot('light');
    await page.reload();
    const lightAfterReload = await bg();
    await startGame(['Đăng', 'Lan']);
    await shot('game-light');
    await themeButton.click(); // → dark
    const dark = await bg();
    await shot('game-dark');
    await themeButton.click(); // → Tết
    const tet = await bg();
    await shot('game-tet');
    await themeButton.click(); // → Chàm
    await shot('game-cham');
    await themeButton.click(); // → high contrast
    await shot('game-contrast');
    await themeButton.click(); // → auto again
    const backToAuto = await bg();
    console.log(`auto=${auto} light=${light} dark=${dark}`);
    // The --bg colors of the light and dark themes in src/styles.css
    const LIGHT = 'rgb(239, 228, 204)';
    const DARK = 'rgb(27, 21, 18)';
    const ok =
      auto === (dark ? (flags.includes('--dark') ? DARK : LIGHT) : LIGHT) &&
      light === LIGHT &&
      lightAfterReload === LIGHT &&
      dark === DARK &&
      tet === 'rgb(246, 226, 192)' &&
      backToAuto === auto;
    console.log(ok ? 'CHECK OK: theme switches, is remembered after reload, and goes back to auto' : 'CHECK FAILED: theme');
  },

  /** A look at every main screen (use --dark for dark mode), the winner screen, and a long random game. */
  async audit({ page, shot, startGame, setup, act, click }) {
    await page.goto(BASE_URL);
    await shot('entry');
    await click(/Vào chơi/);
    await shot('menu');
    await click(/Chơi trên một máy/);
    await shot('setup');
    await page.goBack();
    await click(/Cài đặt/);
    await shot('settings');
    await page.goBack();
    await click(/Chơi online/);
    await shot('online');
    await startGame(['Đăng', 'Lan', 'Minh', 'Hoa']);
    await setup((game) => {
      const give = (owner, ...spaces) => {
        for (const s of spaces) game.ownership[s] = { owner, houses: 0, mortgaged: false };
      };
      give(0, 1, 3, 5, 12);
      give(1, 6, 8, 9, 15);
      give(2, 11, 13, 14, 16, 18);
      give(3, 37, 39, 25);
      game.ownership[1].houses = 2;
      game.ownership[3].houses = 2;
      game.ownership[6].houses = 5;
      game.ownership[8].houses = 5;
      game.ownership[9].houses = 5;
      game.ownership[16].mortgaged = true;
      game.players[2].inJail = true;
      game.players[2].position = 10;
      game.players[3].jailCards = ['chance'];
      game.decks.chance = game.decks.chance.filter((c) => c !== 10); // Hoa holds that jail card
      // a harmless card on top, so the turn always goes the same way ("Trúng mùa bưởi": collect 500k)
      game.decks.chance = [12, ...game.decks.chance.filter((c) => c !== 12)];
    });
    await act({ type: 'ROLL', dice: [2, 5] }); // Đăng → Cơ hội
    await shot('busy-board');
    await click(/Quản lý tài sản/);
    await shot('manage-dialog');
    await page.keyboard.press('Escape');
    await page.locator('.cell').nth(39).click();
    await shot('space-card');
    await page.keyboard.press('Escape');
    await click(/Giao dịch/);
    await shot('trade-dialog');
    await page.keyboard.press('Escape');

    await setup((game) => {
      for (const p of game.players.slice(1)) {
        p.bankrupt = true;
        p.cash = 0;
      }
      game.ownership = {};
      game.phase = { kind: 'gameOver', winner: 0 };
      game.endReason = 'lastStanding';
      game.log.push({ type: 'won', player: 0 });
    });
    // The summary opens by itself at the end; close it to see the board.
    await page.waitForSelector('dialog.summary-dialog');
    await shot('summary');
    await page.locator('dialog.summary-dialog').getByRole('button', { name: 'Đóng' }).click();
    await shot('winner');

    // A long game played at random through the real buttons, watching for errors.
    let errors = 0;
    page.on('pageerror', () => errors++);
    page.on('console', (m) => m.type() === 'error' && errors++);
    await click(/Chơi ván mới/);
    await click(/Chơi trên một máy/);
    const inputs = page.locator('.player-row input');
    await click(/Thêm người chơi/);
    for (const [i, name] of ['Đăng', 'Lan', 'Minh'].entries()) await inputs.nth(i).fill(name);
    await page.locator('.cash-field input').fill('5');
    await startInListedOrder(page);
    const order = ['Mua', 'Gieo', 'Trả', 'Nộp', 'Kết thúc', 'Tuyên bố', 'Bỏ qua'];
    let moves = 0;
    for (; moves < 400; moves++) {
      await page.waitForSelector('.board[data-busy="false"]', { timeout: 10_000 });
      const panel = page.locator('.action-panel');
      if (await panel.getByRole('button', { name: /Chơi ván mới/ }).count()) break;
      let clicked = false;
      for (const word of order) {
        const button = panel.locator('.action-buttons button', { hasText: word }).first();
        if (await button.count()) {
          await button.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) break;
    }
    const finished = await page.locator('.winner-text').count();
    console.log(`Soak game: ${moves} moves, ${finished ? 'finished with a winner' : 'still going'}, ${errors} errors`);
    console.log(errors === 0 ? 'CHECK OK: no errors during the long game' : 'CHECK FAILED: errors during the long game');
    await shot('after-soak');
  },

  /** The whole tutorial, played with the real buttons (and one wrong click on purpose). */
  async tutorial({ page, shot, click }) {
    await openFromMenu(page, /Hướng dẫn chơi/);
    const bubble = page.locator('.tutorial-bubble');
    const step = (title) => bubble.locator('h2', { hasText: title }).waitFor({ timeout: 20_000 });
    const next = async () => {
      await bubble.getByRole('button', { name: /Tiếp/ }).waitFor({ timeout: 20_000 });
      await bubble.getByRole('button', { name: /Tiếp/ }).click();
    };
    const settle = () => page.waitForSelector('.board[data-busy="false"]', { timeout: 10_000 });
    const dialogButton = (dialog, name) => page.locator(`dialog.${dialog}`).getByRole('button', { name }).first();

    await step('Chào mừng');
    await shot('welcome');
    await next();

    await step('Gieo xúc xắc');
    await shot('roll-highlighted');
    await click(/Gieo xúc xắc/);
    await settle();

    await step('Mua đất');
    await click(/Bỏ qua/); // wrong on purpose: the tutorial should nudge, not skip
    await shot('wrong-click-nudge');
    await click(/^Mua/);

    await step('Giao dịch');
    await shot('trade-step');
    await click(/Giao dịch/);
    const dialog = page.locator('dialog.trade-dialog');
    await dialog.locator('.trade-side').nth(1).getByLabel(/Vườn bưởi Phúc Trạch/).check();
    await dialog.locator('.trade-side').nth(0).locator('.trade-cash input').fill('1tr');
    await shot('trade-dialog-with-hint');
    await click(/Gửi đề nghị cho Lan/);

    await step('Lan đồng ý');
    await next();

    await step('Xây nhà');
    await click(/Quản lý tài sản/);
    await shot('build-step-manage-open');
    await page.locator('dialog.manage-dialog [data-tutorial="build-3"]').click();
    await dialogButton('manage-dialog', 'Đóng').click();

    await step('Kết thúc lượt');
    await click(/Kết thúc lượt/);

    await step('Lượt của Lan');
    await bubble.getByRole('button', { name: /Tiếp/ }).waitFor({ timeout: 20_000 });
    await shot('lan-paid-rent');
    await next();

    await step('Lượt của bạn');
    await click(/Gieo xúc xắc/);
    await settle();
    await step('Thẻ Cơ hội');
    await shot('chance-card');
    await next();

    await step('Kết thúc lượt');
    await click(/Kết thúc lượt/);
    await step('Lượt của Lan');
    await next();

    await step('Lượt của bạn');
    await click(/Gieo xúc xắc/);
    await settle();
    await step('Vào nhà tạm giữ');
    await shot('jail');
    await next();

    await step('Kết thúc lượt');
    await click(/Kết thúc lượt/);
    await step('Lượt của Lan');
    await next();

    await step('Ra khỏi nhà tạm giữ');
    await shot('pay-fine-step');
    await click(/Nộp 500k/);

    await step('Tự do');
    await click(/Gieo xúc xắc/);
    await settle();
    await step('Mua thêm');
    await click(/^Mua/);

    await step('Cầm cố');
    await click(/Quản lý tài sản/);
    await page.locator('dialog.manage-dialog [data-tutorial="mortgage-14"]').click();
    await dialogButton('manage-dialog', 'Đóng').click();

    await step('sẵn sàng');
    await shot('done');
    await bubble.getByRole('button', { name: /Chơi tiếp ván này/ }).click();
    await page.waitForTimeout(200);
    const gone = (await page.locator('.tutorial-bubble').count()) === 0;
    console.log(gone ? 'CHECK OK: tutorial finished, normal game continues' : 'CHECK FAILED: hint still shown');
    await shot('after-tutorial');
  },

  /** Frames during a move (dice tumbling, token hopping, money floating), sounds, mute, reduced motion. */
  async motion({ page, shot, startGame, setup, act, sounds, click, browser }) {
    await startGame(['Đăng', 'Lan']);
    await setup((game) => {
      game.players[0].position = 34; // 34 + 8 → 2: passes Start, lands on Khí vận
      const collect = game.decks.community.find((c) => c === 1); // "Ngân hàng tính nhầm... Nhận 2tr"
      game.decks.community = [collect, ...game.decks.community.filter((c) => c !== collect)];
    });
    await act({ type: 'ROLL', dice: [3, 5] }, { wait: false });
    await shot('frame-1-dice-tumbling');
    await page.waitForTimeout(820);
    await shot('frame-2-token-hopping');
    await page.waitForSelector('.board[data-busy="false"]');
    await page.waitForTimeout(200);
    await shot('frame-3-arrived-card-and-money');
    console.log('Sounds for that move:', (await sounds()).join(', '));

    await act({ type: 'END_TURN' });
    await setup((game) => (game.players[1].position = 27));
    await act({ type: 'ROLL', dice: [1, 2] }, { wait: false }); // 27 → 30 → jail
    await page.waitForTimeout(1050);
    await shot('frame-4-jump-to-jail');
    await page.waitForSelector('.board[data-busy="false"]');

    const before = (await sounds()).length;
    await page.getByRole('button', { name: /Âm thanh/ }).click();
    await page.getByRole('button', { name: /Tắt âm thanh/ }).click();
    await shot('muted');
    await act({ type: 'END_TURN' });
    await act({ type: 'ROLL', dice: [1, 2] });
    const after = (await sounds()).length;
    console.log(after === before ? 'CHECK OK: no sounds while muted' : `CHECK FAILED: ${after - before} sounds while muted`);

    // A device set to "reduce motion": results appear at once, nothing waits.
    const calm = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    const calmPage = await calm.newPage();
    await openFromMenu(calmPage, /Chơi trên một máy/);
    const inputs = calmPage.locator('.player-row input');
    await inputs.nth(0).fill('Đăng');
    await inputs.nth(1).fill('Lan');
    await startInListedOrder(calmPage);
    await calmPage.waitForSelector('.board');
    await calmPage.evaluate(() => window.__dangopoly.dispatch({ type: 'ROLL', dice: [1, 2] }));
    await calmPage.waitForTimeout(60);
    const busyNow = await calmPage.locator('.board[data-busy="true"]').count();
    console.log(busyNow === 0 ? 'CHECK OK: reduced motion shows the result at once' : 'CHECK FAILED: animated anyway');
    await calm.close();
    void click;
  },

  /** Play a little, close and reopen the page, continue; then a damaged save is ignored. */
  async save({ page, shot, startGame, act, click }) {
    await startGame(['Đăng', 'Lan', 'Minh']);
    await act({ type: 'ROLL', dice: [1, 2] }); // Đăng → Lò kẹo cu đơ
    await click(/^Mua/);
    await click(/Kết thúc lượt/);
    await act({ type: 'ROLL', dice: [2, 4] }); // Lan → Suối nước nóng Sơn Kim
    await click(/^Mua/);
    await shot('playing');
    const before = await page.evaluate(() => JSON.stringify(window.__dangopoly.getGame()));

    await page.reload(); // like closing the tab and opening the game again
    await page.waitForSelector('.saved-card');
    await shot('reopened-shows-saved-game');

    await click(/Chơi tiếp/);
    await page.waitForSelector('.board');
    await shot('continued');
    const after = await page.evaluate(() => JSON.stringify(window.__dangopoly.getGame()));
    console.log(after === before ? 'CHECK OK: the continued game is identical' : 'CHECK FAILED: game differs');

    // The ← Trang chủ button: back to the start screen, with the game kept.
    await click(/Trang chủ/);
    await page.waitForSelector('.saved-card');
    await shot('home-button-keeps-game');
    console.log('CHECK OK: ← Trang chủ shows the start screen with the game kept');
    await click(/Chơi tiếp/);
    await page.waitForSelector('.board');

    // The phone/browser back button does the same instead of leaving the site.
    await page.goBack();
    await page.waitForSelector('.saved-card', { timeout: 5_000 });
    const stillHere = page.url().startsWith(BASE_URL);
    console.log(stillHere ? 'CHECK OK: the back button returns to the start screen' : 'CHECK FAILED: back left the site');
    await click(/Chơi tiếp/);
    await page.waitForSelector('.board');
    const again = await page.evaluate(() => JSON.stringify(window.__dangopoly.getGame()));
    console.log(again === before ? 'CHECK OK: continuing after back gives the same game' : 'CHECK FAILED: game changed');

    // Discarding from the start screen removes the save.
    await click(/Trang chủ/);
    await page.waitForSelector('.saved-card');
    await click(/Bỏ ván này/); // confirm is accepted automatically
    const cardAfterDiscard = await page.locator('.saved-card').count();
    console.log(cardAfterDiscard === 0 ? 'CHECK OK: no saved game after "Bỏ ván này"' : 'CHECK FAILED: save still offered');

    await page.evaluate(() => localStorage.setItem('dangopoly.savedGame', '{"version":1,"game":{"players":"broken"'));
    await page.reload();
    await page.waitForSelector('.menu-choices');
    const ignored = (await page.locator('.saved-card').count()) === 0;
    console.log(ignored ? 'CHECK OK: damaged save ignored, setup works' : 'CHECK FAILED: damaged save shown');
    await shot('damaged-save-ignored');
  },

  /** Cards (a move card, a jail card), going to jail, the jail options, and trading a jail card. */
  async jail({ page, shot, startGame, setup, act, click }) {
    await startGame(['Đăng', 'Lan']);
    /** Puts the first card of `deck` whose effect matches on top of that deck. */
    const top = (deck, kind, extra = {}) =>
      page.evaluate(
        ({ deck, kind, extra }) => {
          const hook = window.__dangopoly;
          const index = hook.cards[deck].findIndex(
            (c) => c.effect.kind === kind && Object.entries(extra).every(([k, v]) => c.effect[k] === v),
          );
          const game = structuredClone(hook.getGame());
          game.decks[deck] = [index, ...game.decks[deck].filter((c) => c !== index)];
          hook.setGame(game);
        },
        { deck, kind, extra },
      );

    // Đăng draws "Đi xe khách": nearest transport is Lan's Cảng Vũng Áng → double rent.
    await setup((game) => {
      game.players[0].position = 3;
      game.ownership[15] = { owner: 1, houses: 0, mortgaged: false };
    });
    await top('chance', 'advanceToNearest', { target: 'transport' });
    await act({ type: 'ROLL', dice: [1, 3] }); // 3 → 7 (Cơ hội)
    await shot('card-move-and-double-rent');
    await act({ type: 'END_TURN' });

    // Lan lands on "Vào nhà tạm giữ".
    await setup((game) => (game.players[1].position = 25));
    await act({ type: 'ROLL', dice: [2, 3] }); // 25 → 30
    await shot('lan-goes-to-jail');
    await act({ type: 'END_TURN' });

    // Đăng draws a "Ra tù miễn phí" card from Khí vận.
    await setup((game) => (game.players[0].position = 13));
    await top('community', 'jailFree');
    await act({ type: 'ROLL', dice: [1, 3] }); // 13 → 17 (Khí vận)
    await shot('dang-gets-jail-card');

    // ...and offers it to Lan for 500k.
    await click(/Giao dịch/);
    const dialog = page.locator('dialog.trade-dialog');
    await dialog.locator('.trade-side').nth(0).getByLabel(/Thẻ Ra tù/).check();
    await dialog.locator('.trade-side').nth(1).locator('.trade-cash input').fill('500k');
    await shot('trade-jail-card');
    await click(/Gửi đề nghị cho Lan/);
    await click(/Đồng ý/);
    await act({ type: 'END_TURN' });

    // Lan's turn in jail: roll for doubles, pay, or use the card she just bought.
    await shot('lan-jail-options');
    await act({ type: 'ROLL', dice: [1, 2] });
    await shot('lan-stays-in-jail');
    await act({ type: 'END_TURN' });
    await top('chance', 'collect');
    await act({ type: 'ROLL', dice: [2, 3] }); // Đăng 17 → 22 (Cơ hội: collect money)
    await act({ type: 'END_TURN' });
    await click(/Dùng thẻ Ra tù/);
    await shot('lan-uses-jail-card');

    await page.getByRole('button', { name: 'English', exact: true }).click();
    await shot('english');
  },

  /** Đăng completes the light-blue set by trading with Lan, then Minh turns an offer down. */
  async trade({ page, shot, startGame, setup, click }) {
    await startGame(['Đăng', 'Lan', 'Minh']);
    await setup((game) => {
      const give = (owner, ...spaces) => {
        for (const s of spaces) game.ownership[s] = { owner, houses: 0, mortgaged: false };
      };
      give(0, 1, 6, 8, 5); // Đăng: Vườn bưởi, Sơn Kim, Hồ Kẻ Gỗ, Bến xe
      give(1, 3, 9, 15); // Lan: Lò kẹo cu đơ, Cửa khẩu Cầu Treo, Cảng Vũng Áng
      give(2, 11, 13); // Minh: Kỳ Anh, Nghi Xuân
    });
    await shot('board-before');

    await click(/Giao dịch/);
    await shot('trade-dialog-empty');

    const dialog = page.locator('dialog.trade-dialog');
    await dialog.getByLabel(/Bến xe Hà Tĩnh/).check();
    await dialog.locator('.trade-side').nth(0).locator('.trade-cash input').fill('1tr5');
    await dialog.getByLabel(/Cửa khẩu Cầu Treo/).check();
    await shot('trade-dialog-filled');

    await dialog.locator('.trade-side').nth(1).locator('.trade-cash input').fill('abc');
    await shot('trade-dialog-invalid-cash');
    await dialog.locator('.trade-side').nth(1).locator('.trade-cash input').fill('');

    await click(/Gửi đề nghị cho Lan/);
    await shot('offer-shown-to-lan');

    await click(/Đồng ý/);
    await shot('after-accept');

    await click(/Quản lý tài sản/);
    await shot('manage-full-set');
    await page.locator('dialog.manage-dialog').getByRole('button', { name: 'Đóng' }).click();

    await click(/Giao dịch/);
    await page.locator('.partner', { hasText: 'Minh' }).click();
    await dialog.getByLabel(/Vườn bưởi Phúc Trạch/).check();
    await dialog.getByLabel(/Kỳ Anh/).check();
    await click(/Gửi đề nghị cho Minh/);
    await shot('offer-shown-to-minh');
    await click(/Từ chối/);
    await shot('after-reject');
  },

  /**
   * Small screens (run with and without --mobile): a drawn card and a space for sale fit inside the
   * board, a card whose picture can't load keeps its drawn pattern, players sit two by two on a
   * phone, and screens slide in.
   */
  async layout({ page, shot, click, startGame, setup, act }) {
    const check = (ok, what) => console.log(`${ok ? 'CHECK OK' : 'CHECK FAILED'}: ${what}`);
    let errors = 0;
    page.on('pageerror', () => errors++);
    // The Khí vận picture never arrives, like a page left open across a new release.
    await page.route('**/community*.webp', (route) => route.abort());

    await openFromMenu(page, /Cài đặt/);
    check((await page.locator('.screen-transition.forward').count()) === 1, 'a screen slides in going forward');
    await click(/Quay lại|←/);
    check((await page.locator('.screen-transition.back').count()) === 1, 'and from the other side going back');
    await shot('menu');
    await page.locator('.menu-top .back-button').click();
    check(await page.getByRole('button', { name: /Vào chơi/ }).isVisible(), 'the menu goes back to the entry screen');

    await startGame(['Đăng', 'Lan', 'Minh', 'Hoa']);
    // Land on Cơ hội with the longest chance card showing and a space for sale.
    await act({ type: 'ROLL', dice: [3, 4] });
    const showCard = (deck) =>
      setup(
        new Function(
          'game',
          `const cards = window.__dangopoly.cards[${JSON.stringify(deck)}];
           let longest = 0;
           cards.forEach((c, i) => { if (c.text.vi.length > cards[longest].text.vi.length) longest = i; });
           game.lastCard = { deck: ${JSON.stringify(deck)}, card: longest };
           game.phase = { kind: 'awaitBuy', space: 39 };`,
        ),
      );
    // Waits (up to a few seconds) for the page to settle into the expected state.
    const settles = (test) =>
      page.waitForFunction(test, null, { timeout: 5000 }).then(
        () => true,
        () => false,
      );
    const fits = () =>
      settles(() => {
        const middle = document.querySelector('.board-center');
        return middle.scrollHeight <= middle.clientHeight + 1;
      });
    await showCard('chance');
    await page.waitForTimeout(300);
    const art = await settles(() => document.querySelector('.drawn-card-art img')?.naturalWidth > 0);
    check(art, 'the Cơ hội picture shows');
    check(await fits(), 'the card and the space for sale fit inside the board');
    await shot('card-and-offer');

    if (!mobile) {
      await page.setViewportSize({ width: 1280, height: 650 }); // a short laptop screen
      await page.waitForTimeout(300);
      check(await fits(), 'they still fit on a short laptop screen');
      await shot('short-laptop');
      await page.setViewportSize({ width: 1280, height: 860 });
    }

    await showCard('community');
    await page.waitForTimeout(500);
    const broken = await page.evaluate(() => ({
      img: document.querySelectorAll('.drawn-card-art img').length,
      pattern: getComputedStyle(document.querySelector('.drawn-card-art')).backgroundImage.includes('gradient'),
    }));
    check(broken.img === 0 && broken.pattern, 'a picture that fails to load leaves the drawn pattern, not a broken image');
    await shot('card-without-picture');

    if (mobile) {
      await setup((game) => {
        for (const s of [1, 3, 5, 6]) game.ownership[s] = { owner: 0, houses: 0, mortgaged: false };
      });
      const tops = await page.locator('.player-card').evaluateAll((cards) => cards.map((c) => c.getBoundingClientRect().top));
      // (the current player's card is lifted a little)
      const sameRow = (a, b) => Math.abs(a - b) < 5;
      check(sameRow(tops[0], tops[1]) && sameRow(tops[2], tops[3]) && tops[2] > tops[0] + 20, 'players sit two by two under the board');
      await page.locator('.player-more').first().click();
      const open = await page.locator('.player-card.open .holdings').isVisible();
      check(open, 'tapping a player shows their places');
      await page.locator('.player-card.open').scrollIntoViewIfNeeded();
      await shot('players-open');
    }
    check(errors === 0, `no errors on the page (${errors})`);
  },

  /**
   * The effects after a move, each caught mid-way: the page's clock is under the script's control
   * (page.clock), so a move plays out exactly as far as needed and then everything is frozen.
   */
  async effects({ page, shot, click, setup }) {
    const check = (ok, what) => console.log(`${ok ? 'CHECK OK' : 'CHECK FAILED'}: ${what}`);
    let errors = 0;
    page.on('pageerror', () => errors++);
    await page.clock.install();
    await openFromMenu(page, /Chơi trên một máy/);
    const inputs = page.locator('.player-row input');
    await click(/Thêm người chơi/);
    for (const [i, name] of ['Đăng', 'Lan', 'Minh'].entries()) await inputs.nth(i).fill(name);
    await startInListedOrder(page);
    await page.waitForSelector('.board');

    const dispatch = (action) => page.evaluate((a) => window.__dangopoly.dispatch(a), action);
    /** Plays the move until the effects appear, then freezes every animation `at` ms into it. */
    const freezeAt = async (selector, at) => {
      for (let i = 0; i < 40 && !(await page.locator(selector).count()); i++) await page.clock.runFor(100);
      await page.evaluate((ms) => {
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = ms;
        }
      }, at);
      return (await page.locator(selector).count()) > 0;
    };
    const settle = () => page.clock.runFor(4000);

    // Buying: the red seal, coins to the bank.
    await setup((game) => {
      game.players[1].position = 10;
      game.players[2].position = 21;
    });
    await dispatch({ type: 'ROLL', dice: [1, 2] }); // Đăng: Xuất phát → Lò kẹo cu đơ
    await settle();
    await dispatch({ type: 'BUY' });
    check(await freezeAt('.fx-seal', 300), 'buying stamps a red seal');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('seal-and-coins');
    await settle();

    // Rent: coins fly from Đăng to Lan, who owns the space.
    await setup((game) => {
      game.phase = { kind: 'awaitRoll' };
      game.current = 0;
      game.dice = null;
      game.ownership[6] = { owner: 1, houses: 0, mortgaged: false };
    });
    await dispatch({ type: 'ROLL', dice: [1, 2] }); // 3 → 6
    check(await freezeAt('.fx-money .fx-coin', 450), 'rent sends coins to the owner');
    await shot('rent-coins');
    await settle();

    // Building: dust where the house goes up.
    await setup((game) => {
      game.phase = { kind: 'awaitEndTurn' };
      game.current = 0;
      game.ownership[1] = { owner: 0, houses: 0, mortgaged: false };
      game.ownership[3] = { owner: 0, houses: 0, mortgaged: false };
    });
    await dispatch({ type: 'BUILD_HOUSE', space: 1 });
    check(await freezeAt('.fx-build', 250), 'building raises dust');
    await shot('build-dust');
    await settle();

    // Jail: bars come down.
    await setup((game) => {
      game.phase = { kind: 'awaitRoll' };
      game.current = 0;
      game.dice = null;
      game.players[0].position = 27;
    });
    await dispatch({ type: 'ROLL', dice: [1, 2] }); // → 30, Vào nhà tạm giữ
    check(await freezeAt('.fx-jail', 500), 'going to jail brings down the bars');
    await shot('jail-bars');
    await settle();

    // A festival: the last player of round 2 ends the turn, festivals on; round 3 brings one.
    await setup((game) => {
      game.rules = { ...game.rules, festivals: true };
      game.round = 2;
      game.current = 2;
      game.phase = { kind: 'awaitEndTurn' };
    });
    await dispatch({ type: 'END_TURN' });
    check(await freezeAt('.fx-festival', 900), 'a festival unrolls its banner');
    await shot('festival-banner');
    await settle();

    // Bankrupt: Minh can't pay a big debt and gives up; the token tears.
    await setup((game) => {
      game.current = 2;
      game.players[2].position = 21;
      game.phase = { kind: 'inDebt', debtor: 2, creditor: null, amount: 99_000_000, reason: { kind: 'card' } };
    });
    await dispatch({ type: 'DECLARE_BANKRUPTCY' });
    check(await freezeAt('.fx-tear', 900), 'a bankrupt token tears like paper');
    await shot('bankrupt-tear');
    check(errors === 0, `no errors on the page (${errors})`);
  },

  /** Game types: a round limit with festivals (a festival round, the end, the summary) and a time limit. */
  async modes({ page, shot, click, setup, act }) {
    const check = (ok, what) => console.log(`${ok ? 'CHECK OK' : 'CHECK FAILED'}: ${what}`);
    let errors = 0;
    page.on('pageerror', () => errors++);
    await openFromMenu(page, /Chơi trên một máy/);
    const inputs = page.locator('.player-row input');
    await click(/Thêm người chơi/);
    for (const [i, name] of ['Đăng', 'Lan', 'Minh'].entries()) await inputs.nth(i).fill(name);
    await page.getByRole('radio', { name: 'Giới hạn vòng' }).click();
    await page.getByRole('radio', { name: '10 vòng' }).click();
    await page.getByLabel(/Lễ hội xứ Nghệ/).check();
    await page.locator('.rules-picker').scrollIntoViewIfNeeded();
    await shot('setup-round-limit');
    await startInListedOrder(page);
    await page.waitForSelector('.board');

    // A festival round, with some land owned.
    await setup((game) => {
      const give = (owner, ...spaces) => spaces.forEach((s) => (game.ownership[s] = { owner, houses: 0, mortgaged: false }));
      give(0, 21, 23, 24);
      give(1, 6, 8, 9);
      give(2, 37, 39);
      game.round = 3;
      game.festival = { id: 'denCuong', group: 'red' };
    });
    await page.waitForSelector('.status-festival');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('festival-round');

    // Jump to the end of round 10 with a made-up history, then end the last turn.
    await setup((game) => {
      const rows = [];
      for (let r = 0; r < 10; r++) rows.push([15e6 + r * 900e3 - (r % 3) * 400e3, 15e6 + Math.round(Math.sin(r) * 2e6), 15e6 - r * 600e3]);
      game.worth = rows;
      game.round = 10;
      game.festival = null;
      game.current = 2;
      game.phase = { kind: 'awaitEndTurn' };
      game.players[0].cash = 21e6;
      game.stats = [
        { rentPaid: 1.2e6, rentReceived: 4.5e6, jailed: 1, doubles: 3, bought: 5, housesBuilt: 4, laps: 3, trades: 1, cards: 4 },
        { rentPaid: 2.1e6, rentReceived: 1.8e6, jailed: 3, doubles: 1, bought: 4, housesBuilt: 0, laps: 3, trades: 2, cards: 6 },
        { rentPaid: 3.0e6, rentReceived: 0.6e6, jailed: 0, doubles: 2, bought: 2, housesBuilt: 0, laps: 4, trades: 1, cards: 3 },
      ];
    });
    await act({ type: 'END_TURN' });
    await page.waitForSelector('dialog.summary-dialog');
    check(true, 'the round limit ends the game and the summary opens');
    await shot('summary');
    await page.locator('dialog.summary-dialog').getByRole('button', { name: 'Đóng' }).click();
    await shot('winner-panel');

    // A timed game: the clock in the status bar, then time runs out at the start of a turn.
    await openFromMenu(page, /Chơi trên một máy/);
    await inputs.nth(0).fill('Đăng');
    await inputs.nth(1).fill('Lan');
    await page.getByRole('radio', { name: 'Giới hạn giờ' }).click();
    await startInListedOrder(page);
    await page.waitForSelector('.status-clock');
    await setup((game) => (game.rules.mode.endsAt = Date.now() + 45_000));
    await page.waitForSelector('.status-clock.ending');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('time-almost-up');
    await setup((game) => (game.rules.mode.endsAt = Date.now() - 1));
    await page.waitForSelector('dialog.summary-dialog', { timeout: 5_000 });
    check(true, 'the time limit ends the game at the start of a turn');
    check(errors === 0, `no errors on the page (${errors})`);
  },

  /**
   * Online play with three phones in one room: lobby, who goes first, a few turns, a trade offer
   * that pops up on the other player's phone, and a phone that drops out and comes back.
   * Needs the room server too (npm run server). Each picture shows the three phones side by side.
   */
  async online({ browser }) {
    let failed = 0;
    const check = (ok, what) => {
      if (!ok) failed++;
      console.log(`${ok ? 'CHECK OK' : 'CHECK FAILED'}: ${what}`);
    };
    let errors = 0;
    const phoneOptions = {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: dark ? 'dark' : 'light',
    };
    const openPhone = async (name, context) => {
      const ctx = context ?? (await browser.newContext(phoneOptions));
      const page = await ctx.newPage();
      page.on('pageerror', (e) => {
        errors++;
        console.error(`${name}: ${e.message}`);
      });
      return { name, ctx, page };
    };
    const phones = [await openPhone('Đăng'), await openPhone('Lan'), await openPhone('Minh')];
    const [dang, lan, minh] = phones;
    const button = (p, name) => p.page.getByRole('button', { name }).first();

    // Each phone's screen, side by side, with its owner's name underneath.
    let count = 0;
    const together = async (label) => {
      for (const p of phones) await p.page.waitForTimeout(150);
      const pics = [];
      for (const p of phones) pics.push((await p.page.screenshot()).toString('base64'));
      const sheet = await browser.newPage({ viewport: { width: 3 * 390 + 4 * 24, height: 844 + 72 } });
      await sheet.setContent(`<body style="margin:0;padding:24px;display:flex;gap:24px;background:#3a2e26;font:700 20px system-ui;color:#f3e7cc">${pics
        .map((b, i) => `<figure style="margin:0;text-align:center"><img src="data:image/png;base64,${b}" style="width:390px;height:844px;border-radius:18px;display:block"><figcaption style="margin-top:10px">📱 ${phones[i].name}</figcaption></figure>`)
        .join('')}</body>`);
      const file = path.join(outDir, `${String(++count).padStart(2, '0')}-${label}.png`);
      await sheet.screenshot({ path: file });
      await sheet.close();
      console.log('saved', file);
    };

    // Đăng creates the room.
    await openFromMenu(dang.page, /Chơi online/);
    await button(dang, 'Tạo phòng').click();
    await dang.page.getByPlaceholder('Tên').waitFor();
    check(!dang.page.url().includes('room='), 'no room link in the address before the room exists');
    await dang.page.getByPlaceholder('Tên').fill('Đăng');
    await dang.page.locator('form').getByRole('button', { name: 'Tạo phòng' }).click();
    const code = (await dang.page.locator('.room-code').textContent()).trim();
    check(/^[A-Z2-9]{6}$/.test(code), `a room is created (${code})`);
    await dang.page.waitForURL((url) => url.search === `?room=${code}`);
    check(true, 'once it exists, the address is the room link');

    // Lan and Minh open the link and join.
    for (const p of [lan, minh]) {
      await p.page.goto(`${BASE_URL}?room=${code}`);
      await p.page.waitForSelector('.lobby-seat');
      await p.page.getByPlaceholder('Tên').fill(p.name);
      await button(p, 'Vào phòng').click();
      await p.page.waitForSelector('.badge-you');
    }
    await dang.page.waitForFunction(() => document.querySelectorAll('.lobby-seat').length === 3);
    check(true, 'Lan and Minh join from the link; everyone sees 3 players');
    await together('lobby');

    // Đăng starts; the server rolls for who goes first and every phone shows the same dice.
    await button(dang, /Bắt đầu ván/).click();
    for (const p of phones) await p.page.waitForSelector('.first-turn-dialog');
    const order = await Promise.all(phones.map((p) => p.page.locator('.first-turn-order').textContent()));
    check(order.every((o) => o === order[0]), `every phone shows the same playing order (${order[0]})`);
    await together('who-goes-first');
    for (const p of phones) await button(p, /Vào chơi/).click();

    // Whose phone has buttons right now (once the board has settled)?
    // Over the internet the phones get each move a moment apart, so first wait until all of them
    // show the same game: boards settled and the same history. (Not the turn banner: it says
    // "your turn" on one phone and the player's name on the others.)
    const inStep = async () => {
      const shown = (p) => p.page.locator('.game-log').textContent();
      for (let tries = 0; tries < 100; tries++) {
        for (const p of phones) await p.page.waitForSelector('.board[data-busy="false"]', { timeout: 10_000 });
        const states = await Promise.all(phones.map(shown));
        if (states.every((st) => st === states[0])) return;
        await phones[0].page.waitForTimeout(100);
      }
      throw new Error('the phones never showed the same game');
    };
    const withButtons = async () => {
      await inStep();
      const has = [];
      for (const p of phones) if (await p.page.locator('.action-panel .action-buttons button').count()) has.push(p);
      return has;
    };

    // A trade offer from the first player: it pops up only on the other player's phone.
    let [mover] = await withButtons();
    const partner = phones.find((p) => p !== mover);
    await button(mover, /Giao dịch/).click();
    await mover.page.locator('.partner', { hasText: partner.name }).click();
    await mover.page.locator('dialog.trade-dialog .trade-cash input').first().fill('1tr');
    await button(mover, new RegExp(`Gửi đề nghị cho ${partner.name}`)).click();
    await partner.page.waitForSelector('.trade-offer .action-buttons');
    const onlyPartner = (await withButtons()).map((p) => p.name);
    check(onlyPartner.length === 1 && onlyPartner[0] === partner.name, `only ${partner.name}'s phone can answer the offer`);
    await together('trade-offer');
    await button(partner, /Đồng ý/).click();

    // A few turns, always pressed on the phone that has the buttons.
    const prefer = ['Mua', 'Gieo', 'Trả', 'Nộp', 'Kết thúc', 'Bỏ qua'];
    let oneAtATime = true;
    for (let move = 0; move < 14; move++) {
      const has = await withButtons();
      if (has.length !== 1) oneAtATime = false;
      if (has.length === 0) break;
      const buttons = has[0].page.locator('.action-panel .action-buttons button');
      for (const word of prefer) {
        const b = buttons.filter({ hasText: word }).first();
        if (await b.count()) {
          await b.click();
          break;
        }
      }
      if (move === 1) await together('a-turn');
      await has[0].page.waitForTimeout(250);
    }
    check(oneAtATime, 'at every step exactly one phone has buttons');

    // A quick reaction from Lan floats up on every phone.
    await button(lan, 'Thả cảm xúc').click();
    await lan.page.getByRole('button', { name: 'Răng rứa?' }).click();
    for (const p of phones) await p.page.locator('.reaction-bubble', { hasText: 'Răng rứa?' }).waitFor();
    check(true, "Lan's reaction shows on every phone");
    await together('reaction');

    // Chat: Minh writes; Đăng sees a count on 💬 and opens it.
    await button(minh, 'Trò chuyện').click();
    await minh.page.getByPlaceholder('Nhắn gì đó…').fill('Đăng ơi, đổi Cảng Vũng Áng không?');
    await minh.page.getByRole('button', { name: 'Gửi' }).click();
    await dang.page.locator('.chat-unread', { hasText: '1' }).waitFor();
    check(true, "Đăng's 💬 button shows 1 unread message");
    await dang.page.getByRole('button', { name: /Trò chuyện/ }).click();
    await dang.page.locator('.chat-message', { hasText: 'đổi Cảng Vũng Áng' }).waitFor();
    await dang.page.getByPlaceholder('Nhắn gì đó…').fill('Răng rứa? Đưa 3tr đã 😂');
    await dang.page.getByRole('button', { name: 'Gửi' }).click();
    await minh.page.locator('.chat-message', { hasText: 'Đưa 3tr đã' }).waitFor();
    check(true, 'chat messages go both ways');
    await together('chat');
    await dang.page.locator('.chat-panel').getByRole('button', { name: 'Đóng' }).click();
    await minh.page.locator('.chat-panel').getByRole('button', { name: 'Đóng' }).click();

    // Lan's phone drops out; the others see it; she comes back to her seat from the link.
    await lan.page.close();
    await dang.page.waitForSelector('.badge-away');
    check(true, "the others see Lan's phone as offline");
    lan.page = (await openPhone('Lan', lan.ctx)).page;
    await lan.page.goto(`${BASE_URL}?room=${code}`);
    await lan.page.waitForSelector('.board');
    await dang.page.waitForFunction(() => !document.querySelector('.badge-away'));
    const lanSeat = await lan.page.locator('.player-card', { has: lan.page.locator('.badge-you') }).locator('.player-name').textContent();
    check(lanSeat.includes('Lan'), 'Lan comes back to her own seat from the link');
    await together('lan-back');

    check(errors === 0, `no errors on any phone (${errors})`);
    console.log(failed === 0 ? 'ALL ONLINE CHECKS PASSED' : `${failed} ONLINE CHECKS FAILED`);
  },
};

async function main() {
  const run = scenes[scene];
  if (!run) throw new Error(`Unknown scene "${scene}". Known: ${Object.keys(scenes).join(', ')}`);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    ...(mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 860 } }),
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('Page error:', error.message));
  page.on('dialog', (dialog) => dialog.accept()); // answer "OK" to confirm() prompts

  let count = 0;
  const shot = async (name) => {
    await page.waitForTimeout(350); // let the screen settle (screens slide in for 0.26 s)
    const file = path.join(outDir, `${String(++count).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file, fullPage: mobile });
    console.log('saved', file);
  };
  const click = (name) => page.getByRole('button', { name }).first().click();
  const startGame = async (names, startingMillions = '15') => {
    await openFromMenu(page, /Chơi trên một máy/);
    const inputs = page.locator('.player-row input');
    while ((await inputs.count()) < names.length) await click(/Thêm người chơi/);
    for (const [i, name] of names.entries()) await inputs.nth(i).fill(name);
    await page.locator('.cash-field input').fill(startingMillions);
    await startInListedOrder(page);
    await page.waitForSelector('.board');
  };
  /** Changes the running game directly (dev-server helper), e.g. to hand out properties. */
  const setup = (change) =>
    page.evaluate((source) => {
      const hook = window.__dangopoly;
      if (!hook) throw new Error('Dev helper missing: run the dev server (npm run dev)');
      const game = structuredClone(hook.getGame());
      new Function('game', `(${source})(game)`)(game);
      hook.setGame(game);
    }, change.toString());

  /** Sends a game action directly (dev-server helper), e.g. a roll with chosen dice; waits for any animation. */
  const act = async (action, { wait = true } = {}) => {
    await page.evaluate((a) => window.__dangopoly.dispatch(a), action);
    await page.waitForTimeout(50);
    if (wait) await page.waitForSelector('.board[data-busy="false"]', { timeout: 10_000 });
  };
  const sounds = () => page.evaluate(() => [...(window.__dangopolySounds ?? [])]);

  try {
    await run({ page, shot, click, startGame, setup, act, sounds, browser, context });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
