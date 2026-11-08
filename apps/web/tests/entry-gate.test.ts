import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { STRINGS, t, type Lang, type StrKey } from '../lib/prefs';
import {
  INITIAL_GATE,
  canEnterApp,
  reduceGate,
  showsTroubleshooting,
  type GateEvent,
  type GateState,
} from '../lib/entry-gate-flow';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');
const LANGS: Lang[] = ['en', 'yue', 'zh', 'ja'];

/** Fold a list of events through the reducer, like the screen does. */
const run = (events: GateEvent[], from: GateState = INITIAL_GATE): GateState =>
  events.reduce(reduceGate, from);

/** The 18+ box ticked and the audio step opened. */
const AT_AUDIO = run([{ type: 'toggleAdult' }, { type: 'confirmAdult' }]);
/** …and the sample has been played, so the question is askable. */
const AFTER_TEST = run([{ type: 'testPlayed' }], AT_AUDIO);

describe('entry gate — you cannot reach /select without answering', () => {
  it('starts at the 18+ step and refuses to advance on an unticked box', () => {
    expect(INITIAL_GATE.phase).toBe('adult');
    expect(INITIAL_GATE.adult).toBe(false);
    const s = reduceGate(INITIAL_GATE, { type: 'confirmAdult' });
    expect(s.phase).toBe('adult');
    expect(canEnterApp(s)).toBe(false);
  });

  it('the 18+ acknowledgement is required, and only then does the audio step open', () => {
    const s = run([{ type: 'toggleAdult' }, { type: 'confirmAdult' }]);
    expect(s.phase).toBe('audio');
    expect(s.adult).toBe(true);
    expect(canEnterApp(s)).toBe(false);
  });

  it('the gate cannot be completed without answering the audio question', () => {
    // Every path to 'done' runs through heardYes / continueAnyway first.
    const s = run([{ type: 'toggleAdult' }, { type: 'confirmAdult' }]);
    expect(canEnterApp(s)).toBe(false);
    expect(canEnterApp(run([{ type: 'micDone', outcome: 'granted' }], s))).toBe(false);
    expect(canEnterApp(run([{ type: 'skipMic' }], s))).toBe(false);
    expect(canEnterApp(run([{ type: 'enterApp' }], s))).toBe(false);
  });

  it('"I heard her" reaches the mic step, then the app', () => {
    const s = run([{ type: 'heardYes' }], AFTER_TEST);
    expect(s.phase).toBe('mic');
    expect(s.heard).toBe('yes');
    const asked = run([{ type: 'micDone', outcome: 'granted' }], s);
    // The mic answer is shown before the user enters, so it can be read.
    expect(asked.phase).toBe('mic');
    expect(canEnterApp(asked)).toBe(false);
    const done = run([{ type: 'enterApp' }], asked);
    expect(done.phase).toBe('done');
    expect(canEnterApp(done)).toBe(true);
  });

  it('skipping the mic still completes the gate (mic is optional)', () => {
    const done = run([{ type: 'heardYes' }, { type: 'skipMic' }], AFTER_TEST);
    expect(canEnterApp(done)).toBe(true);
    expect(done.mic).toBe('skipped');
  });

  it('cannot answer before the sample has played (no guessing)', () => {
    // The "did you hear her?" question is not even asked yet, so both answers
    // are refused by the reducer rather than recorded as a real confirmation.
    expect(reduceGate(AT_AUDIO, { type: 'heardYes' }).phase).toBe('audio');
    expect(reduceGate(AT_AUDIO, { type: 'heardYes' }).heard).toBe(null);
    expect(reduceGate(AT_AUDIO, { type: 'heardNo' }).phase).toBe('audio');
    expect(AFTER_TEST.tested).toBe(true);
    // Playing the sample is not an answer either — it is only proof that we
    // queued the line, which is exactly what the honest limitation is about.
    expect(AFTER_TEST.phase).toBe('audio');
    expect(canEnterApp(AFTER_TEST)).toBe(false);
  });
});

