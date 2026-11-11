// Google Play requires apps that generate content with a model to give users
// an in-app way to report offensive output. This suite pins the whole chain:
// the control exists on AI replies only, a submitted report really lands in
// storage with the reason the user picked, the list stays bounded, and the
// export is valid JSON. It also proves the copy is not lying about where the
// report goes — Amoji is a static site, so it goes nowhere but this device.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import ChatMessage from '../components/ChatMessage';
import {
  MAX_NOTE_CHARS, MAX_REPORTS, MAX_REPLY_CHARS, REPORTS_KEY, REPORTS_VERSION, REPORT_REASONS,
  addReport, buildReportFile, clearReports, exportReportsJson, isReportReason, loadReports,
  reportCount,
} from '../lib/reports';
import { LANGS, STRINGS, t, type Lang, type StrKey } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

const mem = new Map<string, string>();
const ls = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};

beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: Storage }).localStorage = ls as unknown as Storage;
});

const render = (props: Partial<React.ComponentProps<typeof ChatMessage>> = {}) =>
  renderToStaticMarkup(
    <ChatMessage
      role="assistant"
      content="You should not be here."
      lang="en"
      accent="#f9a8d4"
      onReport={() => {}}
      {...props}
    />,
  );

describe('report control — AI replies only', () => {
  it('renders a labeled report control on an assistant message', () => {
    const html = render();
    expect(html).toContain('data-testid="chat-report-button"');
    expect(html).toContain(`aria-label="${t('en', 'reportAria')}"`);
    expect(html).toContain(t('en', 'reportCta'));
  });

  it('renders no report control on a user message', () => {
    const html = render({ role: 'user', content: 'hello there' });
    expect(html).toContain('hello there');
    expect(html).not.toContain('chat-report-button');
    expect(html).not.toContain(t('en', 'reportAria'));
  });

  it('is a real button, so it is reachable by Tab and Enter', () => {
    const html = render();
    // A span/div with an onClick would be invisible to the keyboard.
    const tag = html.slice(html.indexOf('<button'), html.indexOf('>', html.indexOf('<button')) + 1);
    expect(tag).toContain('type="button"');
    expect(tag).toContain('aria-label=');
  });

  it('does not offer to report the transient "…" wait bubble', () => {
    // It is a placeholder painted while the model is still thinking — there
    // is no generated sentence to report yet.
    expect(render({ content: '…' })).not.toContain('chat-report-button');
  });

  it('labels the control in all four languages', () => {
    for (const { id } of LANGS) {
      const html = render({ lang: id });
      expect(html, `${id} aria-label`).toContain(`aria-label="${t(id, 'reportAria')}"`);
      expect(t(id, 'reportAria').trim().length).toBeGreaterThan(0);
    }
    // four distinct labels, not one English string rendered four times
    expect(new Set(LANGS.map(({ id }) => t(id, 'reportAria'))).size).toBe(4);
  });

  it('ChatPanel wires the control to the sheet and mounts it outside the scroller', () => {
    // Structural check only — ChatPanel cannot be rendered without the 3D
    // canvas, so the wiring is pinned at the source level.
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('setReportFor(reply)');
    expect(panel).toContain('<ReportDialog');
    expect(panel).toContain('onClose={() => setReportFor(null)}');
  });
});

