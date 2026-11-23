/**
 * Owner report (2026-11-23, live r2026-11-19.290), three bugs:
 *  (a) "now the character always repeat the answers two times"
 *  (b) "it will repeat my question before answering … make her just answer"
 *  (c) "the voice sometimes jump from speaker a then speaker b in my PC"
 *
 * Each guard here fails on the pre-fix code:
 *  (a) speak() re-enqueued the active line on a tap-replay → two playbacks of
 *      one answer; and a reshaped final reply re-spoke the whole answer after
 *      the streamed lead.
 *  (b) the prompts asked her to "reflect/acknowledge" the last message, which a
 *      free model renders as a read-back of the question; no scrub existed.
 *  (c) a partially heard MP3 line could hand its tail to speechSynthesis (no
 *      setSinkId) while the mic held play-and-record → different speaker.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speechTailAfterLead } from '../lib/speech-queue';
import {
  getDefaultSinkId,
  pinDefaultOutputAsync,
  resetDefaultSinkCacheForTests,
} from '../lib/audio-output';
import { restatesUserMessage, stripQuestionReadBack } from '../lib/spoken-line-sanity';
import { BASE_SYSTEM } from '../lib/llm';

const web = join(__dirname, '..');
const voiceSrc = readFileSync(join(web, 'lib/voice.ts'), 'utf8');
const panelSrc = readFileSync(join(web, 'components/ChatPanel.tsx'), 'utf8');

const sink: Array<{ text: string; settle: () => void }> = [];
/** Test switch: the tier accepts the line but never starts audio (gated <audio>). */
let tierSilent = false;
/**
 * Node env has no DOM; voice.ts binds its gesture-replay listener at import
 * time, so a minimal window that records `pointerdown` listeners lets the
 * tests fire the exact handler the owner's tap would fire.
 */