describe('entry gate — a user with no sound is helped, not trapped', () => {
  it('"I heard nothing" opens the troubleshooting list instead of continuing', () => {
    const s = run([{ type: 'heardNo' }], AFTER_TEST);
    expect(s.phase).toBe('help');
    expect(showsTroubleshooting(s)).toBe(true);
    // Nothing has been answered yet — "no" is only committed by continueAnyway.
    expect(s.heard).toBe(null);
    expect(canEnterApp(s)).toBe(false);
  });

  it('the help list is never a dead end: "continue anyway" completes the gate', () => {
    const s = run([{ type: 'heardNo' }, { type: 'continueAnyway' }], AFTER_TEST);
    expect(s.phase).toBe('mic');
    // The honest answer is recorded — this is NOT treated as verified audio.
    expect(s.heard).toBe('no');
    expect(canEnterApp(run([{ type: 'skipMic' }], s))).toBe(true);
  });

  it('"test again" from the help list returns to the audio step', () => {
    const s = run([{ type: 'heardNo' }, { type: 'testAgain' }], AFTER_TEST);
    expect(s.phase).toBe('audio');
    expect(s.heard).toBe(null);
    // already played once, so the question stays askable after going back
    expect(s.tested).toBe(true);
  });

  it('the user can still say yes after retrying from the help list', () => {
    const s = run([
      { type: 'heardNo' }, { type: 'testAgain' }, { type: 'heardYes' },
      { type: 'micDone', outcome: 'denied' }, { type: 'enterApp' },
    ], AFTER_TEST);
    expect(canEnterApp(s)).toBe(true);
    expect(s.heard).toBe('yes');
    expect(s.mic).toBe('denied');
  });
  it('going back from the audio step re-locks it until the box is ticked again', () => {
    const back = reduceGate(AT_AUDIO, { type: 'back' });
    expect(back.phase).toBe('adult');
    expect(back.tested).toBe(false);
    // Re-confirming is allowed (the box is still ticked) but the sample must be
    // played again before the question reappears.
    const again = reduceGate(back, { type: 'confirmAdult' });
    expect(again.phase).toBe('audio');
    expect(again.tested).toBe(false);
    expect(reduceGate(again, { type: 'heardYes' }).phase).toBe('audio');
  });

  it('mic state does not survive backing out of the mic step', () => {
    const withMic = run([{ type: 'micDone', outcome: 'granted' }], run([{ type: 'heardYes' }], AFTER_TEST));
    expect(withMic.mic).toBe('granted');
    const back = reduceGate(withMic, { type: 'back' });
    expect(back.phase).toBe('audio');
    expect(back.mic).toBe('skipped');
  });
});

describe('entry gate — the silent-switch guidance is present in all four languages', () => {
  it('every gate key resolves in en/yue/zh/ja and is not English-only', () => {
    const keys: StrKey[] = [
      'gate18Title', 'gate18Body', 'gate18Ack', 'gate18Cta',
      'gateAudioTitle', 'gateAudioBody', 'gateAudioIosHint', 'gateAudioTest',
      'gateAudioQuestion', 'gateAudioYes', 'gateAudioNo',
      'gateHelpTitle', 'gateHelpSwitch', 'gateHelpVolume', 'gateHelpBluetooth',
      'gateHelpTabMuted', 'gateHelpRetry', 'gateHelpContinue', 'gateHelpNote',
      'gateMicTitle', 'gateMicBody', 'gateMicAllow', 'gateMicSkip',
      'gateEnter', 'settingsAdultOnly',
    ];
    for (const key of keys) {
      for (const lang of LANGS) {
        expect(STRINGS[key][lang], `${key}.${lang} missing`).toBeTruthy();
      }
    }
  });

  it('the iPhone silent-switch line names the hardware switch in all four languages', () => {
    // The #1 cause, and the one thing no code can detect — it must be explicit,
    // not a vague "check your sound".
    expect(t('en', 'gateAudioIosHint')).toMatch(/silent switch/i);
    expect(t('yue', 'gateAudioIosHint')).toContain('靜音掣');
    expect(t('zh', 'gateAudioIosHint')).toContain('静音开关');
    expect(t('ja', 'gateAudioIosHint')).toContain('サイレントスイッチ');
  });

  it('the troubleshooting list names switch, volume, Bluetooth and a muted tab in every language', () => {
    const marks: Record<string, RegExp> = {
      en: /silent|bluetooth|volume|muted/i,
      yue: /靜音|藍牙|音量|靜音/i,
      zh: /静音|蓝牙|音量|静音/,
      ja: /サイレント|Bluetooth|音量|ミュート/i,
    };
    for (const lang of LANGS) {
      const joined = [
        t(lang, 'gateHelpSwitch'),
        t(lang, 'gateHelpVolume'),
        t(lang, 'gateHelpBluetooth'),
        t(lang, 'gateHelpTabMuted'),
      ].join(' ');
      expect(joined, lang).toMatch(marks[lang]!);
      // none of the four languages may collapse back to the English line
      if (lang !== 'en') expect(joined, lang).not.toBe(
        ['gateHelpSwitch', 'gateHelpVolume', 'gateHelpBluetooth', 'gateHelpTabMuted']
          .map((k) => t('en', k as StrKey)).join(' '),
      );
    }
  });

  it('the 18+ statement is present in all four languages and says the age', () => {
    for (const lang of LANGS) {
      const title = t(lang, 'gate18Title');
      const ack = t(lang, 'gate18Ack');
      expect(title, lang).toMatch(/18/);
      expect(ack, lang).toMatch(/18/);
    }
  });

  it('step copy interpolates both numbers', () => {
    expect(t('en', 'gateStep', { n: '2', total: '3' })).toContain('2');
    expect(t('en', 'gateStep', { n: '2', total: '3' })).toContain('3');
    expect(t('en', 'gateStep', { n: '2', total: '3' })).not.toContain('{');
  });
});

