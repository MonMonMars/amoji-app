import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import robots, { dynamic as robotsDynamic } from '../app/robots';
import sitemap, { dynamic as sitemapDynamic } from '../app/sitemap';
import {
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
} from '../lib/site';

describe('site SEO constants', () => {
  it('points at the GitHub Pages project URL', () => {
    expect(SITE_URL).toBe('https://monmonmars.github.io/amoji-app');
    expect(SITE_TITLE.toLowerCase()).toContain('amoji');
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(40);
    expect(SITE_OG_IMAGE.startsWith('https://')).toBe(true);
  });
});

describe('root layout SEO metadata', () => {
  const layout = readFileSync(resolve(__dirname, '../app/layout.tsx'), 'utf8');

  it('sets metadataBase and Open Graph / Twitter cards', () => {
    expect(layout).toContain('metadataBase: new URL(SITE_URL)');
    expect(layout).toContain('openGraph:');
    expect(layout).toContain('twitter:');
    expect(layout).toContain('card: "summary_large_image"');
    expect(layout).toContain('alternates:');
    expect(layout).toContain('canonical: "/"');
  });

  it('embeds JSON-LD for structured data', () => {
    expect(layout).toContain('import JsonLd from "../components/JsonLd"');
    expect(layout).toContain('<JsonLd />');
  });

  it('keeps favicon basePath prefix', () => {
    expect(layout.includes('const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH')).toBe(true);
    const tick = String.fromCharCode(96);
    expect(layout.includes('icon: ' + tick + '${BASE_PATH}/icon.svg' + tick)).toBe(true);
  });
});

describe('robots.txt route', () => {
  it('is static for output:export', () => {
    expect(robotsDynamic).toBe('force-static');
  });

  it('allows indexing and points at the Pages sitemap', () => {
    const r = robots();
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(r.host).toBe(SITE_URL);
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules?.allow).toBe('/');
    expect(rules?.disallow).toEqual(
      expect.arrayContaining(['/selftest', '/thumb-bake', '/dialogue-review']),
    );
  });
});

describe('sitemap.xml route', () => {
  it('is static for output:export', () => {
    expect(sitemapDynamic).toBe('force-static');
  });

  it('lists public marketing and legal URLs under /amoji-app', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/setup`);
    expect(urls).toContain(`${SITE_URL}/robot-demo`);
    expect(urls).toContain(`${SITE_URL}/privacy`);
    expect(urls.every((u) => u.startsWith(SITE_URL))).toBe(true);
    expect(urls.some((u) => u.includes('selftest'))).toBe(false);
  });
});

describe('JSON-LD payload', () => {
  it('declares WebApplication + robot-face SoftwareApplication', () => {
    const src = readFileSync(resolve(__dirname, '../components/JsonLd.tsx'), 'utf8');
    expect(src).toContain("'WebApplication'");
    expect(src).toContain("'SoftwareApplication'");
    expect(src).toContain('@amoji/robot-face');
    expect(src).toContain('application/ld+json');
  });
});
