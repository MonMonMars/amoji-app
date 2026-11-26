/**
 * Owner 2026-11-26: "first page testing speaker function, it keep on talking,
 * please add a stop button to stop the test."
 *
 * The gate's Test button used to be `disabled={playing}`, so a 30s+ sample had
 * no way out. These tests pin the replacement contract:
 *   1. while playing, the sound-check control renders as an enabled Stop;
 *   2. Stop retires the attempt (so it cannot mark the speaker verified) and
 *      cuts every engine via stopSpeaking(), then keeps cutting while
 *      testVoiceChain falls through to the next tier;
 *   3. the Stop label is genuinely translated in yue / zh / ja.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GateSoundButton } from '../components/PreChatAudioGate';
import { LANGS, t } from '../lib/prefs';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');
const gate = () => read('components/PreChatAudioGate.tsx');

const noop = () => undefined;

function markup(playing: boolean) {
  return renderToStaticMarkup(
    <GateSoundButton
      data-testid="pre-chat-test-sound"
      playing={playing}
      onPlay={noop}
      onStop={noop}
      testLabel={t('en', 'gateAudioTest')}
      stopLabel={t('en', 'gateAudioStop')}
    />,
  );
}

describe('gate sound-check Stop control', () => {
  it('renders an enabled, keyboard-reachable Stop while the sample plays', () => {
    const html = markup(true);
    // Same control, now a stop action with an accessible name.
    expect(html).toContain('data-testid="pre-chat-test-sound"');
    expect(html).toContain('data-playing="1"');
    expect(html).toContain('data-action="stop"');
    expect(html).toContain('aria-label="Stop"');
    expect(html).toContain('>Stop<');
    // A native button is tab-reachable; it must never be disabled mid-sample.
    expect(html).toContain('<button type="button"');
    expect(html).not.toContain('disabled');
    // Playing affordance only while actually playing.
    expect(html).toContain('animate-pulse');
  });

  it('returns to Test with no pulsing dot when idle', () => {
    const html = markup(false);
    expect(html).toContain('data-action="play"');
    expect(html).toContain('aria-label="Test my sound"');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('animate-pulse');
  });

  it('wires BOTH gate buttons to Stop (no disabled dead-end left)', () => {
    const src = gate();
    expect(src).not.toContain('disabled={playing}');
    expect(src).not.toMatch(/data-testid="pre-chat-test-sound"[\s\S]{0,80}disabled/);
    expect(src).not.toMatch(/data-testid="pre-chat-hear-retry"[\s\S]{0,80}disabled/);
    // Both the primary test button and the help-card retry share the control.
    const stops = src.match(/stopLabel=\{t\(lang, 'gateAudioStop'\)\}/g) ?? [];
    expect(stops).toHaveLength(2);
    expect(src).toContain('onStop={stopSample}');
  });

  it('Stop calls stopSpeaking() and cannot mark the speaker as heard', () => {
    const src = gate();
    const stop = src.slice(
      src.indexOf('const stopSample = useCallback'),
      src.indexOf('const speakerOk'),
    );
    // Real teardown of the audio engine, not just React state.
    expect(stop).toContain('stopSpeaking()');
    // The attempt is retired BEFORE the cut, so the playSample finally cannot
    // take the "played through" branch.
    expect(stop.indexOf('attemptSeq.current += 1')).toBeLessThan(stop.indexOf('stopSpeaking()'));
    expect(stop).toContain('retiredAttempts.current += 1');
    expect(stop).not.toContain('setSoundTested(true)');

    // The only setSoundTested(true) sits AFTER the stop guard in playSample.
    const play = src.slice(
      src.indexOf('const playSample = useCallback'),
      src.indexOf('const stopSample = useCallback'),
    );
    const guard = play.indexOf('if (attempt !== attemptSeq.current)');
    const verified = play.indexOf('setSoundTested(true)');
    expect(guard).toBeGreaterThan(-1);
    expect(verified).toBeGreaterThan(guard);

    // The hear question still needs a completed sample.
    expect(src).toContain('const hearReady = soundTested && !playing;');
  });

  it('keeps cutting after stop because the chain falls through on cancel', () => {
    const src = gate();
    const mop = src.slice(src.indexOf('const armStopMop'), src.indexOf('useEffect(() => () => stopMop()'));
    expect(mop).toContain('setInterval');
    expect(mop).toContain('retiredAttempts.current <= 0');
    expect(mop).toContain('stopSpeaking()');
    // A live re-test must own the speaker; the sweep only runs when idle.
    expect(mop).toContain('if (playingRef.current) return;');
  });

  it('has a genuine Stop label in all four locales', () => {
    for (const { id } of LANGS) expect(t(id, 'gateAudioStop').trim()).not.toBe('');
    const en = t('en', 'gateAudioStop');
    for (const lang of ['yue', 'zh', 'ja'] as const) {
      const v = t(lang, 'gateAudioStop');
      expect(v).not.toBe(en);
      expect(v).toMatch(/[\u3400-\u9fff]/);
    }
  });
});
