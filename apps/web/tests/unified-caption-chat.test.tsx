import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMessage from '../components/ChatMessage';
import { stepCaptionLadder } from '../lib/speech-caption';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('unified speech caption in chat history', () => {
  it('ChatPanel mounts the live caption below history, not inside ChatMessage', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('SPEECH_CAPTION_EVENT');
    expect(panel).toContain('stepCaptionLadder');
    expect(panel).toContain('captionLadder');
    expect(panel).toContain('data-testid="speech-caption"');
    expect(panel).toContain('data-testid="speech-caption-settled"');
    expect(panel).toContain('data-testid="speech-caption-front"');
    // Live clause no longer painted inside the last history bubble.
    expect(panel).not.toMatch(/liveClause=\{liveClause/);
  });

  it('assistant streaming tail hides the full bubble so captions cannot overlap it', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Full reply stays for reporting."
        tailStreaming
        lang="en"
        accent="#f9a8d4"
        onReport={() => {}}
      />,
    );
    expect(html).not.toContain('Full reply stays for reporting.');
    expect(html).not.toContain('data-testid="speech-caption"');
    expect(html).not.toContain('chat-report-button');
  });

  it('finished assistant bubbles still show full content', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Full reply stays for reporting."
        lang="en"
        accent="#f9a8d4"
        onReport={() => {}}
      />,
    );
    expect(html).toContain('Full reply stays for reporting.');
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

  it('stepCaptionLadder promotes the previous front line before showing the next', () => {
    const first = stepCaptionLadder([], '', 'Sunny and mild.');
    expect(first).toEqual({ ladder: [], current: 'Sunny and mild.' });
    const second = stepCaptionLadder(first.ladder, first.current, 'Bring a light jacket.');
    expect(second.ladder).toEqual(['Sunny and mild.']);
    expect(second.current).toBe('Bring a light jacket.');
    const done = stepCaptionLadder(second.ladder, second.current, '');
    expect(done).toEqual({ ladder: [], current: '' });
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
