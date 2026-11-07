import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

const voice = read('lib/voice.ts');
const chain = read('lib/tts-chain.ts');
const gtts = read('lib/gtts.ts');

describe('the HTTP MP3 voice tier is actually reachable', () => {
  it('the Edge readaloud endpoint is dead, so a second real tier must exist', () => {
    // Verified live: the readaloud socket answers 401 without the client token
    // and 403 with it, from Node with an Edge UA and the extension Origin. So
    // the in-browser 403 is not an Origin/CORS problem — the endpoint itself
    // rejects the published client id. Without another real tier the app falls
    // all the way to speechSynthesis, which the iOS hardware silent switch
    // mutes outright.
    expect(chain).toContain("'gtts'");
    expect(chain.indexOf('gtts')).toBeGreaterThan(-1);
  });

  it('gtts is imported as a speaking tier, not just for stop()', () => {
    // It used to be imported as `{ stopGtts }` only and never called — the
    // file's own header said "gtts.ts is not a hop".
    expect(voice).toContain('speakGtts');
    expect(voice).toMatch(/import \{[^}]*speakGtts[^}]*\} from '\.\/gtts'/);
  });

  it('the chain runs gtts before falling back to speechSynthesis', () => {
    const hopsAt = voice.indexOf("if (hop === 'gtts')");
    const synthAt = voice.indexOf("if (hop === 'synth')");
    expect(hopsAt).toBeGreaterThan(-1);
    // Both branches exist in the runner; ordering is asserted in tts-chain.test.
    expect(synthAt).toBeGreaterThan(-1);
  });

  it('gtts speaks over plain HTTPS so no socket can be blocked', () => {
    expect(gtts).toContain('https://translate.google.com/translate_tts');
    expect(gtts).not.toContain('wss://');
  });

  it('the greeting starts the HTTP tier, not a dead Edge attempt', () => {
    // Edge 403s for every client, so blocking the greeting on it would mean a
    // visible delay before any sound. gtts is started first; Edge can still
    // interrupt if it ever answers again.
    const greetStart = voice.indexOf('export function playVoiceGreeting');
    const greetEnd = voice.indexOf('export function previewLibraryClip', greetStart);
    const greet = voice.slice(greetStart, greetEnd);
    expect(greet).toContain('speakGtts(');
    const gttsAt = greet.indexOf('speakGtts(');
    const edgeAt = greet.indexOf('speakEdge(');
    expect(gttsAt).toBeGreaterThan(-1);
    expect(edgeAt).toBeGreaterThan(gttsAt); // MP3 tier is kicked off first
    // synth survives only as the final fallback when even HTTP cannot play
    expect(greet).toContain("runSynthAudition('greeting fallback')");
  });

  it('the preview path starts the HTTP tier too', () => {
    const start = voice.indexOf('export function previewVoiceChoice');
    const end = voice.indexOf('const TEST_LINES', start);
    const block = voice.slice(start, end);
    expect(block).toContain('speakGtts(');
    expect(block).toContain("runSynthAudition('preview fallback')");
    // The preview must send the chosen speaker, or it auditions the default and
    // every button still sounds the same.
    expect(block).toContain('tlForChoice(locale, choiceId)');
    expect(block).toMatch(/speakGtts\(text, \{\s*lang: locale,\s*tl,/);
  });

  it('the settings self-test exercises the gtts tier so a silent phone is diagnosable', () => {
    expect(voice).toMatch(/if \(hop === 'gtts'\)[\s\S]{0,400}speakGtts/);
  });

  it('asks Google for real Cantonese, not the Hong Kong Mandarin voice', () => {
    // Verified live: `yue` and `zh-HK` both return audio, but zh-HK is the
    // Mandarin Hong Kong voice, which mispronounces colloquial Cantonese.
    expect(gtts).toMatch(/yue:\s*'yue'/);
    expect(gtts).not.toMatch(/yue:\s*'zh-HK'/);
  });

  it('accepts an explicit speaker code from the picker', () => {
    // `tl` is the only voice selector this endpoint has: voice/name/speaker
    // params all return byte-identical audio (verified). Without this the
    // picker could not change the sound at all.
    expect(gtts).toContain('tl?: string');
    expect(gtts).toMatch(/opts\.tl \?\? LANG_MAP\[opts\.lang\]/);
  });

  it('does not set crossOrigin, so plain <audio> playback is not CORS-blocked', () => {
    // translate.google.com returns `access-control-allow-origin: null`. A media
    // element does not need CORS to PLAY, only to read bytes — setting
    // crossOrigin would break playback.
    expect(gtts).not.toContain('crossOrigin');
  });
});
