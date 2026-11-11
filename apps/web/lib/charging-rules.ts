/**
 * Data-driven charging rules for Amoji.
 *
 * Product intent (DimDik Phase 0 + systems pack #335):
 * - Free plan meters **LLM chat turns only** (device-local, UTC day).
 * - TTS (free engines), poke, idle, games, crisis, local music/sing/dance,
 *   and setup never consume the daily turn budget.
 * - Plus unlocks unlimited chat turns for a fixed window after verified payment
 *   (or labeled demo unlock). Display price is informational; Stripe owns the
 *   live charge amount when secrets are configured.
 */

export type ChargeFeatureId =
  | 'chat_llm_turn'
  | 'tts_free'
  | 'tts_byok'
  | 'poke'
  | 'idle'
  | 'game'
  | 'crisis'
  | 'music_local'
  | 'sing_dance_local'
  | 'setup'
  | 'byok_brain';

export interface FeatureChargeRule {
  id: ChargeFeatureId;
  /** Turns deducted from the free daily budget when this feature runs. */
  costTurns: number;
  /** When true, free plan must have remaining turns (or Plus) before running. */
  gatedByDailyQuota: boolean;
  /** Short English label for Settings /systems. */
  label: string;
  notes?: string;
}

export interface PlanChargeRule {
  id: 'free' | 'plus';
  /** null = unlimited */
  dailyChatTurns: number | null;
  /** Display-only catalog price for Plus (cents). Live Stripe link/price wins. */
  displayPriceCents: number | null;
  displayCurrency: 'USD' | 'HKD' | 'JPY' | 'CNY';
  /** Plus entitlement length after a verified checkout (days). */
  durationDays: number | null;
  summary: string;
}

export interface ChargingRulesConfig {
  version: number;
  /** Unit name shown in UI (not a separate coin wallet). */
  unit: 'chat_turn';
  reset: 'utc-midnight';
  plans: {
    free: PlanChargeRule;
    plus: PlanChargeRule;
  };
  features: readonly FeatureChargeRule[];
}

/** Single source of truth — keep server/backend/src/charging-rules.ts aligned. */
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
  features: [
    {
      id: 'chat_llm_turn',
      costTurns: 1,
      gatedByDailyQuota: true,
      label: 'LLM chat turn',
      notes: 'Only the normal ChatPanel LLM path calls consumeChatTurn().',
    },
    {
      id: 'tts_free',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Free TTS (Edge / gTTS / synth)',
    },
    {
      id: 'tts_byok',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'BYOK TTS (user key)',
      notes: 'Billed by the user’s own provider, never by Amoji turns.',
    },
    {
      id: 'poke',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Poke / touch reactions',
    },
    {
      id: 'idle',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Idle motion / chatter',
    },
    {
      id: 'game',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Mini-games',
    },
    {
      id: 'crisis',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Crisis / helpline path',
      notes: 'Always free; never blocked by quota.',
    },
    {
      id: 'music_local',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Local / Mixkit music beds',
    },
    {
      id: 'sing_dance_local',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Sing / dance local clips',
    },
    {
      id: 'setup',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Setup / onboarding',
    },
    {
      id: 'byok_brain',
      costTurns: 0,
      gatedByDailyQuota: false,
      label: 'Advanced brain (BYOK)',
      notes: 'Uses the user’s key; does not consume the free daily turn budget.',
    },
  ],
} as const;

export function freeDailyChatTurnLimit(): number {
  return CHARGING_RULES.plans.free.dailyChatTurns ?? 40;
}

export function plusDurationMs(now = Date.now()): number {
  const days = CHARGING_RULES.plans.plus.durationDays ?? 30;
  return days * 24 * 60 * 60 * 1000;
}

export function plusExpiresAtIso(now = Date.now()): string {
  return new Date(now + plusDurationMs(now)).toISOString();
}

export function featureRule(id: ChargeFeatureId): FeatureChargeRule | undefined {
  return CHARGING_RULES.features.find((f) => f.id === id);
}

/** True when this feature must pass the free daily chat gate (unless Plus). */
export function featureRequiresQuota(id: ChargeFeatureId): boolean {
  return featureRule(id)?.gatedByDailyQuota === true;
}

export function featureCostTurns(id: ChargeFeatureId): number {
  return featureRule(id)?.costTurns ?? 0;
}

export function formatPlanPrice(plan: PlanChargeRule = CHARGING_RULES.plans.plus): string {
  if (plan.displayPriceCents == null || plan.displayPriceCents <= 0) return 'Free';
  const major = (plan.displayPriceCents / 100).toFixed(2);
  switch (plan.displayCurrency) {
    case 'HKD':
      return `HK$${major}`;
    case 'JPY':
      return `¥${Math.round(plan.displayPriceCents)}`;
    case 'CNY':
      return `¥${major}`;
    default:
      return `$${major}`;
  }
}

export function chargingRulesSnapshot() {
  return {
    version: CHARGING_RULES.version,
    unit: CHARGING_RULES.unit,
    reset: CHARGING_RULES.reset,
    freeDailyChatTurns: freeDailyChatTurnLimit(),
    plusDisplayPrice: formatPlanPrice(),
    plusDurationDays: CHARGING_RULES.plans.plus.durationDays,
    gatedFeatures: CHARGING_RULES.features.filter((f) => f.gatedByDailyQuota).map((f) => f.id),
    freeFeatures: CHARGING_RULES.features.filter((f) => !f.gatedByDailyQuota).map((f) => f.id),
  };
}
