import { describe, expect, it } from 'vitest';
import { OVH_MODEL, OVH_MODELS, preferOvhModels } from '../lib/client-chat';

/**
 * Locks the 2026-11-09 multi-language free-LLM A/B catalog.
 * Default companion primary is Qwen; live/story/reason reshuffle via preferOvhModels.
 */
describe('free LLM A/B winner', () => {
  it('selects OVH Qwen2.5-VL-72B as default companion primary', () => {
    expect(OVH_MODEL).toBe('Qwen2.5-VL-72B-Instruct');
    expect(OVH_MODELS[0]).toBe('Qwen2.5-VL-72B-Instruct');
    expect(preferOvhModels('companion')[0]).toBe(OVH_MODEL);
  });

  it('keeps Mistral then Llama as rotate siblings (not gpt-oss)', () => {
    expect([...OVH_MODELS]).toEqual([
      'Qwen2.5-VL-72B-Instruct',
      'Mistral-Small-3.2-24B-Instruct-2506',
      'Meta-Llama-3_3-70B-Instruct',
    ]);
  });
});
