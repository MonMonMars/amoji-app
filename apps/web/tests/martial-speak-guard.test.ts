import { describe, expect, it, beforeEach } from 'vitest';
import {
  MARTIAL_FLOW_CLIP,
  markMartialFlowClipLoaded,
  martialFlowClipArmed,
  martialFlowDemoTurn,
  resetMartialFlowClipsForTests,
  scrubUnsyncedMartialProse,
} from '../lib/martial-speak-guard';

describe('martial speak guard', () => {
  beforeEach(() => resetMartialFlowClipsForTests());

  it('maps kung fu and tai chi to lib_C120 / lib_C121', () => {
    expect(MARTIAL_FLOW_CLIP.kungfu).toBe('lib_C120');
    expect(MARTIAL_FLOW_CLIP.taichi).toBe('lib_C121');
  });

  it('uses perform copy when clip armed, theory when not', () => {
    const cold = martialFlowDemoTurn('kungfu', 'en');
    expect(cold.performMode).toBe(false);
    expect(cold.line).toMatch(/manners before fists/i);

    markMartialFlowClipLoaded('lib_C120');
    expect(martialFlowClipArmed('kungfu')).toBe(true);
    const hot = martialFlowDemoTurn('kungfu', 'en');
    expect(hot.performMode).toBe(true);
    expect(hot.line).toMatch(/run a kung fu form/i);
  });

  it('scrubs first-person move monologue when clip not armed', () => {
    const raw = '好，我而家出冲拳，左手再踢一脚——跟住做馬步！';
    const out = scrubUnsyncedMartialProse(raw, 'kungfu', false, 'yue');
    expect(out).not.toMatch(/我而家出冲拳/);
  });
});
