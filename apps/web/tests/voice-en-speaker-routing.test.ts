/**
 * Phone routing: en / zh / ja TTS must land on the main loudspeaker (same as
 * music/gate), not earpiece / BT comms after mic play-and-record.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  markMicCommsRoutingLatch,
  resetDefaultSinkCacheForTests,
  startHtmlAudioOnDefaultSpeakers,
} from '../lib/audio-output';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('en speaker routing (mic latch + gesture card)', () => {
  beforeEach(() => {
    resetDefaultSinkCacheForTests();
    markMicCommsRoutingLatch(false);
  });

  it('gesture-safe play kicks sink pin before play when mic latch is on', async () => {
    markMicCommsRoutingLatch(true);
    const order: string[] = [];
    const audio = {
      setSinkId(id: string) {
        order.push(`sink:${id}`);
        return Promise.resolve();
      },
      play() {
        order.push('play');
        return Promise.resolve();
      },
    } as unknown as HTMLAudioElement;
    await startHtmlAudioOnDefaultSpeakers(audio, 'gesture-safe');
    expect(order[0]).toBe('sink:');
    expect(order[1]).toBe('play');
  });

  it('chat beginTts primes full companion playback session (not route-only)', () => {
    const voice = read('lib/voice.ts');
    expect(voice).toMatch(/const beginTts = \(\) => \{[\s\S]*?companionPlaybackSession\(\)/);
    expect(voice).toContain('micCommsRoutingLatchActive');
    expect(voice).toMatch(/if \(hop === 'synth'\)[\s\S]*?micCommsRoutingLatchActive\(\)[\s\S]*?spokenGender === 'male'/);
  });

  it('card greet + preview duck companion audio like chat speak', () => {
    const voice = read('lib/voice.ts');
    const greet = voice.slice(
      voice.indexOf('export function playVoiceGreeting'),
      voice.indexOf('export function previewLibraryClip'),
    );
    const preview = voice.slice(
      voice.indexOf('export function previewVoiceChoice'),
      voice.indexOf('const TEST_LINES'),
    );
    expect(greet).toContain('duckExternalAudioForCompanion()');
    expect(preview).toContain('duckExternalAudioForCompanion()');
    expect(greet).toMatch(/greetGttsOpts[\s\S]*?lang,/);
    expect(greet).toMatch(/tlForChoice\(lang, choiceId\)/);
  });

  it('audio-output documents latch pre-pin for gesture paths', () => {
    const audio = read('lib/audio-output.ts');
    expect(audio).toContain('kickDefaultOutputPinBeforeGesturePlay');
    expect(audio).toContain('micCommsRoutingLatchActive()');
  });
});