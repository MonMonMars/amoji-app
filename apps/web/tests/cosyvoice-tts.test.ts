import { afterEach, describe, expect, it } from 'vitest';
import {
  COSYVOICE_SFT_SAMPLE_RATE_HZ,
  cosyvoiceActive,
  cosyvoiceEndpoint,
  cosyvoiceInferenceUrl,
  cosyvoiceSpeaker,
  experimentalCosyvoiceEnabled,
  planCosyvoiceRequest,
  setCosyvoiceEndpoint,
  setExperimentalCosyvoiceEnabled,
  wrapPcm16Wav,
} from '../lib/cosyvoice-tts';
import { formatVoiceChain, freeVoiceHops } from '../lib/tts-chain';

function swapLs(): () => void {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return () => { g.localStorage = prev; };
}

describe('CosyVoice experiment', () => {
  let restore = () => {};
  const prevUrl = process.env.NEXT_PUBLIC_COSYVOICE_URL;

  afterEach(() => {
    restore();
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_COSYVOICE_URL;
    else process.env.NEXT_PUBLIC_COSYVOICE_URL = prevUrl;
  });

  it('stays off the live chain until the flag and a URL are both set', () => {
    restore = swapLs();
    expect(experimentalCosyvoiceEnabled()).toBe(false);
    expect(cosyvoiceActive()).toBe(false);
    expect(freeVoiceHops('yue')).toEqual(['edge', 'synth']);
    expect(freeVoiceHops('en', { cosyvoice: cosyvoiceActive() })).toEqual(['edge', 'synth']);

    setCosyvoiceEndpoint('http://127.0.0.1:50000');
    expect(cosyvoiceActive()).toBe(false);
    expect(formatVoiceChain(freeVoiceHops('yue', { cosyvoice: false }))).toBe('edge→synth');

    setExperimentalCosyvoiceEnabled(true);
    expect(cosyvoiceActive()).toBe(true);
    expect(freeVoiceHops('zh', { cosyvoice: true })).toEqual(['cosyvoice', 'edge', 'synth']);
    expect(formatVoiceChain(freeVoiceHops('yue', { cosyvoice: true, cantoNano: true }), 'openai'))
      .toBe('openai→cosyvoice→edge→synth→canto-nano');
  });

  it('lets a cleared URL override a build-time env endpoint', () => {
    restore = swapLs();
    process.env.NEXT_PUBLIC_COSYVOICE_URL = 'http://env.example:50000/';
    expect(cosyvoiceEndpoint()).toBe('http://env.example:50000');
    setExperimentalCosyvoiceEnabled(true);
    expect(cosyvoiceActive()).toBe(true);
    setCosyvoiceEndpoint('');
    expect(cosyvoiceEndpoint()).toBe('');
    expect(cosyvoiceActive()).toBe(false);
  });

  it('maps SFT speakers and refuses the gaps', () => {
    expect(cosyvoiceSpeaker('yue', 'female')).toBe('粤语女');
    expect(cosyvoiceSpeaker('yue', 'male')).toBeNull();
    expect(cosyvoiceSpeaker('ja', 'female')).toBeNull();
    expect(cosyvoiceSpeaker('ja', 'male')).toBe('日语男');
    expect(cosyvoiceSpeaker('zh', 'male')).toBe('中文男');
    expect(cosyvoiceSpeaker('en', 'female')).toBe('英文女');

    expect(planCosyvoiceRequest('  你好  ', 'zh', 'female', 'http://127.0.0.1:50000/')).toEqual({
      ok: true,
      url: 'http://127.0.0.1:50000/inference_sft',
      fields: { tts_text: '你好', spk_id: '中文女' },
    });
    expect(cosyvoiceInferenceUrl('http://127.0.0.1:50000/inference_sft')).toBe('http://127.0.0.1:50000/inference_sft');
    const missing = planCosyvoiceRequest('喂', 'yue', 'male', 'http://127.0.0.1:50000');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toContain('yue/male');
  });

  it('wraps int16 PCM as a mono WAV at the 300M-SFT rate', () => {
    const pcm = new Uint8Array([1, 2, 3, 4, 5]);
    const wav = wrapPcm16Wav(pcm, COSYVOICE_SFT_SAMPLE_RATE_HZ);
    expect(wav.byteLength).toBe(48);
    expect(String.fromCharCode(...wav.subarray(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.subarray(8, 12))).toBe('WAVE');
    const view = new DataView(wav.buffer);
    expect(view.getUint32(4, true)).toBe(40);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint32(40, true)).toBe(4);
    expect([...wav.subarray(44)]).toEqual([1, 2, 3, 4]);
  });
});
