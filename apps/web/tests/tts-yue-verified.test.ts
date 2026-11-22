import { describe, expect, it } from 'vitest';
import { TTS_APP_PICKS, ttsAppPicksForLocale } from '../lib/tts-app-picks';

/**
 * Cantonese (yue) coverage guard — r283.
 *
 * The 218-row keep/delete catalogue tags voices by `locales`. That tag is
 * authored data, so it can drift away from what an engine can actually speak.
 * A Mandarin-only model silently counted as Cantonese coverage is a product
 * bug, not cosmetics: the rule is "all languages/genders speak — not
 * Yue-female-only".
 *
 * This test pins an explicit allowlist. A new row may only carry `yue` if it
 * is added here with evidence (official language table / dialect tag /
 * dialect checkpoint), and the comment must name that evidence.
 *
 * Verified 2026-11-22 against vendor documentation.
 */
const YUE_VERIFIED: ReadonlySet<string> = new Set([
  // Edge TTS — the only three zh-HK Edge voices.
  'TTS-001', // zh-HK-WanLungNeural
  'TTS-002', // zh-HK-HiuMaanNeural
  'TTS-003', // zh-HK-HiuGaaiNeural

  // Purpose-built Cantonese models.
  'TTS-007', // hon9kon9ize Bert-VITS2 Cantonese
  'TTS-008', // alvanlii/canto-llasa-1b
  'TTS-009', // canto-tts-nano
  'TTS-010', // Cantonese TTS (cantonese-dev)
  'TTS-011', // CosyVoice2-Yue / ZoengJyutGaai
  'TTS-012', // Ekho — Cantonese-capable HK engine
  'TTS-014', // JyutVoice / CanTTSo
  'TTS-015', // Kitten-TTS 2 Hong Kong Cantonese QAT
  'TTS-016', // Llasa-1B-Yue (WenetSpeech-Yue)
  'TTS-020', // jmtl HK Cantonese CC0 Qwen3-TTS LoRA
  'TTS-021', // Sambert-HifiGAN jiajia Cantonese
  'TTS-024', // xiaomaiiwn VITS Cantonese
  'TTS-026', // XWX_tts — yue_en (粤语+英语) melotts model

  // Multilingual models with documented Cantonese support.
  'TTS-004', // CosyVoice 3 — 18 Chinese dialects incl. 广东话
  'TTS-005', // Ming-3.0-tts — DIALECT task, dialect: cantonese
  'TTS-006', // Audio8-TTS-Realistic-Air — 23 langs incl. Cantonese (quality caveat)
  'TTS-017', // M5-TTS — --lang Chinese --accent yue
  'TTS-018', // MOSS-TTS-Local-Transformer-v1.5 — yue in official language table
  'TTS-019', // MOSS-TTS-v1.5 — yue in official language table
  'TTS-022', // SoulX-Podcast — -dialect checkpoint, <|Yue|> prefix
  'TTS-023', // Step-Audio-EditX — [Cantonese] tag
  'TTS-025', // VoxCPM2 — 9 Chinese dialects incl. 粤语
]);

describe('yue locale tag is verified, not assumed', () => {
  it('every yue-tagged row is on the verified allowlist', () => {
    const yueRows = ttsAppPicksForLocale('yue');
    const unverified = yueRows
      .map((row) => row.id)
      .filter((id) => !YUE_VERIFIED.has(id));

    expect(unverified).toEqual([]);
  });

  it('keeps every verified row tagged — no silent coverage loss', () => {
    const tagged = new Set(ttsAppPicksForLocale('yue').map((row) => row.id));
    const dropped = [...YUE_VERIFIED].filter((id) => !tagged.has(id));

    expect(dropped).toEqual([]);
  });

  it('does not tag a Mandarin-only engine as Cantonese', () => {
    // zai-org/GLM-TTS issue #8: 粤语 support 不太好; maintainer — 多方言 presently still training.
    const glm = TTS_APP_PICKS.find((row) => row.id === 'TTS-013');

    expect(glm).toBeDefined();
    expect(glm?.name).toContain('GLM-TTS');
    expect(glm?.locales).not.toContain('yue');
    expect(glm?.locales).toContain('zh');
  });

  it('retains the three Edge Cantonese voices as the speaking floor', () => {
    const edgeYue = ttsAppPicksForLocale('yue').filter((row) => row.kind === 'edge');
    const edgeYueIds = edgeYue.map((row) => row.id);

    expect(edgeYueIds).toEqual(['TTS-001', 'TTS-002', 'TTS-003']);
    // Both genders must remain available — not Yue-female-only.
    expect(edgeYue.some((row) => row.gender === 'M')).toBe(true);
    expect(edgeYue.some((row) => row.gender === 'F')).toBe(true);
  });

  it('preferred defaults are all speakable (edge), never link-only', () => {
    const preferred = TTS_APP_PICKS.filter((row) => row.preferred);

    expect(preferred.length).toBeGreaterThan(0);
    expect(preferred.filter((row) => row.kind !== 'edge')).toEqual([]);
  });
});
