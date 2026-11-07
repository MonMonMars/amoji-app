/**
 * The picker must show what this device really has, and must never dress one
 * voice up as a choice.
 *
 * Behaviour asserted here:
 *   - the OS source is a real, labelled section (not folded into the Google row),
 *   - it is grouped by INFERRED gender, with an explicit "unknown" bucket,
 *   - it is hidden when the device has nothing for that language,
 *   - a language with too few OS voices states the count instead of implying a
 *     choice,
 *   - the diagnostic surface exists and prints name + locale + gender.
 *
 * Source-level assertions, matching every other component test in this repo
 * (the suite runs in a node environment with no DOM).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { osVoicesAreChoosable, OS_VOICE_SOURCE } from '../lib/voice-capability';

const row = readFileSync(join(__dirname, '../components/OsVoiceRow.tsx'), 'utf8');
const diag = readFileSync(join(__dirname, '../components/OsVoiceDiagnostics.tsx'), 'utf8');
const picker = readFileSync(join(__dirname, '../components/VoicePicker.tsx'), 'utf8');

describe('OsVoiceRow', () => {
  it('renders nothing when the device has no voice for the language', () => {
    expect(row).toContain('if (!inventory || !inventory.supported) return null');
    expect(row).toContain('if (!choosable.length) return null');
  });

  it('only offers voices that are native AND will actually play', () => {
    // iOS lists many voices and synthesizes one per language; a substitute
    // (Mandarin reading Cantonese) is not this language's voice either.
    expect(row).toContain("inventory.voices.filter((v) => v.fit === 'native' && v.usable)");
  });

  it('groups by inferred gender and keeps an explicit unknown bucket', () => {
    expect(row).toContain("const GENDER_ORDER: readonly InferredGender[] = ['female', 'male', 'unknown']");
    expect(row).toContain("t(lang, 'osVoicesGenderUnknown')");
  });

  it('labels itself as the device’s own voices, not the network', () => {
    expect(row).toContain("t(lang, 'osVoicesTitle')");
    expect(row).toContain("t(lang, 'osVoicesNetwork')");
  });

  it('says the real count so a one-voice language cannot look like a menu', () => {
    expect(row).toContain('osVoicesAreChoosable');
    expect(row).toContain("t(lang, 'osVoicesCount'");
    expect(row).toContain('data-testid={`os-voice-summary-${locale}`}');
    expect(row).toContain("data-meets-three={meetsBar ? '1' : '0'}");
  });

  it('exposes the inferred gender and its source for audit', () => {
    expect(row).toContain('data-voice-gender={voice.gender}');
    expect(row).toContain('data-gender-source={voice.genderSource}');
    expect(row).toContain('data-voice-os="1"');
  });

  it('reports what the device contributes so the parent can stay truthful', () => {
    expect(row).toContain('onInventory');
    expect(row).toContain('onInventory?.({ female: inventory.usable.female, male: inventory.usable.male }, nativeUsable)');
  });

  it('previews the exact voice that was tapped', () => {
    expect(row).toContain('onClick={() => onPreview?.(voice)}');
  });
});

describe('OsVoiceDiagnostics', () => {
  it('waits for the async voice list instead of reading it synchronously', () => {
    expect(diag).toContain('loadVoices()');
    expect(diag).toContain('onVoicesChanged');
  });

  it('offers a re-probe, so a voice installed later shows up', () => {
    expect(diag).toContain("t(lang, 'osVoicesProbe')");
    expect(diag).toContain('loadVoices({ timeoutMs: 1500 })');
  });

  it('prints name, locale and inferred gender for every voice', () => {
    expect(diag).toContain('voice.name');
    expect(diag).toContain('voice.lang');
    expect(diag).toContain('genderLabel(lang, voice)');
    expect(diag).toContain("t(lang, 'osVoicesGenderUnknown')");
  });

  it('marks voices that will not play, and voices from another language', () => {
    expect(diag).toContain("t(lang, 'osVoicesUnreachable')");
    expect(diag).toContain("t(lang, 'osVoicesSubstitute')");
    expect(diag).toContain('data-voice-usable={voice.usable ? \'1\' : \'0\'}');
    expect(diag).toContain('data-voice-fit={voice.fit}');
  });

  it('states the iOS silent-switch caveat plainly', () => {
    expect(diag).toContain("'ios-silent-switch': 'osVoicesCaveatIosSilent'");
    expect(diag).toContain("data-testid={`os-voice-caveat-${caveat}`}");
  });

  it('states why a language’s list is short instead of hiding it', () => {
    expect(diag).toContain("t(lang, 'osVoicesNone')");
    expect(diag).toContain("t(lang, 'osVoicesInferred')");
  });

  it('is a labelled group per language, not a bare dump', () => {
    expect(diag).toContain('role="group"');
    expect(diag).toContain('aria-labelledby={`os-voice-locale-${locale}`}');
    expect(diag).toContain('data-testid={`os-voice-locale-${locale}`}');
  });
});

describe('VoicePicker integration', () => {
  it('renders the OS voice row under each language', () => {
    expect(picker).toContain('import OsVoiceRow');
    expect(picker).toContain('<OsVoiceRow');
  });

  it('previews an OS voice through the synth path, and pins it', () => {
    expect(picker).toContain('previewOsVoice');
    expect(picker).toContain("if (voice.gender === 'unknown') return;");
  });

  it('never says "only one voice" while device voices are on screen', () => {
    // The note is about the HOSTED tier. Printing it above four device voices
    // would be the same half-truth this picker was rebuilt to remove.
    expect(picker).toContain('const osVoiceCount = os ? os.female + os.male : 0');
    expect(picker).toContain('const hostedOnly = isSingleVoiceLocale(locale) && osVoiceCount === 0');
    expect(picker).toContain('{hostedOnly && (');
    expect(picker).toContain('onInventory={(usable) => reportOs(locale, usable)}');
  });

  it('exposes the diagnostic behind a toggle so the picker stays short', () => {
    expect(picker).toContain('import OsVoiceDiagnostics');
    expect(picker).toContain('aria-expanded={showDiag}');
    expect(picker).toContain('data-testid="os-voice-diag-toggle"');
    expect(picker).toContain('{showDiag && <OsVoiceDiagnostics');
  });

  it('still lists the hosted voices and still explains the dead engines', () => {
    expect(picker).toContain('selectTtsButtons(locale)');
    expect(picker).toContain("t(lang, 'voiceEnginesUnavailable')");
  });
});

describe('osVoicesAreChoosable', () => {
  it('needs the minimum in BOTH genders, not an average', () => {
    const min = OS_VOICE_SOURCE.minPerGender;
    expect(osVoicesAreChoosable({ female: min, male: min })).toBe(true);
    expect(osVoicesAreChoosable({ female: min, male: min - 1 })).toBe(false);
    expect(osVoicesAreChoosable({ female: min - 1, male: min })).toBe(false);
    expect(osVoicesAreChoosable({ female: 10, male: 0 })).toBe(false);
  });

  it('refuses to call one extra voice a choice', () => {
    expect(osVoicesAreChoosable({ female: 1, male: 1 })).toBe(false);
  });

  it('documents the Windows measurement that set the bar', () => {
    expect(OS_VOICE_SOURCE.evidence).toContain('15 local voices');
    expect(OS_VOICE_SOURCE.evidence).toContain('no gender field');
    expect(OS_VOICE_SOURCE.evidence).toContain('iOS silent switch');
  });
});
