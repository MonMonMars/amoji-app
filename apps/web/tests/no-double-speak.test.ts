import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isLiveFactsOnlyTurn, planTools } from '../lib/live-tools';
import { speechLeadDiverged, speechRemainder } from '../lib/speech-queue';

const panel = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');
const liveTools = readFileSync(join(__dirname, '../lib/live-tools.ts'), 'utf8');

describe('no double speak on one turn', () => {
  it('skips streamed first-sentence TTS when live facts will replace the reply', () => {
    expect(panel).toContain('!worldSpoken.trim()');
    expect(panel).toMatch(/requested !== 'sing' && !worldSpoken\.trim\(\)/);
  });

  it('cuts a diverged streamed lead instead of stacking a second full answer', () => {
    expect(panel).toContain('speechLeadDiverged');
    expect(panel).toContain('stopSpeaking()');
    const speakReply = panel.slice(
      panel.indexOf('const speakReply ='),
      panel.indexOf('// t794/t796 + Pixel entry'),
    );
    expect(speakReply).toMatch(/speechLeadDiverged\(reply, alreadySpoken\.text\)/);
    expect(speakReply).toMatch(/stopSpeaking\(\)/);
  });

  it('news headlines speak once as live facts (no second LLM pass)', () => {
    const news = planTools('what is the latest news?');
    expect(isLiveFactsOnlyTurn(news, 'From the news: Cat parade brightens the city.')).toBe(true);
    // Prompt builder must not join multiple headlines with "; ".
    expect(liveTools).toMatch(/One headline per tap/);
    expect(liveTools).not.toMatch(/ordered\.map.*join\('; '\)/);
  });

  it('sayLocal owns history — quota / content-stop must not append the same assistant line twice', () => {
    const sayLocal = panel.slice(
      panel.indexOf('const sayLocal ='),
      panel.indexOf('const showTrack ='),
    );
    expect(sayLocal).toMatch(/tail\?\.role === 'assistant'/);
    expect(sayLocal).toMatch(/tail\.content\.trim\(\) === gated\.trim\(\)/);

    const stopBlock = panel.slice(
      panel.indexOf('if (contTurn.stopped)'),
      panel.indexOf('if (contTurn.session)'),
    );
    expect(stopBlock).toContain('sayLocal(line');
    expect(stopBlock).not.toMatch(/setHistory\(\(h\) => \[\.\.\.h, \{ role: 'assistant'/);

    const quotaBlock = panel.slice(
      panel.indexOf('if (!plan.chatAllowed)'),
      panel.indexOf('if (plan.plan === \'free\')'),
    );
    expect(quotaBlock).toContain('sayLocal(line');
    expect(quotaBlock).not.toMatch(/setHistory\(\(h\) => \[\.\.\.h, \{ role: 'assistant'/);
  });

  it('treats closer-only punctuation drift as the same lead (no re-speak of sentence one)', () => {
    expect(speechLeadDiverged('Hello there! How are you?', 'Hello there.')).toBe(false);
    expect(speechRemainder('Hello there! How are you?', 'Hello there.')).toBe('How are you?');
    expect(speechLeadDiverged('你好！今天怎樣？', '你好。')).toBe(false);
    expect(speechRemainder('你好！今天怎樣？', '你好。')).toBe('今天怎樣？');
    expect(speechLeadDiverged('Totally different answer.', 'Hello there.')).toBe(true);
    expect(speechRemainder('Totally different answer.', 'Hello there.')).toBe('');
  });
});
