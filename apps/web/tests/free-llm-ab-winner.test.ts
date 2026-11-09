import { describe, expect, it } from 'vitest';
import { OVH_MODEL, OVH_MODELS } from '../lib/client-chat';

/**
 * Locks the 2026-11-09 free-LLM A/B selection:
 * speed + language + reason + $0 price → Meta-Llama-3_3-70B-Instruct.
 */
describe('free LLM A/B winner', () => {
  it('selects OVH Meta-Llama-3_3-70B as primary free brain', () => {
    expect(OVH_MODEL).toBe('Meta-Llama-3_3-70B-Instruct');
    expect(OVH_MODELS[0]).toBe('Meta-Llama-3_3-70B-Instruct');
  });

  it('keeps Qwen then Mistral as rotate siblings (not gpt-oss)', () => {
    expect([...OVH_MODELS]).toEqual([
      'Meta-Llama-3_3-70B-Instruct',
      'Qwen2.5-VL-72B-Instruct',
      'Mistral-Small-3.2-24B-Instruct-2506',
    ]);
  });
});
