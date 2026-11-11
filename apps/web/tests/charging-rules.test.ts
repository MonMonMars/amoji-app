import { describe, expect, it } from 'vitest';
import {
  CHARGING_RULES,
  chargingRulesSnapshot,
  featureCostTurns,
  featureRequiresQuota,
  formatPlanPrice,
  freeDailyChatTurnLimit,
  plusDurationMs,
} from '../lib/charging-rules';
import { dailyTurnLimit } from '../lib/daily-quota';

describe('charging rules', () => {
  it('meters only LLM chat turns on the free plan', () => {
    expect(freeDailyChatTurnLimit()).toBe(40);
    expect(dailyTurnLimit()).toBe(40);
    expect(featureRequiresQuota('chat_llm_turn')).toBe(true);
    expect(featureCostTurns('chat_llm_turn')).toBe(1);
    for (const id of [
      'tts_free', 'poke', 'idle', 'game', 'crisis', 'music_local', 'sing_dance_local', 'setup', 'byok_brain',
    ] as const) {
      expect(featureRequiresQuota(id), id).toBe(false);
      expect(featureCostTurns(id), id).toBe(0);
    }
  });

  it('defines Plus catalog price and 30-day window', () => {
    expect(CHARGING_RULES.plans.plus.dailyChatTurns).toBeNull();
    expect(CHARGING_RULES.plans.plus.durationDays).toBe(30);
    expect(formatPlanPrice()).toBe('$4.99');
    expect(plusDurationMs()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('exposes a stable snapshot for Settings /systems', () => {
    const snap = chargingRulesSnapshot();
    expect(snap.version).toBe(1);
    expect(snap.gatedFeatures).toEqual(['chat_llm_turn']);
    expect(snap.freeFeatures).toContain('crisis');
    expect(snap.plusDisplayPrice).toBe('$4.99');
  });
});
