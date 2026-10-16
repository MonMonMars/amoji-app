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
// r2026-10-05.104: SUPERSEDES r34 — the per-card live 3D busts are retired
// (29 live WebGL streams on one page melted GPUs; CORS-blocked remote models
// burned the rest). The scroll row now shows cheap runtime-rendered one-frame
// thumbnails (ModelThumb, cached JPEG per model), and only the TOP preview
// chip keeps the live ModelPreview. The r34 notes above stay as history.
// r2026-10-05.105 (Master Simon): every scroll row gets scroll position
// memory — each row reopens where the user left it (select ⇄ change
// round-trips) or, on a fresh entry, centered on the currently selected tile;
// picking a new tile re-centers and becomes the next entry's anchor. Tiles
// carry data-row-item so HScrollRow can find the selected one.
// r2026-10-05.123 (Master Simon: "no need to show the real 3D model — an
// image is good enough; put it on the background selected"): the row-0
// preview now composites the r123 baked ALPHA-PNG cutout of her posed body
// over the picked scene — a realistic standing-in-the-scene preview with zero
// live WebGL on this page. Falls back to the painted portrait chip when the
// cutout is missing (old bakes), and the live ModelPreview stream is retired.
// r2026-10-06.136 (Master Simon: "the first row now only shows the legs of
// the character, please show the whole body"): the row-0 card is taller
// (h-44) and the cutout is cropped to the WHOLE body inside the card (96% of
// its height, anchored to the floor line) instead of overflowing it from the
// waist up.
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import HScrollRow from './HScrollRow';
import SceneBackdrop from './SceneBackdrop';
import ModelThumb from './ModelThumb';
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

  // Front release PNG (character.image). A failed load becomes a monogram.
  const [portraitOk, setPortraitOk] = useState(true);
  useEffect(() => { setPortraitOk(true); }, [character.id]);

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

      {/* Top row: the SELECTED character and SELECTED background are the
          main visual. Everything under this card is a smaller thumbnail. */}
      <div
        data-testid="selection-hero"
        className="fx-rise mx-5 mt-3 min-h-0 flex-1"
        style={{ '--d': '20ms' } as CSSProperties}
      >
        <div className="fx-sheen relative h-full min-h-[36vh] overflow-hidden rounded-3xl border border-white/10">
          <SceneBackdrop background={background} />
          {portraitOk && character.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(character.image)}
              alt={character.name}
              draggable={false}
              onError={() => setPortraitOk(false)}
              className="absolute bottom-0 left-1/2 h-[88%] w-auto max-w-[78%] -translate-x-1/2 object-contain object-bottom"
              style={{ filter: `drop-shadow(0 14px 24px rgba(0,0,0,0.55)) drop-shadow(0 0 28px ${character.accent}55)` }}
            />
          ) : (
            <span
              className="absolute left-1/2 top-[14%] flex h-40 w-40 -translate-x-1/2 items-center justify-center rounded-[2rem] text-6xl font-bold text-black/70"
              style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${character.accent})` }}
            >
              {character.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="min-w-0">
              <p className="text-2xl font-bold drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                {character.name}
                <span className="ml-1.5 text-sm font-normal text-white/70">{character.gender === 'female' ? '♀' : '♂'}</span>
              </p>
              <p className="truncate text-sm text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {character.tagline[lang] ?? character.tagline.en}
              </p>
              {mode === 'change' && (
                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/55">
                  {dirty ? t(lang, 'previewNew') : t(lang, 'previewCurrent')}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
              {t(lang, background.nameKey as never)} · {langNative}
            </span>
          </div>
        </div>
      </div>

      {/* rows 1-3 + reserved future row */}
      <div data-testid="selection-thumbs" className="shrink-0 space-y-1 overflow-hidden px-4 pb-1">
        <section className="fx-rise" style={{ '--d': '70ms' } as CSSProperties}>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseCharacter')}
          </h2>
          <HScrollRow ariaLabel="characters" rowKey="characters" selectedId={live.character}>
            {cast.map((c) => {
              const active = c.id === live.character;
              // Stable cast number — index in the FULL cast + 1, so Kid Mode
              // filtering never renumbers anyone (numbers are how the user
              // orders model swaps: "give #7 the new Tifa model").
              const num = CHARACTERS.findIndex((x) => x.id === c.id) + 1;
              return (
                <button
                  key={c.id}
                  data-row-item={c.id}
                  onClick={() => pick({ character: c.id })}
                  className={`ui-card relative flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1 rounded-xl border p-1.5 ${
                    active ? 'border-transparent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${c.accent}, 0 10px 30px -12px ${c.accent}` } : undefined}
                >
                  {/* r78: number badge pinned to the CARD corner, outside the
                      clipped portrait circle — it used to live at the circle's
                      top-left, where overflow-hidden trimmed it and the row's
                      scroll arrows covered it. z-20 keeps it above the
                      thumbnails and the arrows; the ring makes it readable on
                      any accent color. */}
                  <span
                    className="absolute -right-1 -top-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-neutral-950 px-1 text-[8px] font-extrabold text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    style={{ background: c.accent }}
                    title={`#${num}`}
                  >
                    {num}
                  </span>
                  <span
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/40"
                    style={active ? { boxShadow: `0 0 0 2px ${c.accent}` } : undefined}
                  >
                    {/* r104: runtime-rendered cached thumbnail (falls back to
                        painted art / accent monogram) instead of a live bust.
                        r114: pre-baked posed screenshot wins when present. */}
                    <ModelThumb url={c.model} accent={c.accent} name={c.name} image={c.image} />
                  </span>
                  <span className="max-w-full truncate text-[9px] font-semibold leading-tight">{c.name}</span>
                  <span className="text-[8px] leading-none text-white/40">{c.gender === 'female' ? '♀' : '♂'}</span>
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <section className="fx-rise" style={{ '--d': '130ms' } as CSSProperties}>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseBackground')}
          </h2>
          <HScrollRow ariaLabel="scenes" rowKey="backgrounds" selectedId={live.background}>
            {scenes.map((b) => {
              const active = b.id === live.background;
              return (
                <button
                  key={b.id}
                  data-row-item={b.id}
                  onClick={() => pick({ background: b.id })}
                  className={`ui-card w-24 shrink-0 snap-start overflow-hidden rounded-xl border ${
                    active ? 'border-white/80' : 'border-white/10 hover:border-white/40'
                  }`}
                >
                  <span className="relative block h-12 w-full" style={{ background: b.css }}>
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
                  <span className="block truncate bg-black/50 px-1 py-0.5 text-left text-[8px] leading-tight text-white/75">{t(lang, b.nameKey as never)}</span>
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <section className="fx-rise" style={{ '--d': '190ms' } as CSSProperties}>
          <h2 className="mb-0.5 pl-1 text-xs font-medium uppercase tracking-widest text-white/50">
            {t(lang, 'chooseLanguage')}
          </h2>
          <HScrollRow ariaLabel="languages" rowKey="languages" selectedId={live.lang}>
            {LANGS.map((l) => {
              const active = l.id === live.lang;
              return (
                <button
                  key={l.id}
                  data-row-item={l.id}
                  onClick={() => pick({ lang: l.id })}
                  className={`ui-btn shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium hover:scale-105 ${
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
                className="ui-card flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/10 text-[9px] text-white/25"
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
          className="ui-btn ui-btn-primary rounded-full bg-white px-8 py-2.5 text-sm font-semibold text-black shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]"
        >
          {mode === 'change' ? t(lang, 'changeCta') : t(lang, 'confirmCta', { name: character.name })}
        </button>
      </div>
    </main>
  );
}
