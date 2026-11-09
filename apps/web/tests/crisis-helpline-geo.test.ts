import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HELPLINES_BY_REGION,
  countryToHelplineRegion,
  crisisReplyText,
  downloadRegionFromLocale,
  guardCompanionTurn,
  helplineLine,
  helplinesForRegion,
  langToHelplineRegion,
  resolveHelplineRegion,
} from '../lib/crisis';
import { LANGS, t } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('helpline region precedence', () => {
  it('realtime beats register, download, and lang', () => {
    expect(resolveHelplineRegion({
      realtimeCountry: 'JP',
      registerRegion: 'US',
      downloadRegion: 'GB',
      lang: 'yue',
    })).toBe('JP');
  });

  it('register beats download and lang when realtime is missing', () => {
    expect(resolveHelplineRegion({
      registerRegion: 'Taiwan',
      downloadRegion: 'US',
      lang: 'yue',
    })).toBe('TW');
  });

  it('download beats lang when realtime and register are missing', () => {
    expect(resolveHelplineRegion({
      downloadRegion: 'zh-HK',
      lang: 'en',
    })).toBe('HK');
  });

  it('falls back to app language', () => {
    expect(langToHelplineRegion('yue')).toBe('HK');
    expect(langToHelplineRegion('zh')).toBe('CN');
    expect(langToHelplineRegion('ja')).toBe('JP');
    expect(langToHelplineRegion('en')).toBe('US');
    expect(resolveHelplineRegion({ lang: 'ja' })).toBe('JP');
  });

  it('maps common ISO and country names', () => {
    expect(countryToHelplineRegion('HK')).toBe('HK');
    expect(countryToHelplineRegion('united states')).toBe('US');
    expect(countryToHelplineRegion('en-GB')).toBe('UK');
    expect(downloadRegionFromLocale('zh-TW')).toBe('TW');
  });
});

describe('location-aware helpline numbers', () => {
  it('returns region-local numbers, not the full catalogue', () => {
    const hk = helplinesForRegion('HK').map((h) => h.tel);
    expect(hk).toEqual(expect.arrayContaining(['2389 2222', '2382 0000', '2896 0000']));
    expect(hk).not.toContain('988');

    const us = helplinesForRegion('US').map((h) => h.tel);
    expect(us).toEqual(['988']);
  });

  it('crisis reply uses lang fallback numbers when no geo hints', () => {
    expect(crisisReplyText('yue')).toContain('2389 2222');
    expect(crisisReplyText('yue')).not.toContain('988');
    expect(crisisReplyText('en')).toContain('988');
    expect(crisisReplyText('ja')).toContain('0120-783-556');
  });

  it('realtime country overrides the spoken numbers', () => {
    const g = guardCompanionTurn('I want to kill myself', 'en', { realtimeCountry: 'JP' });
    expect(g.blocked).toBe(true);
    expect(g.region).toBe('JP');
    expect(g.reply).toContain('0120-783-556');
    expect(g.reply).not.toContain('988');
  });

  it('helplineLine defaults to HK with empty hints', () => {
    expect(helplineLine()).toContain('2389 2222');
  });

  it('every region bucket has at least one dialable number', () => {
    for (const [region, lines] of Object.entries(HELPLINES_BY_REGION)) {
      expect(lines.length).toBeGreaterThan(0);
      for (const h of lines) {
        expect(h.tel.replace(/[^0-9+]/g, '').length).toBeGreaterThan(2);
      }
    }
  });
});

describe('view-only rules owns 「即刻搵人傾」; Agree does not', () => {
  const shared = read('components/setup-one-shared.tsx');
  const quick = read('components/QuickSetup.tsx');
  const splash = read('app/page.tsx');

  it('main-page splashOpenSetup opens /rules view-only', () => {
    expect(splash).toContain('href="/rules"');
    expect(splash).toContain("router.replace('/setup')");
  });

  it('QuickSetup passes showHelplines only when viewOnly', () => {
    expect(quick).toContain('showHelplines={viewOnly}');
    expect(quick).toContain("data-testid={viewOnly ? 'rules-view' : 'entry-gate'}");
  });

  it('scroll body gates the helpline list behind showHelplines', () => {
    expect(shared).toContain('showHelplines');
    expect(shared).toContain("t(lang, 'safetyHelplinesTitle')");
    expect(shared).toContain('HelplineList');
    expect(shared).toContain('setup-helplines-rules-hint');
    expect(shared).toContain("t(lang, 'safetyHelplinesRulesHint')");
    // Agree path must not render the flat catalogue unconditionally.
    expect(shared).not.toMatch(/CRISIS_HELPLINES\.map/);
  });

  it('helpline title string is 「即刻搵人傾」 in Cantonese', () => {
    expect(t('yue', 'safetyHelplinesTitle')).toBe('即刻搵人傾');
    for (const { id } of LANGS) {
      expect(t(id, 'safetyHelplinesRulesHint').trim().length).toBeGreaterThan(0);
      expect(t(id, 'safetyLeadAgree').trim().length).toBeGreaterThan(0);
    }
  });

  it('crisis warning popup + ChatPanel location wiring exist', () => {
    const dialog = read('components/CrisisHelplineDialog.tsx');
    const chat = read('components/ChatPanel.tsx');
    expect(dialog).toContain('data-testid="crisis-dialog"');
    expect(dialog).toContain('HelplineList');
    expect(dialog).toContain("t(lang, 'safetyHelplinesTitle')");
    expect(chat).toContain('readHelplineLocationHints');
    expect(chat).toContain('CrisisHelplineDialog');
    expect(chat).toContain('setCrisisPopup');
  });
});
