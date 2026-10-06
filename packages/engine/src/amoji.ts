// ─────────────────────────────────────────────────────────────────────────────
// @amoji/engine — the umbrella. One attach(), four channels:
//
//   const amoji = Amoji.attach({
//     face:   new AmojiFace({ driver: new UnitreeDriver(robotIp) }),
//     body:   myUnitreeBodyAdapter,        // optional — intent-only
//     voice:  myTtsBridge,                 // optional — prosody colored
//     character: 'sunny-companion',        // or a CharacterConfig, or aigf text
//   });
//   amoji.say('任務完成！我好開心呀！');   // face + body + voice, emotion-synced
//
// The licensee's AI stays the brain. Amoji is the face, body language and
// voice color — the presentation layer.
// ─────────────────────────────────────────────────────────────────────────────

import { analyzeText, EmotionEngine } from '@amoji/emotion-core';
import type { EmotionId } from '@amoji/emotion-core';
import { characterById, pickWeighted, SEED_CHARACTERS } from './characters';
import type { CharacterConfig } from './characters';
import { gaitHintForEmotion, NullBodyDriver, NullVoiceDriver, prosodyForEmotion } from './drivers';
import type { BodyDriver, FaceHandle, VoiceDriver } from './drivers';
import { loadAigfCharacter } from './aigf';

export interface AmojiOptions {
  /** monitor canvas / LED-matrix face — anything with say/setEmotion */
  face?: FaceHandle;
  /** posture + gesture intent channel (optional; NullBodyDriver if absent) */
  body?: BodyDriver;
  /** TTS channel — receives prosody-colored speak() calls (optional) */
  voice?: VoiceDriver;
  /** seed character id, custom CharacterConfig, or raw .aigf JSON text */
  character?: string | CharacterConfig;
  /** raw .aigf companion card JSON — overrides `character` when present */
  aigf?: string;
  /** how often the idle loop nudges an idle emotion, ms (0 = disable) */
  idleMs?: number;
  /** deterministic seed for the emotion dynamics (tests / reproducibility) */
  seed?: number;
  /** rng override for idle picks (tests) */
  rng?: () => number;
}

export interface SaidResult {
  text: string;
  emotion: string;
  intensity: number;
}

type EventHandler = (payload?: unknown) => void;

const KNOWN_IDS = new Set<string>([
  'joy','sadness','anger','fear','disgust','surprise','neutral','love',
  'embarrassment','pride','shame','excitement','contentment','boredom',
  'confusion','jealousy','guilt','relief','contempt',
]);

export class Amoji {
  readonly engine: EmotionEngine;
  readonly character: CharacterConfig;
  private face?: FaceHandle;
  /** attached channels — readonly, for licensee introspection */
  readonly body: BodyDriver;
  readonly voice: VoiceDriver;
  private idleMs: number;
  private rng: () => number;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private lastEmotion = 'neutral';

  /** three lines from zero to a robot that smiles */
  static attach(opts: AmojiOptions = {}): Amoji {
    return new Amoji(opts);
  }

  constructor(opts: AmojiOptions = {}) {
    this.character = Amoji.resolveCharacter(opts);
    this.engine = new EmotionEngine({}, opts.seed ?? 1);
    if (opts.face) this.face = opts.face;
    this.body = opts.body ?? new NullBodyDriver();
    this.voice = opts.voice ?? new NullVoiceDriver();
    this.idleMs = opts.idleMs ?? 7000;
    this.rng = opts.rng ?? Math.random;
  }

  private static resolveCharacter(opts: AmojiOptions): CharacterConfig {
    if (typeof opts.aigf === 'string' && opts.aigf.length > 0) return loadAigfCharacter(opts.aigf);
    const c = opts.character;
    if (typeof c === 'string') {
      const seed = characterById(c);
      if (!seed) throw new Error(`unknown character "${c}" — available: ${Object.keys(SEED_CHARACTERS).join(', ')} (or pass a CharacterConfig / aigf)`);
      return seed;
    }
    if (c && typeof c === 'object') return c;
    return SEED_CHARACTERS['sunny-companion']!;
  }

  get currentEmotion(): string {
    return this.lastEmotion;
  }

  // ── channels ───────────────────────────────────────────────────────────────

  /** Say something: emotion-analyzed, then routed to every attached channel. */
  say(text: string): SaidResult {
    const hints = analyzeText(text);
    const top = Object.entries(hints).sort((a, b) => b[1] - a[1])[0];
    const emotion = top?.[0] && KNOWN_IDS.has(top[0]) ? top[0] : this.pickPleasantDefault();
    const intensity = top?.[1] ?? 0.5;
    this.drive(emotion, intensity);
    this.face?.say?.(text);
    this.face?.setEmotion?.(emotion, intensity);
    this.voice.speak(text, prosodyForEmotion(emotion, intensity));
    const result: SaidResult = { text, emotion, intensity };
    this.emit('said', result);
    return result;
  }

