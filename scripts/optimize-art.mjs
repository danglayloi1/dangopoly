// Shrinks artwork for the web: resizes each picture and saves it as WebP, using Microsoft Edge.
//   node scripts/optimize-art.mjs <folder with the original PNGs>
// Expects board.png, banner.png, chance.png and community.png; writes src/assets/art/*.webp.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/optimize-art.mjs <folder>');

// name → longest side in pixels (about 2× the largest size it's shown at)
const TARGETS = { board: 1200, banner: 1600, chance: 900, community: 900 };

await mkdir('src/assets/art', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();

for (const [name, longest] of Object.entries(TARGETS)) {
  const file = path.join(source, `${name}.png`);
  let png;
  try {
    png = await readFile(file);
  } catch {
    console.log(`skipped ${name} (no ${file})`);
    continue;
  }
  const dataUrl = await page.evaluate(
    async ({ b64, longest }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const scale = Math.min(1, longest / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', 0.8);
    },
    { b64: png.toString('base64'), longest },
  );
  const out = Buffer.from(dataUrl.split(',')[1], 'base64');
  await writeFile(`src/assets/art/${name}.webp`, out);
  console.log(`src/assets/art/${name}.webp: ${Math.round(png.length / 1024)} KB → ${Math.round(out.length / 1024)} KB`);
}

await browser.close();
