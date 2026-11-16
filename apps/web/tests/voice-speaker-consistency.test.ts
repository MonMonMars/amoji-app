import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { PITCH_BIAS_MALE, PITCH_BIAS_FEMALE } from '../lib/gtts';

const web = join(__dirname, '..');
const gtts = readFileSync(join(web, 'lib/gtts.ts'), 'utf8');
const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');

describe('voice does not switch speaker mid-line or between characters', () => {
  it('a mid-line failure resumes the remainder instead of replaying the line', () => {
    // Symptom Mon reported: "some voice will jump to using other speaker".
    // Cause: when the HTTP tier died partway, the next tier was handed the
    // FULL original text, so the sentence restarted in a different voice.
    expect(voice).toContain('speakRemainderInChain');
    expect(voice).toContain('onProgress: (n) => { spokenChars = n; }');
    expect(voice).toMatch(/speechRemainder\(text, text\.slice\(0, spokenChars\)\)/);
  });

  it('the remainder path speaks only the tail, never the whole line', () => {
    const start = voice.indexOf('const speakRemainderInChain');
    const end = voice.indexOf('const runAt =', start);
    const block = voice.slice(start, end);
    expect(block).toContain('speakGtts(rest');
    expect(block).not.toContain('speakGtts(text');
    expect(block).toContain('runSynthTail(rest');
  });

  it('the browser tail fallback takes the remainder, not the full text', () => {
    const start = voice.indexOf('const runSynthTail');
    const end = voice.indexOf('const runFreeChain', start);
    const block = voice.slice(start, end);
    expect(block).toContain('synthSpeak(rest');
    expect(block).not.toContain('synthSpeak(text');
  });

  it('gtts reports progress so a fallback knows how far it got', () => {
    expect(gtts).toContain('onProgress?: (spokenChars: number) => void');
    expect(gtts).toMatch(/spokenChars \+= piece\.text\.length/);
    expect(gtts).toContain('opts.onProgress?.(spokenChars)');
  });

  it('character identity is carried by pitch, since the endpoint has one voice per language', () => {
    // The Translate endpoint takes only `tl`, so every character shares a voice
    // and male companions sounded female. Pitch bias is the only lever.
    expect(gtts).toContain('pitchBias?: number');
    expect(gtts).toContain('preservesPitch = false');
    expect(PITCH_BIAS_MALE).toBeLessThan(1); // male reads deeper
    expect(PITCH_BIAS_FEMALE).toBeGreaterThanOrEqual(1); // female slightly brighter
  });

  it('every gtts call site takes its pitch from ONE shared helper', () => {
    // t790 — the loading filler had to sound like the same person as the
    // reply. Copy-pasting the ternary per call site is how a new caller
    // silently forgets it, so voice.ts owns a single resolver and every tier
    // (reply, resumed tail, greeting, sing, preview, filler) calls it.
    expect(voice).toMatch(/export function gttsPitchBias\(/);
    expect(voice).toMatch(/pitchBias: gttsPitch(?:Bias|ForLang)\(/);
    const ternaries = voice.match(/pitchBias: [a-zA-Z]+ === 'male' \?/g) ?? [];
    expect(ternaries).toEqual([]);
    // Gender base + per-character / pinned-button tier live in gtts-timbre;
    // voice.ts re-exports and routes pins through gttsPitchForLang.
    expect(voice).toContain('gttsCharacterPitchBias');
    expect(voice).toMatch(/return gttsCharacterPitchBias\(gender, characterId, lang(?:, tier)?\)/);
    expect(voice).toMatch(/gttsCharacterPitchBias\(delivery, characterId, lang, tier\)/);
  });

  it('passes characterId into the pitch helper on live speak paths', () => {
    // Same-gender cast members must not collapse to one sound; pinned delivery
    // gender rides through gttsPitchForLang so male/female voice buttons match.
    expect(voice).toMatch(/gttsPitchForLang\(lang, characterId, spokenGender/);
    expect(voice).toMatch(/gttsPitchForLang\(lang, characterId, gender/);
  });

  it('the pitch shift stays bounded so the line is not garbled', () => {
    // preservesPitch=false changes tempo too; a big bias sounds sped up, not
    // like a different person. Clamp tracks GTTS_PITCH_BIAS_* so deep male
    // is not erased by a hard 0.7 floor (#406 follow-up).
    expect(gtts).toMatch(/Math\.min\(GTTS_PITCH_BIAS_MAX, Math\.max\(GTTS_PITCH_BIAS_MIN,/);
    expect(gtts).toMatch(/clamp\(opts\.pitchBias \?\? 1, GTTS_PITCH_BIAS_MIN, GTTS_PITCH_BIAS_MAX\)/);
  });

  it('beginTts forces companion playback route before any lang tier', () => {
    expect(voice).toContain('ensureCompanionPlaybackRoute');
    expect(voice).toMatch(/const beginTts = \(\) => \{[\s\S]*?ensureCompanionPlaybackRoute\(\)/);
  });

  it('a canceled tier still settles immediately rather than falling through', () => {
    // A user cut must not trigger the resume path.
    expect(voice).toMatch(/message === 'canceled'\)\s*\{\s*settle\(\);\s*return;\s*\}/);
  });

  it('pins sinks before HTML audio play and primes synth against wrong Windows route', () => {
    expect(gtts).toContain('startHtmlAudioOnDefaultSpeakers');
    expect(voice).toMatch(/pinSinkBeforePlay:\s*true/);
    expect(gtts).toContain('ensureCompanionPlaybackRoute');
    expect(voice).toContain('primeDefaultSpeakerBeforeSynth');
    const focus = readFileSync(join(web, 'lib/voice-chat-focus.ts'), 'utf8');
    expect(focus).toContain('companionPlaybackSession');
    expect(focus).toContain('ensureCompanionPlaybackRoute');
    expect(focus).toMatch(/duckExternalAudioForCompanion[\s\S]*companionPlaybackSession/);
    expect(focus).toMatch(/function companionPlaybackSession[\s\S]*primeDefaultSpeakerBeforeSynth/);
    expect(focus).toMatch(/leaveVoiceChatAudioSession[\s\S]*primeDefaultSpeakerBeforeSynth/);
  });

  it('all companion HTMLAudio paths force default speakers only (not mic/comms sink)', () => {
    // Owner: Yue female audible on expected speakers; other lang/gender TTS
    // routed to another device — setSinkId / play-and-record latch, not mute.
    const audioOut = readFileSync(join(web, 'lib/audio-output.ts'), 'utf8');
    const edge = readFileSync(join(web, 'lib/edge-tts.ts'), 'utf8');
    const clips = readFileSync(join(web, 'lib/play-voice-clip.ts'), 'utf8');
    const openai = readFileSync(join(web, 'lib/openai-tts.ts'), 'utf8');
    expect(audioOut).toContain('isDefaultSinkId');
    expect(audioOut).not.toMatch(/sharedCtx[\s\S]{0,80}\.sinkId/);
    expect(audioOut).toMatch(/cachedDefaultSink = ''|cachedDefaultSink = 'default'/);
    expect(audioOut).toContain('startHtmlAudioOnDefaultSpeakers');
    expect(audioOut).toContain('pin-before-play');
    for (const src of [gtts, edge, openai]) {
      expect(src).toContain('startHtmlAudioOnDefaultSpeakers');
      expect(src).not.toMatch(/audio\.onplay = \(\) => \{[\s\S]*?pinDefaultOutput\(audio\)/);
    }
    // Gesture clips stay play-first + reject-retry pin (#424).
    expect(clips).toContain('pinDefaultOutputAsync');
    expect(clips).toMatch(/void audio\.play\(\)/);
    expect(clips).not.toMatch(/audio\.onplay = \(\) => \{[\s\S]*?pinDefaultOutput\(audio\)/);
    expect(gtts).toContain('ensureCompanionPlaybackRoute');
    expect(edge).toContain('ensureCompanionPlaybackRoute');
    expect(openai).toContain('ensureCompanionPlaybackRoute');
  });
});
