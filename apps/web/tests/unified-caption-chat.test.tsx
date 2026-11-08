import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMessage from '../components/ChatMessage';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('unified speech caption in chat history', () => {
  it('ChatPanel does not mount a second caption strip outside history', () => {
    const panel = read('components/ChatPanel.tsx');
    const captionHits = [...panel.matchAll(/data-testid="speech-caption"/g)];
    expect(captionHits.length).toBe(0);
    expect(panel).toContain('SPEECH_CAPTION_EVENT');
    expect(panel).toContain('liveClause');
    expect(panel).toContain('tailStreaming');
  });

  it('assistant streaming tail carries movie-style clause inside the bubble', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Full reply stays for reporting."
        liveClause="Just this clause on screen."
        tailStreaming
        lang="en"
        accent="#f9a8d4"
        onReport={() => {}}
      />,
    );
    expect(html).toContain('data-testid="speech-caption"');
    expect(html).toContain('Just this clause on screen.');
    expect(html).not.toContain('Full reply stays for reporting.');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('chat-report-button');
  });

  it('user bubbles stay right-aligned in ChatMessage', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="user"
        content="hello"
        lang="en"
        accent="#38bdf8"
        onReport={() => {}}
      />,
    );
    expect(html).toContain('text-right');
    expect(html).not.toContain('speech-caption');
  });
});

describe('select-page voice audition gate', () => {
  it('playVoiceGreeting and previewVoiceChoice bypass Voice-replies off when not master-muted', () => {
    const voice = read('lib/voice.ts');
    const greet = voice.slice(voice.indexOf('export function playVoiceGreeting'), voice.indexOf('export function previewLibraryClip'));
    const preview = voice.slice(voice.indexOf('export function previewVoiceChoice'), voice.indexOf('const TEST_LINES'));
    expect(greet).toContain('selectAuditionAllowed()');
    expect(preview).toContain('selectAuditionAllowed()');
    expect(greet).not.toMatch(/if \(!voiceOutputAllowed\(\)\) return;\s*unlockAudio\(true\)/);
  });
});
