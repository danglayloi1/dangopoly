// Renders the app icons and the link-preview picture into public/, using Microsoft Edge.
// Run with the dev server up (npm run dev):  node scripts/make-assets.mjs
// The results are committed, so this only needs running again when the look changes.

import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.DANGOPOLY_URL ?? 'http://localhost:5173/dangopoly/';
const svg = await readFile('public/favicon.svg', 'utf8');
const browser = await chromium.launch({ channel: 'msedge', headless: true });

/** The dice icon as a PNG. `maskable` icons get a full background and safe padding for phone launchers. */
async function icon(size, file, maskable = false) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = maskable ? Math.round(size * 0.72) : size;
  await page.setContent(`
    <body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;
                 background:${maskable ? '#d64545' : 'transparent'}">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div>
    </body>`);
  await page.screenshot({ path: file, omitBackground: !maskable });
  await page.close();
  console.log('saved', file);
}

await icon(180, 'public/apple-touch-icon.png', true);
await icon(192, 'public/icon-192.png');
await icon(512, 'public/icon-512.png');
await icon(512, 'public/icon-maskable-512.png', true);

// The preview shown when the link is shared (Zalo, Messenger, Facebook…): the title next to a real board.
const game = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await game.goto(BASE_URL);
const inputs = game.locator('.player-row input');
await inputs.nth(0).fill('Đăng');
await inputs.nth(1).fill('Lan');
await game.getByRole('button', { name: /Bắt đầu chơi/ }).click();
await game.waitForSelector('.board');
await game.evaluate(() => {
  const hook = window.__dangopoly;
  const g = structuredClone(hook.getGame());
  const give = (owner, ...spaces) => spaces.forEach((s) => (g.ownership[s] = { owner, houses: 0, mortgaged: false }));
  give(0, 1, 3, 21, 23, 24, 35);
  give(1, 6, 8, 9, 29, 37, 39);
  g.ownership[21].houses = 3;
  g.ownership[23].houses = 3;
  g.ownership[24].houses = 3;
  g.ownership[37].houses = 5;
  g.ownership[39].houses = 5;
  g.players[0].position = 19;
  g.players[1].position = 31;
  hook.setGame(g);
});
await game.waitForTimeout(400);
const board = (await game.locator('.board').screenshot()).toString('base64');
await game.close();

const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const colors = ['#8b5a3c', '#7cc6e8', '#e05ba1', '#f39237', '#d64545', '#f2c94c', '#3fa66b', '#2d4f9e'];
await card.setContent(`
  <body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:40px;
               padding:0 56px;box-sizing:border-box;background:#f6f1e7;
               font-family:'Segoe UI',system-ui,sans-serif;color:#1f2430">
    <div style="flex:1">
      <div style="display:flex;gap:8px;margin-bottom:22px">
        ${colors.map((c) => `<span style="width:44px;height:14px;border-radius:4px;background:${c}"></span>`).join('')}
      </div>
      <div style="font-size:96px;font-weight:800;color:#d64545;letter-spacing:-2px;line-height:1">Dangopoly</div>
      <div style="font-size:38px;font-weight:700;margin-top:12px">Phiên bản Nghệ Tĩnh</div>
      <div style="font-size:26px;color:#6b7280;margin-top:18px;line-height:1.35">
        Từ quê nhà Hà Tĩnh, qua cầu Bến Thủy,<br>đến thành Vinh. Chơi miễn phí trên trình duyệt.
      </div>
    </div>
    <img src="data:image/png;base64,${board}" style="width:540px;height:540px;border-radius:14px;
         box-shadow:0 18px 40px rgba(0,0,0,.25)">
  </body>`);
await card.screenshot({ path: 'public/og-image.png' });
console.log('saved public/og-image.png');

await browser.close();
