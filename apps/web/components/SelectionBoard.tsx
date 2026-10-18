'use client';
// Shared selection board for /select and /change.
// The stage is the chat room: the same SceneBackdrop and the same live
// CompanionCanvas (VRM, camera, wardrobe). A thumb tap swaps that body
// immediately — there is no flat portrait or cutout standing in for her.
// The bottom strip is a centered card fan: 2D release portraits (never a
// live VRM frame) and scene stills, lettered A, B, C… daytime → nighttime.
// The stage behind them stays the live CompanionCanvas.
import dynamic from 'next/dynamic';
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import ArcFan from './ArcFan';
import HScrollRow from './HScrollRow';
import SceneBackdrop from './SceneBackdrop';
import ModelThumb from './ModelThumb';
import FallbackNotice from './FallbackNotice';
import { assetUrl } from '../lib/asset';
import { activeWardrobe } from '../lib/modular/catalog';
import { useModularSelection } from '../lib/modular/storage';
import { getLoadProgress, onLoadProgress, type LoadProgress } from '../lib/load-progress';
import {
  BACKGROUNDS, CHARACTERS, LANGS,
  backgroundById, backgroundLetter, characterById, t, usePrefs,
  type Lang, type Prefs,
} from '../lib/prefs';

const CompanionCanvas = dynamic(() => import('./CompanionCanvas'), { ssr: false });

