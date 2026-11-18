import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMessage from '../components/ChatMessage';
import {
  captionsCoverReply,
  commitCaptionLines,
  stepCaptionLadder,
} from '../lib/speech-caption';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('unified speech caption in chat history', () => {
  it('ChatPanel mounts the live caption below history, not inside ChatMessage', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('SPEECH_CAPTION_EVENT');
    expect(panel).toContain('stepCaptionLadder');
    expect(panel).toContain('commitCaptionLines');
    expect(panel).toContain('captionLines');
    expect(panel).toContain('captionLadder');
    expect(panel).toContain('captionSealAccRef');
    expect(panel).toContain('whenSpeechIdle');
    expect(panel).toContain('speechPending()');
    expect(panel).toContain('data-testid="speech-caption"');
    expect(panel).toContain('data-testid="speech-caption-settled"');
    expect(panel).toContain('data-testid="speech-caption-front"');
    // Live clause no longer painted inside the last history bubble.
    expect(panel).not.toMatch(/liveClause=\{liveClause/);
    // Must not lock the first clear forever — lead→remainder needs a replace.
    expect(panel).not.toMatch(/if \(row\.captionLines\?\.length\) return h;/);
  });

  it('assistant streaming tail hides the full bubble so captions cannot overlap it', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Full reply stays for reporting."
        tailStreaming
        lang="en"
        accent="#f9a8d4"
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
      />,
    );
    expect(html).toContain('Full reply stays for reporting.');
    expect(html).not.toContain('chat-report-button');
  });

  it('sealed caption lines replace the full-phase history replay', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="assistant"
        content="Sunny and mild. Bring a light jacket."
        captionLines={['Sunny and mild.', 'Bring a light jacket.']}
        lang="en"
        accent="#f9a8d4"
      />,
    );
    expect(html).toContain('data-testid="speech-caption-history"');
    expect(html).toContain('Sunny and mild.');
    expect(html).toContain('Bring a light jacket.');
    // Must not paint the joined full phrase as a second copy.
    expect(html).not.toContain('Sunny and mild. Bring a light jacket.');
  });

  it('user bubbles stay right-aligned in ChatMessage', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        role="user"
        content="hello"
        lang="en"
        accent="#38bdf8"
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

  it('commitCaptionLines seals live clauses so history does not replay the full phrase', () => {
    const sealed = commitCaptionLines(['Sunny and mild.'], 'Bring a light jacket.');
    expect(sealed).toEqual(['Sunny and mild.', 'Bring a light jacket.']);
    expect(captionsCoverReply(sealed, 'Sunny and mild. Bring a light jacket.')).toBe(true);
    expect(captionsCoverReply(sealed, 'Totally different reply')).toBe(false);
    // Clearing the live ladder must not drop the sealed history lines.
    const cleared = stepCaptionLadder(sealed, 'Bring a light jacket.', '');
    expect(cleared).toEqual({ ladder: [], current: '' });
    expect(commitCaptionLines(['Sunny and mild.'], 'Bring a light jacket.')).toEqual(sealed);
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
