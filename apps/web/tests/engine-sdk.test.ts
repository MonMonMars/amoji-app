// r2026-10-06.127: @amoji/engine umbrella — one attach(), four channels.
// Licensee's AI stays the brain; Amoji routes emotion-synced face + body +
// voice. Covers: routing, personality reactions, idle autonomy, prosody,
// gait hints, the .aigf companion bridge and the tiny event bus.
import { describe, expect, it, vi } from 'vitest';
import { Amoji } from '../../../packages/engine/src/amoji';
import {
  NullBodyDriver, NullVoiceDriver, prosodyForEmotion, gaitHintForEmotion,
} from '../../../packages/engine/src/drivers';
import { parseAigf, characterFromAigf, loadAigfCharacter } from '../../../packages/engine/src/aigf';
import { SEED_CHARACTERS, pickWeighted } from '../../../packages/engine/src/characters';

const faceMock = () => ({ say: vi.fn(), setEmotion: vi.fn(), start: vi.fn(), stop: vi.fn() });
const voiceMock = () => ({ speak: vi.fn() });
const bodyMock = () => ({ setPosture: vi.fn(), gesture: vi.fn() });

const AIGF = JSON.stringify({
  format: 'amoji-companion', version: 1, exportedAt: '2026-10-06T00:00:00Z', app: 'Amoji test',
  identity: { characterId: 'juno', name: 'Juno', gender: 'female', persona: 'cheerful and sunny', catchphrase: ['Catch you later!'] },
  appearance: { accentColor: '#8ef', backgroundId: 'beach', modelHint: '' },
  voice: { engineConfig: {}, lang: 'yue' },
  human: { name: 'Simon' },
  memory: { diary: [] },
  history: [{ role: 'user', text: 'hi' }],
  settings: { kidMode: false },
});

describe('@amoji/engine — attach & routing', () => {
  it('defaults to the sunny companion with null drivers', () => {
    const a = Amoji.attach();
    expect(a.character.id).toBe('sunny-companion');
    expect(a.body).toBeInstanceOf(NullBodyDriver);
    expect(a.voice).toBeInstanceOf(NullVoiceDriver);
    expect(() => a.say('hello')).not.toThrow();
  });

  it('rejects an unknown seed character id with a readable error', () => {
    expect(() => Amoji.attach({ character: 'nope' })).toThrow(/unknown character/);
  });

  it('say() routes the top lexicon emotion to every channel', () => {
    const face = faceMock(); const voice = voiceMock(); const body = bodyMock();
    const a = Amoji.attach({ face, voice, body });
    const r = a.say('I love you');
    expect(r.emotion).toBe('love');
    expect(face.say).toHaveBeenCalledWith('I love you');
    expect(face.setEmotion).toHaveBeenCalledWith('love', r.intensity);
    expect(body.setPosture).toHaveBeenCalledWith('love', r.intensity);
    expect(voice.speak).toHaveBeenCalledTimes(1);
    const prosody = voice.speak.mock.calls[0]![1];
    expect(prosody.energy).toBeLessThan(1); // love = soft & warm
  });

  it('say() with no emotional text falls back to a pleasant default', () => {
    const a = Amoji.attach();
    expect(a.say('The weather report says 24 degrees').emotion).toBe('contentment');
  });

  it('setEmotion() drives face + body without touching voice', () => {
    const face = faceMock(); const voice = voiceMock(); const body = bodyMock();
    const a = Amoji.attach({ face, voice, body });
    a.setEmotion('anger', 1);
    expect(face.setEmotion).toHaveBeenCalledWith('anger', 1);
    expect(body.setPosture).toHaveBeenCalledWith('anger', 1);
    expect(voice.speak).not.toHaveBeenCalled();
    expect(a.currentEmotion).toBe('anger');
  });
});

describe('@amoji/engine — personality reactions', () => {
  it('poke: body gesture + user.poke event + a personality reaction line', () => {
    const body = bodyMock();
    const a = Amoji.attach({ body, voice: voiceMock(), rng: () => 0 });
    const events: string[] = [];
    a.on('user.poke', () => events.push('poke'));
    const r = a.react('poke');
    expect(body.gesture).toHaveBeenCalledWith('poke');
    expect(events).toEqual(['poke']);
    expect(r).toBeDefined();
    expect(SEED_CHARACTERS['sunny-companion']!.pokeReactions).toContain(r!.text);
  });

  it('greet: returns a language-matched greeting with the character name', () => {
    const a = Amoji.attach({ character: 'calm-companion', voice: voiceMock() });
    const r = a.react('greet');
    expect(r!.text).toContain('Still');
    // zh-language character greets in Mandarin
    const zh = Amoji.attach({ character: { ...SEED_CHARACTERS['calm-companion']!, language: 'zh' } });
    expect(zh.greeting()).toContain('你好');
  });
});

