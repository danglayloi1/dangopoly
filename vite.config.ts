import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  // The game is served from https://danglayloi1.github.io/dangopoly/
  base: '/dangopoly/',
  // Shown on the start screen
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
