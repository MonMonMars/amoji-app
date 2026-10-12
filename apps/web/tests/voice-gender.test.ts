import { describe, expect, it } from 'vitest';
import { characterVoiceGender } from '../lib/voice-gender';

describe('characterVoiceGender', () => {
  it('matches roster gender for active cast', () => {
    expect(characterVoiceGender('kitagawa')).toBe('female');
    expect(characterVoiceGender('onyx')).toBe('male');
  });

  it('falls back to default companion gender for unknown ids', () => {
    expect(characterVoiceGender('jun')).toBe('female');
    expect(characterVoiceGender('not-a-character')).toBe('female');
  });
});
