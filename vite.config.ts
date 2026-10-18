import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The game is served from https://danglayloi1.github.io/dangopoly/
  base: '/dangopoly/',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
