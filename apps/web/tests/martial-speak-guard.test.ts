import { describe, expect, it, beforeEach } from 'vitest';
import {
  MARTIAL_FLOW_CLIP,
  MARTIAL_FLOW_SPEAK_MS,
  markMartialFlowClipLoaded,
  martialFlowClipArmed,
  martialFlowDemoTurn,
  resetMartialFlowClipsForTests,
  scrubUnsyncedMartialProse,
} from '../lib/martial-speak-guard';
import { MOVE_DUR } from '../lib/moves';
import { detectExercise } from '../lib/exercises';
import { DEMO_PHASE_BUTTONS } from '../lib/demo-phase';

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

  it('keeps the speak window inside the move clock so motion outlasts speech', () => {
    expect(MARTIAL_FLOW_SPEAK_MS).toBeLessThanOrEqual(MOVE_DUR.kungfu);
    expect(MARTIAL_FLOW_SPEAK_MS).toBeLessThanOrEqual(MOVE_DUR.taichi);
    markMartialFlowClipLoaded('lib_C120');
    const turn = martialFlowDemoTurn('kungfu', 'en');
    expect(turn.performMode).toBe(true);
    expect(turn.speakMs).toBeLessThanOrEqual(MOVE_DUR.kungfu);
  });

  it('only the kung fu chip routes into the kung fu demo path', () => {
    const kungfu = DEMO_PHASE_BUTTONS.find((b) => b.id === 'kungfu');
    expect(kungfu).toBeTruthy();
    for (const prompt of Object.values(kungfu!.prompts).flat()) {
      expect(detectExercise(prompt), prompt).toBe('kungfu');
    }
    // r276 added listenMusic / listenSong / singSong next to the old music and
    // sing chips. None of them may route into kung fu speech.
    const musicLike = ['music', 'listenMusic', 'listenSong', 'sing', 'singSong', 'dance'];
    for (const btn of DEMO_PHASE_BUTTONS) {
      if (!musicLike.includes(btn.id)) continue;
      for (const prompt of Object.values(btn.prompts).flat()) {
        expect(detectExercise(prompt), `${btn.id}: ${prompt}`).not.toBe('kungfu');
      }
    }
  });
});