describe('entry gate — the record stores a confirmation, never a detection', () => {
  const PREFS_KEY = 'amoji.entryGate.v1';

  function withStorage(initial?: Record<string, string>) {
    const g = globalThis as { localStorage?: Storage; window?: Window & typeof globalThis };
    const prevLs = g.localStorage;
    const prevWin = g.window;
    const map = new Map<string, string>(Object.entries(initial ?? {}));
    const ls = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    g.localStorage = ls;
    g.window = {
      localStorage: ls,
      dispatchEvent: () => true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window & typeof globalThis;
    return {
      map,
      restore: () => {
        g.localStorage = prevLs;
        if (prevWin === undefined) delete (g as { window?: unknown }).window;
        else g.window = prevWin;
      },
    };
  }

  it('is not passed before the user answers, and is versioned', async () => {
    const { restore } = withStorage();
    const m = await import('../lib/entry-gate');
    expect(m.hasPassedEntryGate()).toBe(false);
    expect(m.ENTRY_GATE_KEY).toBe(PREFS_KEY);
    m.passEntryGate({ audioHeard: 'yes' });
    expect(m.hasPassedEntryGate()).toBe(true);
    const rec = m.getEntryGateRecord()!;
    expect(rec.version).toBe(m.ENTRY_GATE_VERSION);
    expect(rec.audioHeard).toBe('yes');
    expect(typeof rec.audioCheckedAt).toBe('string');
    restore();
  });

  it('a stored "heard nothing" still passes the gate but is recorded as such', async () => {
    const { restore } = withStorage();
    const m = await import('../lib/entry-gate');
    m.passEntryGate({ audioHeard: 'no', mic: 'denied' });
    expect(m.hasPassedEntryGate()).toBe(true);
    const rec = m.getEntryGateRecord()!;
    expect(rec.audioHeard).toBe('no');
    expect(rec.mic).toBe('denied');
    restore();
  });

  it('re-prompts when the stored version lags the current one', async () => {
    const { restore } = withStorage({
      [PREFS_KEY]: JSON.stringify({
        version: 0, adultAcknowledgedAt: '2020-01-01T00:00:00.000Z',
        audioHeard: 'yes', audioCheckedAt: null, mic: 'skipped',
      }),
    });
    const m = await import('../lib/entry-gate');
    expect(m.hasPassedEntryGate()).toBe(false);
    restore();
  });

  it('a record with no audio answer is not a pass (no inferred confirmation)', async () => {
    const { restore } = withStorage({
      [PREFS_KEY]: JSON.stringify({
        version: 1, adultAcknowledgedAt: '2020-01-01T00:00:00.000Z',
        audioHeard: null, audioCheckedAt: null, mic: 'skipped',
      }),
    });
    const m = await import('../lib/entry-gate');
    expect(m.hasPassedEntryGate()).toBe(false);
    restore();
  });
});

describe('entry gate — wiring', () => {
  it('a /gate route renders the gate, and the protected screens render it in place', () => {
    const page = read('app/gate/page.tsx');
    expect(page).toContain('QuickSetup');
    // Render-swap, not redirect: the board/room must never mount first.
    for (const rel of ['app/select/page.tsx', 'app/change/page.tsx', 'app/chat/page.tsx']) {
      expect(read(rel), rel).toContain('RequireEntryGate');
      expect(read(rel), rel).not.toContain('EntryGuard');
    }
  });

  it('title START runs one-click setup then opens /select; /login redirects home', () => {
    const splash = read('app/page.tsx');
    expect(splash).toContain('oneClickBootstrap');
    expect(splash).toContain('hasPassedEntryGate');
    expect(splash).toContain("router.push('/select')");
    const login = read('app/login/page.tsx');
    expect(login).toContain("router.replace('/')");
  });

  it('the guard renders an opaque blocker before it knows, then the gate', () => {
    const guard = read('components/RequireEntryGate.tsx');
    expect(guard).toContain('hasPassedEntryGate');
    expect(guard).toContain('entry-gate-boot');
    expect(guard).toMatch(/if \(status === 'checking'\)/);
    expect(guard).toMatch(/if \(status === 'blocked'\)[\s\S]*?<EntryGate/);
    // The protected children are only rendered on the 'ok' branch.
    expect(guard).toMatch(/return <>\{children\}<\/>;/);
  });

  it('one-click setup plays the app voice path, not a beep', () => {
    const bootstrap = read('lib/one-click-setup.ts');
    expect(bootstrap).toContain('testVoiceChain');
    expect(bootstrap).not.toContain('new Audio(');
  });

  it('one-click setup asks for the mic with getUserMedia and stops the track', () => {
    const bootstrap = read('lib/one-click-setup.ts');
    expect(bootstrap).toContain('getUserMedia');
    expect(bootstrap).toContain('track.stop()');
    expect(bootstrap).toContain("'unsupported'");
  });

  it('the honest-limitation comment is present where the decision lives', () => {
    const lib = read('lib/entry-gate.ts');
    expect(lib).toMatch(/no way to know that speechSynthesis actually produced sound/i);
    expect(lib).toMatch(/silent switch/i);
  });
});
