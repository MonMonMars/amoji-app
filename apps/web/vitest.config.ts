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
  // .tsx is included for tests that must RENDER a component (react-dom/server)
  // rather than grep its source — see tests/brain-optional-ui.test.tsx.
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], environment: 'node' },
});