describe('@amoji/engine — idle autonomy', () => {
  it('idleTick picks from the character idle emotions (deterministic rng)', () => {
    const a = Amoji.attach({ rng: () => 0 });
    const id = a.idleTick();
    expect(a.character.idleEmotions.map((e) => e.id)).toContain(id);
  });

  it('idleTick feeds the dynamics engine; idle flag rises after quiet time', () => {
    const a = Amoji.attach({ rng: () => 0, seed: 7 });
    a.idleTick();
    const frame = a.engine.tick(100);
    expect(frame.idle).toBe(false); // just spoke — not idle yet
    expect(Number.isFinite(frame.valence)).toBe(true);
    expect(Number.isFinite(frame.face.mouthSmile)).toBe(true);
    const later = a.engine.tick(100_000); // long quiet stretch
    expect(later.idle).toBe(true);
  });

  it('start/stop is safe with no face and idleMs 0 disables the loop', () => {
    const a = Amoji.attach({ idleMs: 0 });
    expect(() => { a.start(); a.stop(); }).not.toThrow();
  });
});

describe('@amoji/engine — event bus', () => {
  it('emits to subscribers and survives a throwing listener', () => {
    const a = Amoji.attach();
    const good = vi.fn();
    a.on('said', () => { throw new Error('boom'); });
    a.on('said', good);
    a.say('so happy!');
    expect(good).toHaveBeenCalledTimes(1);
    const extra = vi.fn();
    const unsub = a.on('said', extra);
    unsub();
    a.say('so happy!');
    expect(good).toHaveBeenCalledTimes(2);
    expect(extra).not.toHaveBeenCalled();
  });
});

describe('@amoji/engine — prosody & gait hints', () => {
  it('prosody: sadness slows and drops, excitement lifts, intensity 0 is neutral', () => {
    const sad = prosodyForEmotion('sadness', 1);
    expect(sad.rate).toBeLessThan(1);
    expect(sad.pitch).toBeLessThan(1);
    const exc = prosodyForEmotion('excitement', 1);
    expect(exc.pitch).toBeGreaterThan(1);
    expect(prosodyForEmotion('joy', 0)).toEqual({ rate: 1, pitch: 1, energy: 1 });
  });

  it('gait: joy bounces, sadness lowers the head, unknown is neutral', () => {
    expect(gaitHintForEmotion('joy', 1).bounce).toBeGreaterThan(1);
    expect(gaitHintForEmotion('sadness', 1).headPitchDeg).toBeLessThan(0);
    expect(gaitHintForEmotion('blorp')).toEqual({ bounce: 1, tempo: 1, headPitchDeg: 0 });
  });
});

describe('@amoji/engine — .aigf companion bridge', () => {
  it('parses a valid card and rejects malformed ones with readable reasons', () => {
    expect(parseAigf(AIGF).identity.name).toBe('Juno');
    expect(() => parseAigf('not json')).toThrow(/not JSON/);
    expect(() => parseAigf('{}')).toThrow(/wrong format/);
    expect(() => parseAigf(JSON.stringify({ format: 'amoji-companion', version: 99, identity: { characterId: 'x' }, history: [] }))).toThrow(/unsupported version/);
    expect(() => parseAigf(JSON.stringify({ format: 'amoji-companion', version: 1, history: [] }))).toThrow(/missing identity/);
  });

  it('characterFromAigf folds the card into a runnable character config', () => {
    const c = characterFromAigf(parseAigf(AIGF));
    expect(c.id).toBe('aigf:juno');
    expect(c.name).toBe('Juno');
    expect(c.language).toBe('yue');
    expect(c.cheerfulness).toBeGreaterThan(0.5); // 'cheerful and sunny' persona
    expect(c.pokeReactions).toContain('Catch you later!');
  });

  it('attach({ aigf }) loads the companion soul as the robot character', () => {
    const a = Amoji.attach({ aigf: AIGF });
    expect(a.character.id).toBe('aigf:juno');
    expect(a.character.name).toBe('Juno');
    expect(loadAigfCharacter(AIGF).language).toBe('yue');
  });
});

describe('@amoji/engine — helpers', () => {
  it('pickWeighted handles empty lists and honors weights', () => {
    expect(pickWeighted([])).toBeUndefined();
    expect(pickWeighted([{ id: 'a', weight: 0 }, { id: 'b', weight: 0 }])).toBeUndefined();
    expect(pickWeighted([{ id: 'a', weight: 1 }, { id: 'b', weight: 99 }], () => 0.999)).toBe('b');
    expect(pickWeighted([{ id: 'a', weight: 1 }, { id: 'b', weight: 99 }], () => 0)).toBe('a');
  });
});
