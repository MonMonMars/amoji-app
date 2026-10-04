import { describe, expect, it } from 'vitest';
import manifest, { dynamic } from '../app/manifest';

// r2026-10-04.71 — the app must be installable with the right identity and
// scope, under both the GitHub Pages basePath (/amoji-app) and local dev (/).
// r2026-10-04.72 — the manifest route must declare itself static or the
// `output: 'export'` pages build fails (manifest.webmanifest route rejected).
describe('pwa manifest', () => {
  const m = manifest();

  it('declares itself static so output:export collects the route', () => {
    expect(dynamic).toBe('force-static');
  });

  it('installs standalone as Amoji', () => {
    expect(m.display).toBe('standalone');
    expect(m.name).toBe('Amoji');
    expect(m.short_name).toBe('Amoji');
  });

  it('uses manifest-relative start_url + scope (basePath-safe)', () => {
    expect(m.start_url).toBe('.');
    expect(m.scope).toBe('.');
  });

  it('paints the installed shell in the app dark', () => {
    expect(m.background_color).toBe('#171717');
    expect(m.theme_color).toBe('#171717');
  });

  it('ships an svg icon plus a png fallback', () => {
    expect(m.icons!.length).toBeGreaterThanOrEqual(2);
    expect(m.icons!.some((i) => i.src.endsWith('.svg'))).toBe(true);
    expect(m.icons!.some((i) => i.src.endsWith('.png'))).toBe(true);
  });
});
