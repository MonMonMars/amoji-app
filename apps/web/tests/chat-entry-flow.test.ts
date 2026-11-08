import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildOpenCheerLine,
  openPhaseTopicAsk,
} from '../lib/open-phase';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('chat entry open order', () => {
  it('composes name hello + persona intro before topic ask', () => {
    const line = buildOpenCheerLine('en', {
      nameHello: 'Good evening, Alex',
      personaIntro: "Hi, I'm Nova! I like stars — what should we talk about?",
      topicAsk: openPhaseTopicAsk('en'),
    });
    expect(line.toLowerCase()).toContain('alex');
    expect(line).toMatch(/nova|stars/i);
    expect(line.toLowerCase()).toMatch(/talk about/);
  });

  it('ChatPanel uses persona intro and topic menu, not open-phase weather fetch', () => {
    const chat = read('components/ChatPanel.tsx');
    expect(chat).toContain('voiceOpening');
    expect(chat).toContain('buildOpenCheerLine');
    expect(chat).toContain('formatTopicSuggestionLine');
    expect(chat).not.toMatch(/openPhaseWeatherAsk\(lang\)/);
    expect(chat).not.toMatch(/openPhaseNewsAsk\(lang\)/);
    expect(chat).toContain('userUndecided');
  });
});
