'use client';
// Selection grids shared by the setup flow and the in-chat settings sheet.
import { assetUrl } from '../lib/asset';
import { CHARACTERS, BACKGROUNDS, LANGS, t, type CharacterDef, type Lang, type LangDef, type Prefs } from '../lib/prefs';
import ModelThumb from './ModelThumb';

export function CharacterGrid({ lang, value, onChange }: { lang: Lang; value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CHARACTERS.map((c: CharacterDef) => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
              active ? 'border-transparent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
            style={active ? { boxShadow: `0 0 0 2px ${c.accent}, 0 8px 30px -10px ${c.accent}66` } : undefined}
          >
            <span
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-black/70"
              style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${c.accent})` }}
            >
              <ModelThumb url={c.model} accent={c.accent} name={c.name} image={c.image} />
            </span>
            <span className="text-base font-semibold text-white">
              {c.name}
              <span className="ml-1.5 text-xs font-normal text-white/50">{c.gender === 'female' ? '♀' : '♂'}</span>
            </span>
            <span className="text-xs text-white/60">{c.tagline[lang] ?? c.tagline.en}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BackgroundGrid({ lang, value, onChange }: { lang: Lang; value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {BACKGROUNDS.map((b) => {
        const active = b.id === value;
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className={`overflow-hidden rounded-2xl border text-left transition-all ${
              active ? 'border-white/80' : 'border-white/10 hover:border-white/40'
            }`}
          >
            <span className="relative block h-16 w-full" style={{ background: b.css }}>
              {b.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(b.image)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              )}
            </span>
            <span className="block bg-black/50 px-2 py-1.5 text-xs text-white/80">{t(lang, b.nameKey as never)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Face of a language card. The parent supplies the portrait frame. */
export function LangCardFace({ lang, active }: { lang: LangDef; active: boolean }) {
  return (
    <>
      <span
        className="absolute inset-0 [container-type:size]"
        style={{
          background: `radial-gradient(circle at 50% 28%, #ffffffee, ${lang.accent} 46%, #1c1917 100%)`,
        }}
      >
        <span
          className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 font-black leading-none text-neutral-950 drop-shadow-[0_2px_0_rgba(255,255,255,0.45)]"
          style={{ fontSize: lang.glyph.length > 1 ? '28cqh' : '42cqh' }}
        >
          {lang.glyph}
        </span>
      </span>
      <span
        className="absolute right-2 top-2 z-20 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-neutral-950 px-1 text-[11px] font-extrabold text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        style={{ background: lang.accent }}
      >
        {lang.mark}
      </span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-8 text-center">
        <span className="block truncate text-sm font-semibold leading-tight sm:text-base">{lang.native}</span>
      </span>
      {active && (
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: `inset 0 0 0 2px ${lang.accent}` }}
        />
      )}
    </>
  );
}

const langCardFrame = (active: boolean): { className: string; style: { boxShadow: string; filter: string } } => ({
  className: `fx-press ui-card relative aspect-[6/8.4] w-full overflow-hidden rounded-2xl border text-left ${
    active ? 'border-white/90' : 'border-white/15'
  }`,
  style: active
    ? {
        boxShadow: '0 18px 40px -18px rgba(0,0,0,0.85), 0 0 0 2px rgba(255,255,255,0.9), inset 0 1px 0 rgba(255,255,255,0.35)',
        filter: 'brightness(1.08) saturate(1.05)',
      }
    : {
        boxShadow: '0 10px 24px -16px rgba(0,0,0,0.8)',
        filter: 'brightness(0.78) saturate(0.9)',
      },
});

/** Settings and setup: the same portrait cards, in a centered row. */
export function LangChips({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="mx-auto grid w-full max-w-lg grid-cols-4 items-center justify-center gap-2">
      {LANGS.map((l) => {
        const active = value === l.id;
        const frame = langCardFrame(active);
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(l.id)}
            className={frame.className}
            style={frame.style}
          >
            <LangCardFace lang={l} active={active} />
          </button>
        );
      })}
    </div>
  );
}

export type { Prefs };
