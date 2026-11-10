import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGS, STRINGS, type Lang } from '../lib/prefs';
import { submitSupportMessage, supportApiConfigured } from '../lib/support';

const web = join(__dirname, '..');

describe('support contact', () => {
  const prevApi = process.env.NEXT_PUBLIC_AMOJI_API;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_AMOJI_API;
  });

  afterEach(() => {
    if (prevApi === undefined) delete process.env.NEXT_PUBLIC_AMOJI_API;
    else process.env.NEXT_PUBLIC_AMOJI_API = prevApi;
    vi.unstubAllGlobals();
  });

  it('ships support strings in every language', () => {
    for (const key of [
      'supportTitle', 'supportLead', 'supportSubmit', 'supportNoApi', 'supportOk', 'wipeProductData',
    ] as const) {
      for (const { id } of LANGS) {
        expect(STRINGS[key][id as Lang].length).toBeGreaterThan(3);
      }
    }
  });

  it('does not invent a support send when the production API is unset', async () => {
    expect(supportApiConfigured()).toBe(false);
    const result = await submitSupportMessage({
      email: 'a@b.co',
      message: 'hello',
    });
    expect(result.attempted).toBe(false);
    expect(result.ok).toBe(false);
  });

  it('posts to /api/support when the production API is configured', async () => {
    process.env.NEXT_PUBLIC_AMOJI_API = 'https://api.example.test';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      stored: true,
      emailed: false,
      skipped: true,
      mailConfigured: false,
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await submitSupportMessage({
      email: 'friend@example.com',
      message: 'Need a hand',
    });
    expect(result.attempted).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.stored).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/support',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('wires Settings Help + ReportDialog contact email', () => {
    const settings = readFileSync(join(web, 'components/SettingsSheet.tsx'), 'utf8');
    expect(settings).toContain('submitSupportMessage');
    expect(settings).toContain('wipeClientProductData');
    const report = readFileSync(join(web, 'components/ReportDialog.tsx'), 'utf8');
    expect(report).toContain('amoji-report-email');
    expect(report).toContain('contactEmail');
  });
});
