// Plays scripted scenes in Microsoft Edge and saves screenshots, so changes can be checked
// without clicking through the game by hand.
//
//   npm run dev                      (in another terminal)
//   npm run shots -- trade           desktop screenshots of the trading scene
//   npm run shots -- trade --mobile  the same on a phone-sized screen
//
// Pictures go to screenshots/<scene>[-mobile]/. Needs Microsoft Edge (installed on Windows).

import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.DANGOPOLY_URL ?? 'http://localhost:5173/dangopoly/';
const [scene = 'trade', ...flags] = process.argv.slice(2);
const mobile = flags.includes('--mobile');
const outDir = path.join('screenshots', `${scene}${mobile ? '-mobile' : ''}`);

const scenes = {
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

    await page.getByRole('button', { name: 'EN', exact: true }).click();
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
};

async function main() {
  const run = scenes[scene];
  if (!run) throw new Error(`Unknown scene "${scene}". Known: ${Object.keys(scenes).join(', ')}`);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 860 } },
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('Page error:', error.message));

  let count = 0;
  const shot = async (name) => {
    await page.waitForTimeout(150); // let the screen settle
    const file = path.join(outDir, `${String(++count).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file, fullPage: mobile });
    console.log('saved', file);
  };
  const click = (name) => page.getByRole('button', { name }).first().click();
  const startGame = async (names, startingMillions = '15') => {
    await page.goto(BASE_URL);
    const inputs = page.locator('.player-row input');
    while ((await inputs.count()) < names.length) await click(/Thêm người chơi/);
    for (const [i, name] of names.entries()) await inputs.nth(i).fill(name);
    await page.locator('.cash-field input').fill(startingMillions);
    await click(/Bắt đầu chơi/);
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

  /** Sends a game action directly (dev-server helper), e.g. a roll with chosen dice. */
  const act = async (action) => {
    await page.evaluate((a) => window.__dangopoly.dispatch(a), action);
    await page.waitForTimeout(50);
  };

  try {
    await run({ page, shot, click, startGame, setup, act });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
