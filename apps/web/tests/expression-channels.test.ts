/**
 * E2 defect 1 — which extra expression channels can this rig address?
 *
 * All shipped VRoid cast rigs carry only the six emotion presets, so this must
 * resolve to an EMPTY set there (the face-mapper then keeps the exact old fold).
 * A rig that authors ARKit-style morphs resolves the channels it actually has.
 */
import { describe, expect, it } from 'vitest';
import {
  buildExpressionNameMap,
  resolveExtraChannels,
  resolveExpressionName,
} from '../lib/vrm/expression-names';

// The real roster shape (see the GLB JSON of cast/*.vrm): six presets + visemes.
const CAST_RIG = [
  'Joy', 'Angry', 'Sorrow', 'Surprised', 'Blink', 'Blink_L', 'Blink_R',
  'A', 'I', 'U', 'E', 'O',
];

describe('resolveExtraChannels', () => {
  it('is empty for the shipped cast (six presets only)', () => {
    expect([...resolveExtraChannels(buildExpressionNameMap(CAST_RIG))]).toEqual([]);
  });

  it('resolves the ARKit-style morphs a capable rig ships', () => {
    const map = buildExpressionNameMap([
      'Joy', 'Surprised',
      'BrowInnerUp', 'BrowOuterUp', 'BrowDown',
      'NoseSneer', 'MouthPress', 'MouthStretch', 'MouthPucker', 'CheekSquint',
    ]);
    expect([...resolveExtraChannels(map)].sort()).toEqual([
      'browDown', 'browInnerUp', 'browOuterUp', 'cheekRaise',
      'lipPress', 'mouthPucker', 'mouthStretch', 'noseWrinkle',
    ]);
  });

  it('maps Blender/ARKit spellings to the channel names the avatar writes', () => {
    const map = buildExpressionNameMap(['NoseSneer', 'MouthPress', 'CheekSquint']);
    expect(resolveExpressionName(map, 'noseWrinkle')).toBe('NoseSneer');
    expect(resolveExpressionName(map, 'lipPress')).toBe('MouthPress');
    expect(resolveExpressionName(map, 'cheekRaise')).toBe('CheekSquint');
  });

  it('never invents a channel a rig does not have', () => {
    const map = buildExpressionNameMap(['BrowInnerUp']);
    expect([...resolveExtraChannels(map)]).toEqual(['browInnerUp']);
  });
});