describe('report dialog — honest, localized copy', () => {
  const dialog = read('components/ReportDialog.tsx');

  it('offers every store-review reason plus a free-text note and a cancel', () => {
    for (const key of [
      'reportReasonOffensive', 'reportReasonMinorSexual', 'reportReasonSelfHarm',
      'reportReasonHarmfulAdvice', 'reportReasonOther',
    ] as const) {
      expect(dialog).toContain(`'${key}'`);
    }
    expect(dialog).toContain('<textarea');
    expect(dialog).toContain('id="amoji-report-note"');
    expect(dialog).toContain("t(lang, 'reportCancel')");
  });

  it('is a real dialog, not an alert(), and traps focus', () => {
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('useFocusTrap');
    expect(dialog).toContain('tabIndex={-1}');
    // Comments explain the rule ("not a browser alert()"); only real calls count.
    const code = dialog.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/(?<![.\w])alert\s*\(/);
    expect(code).not.toMatch(/(?<![.\w])confirm\s*\(/);
    expect(code).not.toMatch(/(?<![.\w])prompt\s*\(/);
  });

  it('says the report stays on this device, in all four languages', () => {
    const LOCAL: Record<Lang, RegExp> = {
      en: /on this device only/i,
      yue: /呢部裝置/,
      zh: /这台设备/,
      ja: /この端末/,
    };
    for (const { id } of LANGS) {
      expect(t(id, 'reportSaved'), `${id} confirmation`).toMatch(LOCAL[id]!);
    }
    // and it never claims the report was sent
    for (const { id } of LANGS) {
      expect(t(id, 'reportSaved')).not.toMatch(/sent to our (server|team)/i);
    }
  });

  it('the English confirmation names the missing server and the export route', () => {
    expect(t('en', 'reportSaved')).toMatch(/no server/i);
    expect(t('en', 'reportSavedNext')).toMatch(/export/i);
    expect(t('en', 'reportIntro')).toMatch(/no server/i);
  });

  it('offers an optional contact email for API acknowledgment', () => {
    expect(dialog).toContain('amoji-report-email');
    expect(dialog).toContain('reportContactEmailLabel');
    expect(dialog).toContain('contactEmail');
  });

  it('links to the real issue tracker and invents no email address', () => {
    expect(dialog).toContain('github.com/MonMonMars/amoji-app');
    expect(dialog).not.toMatch(/mailto:/);
    expect(dialog).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  });
});

describe('report storage', () => {
  it('persists a submitted report with the chosen reason', () => {
    const saved = addReport({ reason: 'selfHarm', note: 'it told me to hurt myself', reply: 'do it', lang: 'en' });
    expect(saved).not.toBeNull();
    expect(saved!.reason).toBe('selfHarm');
    expect(saved!.note).toBe('it told me to hurt myself');
    expect(saved!.reply).toBe('do it');

    const stored = loadReports();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.reason).toBe('selfHarm');
    expect(stored[0]!.version).toBe(REPORTS_VERSION);
    expect(new Date(stored[0]!.at).toString()).not.toBe('Invalid Date');
  });

  it('every reason the dialog offers survives a round-trip', () => {
    for (const reason of REPORT_REASONS) {
      mem.clear();
      expect(addReport({ reason, reply: 'x' })!.reason).toBe(reason);
      expect(loadReports()[0]!.reason).toBe(reason);
    }
    expect(REPORT_REASONS).toContain('minorSexual');
  });

  it('writes under one versioned key', () => {
    addReport({ reason: 'offensive', reply: 'x' });
    const raw = JSON.parse(mem.get(REPORTS_KEY)!);
    expect(raw.version).toBe(REPORTS_VERSION);
    expect(Array.isArray(raw.reports)).toBe(true);
    expect(REPORTS_KEY).toBe('amoji.reports.v1');
  });

  it('caps the stored list and keeps the newest', () => {
    for (let i = 0; i < MAX_REPORTS + 12; i++) {
      addReport({ reason: 'other', note: `note-${i}`, reply: `reply-${i}` });
    }
    const stored = loadReports();
    expect(stored).toHaveLength(MAX_REPORTS);
    expect(reportCount()).toBe(MAX_REPORTS);
    // newest first, so the last thing submitted is at the head
    expect(stored[0]!.note).toBe(`note-${MAX_REPORTS + 11}`);
    // and the oldest submissions fell off
    expect(stored.some((r) => r.note === 'note-0')).toBe(false);
    // the raw box is bounded too, not just the read path
    expect(JSON.parse(mem.get(REPORTS_KEY)!).reports).toHaveLength(MAX_REPORTS);
  });

  it('clips an oversized reply and note instead of storing them whole', () => {
    const saved = addReport({
      reason: 'other',
      note: 'n'.repeat(MAX_NOTE_CHARS + 200),
      reply: 'r'.repeat(MAX_REPLY_CHARS + 500),
    })!;
    expect(saved.note).toHaveLength(MAX_NOTE_CHARS);
    expect(saved.reply).toHaveLength(MAX_REPLY_CHARS);
  });

  it('reports a failed write instead of pretending it saved', () => {
    // A quota error must not come back as a cheerful confirmation.
    (globalThis as { localStorage?: Storage }).localStorage = {
      ...ls,
      setItem: () => { throw new Error('QuotaExceededError'); },
      getItem: () => null,
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(addReport({ reason: 'offensive', reply: 'x' })).toBeNull();
  });

  it('ignores junk and a future version rather than throwing', () => {
    mem.set(REPORTS_KEY, 'not json at all');
    expect(loadReports()).toEqual([]);
    mem.set(REPORTS_KEY, JSON.stringify({ version: REPORTS_VERSION + 1, reports: [{ id: 'x' }] }));
    expect(loadReports()).toEqual([]);
    mem.set(REPORTS_KEY, JSON.stringify({ version: 1, reports: [{ nope: true }, { id: 'a', at: new Date().toISOString(), reason: 'other' }] }));
    expect(loadReports()).toHaveLength(1);
  });

  it('clearReports empties the store', () => {
    addReport({ reason: 'offensive', reply: 'x' });
    clearReports();
    expect(loadReports()).toEqual([]);
  });
});

describe('report export', () => {
  it('produces valid JSON that a person can read without the app', () => {
    addReport({ reason: 'minorSexual', note: 'bad', reply: 'something awful', characterId: 'a01-shino' });
    const json = exportReportsJson('r-test');
    const parsed = JSON.parse(json) as ReturnType<typeof buildReportFile>;
    expect(parsed.format).toBe('amoji-reports');
    expect(parsed.version).toBe(REPORTS_VERSION);
    expect(parsed.app).toBe('Amoji r-test');
    expect(parsed.count).toBe(1);
    expect(parsed.reports[0]!.reason).toBe('minorSexual');
    expect(parsed.reports[0]!.reply).toBe('something awful');
    expect(new Date(parsed.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('exports an empty but well-formed file when nothing was reported', () => {
    const parsed = JSON.parse(exportReportsJson('r-test'));
    expect(parsed.count).toBe(0);
    expect(parsed.reports).toEqual([]);
  });

  it('the dialog offers the export and names the file', () => {
    const src = read('lib/reports.ts');
    expect(src).toContain('downloadReports');
    expect(src).toContain('amoji-reports-');
    expect(src).toContain("type: 'application/json'");
  });
});

describe('report strings exist in all four languages', () => {
  const KEYS: StrKey[] = [
    'reportCta', 'reportAria', 'reportTitle', 'reportIntro', 'reportReasonLabel',
    'reportReasonOffensive', 'reportReasonMinorSexual', 'reportReasonSelfHarm',
    'reportReasonHarmfulAdvice', 'reportReasonOther',
    'reportNoteLabel', 'reportNotePlaceholder', 'reportSubmit', 'reportCancel', 'reportDone',
    'reportSaved', 'reportSavedNext', 'reportSaveFailed',
    'reportExport', 'reportExportEmpty', 'reportCountLabel', 'reportExported', 'reportExportFailed',
    'reportSendTo', 'reportSendToHint',
  ];

  it('every key is present and non-empty in en/yue/zh/ja', () => {
    const missing: string[] = [];
    for (const key of KEYS) {
      for (const { id } of LANGS) {
        const v = STRINGS[key][id];
        if (!v || !v.trim()) missing.push(`${key}.${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('CJK locales are genuinely translated, not copied English', () => {
    const copied: string[] = [];
    for (const key of KEYS) {
      for (const lang of ['yue', 'zh', 'ja'] as const) {
        if (STRINGS[key][lang] === STRINGS[key].en) copied.push(`${key}.${lang}`);
      }
    }
    expect(copied).toEqual([]);
  });

  it('the count line interpolates through t(lang, key, vars)', () => {
    expect(t('en', 'reportCountLabel', { n: '3' })).toContain('3');
    expect(t('ja', 'reportCountLabel', { n: '3' })).toContain('3');
    expect(t('en', 'reportCountLabel', { n: '3' })).not.toContain('{n}');
  });

  it('isReportReason only accepts the shipped reasons', () => {
    for (const r of REPORT_REASONS) expect(isReportReason(r)).toBe(true);
    expect(isReportReason('made-up')).toBe(false);
    expect(isReportReason(undefined)).toBe(false);
  });
});
