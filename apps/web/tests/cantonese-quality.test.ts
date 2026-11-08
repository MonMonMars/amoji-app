import { describe, expect, it } from 'vitest';
import { polishCantoneseReply } from '../lib/cantonese-quality';
import { REPLY_BUDGET, shapeCompanionReply } from '../lib/reply-shape';

const dense = (s: string) => s.replace(/\s/g, '').length;

describe('cantonese-quality polish', () => {
  it('drops assistant-template openings', () => {
    const raw = '作為 AI，我唔係醫生。今日好攰喎，想唔想休息？';
    const out = polishCantoneseReply(raw);
    expect(out).not.toMatch(/作為\s*AI/);
    expect(out).toContain('攰');
  });

  it('strips numbered bullet advice', () => {
    const raw = '首先深呼吸。其次打電話。1. 飲水 2. 休息。你而家安全嗎？';
    const out = polishCantoneseReply(raw);
    expect(out).not.toMatch(/^首先/m);
    expect(out).not.toMatch(/1\.\s*飲水/);
  });
});

describe('yue reply budget (DimDik 48)', () => {
  it('caps rambling Cantonese at REPLY_BUDGET.yue', () => {
    const raw = '今日嘅事真係好煩呀。你一早就起身趕住返工，連早餐都未食。'
      + '地鐵又迫又熱，企咗成半個鐘先有位坐。返到公司仲要俾人催交報告。'
      + '你個樣睇落好攰，對眼都紅晒。'
      + '其實你唔使咩都自己扛㗎。'
      + '今晚想食啲咩？';
    const out = shapeCompanionReply(raw, { language: 'yue' });
    expect(dense(out)).toBeLessThanOrEqual(REPLY_BUDGET.yue + 20);
    expect(out).toMatch(/[？?]/);
  });
});
