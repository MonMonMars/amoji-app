import { describe, expect, it, vi } from 'vitest';
import { guardCompanionTurn } from '../lib/crisis';

const CRISIS_PHRASES = ['我想死', 'I want to kill myself', 'もう死にたい'];

describe('crisis E-group — no LLM on three crisis phrases', () => {
  for (const phrase of CRISIS_PHRASES) {
    it(`blocks "${phrase}" before any brain`, () => {
      const chatSpy = vi.fn();
      const guard = guardCompanionTurn(phrase, phrase.includes('死に') ? 'ja' : phrase.match(/[a-z]/i) ? 'en' : 'yue');
      expect(guard.blocked).toBe(true);
      expect(guard.reply.length).toBeGreaterThan(20);
      expect(chatSpy).not.toHaveBeenCalled();
    });
  }

  it('ChatPanel send() orders quota after crisis but clientChat only after quota', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');
    const sendAt = src.indexOf('const send = async (');
    const body = src.slice(sendAt);
    expect(body.indexOf('guardCompanionTurn(text, lang')).toBeLessThan(body.indexOf('clientChat('));
    expect(body.indexOf('planStatus()')).toBeLessThan(body.indexOf('clientChat('));
  });
});
