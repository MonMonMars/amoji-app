import { beforeEach, describe, expect, it } from 'vitest';
import {
  detectChatSituation,
  preferOvhModels,
  resetRacerCooldowns,
  selectRacers,
} from '../lib/client-chat';

describe('detectChatSituation', () => {
  it('picks story when the turn is narrative', () => {
    expect(detectChatSituation({ story: true, lastUser: '你好' })).toBe('story');
  });

  it('picks live for weather / news world blocks', () => {
    expect(detectChatSituation({ world: 'Weather: 29°C, drizzle.' })).toBe('live');
    expect(detectChatSituation({ world: 'News: markets open higher.' })).toBe('live');
  });

  it('picks reason for advice-seeking lines', () => {
    expect(detectChatSituation({ lastUser: 'Should I apologize first?' })).toBe('reason');
    expect(detectChatSituation({ lastUser: '我同屋企人鬧交，唔知應唔應該主動講和。' })).toBe('reason');
    expect(detectChatSituation({ lastUser: 'どうすればいい？' })).toBe('reason');
  });

  it('defaults to companion', () => {
    expect(detectChatSituation({ lastUser: '今日好攰呀' })).toBe('companion');
  });
});

describe('preferOvhModels', () => {
  it('routes companion → Qwen, live → Mistral, story → Llama, reason → Qwen then Llama', () => {
    expect(preferOvhModels('companion')[0]).toBe('Qwen2.5-VL-72B-Instruct');
    expect(preferOvhModels('live')[0]).toBe('Mistral-Small-3.2-24B-Instruct-2506');
    expect(preferOvhModels('story')[0]).toBe('Meta-Llama-3_3-70B-Instruct');
    expect(preferOvhModels('reason')).toEqual([
      'Qwen2.5-VL-72B-Instruct',
      'Meta-Llama-3_3-70B-Instruct',
      'Mistral-Small-3.2-24B-Instruct-2506',
    ]);
  });

  it('nudges zh companion to prefer Llama over Mistral', () => {
    expect(preferOvhModels('companion', 'zh')).toEqual([
      'Qwen2.5-VL-72B-Instruct',
      'Meta-Llama-3_3-70B-Instruct',
      'Mistral-Small-3.2-24B-Instruct-2506',
    ]);
  });

  it('always returns all three models', () => {
    for (const s of ['companion', 'live', 'reason', 'story'] as const) {
      expect(preferOvhModels(s)).toHaveLength(3);
      expect(new Set(preferOvhModels(s)).size).toBe(3);
    }
  });
});

describe('selectRacers situation preference', () => {
  beforeEach(() => resetRacerCooldowns());

  it('leads the OVH slot with the situation primary when all are fresh', () => {
    const companion = selectRacers({ preferOvh: preferOvhModels('companion') })
      .filter((r) => r.host === 'ovhcloud')
      .map((r) => r.model);
    expect(companion[0]).toBe('Qwen2.5-VL-72B-Instruct');

    const live = selectRacers({ preferOvh: preferOvhModels('live') })
      .filter((r) => r.host === 'ovhcloud')
      .map((r) => r.model);
    expect(live[0]).toBe('Mistral-Small-3.2-24B-Instruct-2506');

    const story = selectRacers({ preferOvh: preferOvhModels('story') })
      .filter((r) => r.host === 'ovhcloud')
      .map((r) => r.model);
    expect(story[0]).toBe('Meta-Llama-3_3-70B-Instruct');
  });
});
