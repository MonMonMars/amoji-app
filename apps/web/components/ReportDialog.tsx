'use client';
// Compact per-reply report sheet (Play: in-app reporting for AI output).
//
// Deliberately NOT a browser alert(): it is a real modal with a reason radio
// group, an optional note, a Cancel, a focus trap and Escape-to-close. After
// saving it switches to a truthful confirmation — the report lives on this
// device, and the only way it reaches the developer is the user exporting the
// JSON and sending it. Every one of those claims matches lib/reports.ts.
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { APP_REVISION } from '../lib/revision';
import { REPORT_REASONS, MAX_REPLY_CHARS, addReport, downloadReports, reportCount, submitReportRemote, type ReportReason } from '../lib/reports';
import { t, type Lang, type StrKey } from '../lib/prefs';
import { useFocusTrap } from '../lib/use-focus-trap';

const REASON_LABEL: Record<ReportReason, StrKey> = {
  offensive: 'reportReasonOffensive',
  minorSexual: 'reportReasonMinorSexual',
  selfHarm: 'reportReasonSelfHarm',
  harmfulAdvice: 'reportReasonHarmfulAdvice',
  other: 'reportReasonOther',
};

export interface ReportDialogProps {
  /** the AI reply being reported — shown clipped in the sheet */
  reply: string;
  lang: Lang;
  accent?: string;
  characterId?: string;
  onClose: () => void;
}

export default function ReportDialog({ reply, lang, accent = '#f9a8d4', characterId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [note, setNote] = useState('');
  // null = still filling the form; 'saved' / 'failed' = the outcome screen
  const [outcome, setOutcome] = useState<'saved' | 'failed' | null>(null);
  const [count, setCount] = useState(0);
  const [exported, setExported] = useState<null | boolean>(null);

  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  // Run the open/close effect exactly once. Depending on `onClose` directly
  // would re-run it on every parent render (the prop is a fresh closure each
  // time), which would yank focus back to Close mid-typing.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Dismissible modal: focus Close on open, restore prior focus on close,
  // Escape closes (SettingsSheet parity — this is never a mandatory gate).
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      previousFocusRef.current?.focus?.();
    };
  }, []);

  const submit = () => {
    if (!reason) return;
    const saved = addReport({ reason, note, reply, characterId, lang });
    setCount(reportCount());
    setOutcome(saved ? 'saved' : 'failed');
    // Best-effort API + email ack when a production origin is configured.
    if (saved) {
      void submitReportRemote({ reason, note, reply, characterId, lang });
    }
  };

  const exportNow = () => setExported(downloadReports(APP_REVISION));

  return (
    <div
      // pointer-events-auto: ChatPanel's root is pointer-events-none so empty
      // margins fall through to the 3D canvas — a dialog inside it must opt
      // back in or every button in the sheet would be untappable.
      className="pointer-events-auto fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      data-testid="report-dialog-backdrop"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="report-dialog"
        className="fx-sheet-in max-h-[min(88dvh,34rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/15 bg-neutral-950/95 p-5 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">{t(lang, 'reportTitle')}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t(lang, 'reportCancel')}
            className="ui-btn shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {outcome === null ? (
          <>
            <p className="mb-3 text-xs leading-relaxed text-white/55">{t(lang, 'reportIntro')}</p>

            <blockquote
              data-testid="report-quote"
              className="mb-4 max-h-24 overflow-y-auto rounded-2xl border-l-2 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/70"
              style={{ borderColor: `${accent}80` }}
            >
              {reply.length > MAX_REPLY_CHARS ? `${reply.slice(0, MAX_REPLY_CHARS)}…` : reply}
            </blockquote>

            <fieldset className="mb-4">
              <legend className="mb-2 text-xs font-medium text-white/70">{t(lang, 'reportReasonLabel')}</legend>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 hover:bg-white/10"
                  >
                    <input
                      type="radio"
                      name="amoji-report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ accentColor: accent }}
                    />
                    <span>{t(lang, REASON_LABEL[r])}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor="amoji-report-note" className="mb-1 block text-xs font-medium text-white/70">
              {t(lang, 'reportNoteLabel')}
            </label>
            <textarea
              id="amoji-report-note"
              name="report-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(lang, 'reportNotePlaceholder')}
              className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/40"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="ui-btn rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white/75 hover:bg-white/20"
              >
                {t(lang, 'reportCancel')}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!reason}
                data-testid="report-submit"
                className="ui-btn rounded-full px-3.5 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
                style={{ backgroundColor: accent }}
              >
                {t(lang, 'reportSubmit')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              data-testid="report-confirmation"
              className={`mb-2 rounded-2xl border px-3 py-2.5 text-xs leading-relaxed ${
                outcome === 'saved'
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50'
                  : 'border-amber-400/30 bg-amber-500/10 text-amber-50'
              }`}
            >
              {outcome === 'saved' ? t(lang, 'reportSaved') : t(lang, 'reportSaveFailed')}
            </p>
            {outcome === 'saved' && (
              <p className="mb-3 text-xs leading-relaxed text-white/60">{t(lang, 'reportSavedNext')}</p>
            )}

            <p className="mb-2 text-[11px] text-white/40">
              {count > 0 ? t(lang, 'reportCountLabel', { n: String(count) }) : t(lang, 'reportExportEmpty')}
            </p>

            <button
              type="button"
              onClick={exportNow}
              className="ui-btn mb-1 w-full rounded-full bg-white/10 px-3 py-2 text-xs text-white/85 hover:bg-white/20"
            >
              {t(lang, 'reportExport')}
            </button>
            {exported !== null && (
              <p className="mb-2 text-[11px] text-white/45">
                {exported === true
                  ? t(lang, 'reportExported')
                  : exported === false
                    ? t(lang, 'reportExportFailed')
                    : ''}
              </p>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-white/45">
              {t(lang, 'reportSendToHint')}{' '}
              <a
                href="https://github.com/MonMonMars/amoji-app/issues"
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t(lang, 'reportSendTo')}
                className="text-pink-200 underline-offset-4 hover:underline"
              >
                github.com/MonMonMars/amoji-app
              </a>
            </p>
            <p className="mt-2 text-[11px] text-white/30">
              <Link href="/privacy" className="underline-offset-4 hover:underline">
                {t(lang, 'safetyPrivacyLink')}
              </Link>
            </p>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="ui-btn rounded-full px-4 py-1.5 text-xs font-semibold text-black"
                style={{ backgroundColor: accent }}
              >
                {t(lang, 'reportDone')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
