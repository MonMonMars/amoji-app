'use client';
// The shared one-page selection board — BOTH /select (startup) and /change
// (in-chat switch) render this component. Keep it single-source: any future
// row/preview change lands here once and syncs to both pages automatically.
//
// mode 'start'  : picks apply live to saved prefs; confirm = "Meet {name} →".
// mode 'change' : picks edit a DRAFT — the preview keeps showing the existing
//                 character/scene/language until the user picks replacements;
//                 confirm = "Change", then back to the chat room.
// Kid Mode (r2026-10-03.03) filters the rows to the wholesome cast + sunny scenes.
// r2026-10-03.33: the top-row preview chip streams the picked character REAL
// 3D model (live portrait), with the painted art as poster/fallback.
// r2026-10-03.34: every character card in the scroll row streams its own live
// 3D bust too, lazy-mounted only while the card is on screen, so the whole
// cast is browsed as real faces without drowning the GPU in WebGL contexts.
// r2026-10-04.55: each character card carries a #1-#29 number badge (index in
// the FULL cast) so Master Simon can reference characters by number; Kid Mode
// filtering never renumbers anyone.
// r2026-10-04.78 (Master Simon): the badge LIVES OUTSIDE the clipped portrait
// circle now — it used to hang at the circle's top-left corner, where the
// circle's overflow-hidden cut it to a sliver and the row's scroll arrows sat
// on top of it. Now it's pinned to the card's top-right corner, bigger, with
// a solid ring — nothing can clip or cover it.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import HScrollRow from './HScrollRow';
import SceneBackdrop from './SceneBackdrop';
import ModelPreview from './ModelPreview';
import { assetUrl } from '../lib/asset';
import { APP_REVISION } from '../lib/revision';
import { lookFor } from '../lib/persona';
import {
  BACKGROUNDS, CHARACTERS, LANGS,
  backgroundById, characterById, t, usePrefs,
  type Prefs,
} from '../lib/prefs';

