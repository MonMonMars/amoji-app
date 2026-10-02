'use client';
// One-page selector — preview strip on top, then characters, scenes,
// languages, a reserved future row, and a centered confirm button.
import { useRouter } from 'next/navigation';
import HScrollRow from '../../components/HScrollRow';
import { APP_REVISION } from '../../lib/revision';
import {
  BACKGROUNDS, CHARACTERS, LANGS,
  backgroundById, characterById, t, usePrefs,
} from '../../lib/prefs';

export default function Select() {
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
  const character = characterById(prefs.character);
  const background = backgroundById(prefs.background);
  const lang = prefs.lang;
  const langNative = LANGS.find((l) => l.id === lang)?.native ?? lang;

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-neutral-950 text-white">
      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-pink-400" />
          <h1 className="text-lg font-bold tracking-tight">Amoji</h1>
        </div>
        <span className="text-xs text-white/30">{APP_REVISION}</span>
      </header>

      {/* row 0 — live preview of the current picks */}
      <div className="mx-5 mt-4 flex items-stretch gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-black/70"
            style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${character.accent})` }}
          >
            {character.name[0]}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {character.name}
              <span className="ml-1.5 text-xs font-normal text-white/40">{character.gender === 'female' ? '♀' : '♂'}</span>
            </p>
            <p className="truncate text-xs text-white/50">{character.tagline[lang] ?? character.tagline.en}</p>
          </div>
        </div>
        <div className="flex w-28 shrink-0 flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-2">
          <span className="block h-12 w-full rounded-xl" style={{ background: background.css }} />
          <p className="pt-1.5 text-center text-[11px] text-white/60">{t(lang, background.nameKey)}</p>
        </div>
        <div className="flex w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 text-center text-sm font-semibold">
          {langNative}
        </div>
      </div>

      {/* rows 1-3 + reserved future row */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <section>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseCharacter')}
          </h2>
          <HScrollRow ariaLabel="characters">
            {CHARACTERS.map((c) => {
              const active = c.id === prefs.character;
              return (
                <button
                  key={c.id}
                  onClick={() => setPrefs({ character: c.id })}
                  className={`flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all ${
                    active ? 'border-transparent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${c.accent}, 0 10px 30px -12px ${c.accent}` } : undefined}
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-black/70"
                    style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${c.accent})` }}
                  >
                    {c.name[0]}
                  </span>
                  <span className="text-xs font-semibold">{c.name}</span>
                  <span className="text-[10px] text-white/40">{c.gender === 'female' ? '♀' : '♂'}</span>
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <section>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseBackground')}
          </h2>
          <HScrollRow ariaLabel="scenes">
            {BACKGROUNDS.map((b) => {
              const active = b.id === prefs.background;
              return (
                <button
                  key={b.id}
                  onClick={() => setPrefs({ background: b.id })}
                  className={`w-36 shrink-0 overflow-hidden rounded-2xl border transition-all ${
                    active ? 'border-white/80' : 'border-white/10 hover:border-white/40'
                  }`}
                >
                  <span className="block h-16 w-full" style={{ background: b.css }} />
                  <span className="block bg-black/50 px-2 py-1.5 text-left text-[11px] text-white/75">{t(lang, b.nameKey)}</span>
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <section>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseLanguage')}
          </h2>
          <HScrollRow ariaLabel="languages">
            {LANGS.map((l) => {
              const active = l.id === prefs.lang;
              return (
                <button
                  key={l.id}
                  onClick={() => setPrefs({ lang: l.id })}
                  className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-medium transition ${
                    active ? 'bg-white text-black' : 'bg-white/10 text-white/75 hover:bg-white/20'
                  }`}
                >
                  {l.native}
                </button>
              );
            })}
          </HScrollRow>
        </section>

        {/* reserved row — future features land here */}
        <section>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/25">✦</h2>
          <HScrollRow ariaLabel="future">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex h-[104px] w-32 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs text-white/25"
              >
                {t(lang, 'comingSoon')}
              </div>
            ))}
          </HScrollRow>
        </section>
      </div>

      {/* confirm — centered at the bottom */}
      <div className="flex justify-center pb-6 pt-2">
        <button
          onClick={() => router.push('/chat')}
          className="rounded-full bg-white px-10 py-3.5 text-base font-semibold text-black shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] transition hover:bg-white/85"
        >
          {t(lang, 'confirmCta', { name: character.name })}
        </button>
      </div>
    </main>
  );
}
