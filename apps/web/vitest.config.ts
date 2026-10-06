import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@amoji/emotion-core': pkg('emotion-core'),
      '@amoji/robot-face': pkg('robot-face'),
      '@amoji/vrm-renderer': pkg('vrm-renderer'),
      '@amoji/engine': pkg('engine'),
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
