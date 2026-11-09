import { describe, expect, it } from 'vitest';
import { OVH_MODEL, OVH_MODELS, preferOvhForCharacter, preferOvhModels } from '../lib/client-chat';

/**
 * Locks the 2026-11-09 multi-language free-LLM A/B catalog.
 * Characters pick a home model; conversations stick; failover walks siblings.
 */
describe('free LLM A/B winner', () => {
  it('keeps Qwen as catalog default (no-character fallback)', () => {
    expect(OVH_MODEL).toBe('Qwen2.5-VL-72B-Instruct');
    expect(OVH_MODELS[0]).toBe('Qwen2.5-VL-72B-Instruct');
    expect(preferOvhModels({ characterId: 'default' })[0]).toBe(preferOvhForCharacter('default'));
  });

  it('keeps Mistral then Llama as rotate siblings (not gpt-oss)', () => {
    expect([...OVH_MODELS]).toEqual([
      'Qwen2.5-VL-72B-Instruct',
      'Mistral-Small-3.2-24B-Instruct-2506',
      'Meta-Llama-3_3-70B-Instruct',
    ]);
  });
});