const taps: Array<() => void> = [];
vi.stubGlobal('window', {
  addEventListener: (type: string, fn: () => void) => {
    if (type === 'pointerdown') taps.push(fn);
  },
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

vi.mock('../lib/gtts', () => ({
  PITCH_BIAS_MALE: 0.64,
  PITCH_BIAS_FEMALE: 1.30,
  GTTS_PITCH_BIAS_MIN: 0.38,
  GTTS_PITCH_BIAS_MAX: 1.72,
  GTTS_YUE_MALE_PACE_FLOOR: 0.38,
  stopGtts: () => {},
  pauseGttsForTabHide: () => {},
  resumeGttsForTabShow: () => {},
  pauseAfterClause: () => 0,
  splitClauses: (text: string) => [text],
  splitChunks: (text: string) => [text],
  speakGtts: (text: string, opts: Record<string, unknown>) => new Promise<void>((resolve) => {
    sink.push({ text, settle: resolve });
    if (tierSilent) return;
    (opts.onPlaying as (() => void) | undefined)?.();
  }),
}));

vi.mock('../lib/edge-tts', () => ({
  pauseEdgeForTabHide: () => {},
  resumeEdgeForTabShow: () => {},
  speakEdge: () => Promise.reject(new Error('edge blocked')),
  stopEdge: () => {},
  getTtsProxy: () => null,
  resolveEdgeVoice: () => ({ name: 'stub' }),
  edgeEndpointsDead: () => true,
  resetEdgeHealth: () => {},
}));

vi.mock('../lib/play-voice-clip', () => ({
  isVoiceClipPlaying: () => false,
  playGestureClipSync: () => {},
  playVoiceClip: () => Promise.resolve(),
  stopVoiceClip: () => {},
}));

vi.mock('../lib/sfx', () => ({
  sfxEnabled: () => false,
  setSfxEnabled: () => {},
  playSfx: () => {},
  resumeSfxContext: () => {},
  sfxVoiceHold: () => {},
  sfxVoiceRelease: () => {},
}));

async function flush(): Promise<void> {
  for (let i = 0; i < 32; i += 1) await Promise.resolve();
}

describe('(a) one turn is one utterance — no replay, no second full answer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sink.length = 0;
  });

  afterEach(async () => {
    const voice = await import('../lib/voice');
    voice.stopSpeaking();
    vi.clearAllTimers();
    vi.useRealTimers();
    sink.length = 0;
    tierSilent = false;
  });

  it('a tap-replay while the answer is still in flight never queues a second copy', async () => {
    const voice = await import('../lib/voice');
    // Move the clock so a start callback from an earlier test cannot count.
    await vi.advanceTimersByTimeAsync(1000);
    // The tier takes the line and produces no audio-START: this is the shape
    // that arms the 8s no-audio watchdog (and the tap-to-replay hint).
    tierSilent = true;
    voice.speak('The one and only answer.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(8_000); // watchdog arms the replay
    expect(taps.length).toBeGreaterThan(0);
    for (const tap of taps) tap();
    await flush();
    // A tap must not add a copy of a line that is still the active job.
    expect(sink).toHaveLength(1);

    // Let the original finish normally: the answer is heard exactly once.
    tierSilent = false;
    sink[0]!.settle();
    await flush();
    await vi.advanceTimersByTimeAsync(voice.SILENT_LINE_RELEASE_MS + 20_000);
    await flush();
    expect(sink.map((s) => s.text)).toEqual(['The one and only answer.']);
  });

  it('a dead line is cut and the next tap still rescues it ONCE (silence fix kept)', async () => {
    const voice = await import('../lib/voice');
    await vi.advanceTimersByTimeAsync(1000);
    tierSilent = true;
    voice.speak('A line that never sounds.', 'a01-shino', 'en', undefined, undefined, 1, 0, { resumable: true });
    await flush();
    expect(sink).toHaveLength(1);

    // Queue unwedges: the watchdog releases the serial speaker.
    await vi.advanceTimersByTimeAsync(voice.SILENT_LINE_RELEASE_MS);
    await flush();
    tierSilent = false;

    // After the cut the line is gone from the queue → the rescue tap speaks it
    // once (the earlier dedupe must not swallow the rescue).
    for (const tap of taps) tap();
    await flush();
    expect(sink).toHaveLength(2);
    expect(sink[1]!.text).toBe('A line that never sounds.');
  });

  it('a reshaped final reply says only what was not heard yet', () => {
    // Streamed lead spoken live, final text re-wrapped by shaping/scrub.
    expect(speechTailAfterLead('Sure, here are the steps.', 'Sure!')).toBe('here are the steps.');
    expect(speechTailAfterLead('Sure! Here are the steps.', 'Sure!')).toBe('Here are the steps.');
    expect(speechTailAfterLead('Sure!', 'Sure!')).toBe('');
    // Genuinely different answer: nothing to trim, the caller speaks it once.
    expect(speechTailAfterLead('Totally different answer.', 'Sure!')).toBe('');
    expect(speechTailAfterLead('你好！今天幾好？', '你好。')).toBe('今天幾好？');
  });

  it('the reply path cuts a diverged lead instead of re-speaking the answer', () => {
    const block = panelSrc.slice(
      panelSrc.indexOf('const speakReply ='),
      panelSrc.indexOf('mv === \'sing\''),
    );
    expect(block).toMatch(/leadLive && alreadySpoken && !leadMatched/);
    expect(block).toMatch(/stopSpeaking\(\)/);
    expect(block).toMatch(/speechTailAfterLead\(reply, alreadySpoken\.text\)/);
    // speak() itself must refuse a duplicate of an in-flight line.
    expect(voiceSrc).toMatch(/if \(speechStillQueued\(cleaned\)\) \{/);
  });
});

describe('(b) she answers directly — never reads the question back', () => {
  it('drops a leading read-back of the user question', () => {
    const q = '點解天空係藍色？';
    expect(restatesUserMessage('你問我點解天空係藍色？', q)).toBe(true);
    expect(stripQuestionReadBack('你問我點解天空係藍色？因為陽光散射。', q)).toBe('因為陽光散射。');
  });

  it('drops an English read-back sentence', () => {
    const q = 'why is the sky blue?';
    const reply = "So you're asking why is the sky blue? Blue light scatters the most.";
    expect(restatesUserMessage("So you're asking why is the sky blue?", q)).toBe(true);
    expect(stripQuestionReadBack(reply, q)).toBe('Blue light scatters the most.');
  });

  it('keeps genuine empathy that names a detail (not a read-back)', () => {
    const reply = '你話今日好攰。咁就早啲休息。';
    expect(stripQuestionReadBack(reply, '我好攰')).toBe(reply);
    const en = 'That sounds exhausting. Drink some water and rest early.';
    expect(stripQuestionReadBack(en, 'I am so tired')).toBe(en);
  });

  it('never empties the reply', () => {
    expect(stripQuestionReadBack('你問我點解天空係藍色？', '點解天空係藍色？')).toBe('你問我點解天空係藍色？');
  });

  it('the prompts forbid a read-back (no "reflect/acknowledge then answer")', () => {
    expect(BASE_SYSTEM).toMatch(/LISTEN FIRST, ANSWER FIRST/i);
    expect(BASE_SYSTEM).toMatch(/[Nn]ever restate|[Nn]ever repeat[, ]+quote/);
    expect(BASE_SYSTEM).not.toMatch(/briefly reflect or acknowledge/i);
    expect(BASE_SYSTEM).not.toMatch(/answer comes first after a short ack/i);
  });

  it('the live streamed lead is never a read-back', () => {
    expect(panelSrc).toMatch(/m && !restatesUserMessage\(m\[0\], text\)/);
  });

  it('the chat pipeline strips the read-back before the reply is spoken', () => {
    const chat = readFileSync(join(web, 'lib/client-chat.ts'), 'utf8');
    expect(chat).toMatch(/stripQuestionReadBack\(capped, ctx\.lastUser\)/);
  });
});

describe('(c) one reply, one output sink', () => {
  beforeEach(() => resetDefaultSinkCacheForTests());

  it('every tier resolves to the same default sink id', async () => {
    // gTTS chunk, Edge mp3, OpenAI mp3 and the shared AudioContext all go
    // through the one resolver, so they all receive the SAME id — never '' for
    // one and a device id for another.
    const ids: string[] = [];
    const node = () => ({ setSinkId: (id: string) => { ids.push(id); return Promise.resolve(); } });
    await pinDefaultOutputAsync(node());
    await pinDefaultOutputAsync(node());
    await pinDefaultOutputAsync(node());
    await pinDefaultOutputAsync(node());
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe(getDefaultSinkId());
    expect(getDefaultSinkId() === '' || getDefaultSinkId() === 'default').toBe(true);
  });

  it('a comms-routed element is re-pinned to the same default id, not kept', async () => {
    const ids: string[] = [];
    await pinDefaultOutputAsync({
      sinkId: 'communications-headset-uuid',
      setSinkId: (id: string) => { ids.push(id); return Promise.resolve(); },
    });
    expect(ids).toEqual([getDefaultSinkId()]);
    expect(getDefaultSinkId()).not.toBe('communications-headset-uuid');
  });

  it('a partially heard line never hands its tail to the unpinnable browser voice', () => {
    // speechSynthesis has no setSinkId; under play-and-record Windows routes it
    // to the communications endpoint while pinned <audio> stays on default.
    expect(voiceSrc).toMatch(/if \(micCommsRoutingLatchActive\(\) \|\| !runSynthTail\(rest, settle\)\) settle\(\);/);
    // The whole-line synth tier still routes/ primes the default speaker first.
    expect(voiceSrc).toMatch(/const runSynth = [\s\S]{0,220}companionPlaybackSession\(\)/);
  });
});
