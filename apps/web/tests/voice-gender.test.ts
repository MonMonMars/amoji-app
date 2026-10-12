import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../lib/prefs';
import { characterVoiceGender } from '../lib/voice-gender';

describe('characterVoiceGender', () => {
  it('follows roster gender for want-list cast (two males only)', () => {
    const males = CHARACTERS.filter((c) => c.gender === 'male').map((c) => c.id).sort();
    expect(males).toEqual(['a24-hairsample-male', 'a98-ethan']);
    expect(CHARACTERS.filter((c) => c.gender === 'female').length).toBe(44);
    for (const c of CHARACTERS) {
      expect(characterVoiceGender(c.id)).toBe(c.gender);
    }
  });

  it('unknown ids inherit default companion gender (a01-shino → female)', () => {
    expect(characterVoiceGender('kitagawa')).toBe('female');
    expect(characterVoiceGender('kizuna')).toBe('female');
  });
});
