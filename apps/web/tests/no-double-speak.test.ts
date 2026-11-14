import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isLiveFactsOnlyTurn, planTools } from '../lib/live-tools';

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
});