// Live 3D bust for one character card in the scroll row. The expensive part
// (WebGL context + VRM stream) only starts once the card scrolls near the
// viewport; the painted art stays underneath as poster and as the fallback
// when a model link fails. Once streamed, the bust stays mounted while the
// page lives, so scrolling back never re-streams.
function CharacterBust({ id, image, url }: { id: string; image?: string; url?: string }) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [ready, setReady] = useState(false);
  const look = lookFor(id);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || onScreen) return;
    if (typeof IntersectionObserver === 'undefined') { setOnScreen(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setOnScreen(true); io.disconnect(); }
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onScreen]);

  return (
    <span ref={hostRef} className="absolute inset-0 block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl(image ?? `/portraits/${id}.jpg`)}
        alt=""
        draggable={false}
        className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${
          ready && url ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {url && onScreen && (
        <div
          key={id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ModelPreview
            url={url}
            tint={look.tint}
            height={look.height}
            width={look.width}
            orbit
            onReady={() => setReady(true)}
          />
        </div>
      )}
    </span>
  );
}

export default function SelectionBoard({ mode }: { mode: 'start' | 'change' }) {
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
  // draft is only used in 'change' mode; null = nothing picked yet
  const [draft, setDraft] = useState<Partial<Prefs> | null>(null);
  // which character id currently has its live 3D preview streamed in
  const [previewReadyFor, setPreviewReadyFor] = useState<string | null>(null);
  const live: Prefs = mode === 'change' ? { ...prefs, ...draft } : prefs;

  const character = characterById(live.character);
  const background = backgroundById(live.background);
  const lang = live.lang;
  const langNative = LANGS.find((l) => l.id === lang)?.native ?? lang;
  const dirty = draft !== null;

  // Kid Mode filters the board to the wholesome cast + sunny scenes.
  const cast = prefs.kidMode ? CHARACTERS.filter((c) => c.kidSafe) : CHARACTERS;
  const scenes = prefs.kidMode ? BACKGROUNDS.filter((b) => b.kidSafe) : BACKGROUNDS;

  const pick = (patch: Partial<Prefs>) => {
    if (mode === 'start') setPrefs(patch);
    else setDraft((d) => ({ ...d, ...patch }));
  };

  const confirm = () => {
    if (mode === 'change' && draft) setPrefs({ ...prefs, ...draft });
    router.push('/chat');
  };

  return (
    <main className="fx-page flex h-dvh flex-col overflow-hidden bg-neutral-950 text-white">
      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          {mode === 'change' && (
            <button
              onClick={() => router.push('/chat')}
              aria-label={t(lang, 'back')}
              className="ui-btn mr-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/15"
            >
              ←
            </button>
          )}
          <span className="h-3 w-3 rounded-full bg-pink-400" />
          <h1 className="text-lg font-bold tracking-tight">Amoji</h1>
          {prefs.kidMode && <span className="text-base" title="Kid mode">🧸</span>}
        </div>
        <span className="text-xs text-white/30">{APP_REVISION}</span>
      </header>

      {/* row 0 — combined preview: existing picks (or the draft replacing them) */}
      <div className="fx-rise mx-5 mt-4" style={{ '--d': '20ms' } as CSSProperties}>
        <div className="fx-sheen relative h-36 overflow-hidden rounded-3xl border border-white/10">
          <SceneBackdrop background={background} />
          <div className="absolute inset-0 flex items-end p-3">
            <div className="flex w-full items-end gap-3">
              <span
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-black/40"
                style={{ borderColor: character.accent, boxShadow: `0 8px 24px -8px ${character.accent}aa` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl(character.image ?? `/portraits/${character.id}.jpg`)}
                  alt={character.name}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
                {/* live 3D portrait fades in over the poster once streamed —
                    keyed per character so switching picks resets the fade */}
                {character.model && (
                  <div
                    key={character.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      previewReadyFor === character.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <ModelPreview
                      url={character.model}
                      tint={lookFor(character.id).tint}
                      height={lookFor(character.id).height}
                      width={lookFor(character.id).width}
                      onReady={() => setPreviewReadyFor(character.id)}
                    />
                  </div>
                )}
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
        <section className="fx-rise" style={{ '--d': '70ms' } as CSSProperties}>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseCharacter')}
          </h2>
          <HScrollRow ariaLabel="characters">
            {cast.map((c) => {
              const active = c.id === live.character;
              // Stable cast number — index in the FULL cast + 1, so Kid Mode
              // filtering never renumbers anyone (numbers are how the user
              // orders model swaps: "give #7 the new Tifa model").
              const num = CHARACTERS.findIndex((x) => x.id === c.id) + 1;
              return (
                <button
                  key={c.id}
                  onClick={() => pick({ character: c.id })}
                  className={`ui-card relative flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2.5 ${
                    active ? 'border-transparent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${c.accent}, 0 10px 30px -12px ${c.accent}` } : undefined}
                >
                  {/* r78: number badge pinned to the CARD corner, outside the
                      clipped portrait circle — it used to live at the circle's
                      top-left, where overflow-hidden trimmed it and the row's
                      scroll arrows covered it. z-20 keeps it above the 3D
                      busts and the arrows; the ring makes it readable on any
                      accent color. */}
                  <span
                    className="absolute -right-1.5 -top-1.5 z-20 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-neutral-950 px-1.5 text-[11px] font-extrabold text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
                    style={{ background: c.accent }}
                    title={`#${num}`}
                  >
                    {num}
                  </span>
                  <span
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-black/40"
                    style={active ? { boxShadow: `0 0 0 2px ${c.accent}` } : undefined}
                  >
                    <CharacterBust id={c.id} image={c.image} url={c.model} />
                  </span>
                  <span className="text-xs font-semibold">{c.name}</span>
                  <span className="text-[10px] leading-none text-white/40">{c.gender === 'female' ? '♀' : '♂'}</span>
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <section className="fx-rise" style={{ '--d': '130ms' } as CSSProperties}>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseBackground')}
          </h2>
          <HScrollRow ariaLabel="scenes">
            {scenes.map((b) => {
              const active = b.id === live.background;
              return (
                <button
                  key={b.id}
                  onClick={() => pick({ background: b.id })}
                  className={`ui-card w-36 shrink-0 overflow-hidden rounded-2xl border ${
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

        <section className="fx-rise" style={{ '--d': '190ms' } as CSSProperties}>
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
                  className={`ui-btn shrink-0 rounded-full px-6 py-2.5 text-sm font-medium hover:scale-105 ${
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
        <section className="fx-rise" style={{ '--d': '250ms' } as CSSProperties}>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/25">✦</h2>
          <HScrollRow ariaLabel="future">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="ui-card flex h-[104px] w-32 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs text-white/25"
              >
                {t(lang, 'comingSoon')}
              </div>
            ))}
          </HScrollRow>
        </section>
      </div>

      {/* confirm — centered at the bottom */}
      <div className="fx-rise flex justify-center pb-6 pt-2" style={{ '--d': '310ms' } as CSSProperties}>
        <button
          onClick={confirm}
          className="ui-btn ui-btn-primary rounded-full bg-white px-10 py-3.5 text-base font-semibold text-black shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]"
        >
          {mode === 'change' ? t(lang, 'changeCta') : t(lang, 'confirmCta', { name: character.name })}
        </button>
      </div>
    </main>
  );
}
