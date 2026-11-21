'use client';
// Settings keep/delete list for TTS-001..TTS-218. This is a catalog, not the
// playable gTTS button row — Edge previews may fail (endpoint often 403s),
// and link-only engines are listed without being bundled.

import { useMemo, useState } from 'react';
import { t, type Lang } from '../lib/prefs';
import type { VoiceLocale } from '../lib/voice-catalog';
import {
  setTtsAppPickVerdict,
  ttsAppPickGender,
  ttsAppPickShortName,
  ttsAppPickVerdict,
  ttsAppPicksForLocale,
  TTS_APP_PICK_COUNTS,
  type TtsAppPick,
  type TtsAppPickVerdict,
} from '../lib/tts-app-picks';
import { edgeEndpointsDead, speakEdge, stopEdge } from '../lib/edge-tts';

const LOCALES: VoiceLocale[] = ['yue', 'zh', 'ja', 'en'];
const LANGUAGE_LABEL: Record<VoiceLocale, string> = {
  yue: '廣東話',
  zh: '中文',
  ja: '日本語',
  en: 'English',
};
const PREVIEW_LINE: Record<VoiceLocale, string> = {
  yue: '你好，我係呢把聲。',
  zh: '你好，我是这个声音。',
  ja: 'こんにちは、この声です。',
  en: 'Hello, this is this voice.',
};

export default function TtsAppPicksPanel({
  lang,
  accent,
}: {
  lang: Lang;
  accent: string;
}) {
  const [rev, setRev] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const onVerdict = (id: string, verdict: TtsAppPickVerdict) => {
    const current = ttsAppPickVerdict(id);
    setTtsAppPickVerdict(id, current === verdict ? null : verdict);
    setRev((n) => n + 1);
  };

  const onPreview = (row: TtsAppPick, locale: VoiceLocale) => {
    if (row.kind !== 'edge' || !row.edgeVoiceId) return;
    if (edgeEndpointsDead()) {
      setNote(t(lang, 'ttsPicksEdge'));
      return;
    }
    setPlaying(row.id);
    setNote(null);
    stopEdge();
    void speakEdge(PREVIEW_LINE[locale], {
      lang: locale,
      gender: ttsAppPickGender(row),
      voiceId: row.edgeVoiceId,
      gestureTap: true,
    })
      .then(() => setPlaying((id) => (id === row.id ? null : id)))
      .catch(() => {
        setPlaying((id) => (id === row.id ? null : id));
        setNote(t(lang, 'ttsPicksEdge'));
      });
  };

  return (
    <section className="space-y-2" data-testid="tts-app-picks" data-rev={rev}>
      <div>
        <h3 className="text-sm text-white/85">{t(lang, 'ttsPicksTitle')}</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{t(lang, 'ttsPicksHint')}</p>
        {note && (
          <p className="mt-1 text-[10px] leading-relaxed text-white/40" role="status">
            {note}
          </p>
        )}
      </div>
      {LOCALES.map((locale) => (
        <LocalePicks
          key={locale}
          locale={locale}
          lang={lang}
          accent={accent}
          playing={playing}
          onVerdict={onVerdict}
          onPreview={onPreview}
        />
      ))}
    </section>
  );
}

function LocalePicks({
  locale,
  lang,
  accent,
  playing,
  onVerdict,
  onPreview,
}: {
  locale: VoiceLocale;
  lang: Lang;
  accent: string;
  playing: string | null;
  onVerdict: (id: string, verdict: TtsAppPickVerdict) => void;
  onPreview: (row: TtsAppPick, locale: VoiceLocale) => void;
}) {
  const rows = useMemo(() => ttsAppPicksForLocale(locale), [locale]);
  const counts = TTS_APP_PICK_COUNTS[locale];
  return (
    <div className="space-y-1.5" data-testid={`tts-app-picks-${locale}`}>
      <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
        {LANGUAGE_LABEL[locale]} · {counts.total}
      </h4>
      <div className="max-h-80 space-y-1 overflow-y-auto pr-0.5">
        {rows.map((row) => (
          <PickRow
            key={`${locale}-${row.id}`}
            row={row}
            lang={lang}
            accent={accent}
            playing={playing === row.id}
            onVerdict={onVerdict}
            onPreview={() => onPreview(row, locale)}
          />
        ))}
      </div>
    </div>
  );
}

function PickRow({
  row,
  lang,
  accent,
  playing,
  onVerdict,
  onPreview,
}: {
  row: TtsAppPick;
  lang: Lang;
  accent: string;
  playing: boolean;
  onVerdict: (id: string, verdict: TtsAppPickVerdict) => void;
  onPreview: () => void;
}) {
  const verdict = ttsAppPickVerdict(row.id);
  const kindLabel = row.kind === 'edge' ? t(lang, 'ttsPicksEdge') : t(lang, 'ttsPicksLinkOnly');
  const star = row.preferred ? ' ★' : '';
  const label = `${row.id}${star} ${ttsAppPickShortName(row)} · ${row.gender || '—'} · ${kindLabel}`;
  return (
    <div
      data-testid={`tts-pick-${row.id}`}
      data-tts-id={row.id}
      data-tts-kind={row.kind}
      className="flex items-start gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-tight text-white/90">{label}</p>
        {row.note && <p className="mt-0.5 text-[10px] leading-snug text-white/40">{row.note}</p>}
        {playing && <p className="text-[10px] text-white/55">…</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {row.kind === 'edge' && (
          <button
            type="button"
            data-testid={`tts-pick-preview-${row.id}`}
            onClick={onPreview}
            className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/80"
          >
            {t(lang, 'ttsPicksPreview')}
          </button>
        )}
        <button
          type="button"
          aria-pressed={verdict === 'keep'}
          data-testid={`tts-pick-keep-${row.id}`}
          onClick={() => onVerdict(row.id, 'keep')}
          className={`rounded-full border px-2 py-0.5 text-[10px] ${
            verdict === 'keep' ? 'border-white/80 text-white' : 'border-white/15 text-white/70'
          }`}
          style={verdict === 'keep' ? { backgroundColor: `${accent}33` } : undefined}
        >
          {t(lang, 'ttsPicksKeep')}
        </button>
        <button
          type="button"
          aria-pressed={verdict === 'delete'}
          data-testid={`tts-pick-delete-${row.id}`}
          onClick={() => onVerdict(row.id, 'delete')}
          className={`rounded-full border px-2 py-0.5 text-[10px] ${
            verdict === 'delete' ? 'border-white/80 text-white' : 'border-white/15 text-white/70'
          }`}
        >
          {t(lang, 'ttsPicksDelete')}
        </button>
      </div>
    </div>
  );
}
