/**
 * Server copy of charging rules — keep aligned with
 * apps/web/lib/charging-rules.ts (same numbers, same free vs gated features).
 */

export interface ChargingRulesConfig {
  version: number;
  unit: 'chat_turn';
  reset: 'utc-midnight';
  plans: {
    free: {
      id: 'free';
      dailyChatTurns: number;
      displayPriceCents: number;
      displayCurrency: 'USD';
      durationDays: null;
      summary: string;
    };
    plus: {
      id: 'plus';
      dailyChatTurns: null;
      displayPriceCents: number;
      displayCurrency: 'USD';
      durationDays: number;
      summary: string;
    };
  };
  gatedFeatures: readonly string[];
  freeFeatures: readonly string[];
}

export const CHARGING_RULES: ChargingRulesConfig = {
  version: 1,
  unit: 'chat_turn',
  reset: 'utc-midnight',
  plans: {
    free: {
      id: 'free',
      dailyChatTurns: 40,
      displayPriceCents: 0,
      displayCurrency: 'USD',
      durationDays: null,
      summary: '40 LLM chat turns per UTC day on this device. Voice, poke, idle, games, and crisis stay free.',
    },
    plus: {
      id: 'plus',
      dailyChatTurns: null,
      displayPriceCents: 499,
      displayCurrency: 'USD',
      durationDays: 30,
      summary: 'Unlimited LLM chat turns for 30 days after verified payment (or labeled demo unlock).',
    },
  },
  gatedFeatures: ['chat_llm_turn'],
  freeFeatures: [
    'tts_free',
    'tts_byok',
    'poke',
    'idle',
    'game',
    'crisis',
    'music_local',
    'sing_dance_local',
    'setup',
    'byok_brain',
  ],
};

export function plusDurationMs(): number {
  return (CHARGING_RULES.plans.plus.durationDays || 30) * 24 * 60 * 60 * 1000;
}

export function freeDailyChatTurnLimit(): number {
  return CHARGING_RULES.plans.free.dailyChatTurns;
}
