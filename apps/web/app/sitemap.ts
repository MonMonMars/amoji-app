import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

// Static export requires force-static (same pattern as manifest.ts).
export const dynamic = 'force-static';

/** Indexable marketing / legal / demo routes (skip chat shell + QA). */
const ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/setup', priority: 0.95, changeFrequency: 'weekly' },
  { path: '/robot-demo', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/story', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/credits', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/safety', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/rules', priority: 0.4, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path || '/'}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
