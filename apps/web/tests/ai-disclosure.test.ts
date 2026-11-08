import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { BASE_SYSTEM, languageBlock } from '../lib/llm';
import { LANGS, t, type Lang } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('AI disclosure — first run', () => {
  const splash = read('app/page.tsx');
  const gate = read('components/LegalGate.tsx');

  it('shows AI + 18+ on the first interactive screen (title START disclaimer)', () => {
    expect(splash).toContain("t(lang, 'setupOneDisclaimer')");
    expect(splash).toContain('amoji-splash-legal');
  });

  it('shows the notice in the legal gate too, at the first tap', () => {
    // EU AI Act Art 50 transparency attaches to the first interaction. The
    // Accept tap happens before the name step, so it carries the notice too.
    expect(gate).toContain("t(lang, 'aiNotice')");
  });

  it('says in plain words that this is AI, not a human, in all four languages', () => {
    const HUMAN_WORD: Record<Lang, RegExp> = {
      en: /\bAI\b.*\bnot a human\b/i,
      yue: /AI.*唔係真人/,
      zh: /AI.*不是真人/,
      ja: /AI.*人間ではありません/,
    };
    for (const { id } of LANGS) expect(t(id, 'aiNotice')).toMatch(HUMAN_WORD[id]!);
  });

  it('does not reuse one language string for another', () => {
    const en = t('en', 'aiNotice');
    for (const id of ['yue', 'zh', 'ja'] as const) expect(t(id, 'aiNotice')).not.toBe(en);
    expect(t('yue', 'aiNotice')).not.toBe(t('zh', 'aiNotice'));
  });

  it('names the model, so the claim is specific rather than vague', () => {
    expect(t('en', 'aiNotice')).toMatch(/language model/i);
  });
});

describe('AI disclosure — system prompt hard rule', () => {
  it('forbids claiming to be human', () => {
    expect(BASE_SYSTEM).toMatch(/never (?:claim|pretend)/i);
    expect(BASE_SYSTEM).toMatch(/never claim to be a real person|Never claim to be a real person/i);
  });

  it('requires an honest answer when asked directly', () => {
    expect(BASE_SYSTEM).toMatch(/are an AI|whether you are an AI/i);
    expect(BASE_SYSTEM).toMatch(/Do not deny it/);
  });

  it('forbids inventing a human past', () => {
    expect(BASE_SYSTEM).toMatch(/Never invent a human past/i);
  });

  it('keeps the Cantonese-colloquial language instruction intact', () => {
    // llm.ts:53 — this line is what makes her speak HK Cantonese rather than
    // written Chinese; a prompt edit must never quietly damage it.
    const yue = languageBlock('yue');
    expect(yue).toContain('粵語口語書面');
    expect(yue).toContain('係/嘅/唔/喎/啦/吓/咩');
    expect(yue).toContain('Hard Cantonese rules');
    expect(yue).toContain('ALWAYS reply in natural Hong Kong Cantonese');
    // the no-language default is Cantonese too
    expect(languageBlock(undefined)).toBe(yue);
  });

  it('still carries every rule the reply-quality suite pinned', () => {
    expect(BASE_SYSTEM).toMatch(/1 to 3 short sentences/);
    expect(BASE_SYSTEM).toMatch(/NO NONSENSE/);
    expect(BASE_SYSTEM).toMatch(/END WITH A QUESTION/);
    expect(BASE_SYSTEM).toMatch(/BE PRECISE/);
    expect(BASE_SYSTEM).toMatch(/hehe\/haha/);
    expect(BASE_SYSTEM).toMatch(/hey-hey/);
    expect(BASE_SYSTEM).toMatch(/grounded|not surreal/);
    expect(BASE_SYSTEM).toMatch(/\[emotion:\{/);
    expect(BASE_SYSTEM).toMatch(/0\.7–1\.0/);
  });
});

describe('safety page', () => {
  const page = read('app/safety/page.tsx');

  it('exists as a route and is reachable without accepting the gate', () => {
    expect(page).toContain('amoji-safety-title');
    expect(read('components/LegalGate.tsx')).toContain("'/safety'");
  });

  it('states plainly that Amoji is not a crisis service', () => {
    expect(t('en', 'safetyLead')).toMatch(/not a crisis service/i);
    expect(t('yue', 'safetyLead')).toMatch(/唔係危機支援服務/);
    expect(t('zh', 'safetyLead')).toMatch(/不是危机干预服务/);
    expect(t('ja', 'safetyLead')).toMatch(/危機対応の窓口でも/);
  });

  it('renders the helpline list from the crisis module, not hard-coded copy', () => {
    expect(page).toContain('CRISIS_HELPLINES');
    expect(page).toContain('tel:');
  });

  it('localizes every heading', () => {
    const KEYS = [
      'safetyTitle', 'safetyLead', 'safetyHelplinesTitle', 'safetyEmergencyTitle',
      'safetyStepsTitle', 'safetyStepsBody', 'safetyAboutAi', 'safetyPrivacyLink',
    ] as const;
    for (const key of KEYS) {
      expect(page).toContain(`t(lang, '${key}')`);
      for (const { id } of LANGS) {
        expect(t(id, key).trim().length).toBeGreaterThan(0);
      }
    }
  });
});