export default function SelectionBoard({ mode }: { mode: 'start' | 'change' }) {
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
  const [draft, setDraft] = useState<Partial<Prefs> | null>(null);
  const [notice, setNotice] = useState<{ reason: 'webgl' | 'asset' } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const live: Prefs = mode === 'change' ? { ...prefs, ...draft } : prefs;

  const character = characterById(live.character);
  const background = backgroundById(live.background);
  const lang = live.lang;
  const dirty = draft !== null;
  const storedWardrobe = useModularSelection();
  const wardrobe = activeWardrobe(character.id, storedWardrobe);

  const cast = prefs.kidMode ? CHARACTERS.filter((c) => c.kidSafe) : CHARACTERS;
  const scenes = prefs.kidMode ? BACKGROUNDS.filter((b) => b.kidSafe) : BACKGROUNDS;

  const pick = (patch: Partial<Prefs>) => {
    if (mode === 'start') setPrefs(patch);
    else setDraft((d) => ({ ...d, ...patch }));
  };

  const confirm = () => {
    if (leaving) return;
    const go = () => {
      if (mode === 'change' && draft) setPrefs({ ...prefs, ...draft });
      router.push('/chat');
    };
    // Fade + slight scale, then navigate. Reduced motion skips the wait.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      go();
      return;
    }
    setLeaving(true);
    window.setTimeout(go, 340);
  };

  return (
    <main
      className={`${leaving ? 'fx-select-out' : 'fx-select-in'} fx-select relative h-dvh w-screen overflow-hidden text-white`}
      style={{ background: background.css }}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-30 ${leaving ? 'fx-route-veil-out' : 'fx-route-veil-in'}`}
      />
      <div data-testid="selection-hero" className="absolute inset-0">
        <SceneBackdrop background={background} />
        <CompanionCanvas
          accent={character.accent}
          seedKey={character.id}
          wardrobeHeadId={wardrobe?.headId}
          wardrobeBodyId={wardrobe?.bodyId}
          lighting={background.setting === 'indoor' ? 'indoor' : 'outdoor'}
          onNotice={setNotice}
        />
      </div>

      <LoadChip accent={character.accent} lang={lang} />
      {notice && <FallbackNotice reason={notice.reason} />}

      <div
        data-testid="selection-thumbs"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12 sm:px-6"
      >
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-center gap-2">
        <div className="w-full min-w-0 px-1 text-center">
          <p className="truncate text-lg font-bold drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)] sm:text-xl">
            {character.name}
            <span className="ml-1.5 text-sm font-normal text-white/75">{character.gender === 'female' ? '♀' : '♂'}</span>
            {prefs.kidMode && <span className="ml-1 text-sm">🧸</span>}
          </p>
          <p className="truncate text-xs text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:text-sm">
            {character.tagline[lang] ?? character.tagline.en}
          </p>
          {mode === 'change' && (
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/60">
              {dirty ? t(lang, 'previewNew') : t(lang, 'previewCurrent')}
            </p>
          )}
        </div>

        <section className="pointer-events-auto w-full min-w-0" style={{ '--d': '70ms' } as CSSProperties}>
          <h2 className="mb-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
            {t(lang, 'chooseCharacter')}
          </h2>
          <ArcFan
            ariaLabel="characters"
            size="portrait"
            items={cast}
            selectedId={live.character}
            onSelect={(id) => pick({ character: id })}
            label={(c) => c.name}
          >
            {(c, active) => {
              const num = CHARACTERS.findIndex((x) => x.id === c.id) + 1;
              return (
                <>
                  <span
                    className="absolute right-1.5 top-1.5 z-20 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-neutral-950 px-1 text-[9px] font-extrabold text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    style={{ background: c.accent }}
                    title={`#${num}`}
                  >
                    {num}
                  </span>
                  <ModelThumb accent={c.accent} name={c.name} image={c.image} crop="face" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-1.5 pb-1.5 pt-6 text-center">
                    <span className="block truncate text-[11px] font-semibold leading-tight sm:text-xs">{c.name}</span>
                    <span className="text-[9px] leading-none text-white/70">{c.gender === 'female' ? '♀' : '♂'}</span>
                  </span>
                  {active && (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{ boxShadow: `inset 0 0 0 2px ${c.accent}` }}
                    />
                  )}
                </>
              );
            }}
          </ArcFan>
        </section>

        <section className="pointer-events-auto w-full min-w-0">
          <h2 className="mb-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
            {t(lang, 'chooseBackground')}
          </h2>
          <ArcFan
            ariaLabel="scenes"
            size="scene"
            items={scenes}
            selectedId={live.background}
            onSelect={(id) => pick({ background: id })}
            label={(b) => `${backgroundLetter(b.id)} ${t(lang, b.nameKey as never)}`}
          >
            {(b, active) => {
              const letter = backgroundLetter(b.id);
              return (
                <>
                  <span
                    data-testid="bg-letter"
                    className="absolute right-1.5 top-1.5 z-20 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-neutral-950 px-1 text-[9px] font-extrabold text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    style={{ background: active ? '#ffffff' : '#e7e5e4' }}
                    title={letter}
                  >
                    {letter}
                  </span>
                  <span className="absolute inset-0" style={{ background: b.css }}>
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
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-center text-[10px] font-medium text-white/90">
                    {t(lang, b.nameKey as never)}
                  </span>
                </>
              );
            }}
          </ArcFan>
        </section>

        <section className="pointer-events-auto w-full min-w-0">
          <h2 className="mb-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
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
                  className={`fx-press ui-btn relative min-h-11 shrink-0 rounded-full px-3 py-1 text-[11px] font-medium hover:scale-105 ${
                    active ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {l.native}
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <button
          onClick={confirm}
          className={`fx-press fx-start ui-btn ui-btn-primary pointer-events-auto mt-1 min-h-12 shrink-0 rounded-full px-10 text-sm ${
            mode === 'start' ? 'min-w-40 tracking-[0.28em]' : 'min-w-32'
          }`}
        >
          {mode === 'change' ? t(lang, 'changeCta') : t(lang, 'confirmCta')}
        </button>
        </div>
      </div>
    </main>
  );
}

function LoadChip({ accent, lang }: { accent: string; lang: Lang }) {
  const [loadingPct, setLoadingPct] = useState<LoadProgress>(getLoadProgress());
  useEffect(() => onLoadProgress(setLoadingPct), []);
  if (loadingPct !== 'prep' && typeof loadingPct !== 'number') return null;
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 shadow-lg shadow-black/30 backdrop-blur-md">
      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.22)" strokeWidth="3.5" />
        <circle cx="12" cy="12" r="10" stroke={accent} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="14 49" />
      </svg>
      {loadingPct === 'prep' ? (
        <span className="text-[10px] text-white/85">{t(lang, 'statusPreparing')}</span>
      ) : (
        <span className="tabular-nums text-[10px] text-white/85">{loadingPct}%</span>
      )}
    </div>
  );
}
