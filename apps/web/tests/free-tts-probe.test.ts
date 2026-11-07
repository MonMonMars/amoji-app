import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { freeVoiceHops } from '../lib/tts-chain';
import { ENGINE_VERDICTS, engineStatus, hiddenEngines } from '../lib/voice-capability';

// Re-check cheaply what the live probe measured on 2026-11-08:
//   Edge WSS upgrade → 403 (with published TrustedClientToken)
//   gTTS yue MP3 → 200, PCM RMS ≈ 0.10 (non-silent)
//   Piper / Kokoro → not bundled; no keyless CORS yue host
//   StreamElements → English-only for anonymous speech (yue 401)
// This file pins the CODE conclusions; scripts/measure-gtts-rms.mjs remeasures RMS.

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('free TTS alternatives — only ship what is free, keyless, CORS-playable, yue-capable', () => {
  it('keeps the live chain as edge → gtts → synth', () => {
    expect(freeVoiceHops('yue')).toEqual(['edge', 'gtts', 'synth']);
  });

  it('marks Edge dead and gTTS as the working free engine', () => {
    expect(engineStatus('edge')).toBe('dead');
    expect(engineStatus('gtts')).toBe('works');
    expect(engineStatus('speech')).toBe('browser');
  });

  it('does not offer Piper or Kokoro as buttons (no keyless yue CORS path)', () => {
    expect(engineStatus('piper')).toBe('not-bundled');
    expect(engineStatus('kokoro')).toBe('not-bundled');
    const hidden = hiddenEngines().map((v) => v.engine);
    expect(hidden).toEqual(expect.arrayContaining(['piper', 'kokoro', 'edge', 'canto-nano']));
  });

  it('documents why Web Audio formant is not applied to gTTS MP3', () => {
    const timbre = read('lib/gtts-timbre.ts');
    const gtts = read('lib/gtts.ts');
    expect(timbre).toMatch(/Access-Control-Allow-Origin|ACAO/);
    expect(timbre).toMatch(/MediaElementSource|decodeAudioData/);
    expect(gtts).toMatch(/Cross-Origin-Resource-Policy|ACAO/);
    expect(gtts).not.toContain('crossOrigin');
  });

  it('records that Piper/Kokoro have no verified free yue path in the verdict', () => {
    const piper = ENGINE_VERDICTS.find((v) => v.engine === 'piper');
    const kokoro = ENGINE_VERDICTS.find((v) => v.engine === 'kokoro');
    expect(piper?.evidence).toMatch(/Cantonese|yue/i);
    expect(kokoro?.evidence).toMatch(/yue/i);
    expect(piper?.locales).not.toContain('yue');
    expect(kokoro?.locales).not.toContain('yue');
  });
});
