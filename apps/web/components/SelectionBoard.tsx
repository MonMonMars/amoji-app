'use client';
// The shared one-page selection board — BOTH /select (startup) and /change
// (in-chat switch) render this component. Keep it single-source: any future
// row/preview change lands here once and syncs to both pages automatically.
//
// mode 'start'  : picks apply live to saved prefs; confirm = "Meet {name} →".
// mode 'change' : picks edit a DRAFT — the preview keeps showing the existing
//                 character/scene/language until the user picks replacements;
//                 confirm = "Change", then back to the chat room.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HScrollRow from './HScrollRow';
import SceneBackdrop from './SceneBackdrop';
import { assetUrl } from '../lib/asset';
import { APP_REVISION } from '../lib/revision';
import {
  BACKGROUNDS, CHARACTERS, LANGS,
  backgroundById, characterById, t, usePrefs,
  type Prefs,
} from '../lib/prefs';

export default function SelectionBoard({ mode }: { mode: 'start' | 'change' }) {
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
  // draft is only used in 'change' mode; null = nothing picked yet
  const [draft, setDraft] = useState<Partial<Prefs> | null>(null);
  const live: Prefs = mode === 'change' ? { ...prefs, ...draft } : prefs;

  const character = characterById(live.character);
  const background = backgroundById(live.background);
  const lang = live.lang;
  const langNative = LANGS.find((l) => l.id === lang)?.native ?? lang;
  const dirty = draft !== null;

  const pick = (patch: Partial<Prefs>) => {
    if (mode === 'start') setPrefs(patch);
    else setDraft((d) => ({ ...d, ...patch }));
  };

  const confirm = () => {
    if (mode === 'change' && draft) setPrefs({ ...prefs, ...draft });
    router.push('/chat');
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-neutral-950 text-white">
      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          {mode === 'change' && (
            <button
              onClick={() => router.push('/chat')}
              aria-label={t(lang, 'back')}
              className="mr-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/70 transition hover:bg-white/15"
            >
              ←
            </button>
          )}
          <span className="h-3 w-3 rounded-full bg-pink-400" />
          <h1 className="text-lg font-bold tracking-tight">Amoji</h1>
        </div>
        <span className="text-xs text-white/30">{APP_REVISION}</span>
      </header>

      {/* row 0 — combined preview: existing picks (or the draft replacing them) */}
      <div className="mx-5 mt-4">
        <div className="relative h-36 overflow-hidden rounded-3xl border border-white/10">
          <SceneBackdrop background={background} />
          <div className="absolute inset-0 flex items-end p-3">
            <div className="flex w-full items-end gap-3">
              <span
                className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-black/40"
                style={{ borderColor: character.accent, boxShadow: `0 8px 24px -8px ${character.accent}aa` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl(character.image ?? `/portraits/${character.id}.jpg`)}
                  alt={character.name}
                  draggable={false}
                  className="h-full w-full object-cover object-top"
                />
              </span>
              <div className="min-w-0 flex-1 pb-0.5">
                <p className="text-lg font-bold drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                  {character.name}
                  <span className="ml-1.5 text-xs font-normal text-white/70">{character.gender === 'female' ? '♀' : '♂'}</span>
                </p>
                <p className="truncate text-xs text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                  {character.tagline[lang] ?? character.tagline.en}
                </p>
                {mode === 'change' && (
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/45">
                    {dirty ? t(lang, 'previewNew') : t(lang, 'previewCurrent')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 pb-0.5">
                <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium backdrop-blur-md">
                  {t(lang, background.nameKey as never)}
                </span>
                <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold backdrop-blur-md">
                  {langNative}
                </span>
              </div>
            </div>
          </div>
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
              const active = c.id === live.character;
              return (
                <button
                  key={c.id}
                  onClick={() => pick({ character: c.id })}
                  className={`flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-all ${
                    active ? 'border-transparent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${c.accent}, 0 10px 30px -12px ${c.accent}` } : undefined}
                >
                  <span
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-black/40"
                    style={active ? { boxShadow: `0 0 0 2px ${c.accent}` } : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={assetUrl(c.image ?? `/portraits/${c.id}.jpg`)}
                      alt={c.name}
                      draggable={false}
                      className="h-full w-full object-cover object-top"
                    />
                  </span>
                  <span className="text-xs font-semibold">{c.name}</span>
                  <span className="text-[10px] leading-none text-white/40">{c.gender === 'female' ? '♀' : '♂'}</span>
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
              const active = b.id === live.background;
              return (
                <button
                  key={b.id}
                  onClick={() => pick({ background: b.id })}
                  className={`w-36 shrink-0 overflow-hidden rounded-2xl border transition-all ${
                    active ? 'border-white/80' : 'border-white/10 hover:border-white/40'
                  }`}
                >
                  <span className="relative block h-20 w-full" style={{ background: b.css }}>
                    {b.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={assetUrl(b.image)}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="block bg-black/50 px-2 py-1.5 text-left text-[11px] text-white/75">{t(lang, b.nameKey as never)}</span>
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
              const active = l.id === live.lang;
              return (
                <button
                  key={l.id}
                  onClick={() => pick({ lang: l.id })}
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
          onClick={confirm}
          className="rounded-full bg-white px-10 py-3.5 text-base font-semibold text-black shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] transition hover:bg-white/85"
        >
          {mode === 'change' ? t(lang, 'changeCta') : t(lang, 'confirmCta', { name: character.name })}
        </button>
      </div>
    </main>
  );
}
