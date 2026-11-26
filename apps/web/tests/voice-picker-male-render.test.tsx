/**
 * Render proof for the relay gate (owner 2026-11-25: "the male voice button are
 * all gone").
 *
 * Data-level tests can show that `selectRelayVoiceButtons()` is empty when no
 * relay is configured; this one renders the actual picker and asserts that no
 * male <button> exists in the markup at all. That is the property that matters
 * on the static GitHub Pages export: a male button must never be present in a
 * state where it could only be silent or fall back to a woman's voice.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import VoicePicker from '../components/VoicePicker';
import TtsVoiceRow from '../components/TtsVoiceRow';
import { DEFAULT_TTS_PROXY, setTtsProxy } from '../lib/edge-tts';

const noop = () => undefined;

function picker() {
  return renderToStaticMarkup(
    <VoicePicker lang="en" characterId="kizuna" companionGender="female" accent="#8b5cf6" onLang={noop} />,
  );
}

function voiceRow() {
  return renderToStaticMarkup(
    <TtsVoiceRow lang="yue" characterId="kizuna" companionGender="female" accent="#8b5cf6" onLang={noop} />,
  );
}

beforeEach(() => {
  setTtsProxy(DEFAULT_TTS_PROXY);
});

afterEach(() => {
  setTtsProxy(DEFAULT_TTS_PROXY);
});

describe('picker renders male neural buttons only when the relay is configured', () => {
  it('shows WanLung (Cantonese male) with the relay on', () => {
    const html = picker();
    expect(html).toContain('data-voice-id="edge:zh-HK-WanLungNeural"');
    expect(html).toContain('data-voice-engine="edge"');
    // Grouped by language, not mixed into the Google speaker grid.
    expect(html).toContain('data-testid="voice-relay-male-yue"');
    // Owner priority: the Cantonese male is the one the owner asked for.
    expect(html).toContain('edge:zh-CN-YunjianNeural');
    expect(html).toContain('edge:ja-JP-KeitaNeural');
    expect(html).toContain('edge:en-US-GuyNeural');
    expect(html).not.toContain('data-testid="voice-relay-off"');
  });

  it('renders ZERO male buttons (not disabled ones) with no relay', () => {
    // Explicit opt-out, exactly what a static export without a relay means:
    // no proxy URL can carry Edge, and the direct socket 403s this app.
    setTtsProxy('');
    const html = picker();
    expect(html).not.toContain('data-voice-engine="edge"');
    expect(html).not.toContain('edge:zh-HK-WanLungNeural');
    expect(html).not.toContain('edge:zh-CN-YunjianNeural');
    expect(html).not.toContain('edge:ja-JP-KeitaNeural');
    expect(html).not.toContain('edge:en-US-GuyNeural');
    expect(html).not.toContain('voice-relay-male-');
    // The female Google list is untouched by the gate.
    expect(html).toContain('data-voice-id="gtts:yue:f:mid"');
    // And the absence is explained rather than mysterious.
    expect(html).toContain('data-testid="voice-relay-off"');
  });
});

describe('select-board voice row honours the same gate', () => {
  it('adds the male button with the relay on', () => {
    const html = voiceRow();
    expect(html).toContain('data-voice-id="edge:zh-HK-WanLungNeural"');
  });

  it('adds no male button with the relay off', () => {
    setTtsProxy('');
    const html = voiceRow();
    expect(html).not.toContain('data-voice-engine="edge"');
    expect(html).not.toContain('edge:zh-HK-WanLungNeural');
    // The Cantonese female speaker still renders.
    expect(html).toContain('data-voice-id="gtts:yue:f:mid"');
  });
});
