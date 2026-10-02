'use client';
// Slide-over settings sheet, reachable from the chat room (⚙).
import { t, type Prefs } from '../lib/prefs';
import { CharacterGrid, BackgroundGrid, LangChips } from './selectors';

export default function SettingsSheet({
  open, prefs, onChange, onClose,
}: {
  open: boolean;
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const lang = prefs.lang;
  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-neutral-950/90 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t(lang, 'settings')}</h2>
          <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20">✕</button>
        </div>
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{t(lang, 'chooseCharacter')}</h3>
            <CharacterGrid lang={lang} value={prefs.character} onChange={(id) => onChange({ character: id })} />
          </section>
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{t(lang, 'chooseBackground')}</h3>
            <BackgroundGrid lang={lang} value={prefs.background} onChange={(id) => onChange({ background: id })} />
          </section>
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{t(lang, 'chooseLanguage')}</h3>
            <LangChips value={prefs.lang} onChange={(l) => onChange({ lang: l })} />
          </section>
        </div>
      </div>
    </div>
  );
}
