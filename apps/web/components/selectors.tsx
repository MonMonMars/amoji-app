'use client';
// Selection grids shared by the setup flow and the in-chat settings sheet.
import { assetUrl } from '../lib/asset';
import { CHARACTERS, BACKGROUNDS, LANGS, t, type CharacterDef, type Lang, type Prefs } from '../lib/prefs';
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
              {/* r104: runtime-rendered cached thumbnail — painted art stays
                  as poster, accent monogram until the render lands */}
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

export function LangChips({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${
            value === l.id ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'
          }`}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}

export type { Prefs };
