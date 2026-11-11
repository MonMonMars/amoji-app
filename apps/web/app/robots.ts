import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

// Static export requires force-static (same pattern as manifest.ts).
export const dynamic = 'force-static';

/**
 * Crawl rules for the public companion + robot-demo surface.
 * Note: Google only honors robots.txt at the host root. On GitHub project
 * Pages this file lives at /amoji-app/robots.txt — still useful for tooling
 * and a future custom domain; submit sitemap.xml in Search Console either way.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/selftest',
        '/thumb-bake',
        '/dialogue-review',
        '/en-sfx-ab',
        '/sfx-gallery',
        '/gate/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
