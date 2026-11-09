'use client';
// One-shot auditions for the TTS Lab panel — does not change chat pins
// except when the user is already previewing a shipping hop.

import { speakGtts, stopGtts, PITCH_BIAS_FEMALE } from './gtts';
import { speakEdge, stopEdge } from './edge-tts';
import { speakCantoNano } from './canto-nano';
import { edgeSampleText } from './voice-catalog';
import { stopSpeaking } from './voice';
import { TTS_LAB_ENGINES, type TtsLabEngine } from './tts-lab';
import type { Lang } from './prefs';

export type TtsLabAuditionResult =
  | { ok: true; engineId: string; via: string }
  | { ok: false; engineId: string; reason: string; demoUrl?: string };

function haltAll(): void {
  try { stopSpeaking(); } catch { /* ignore */ }
  try { stopGtts(); } catch { /* ignore */ }
  try { stopEdge(); } catch { /* ignore */ }
}

/**
 * Click-to-test one lab engine. Returns a structured result for the UI note.
 * External / gated engines do not auto-navigate — the panel opens the URL.
 */
export async function auditionTtsLabEngine(
  engineId: string,
  uiLang: Lang = 'yue',
): Promise<TtsLabAuditionResult> {
  const engine: TtsLabEngine | undefined = TTS_LAB_ENGINES.find((e) => e.id === engineId);
  if (!engine) return { ok: false, engineId, reason: 'unknown engine' };

  const sampleLang = engine.sampleLang;
  const text = edgeSampleText(sampleLang);
  void uiLang;

  if (engine.audition === 'external') {
    return {
      ok: false,
      engineId,
      reason: 'opens external demo — not bundled in this app yet',
      demoUrl: engine.demoUrl,
    };
  }
  if (engine.audition === 'gated') {
    return {
      ok: false,
      engineId,
      reason: 'needs a paid key / Pro path — kept as backup',
      demoUrl: engine.demoUrl,
    };
  }
  if (engine.audition === 'none') {
    return { ok: false, engineId, reason: 'not bundled — no play path in this build' };
  }

  haltAll();

  if (engine.audition === 'gtts') {
    try {
      await speakGtts(text, {
        lang: sampleLang,
        tl: sampleLang === 'zh' ? 'zh-CN' : sampleLang === 'en' ? 'en-US' : sampleLang,
        pitchBias: PITCH_BIAS_FEMALE,
      });
      return { ok: true, engineId, via: 'gtts' };
    } catch (e) {
      return { ok: false, engineId, reason: (e as Error)?.message ?? 'gtts failed' };
    }
  }

  if (engine.audition === 'edge') {
    try {
      await speakEdge(text, {
        lang: sampleLang,
        gender: 'female',
        forcePlain: true,
        expressiveness: 1.1,
      });
      return { ok: true, engineId, via: 'edge' };
    } catch (e) {
      return {
        ok: false,
        engineId,
        reason: (e as Error)?.message ?? 'edge refused (expected 403)',
      };
    }
  }

  if (engine.audition === 'synth') {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return { ok: false, engineId, reason: 'speechSynthesis not available' };
    }
    const { speechLocale } = await import('./speak-text');
    return new Promise<TtsLabAuditionResult>((resolve) => {
      let settled = false;
      const done = (result: TtsLabAuditionResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = speechLocale(sampleLang);
        u.rate = 1;
        u.pitch = 1;
        u.onstart = () => done({ ok: true, engineId, via: 'synth' });
        u.onerror = () => done({ ok: false, engineId, reason: 'OS utterance failed' });
        u.onend = () => done({ ok: true, engineId, via: 'synth' });
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        window.setTimeout(() => done({ ok: true, engineId, via: 'synth' }), 2500);
      } catch (e) {
        done({ ok: false, engineId, reason: (e as Error)?.message ?? 'synth failed' });
      }
    });
  }

  if (engine.audition === 'canto-nano') {
    try {
      await speakCantoNano(text);
      return { ok: true, engineId, via: 'canto-nano' };
    } catch (e) {
      return {
        ok: false,
        engineId,
        reason: (e as Error)?.message ?? 'canto-nano not bundled',
        demoUrl: engine.demoUrl,
      };
    }
  }

  return { ok: false, engineId, reason: 'no audition path' };
}