  /** Drive a raw emotion directly — no text, no LLM required. Works offline. */
  setEmotion(emotion: string, intensity = 1): void {
    this.drive(emotion, intensity);
    this.face?.setEmotion?.(emotion, intensity);
  }

  /** Personality-driven reaction. Currently: 'poke' | 'greet' | 'praise'. */
  react(kind: string): SaidResult | undefined {
    this.body.gesture(kind);
    this.emit(`react:${kind}`);
    if (kind === 'poke') this.emit('user.poke');
    if (kind === 'poke' && this.character.pokeReactions.length > 0) {
      const line = this.character.pokeReactions[Math.floor(this.rng() * this.character.pokeReactions.length)]!;
      return this.say(line);
    }
    if (kind === 'greet') return this.say(this.greeting());
    return undefined;
  }

  /** short, cheerful, character-flavored greeting */
  greeting(): string {
    const n = this.character.name;
    switch (this.character.language) {
      case 'yue': return `你好呀！我係${n}，見到你真係好開心！`;
      case 'zh': return `你好呀！我是${n}，见到你真开心！`;
      case 'ja': return `こんにちは！${n}だよ。会えて嬉しい！`;
      default: return `Hey! I'm ${n} — so happy to see you!`;
    }
  }

  // ── idle autonomy ──────────────────────────────────────────────────────────

  /** start the idle loop — the robot never looks switched off */
  start(): void {
    this.face?.start?.();
    if (this.idleMs > 0 && this.idleTimer === null) {
      this.idleTimer = setInterval(() => this.idleTick(), this.idleMs);
    }
  }

  stop(): void {
    this.face?.stop?.();
    if (this.idleTimer !== null) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /** one idle beat: pick a personality-weighted idle emotion, nudge everything */
  idleTick(): string | undefined {
    // cheerfulness biases the weights toward pleasant states
    const bias = (id: string, w: number): number => {
      const pleasant = ['joy', 'contentment', 'love', 'excitement', 'relief', 'pride'].includes(id);
      const gloomy = ['sadness', 'boredom', 'contempt'].includes(id);
      let out = w;
      if (pleasant) out *= 1 + Math.max(0, this.character.cheerfulness);
      if (gloomy) out *= 1 + Math.max(0, -this.character.cheerfulness);
      if (id === 'excitement') out *= 1 + Math.max(0, this.character.energy);
      if (id === 'contentment' || id === 'boredom') out *= 1 + Math.max(0, -this.character.energy);
      return out;
    };
    const weighted = this.character.idleEmotions.map((e) => ({ id: e.id, weight: bias(e.id, e.weight) }));
    const id = pickWeighted(weighted, this.rng);
    if (!id) return undefined;
    const known = KNOWN_IDS.has(id) ? id as EmotionId : 'contentment';
    this.engine.update({ llmTags: { [known]: 0.5 } });
    this.setEmotion(known, 0.5);
    // optional ambient chatter line
    if (this.character.idleChatter.length > 0 && this.rng() < 0.35) {
      const line = this.character.idleChatter[Math.floor(this.rng() * this.character.idleChatter.length)]!;
      this.voice.speak(line, prosodyForEmotion(known, 0.5));
    }
    this.emit('idle', { emotion: known });
    return known;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /** push an emotion into the dynamics engine + body channel (not the face —
   *  face display has its own easing via the robot-face package) */
  private drive(emotion: string, intensity: number): void {
    this.lastEmotion = emotion;
    const known = KNOWN_IDS.has(emotion) ? emotion as EmotionId : 'neutral';
    this.engine.update({ llmTags: { [known]: Math.min(1, Math.max(0, intensity)) } });
    this.body.setPosture(emotion, intensity);
    this.emit('gait', gaitHintForEmotion(emotion, intensity));
  }

  /** pleasant fallback when the lexicon finds nothing — companions cheer you up */
  private pickPleasantDefault(): string {
    return this.character.cheerfulness >= 0 ? 'contentment' : 'neutral';
  }

  // ── tiny event bus ─────────────────────────────────────────────────────────

  on(event: string, handler: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) { set = new Set(); this.handlers.set(event, set); }
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of set) {
      try { h(payload); } catch { /* listener fault — never break the loop */ }
    }
  }
}
