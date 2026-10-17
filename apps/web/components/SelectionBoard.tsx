'use client';
// Shared selection board for /select and /change.
// The stage is the chat room: the same SceneBackdrop and the same live
// CompanionCanvas (VRM, camera, wardrobe). A thumb tap swaps that body
// immediately — there is no flat portrait or cutout standing in for her.
// The bottom strip is face thumbnails (release PNGs) plus scene thumbs
// lettered A, B, C… in daytime → nighttime order.
import dynamic from 'next/dynamic';
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
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
    if (mode === 'change' && draft) setPrefs({ ...prefs, ...draft });
    router.push('/chat');
  };

  return (
    <main className="fx-page relative h-dvh w-screen overflow-hidden text-white" style={{ background: background.css }}>
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
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12"
      >
        <div className="flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
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
          <button
            onClick={confirm}
            className="ui-btn ui-btn-primary pointer-events-auto min-h-11 shrink-0 rounded-full bg-white px-5 text-sm font-semibold text-black shadow-[0_12px_36px_-12px_rgba(255,255,255,0.55)]"
          >
            {mode === 'change' ? t(lang, 'changeCta') : t(lang, 'confirmCta', { name: character.name })}
          </button>
        </div>

        <section className="pointer-events-auto" style={{ '--d': '70ms' } as CSSProperties}>
          <h2 className="mb-1 pl-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
            {t(lang, 'chooseCharacter')}
          </h2>
          <HScrollRow ariaLabel="characters" rowKey="characters" selectedId={live.character}>
            {cast.map((c) => {
              const active = c.id === live.character;
              const num = CHARACTERS.findIndex((x) => x.id === c.id) + 1;
              return (
                <button
                  key={c.id}
                  data-row-item={c.id}
                  onClick={() => pick({ character: c.id })}
                  aria-label={c.name}
                  aria-pressed={active}
                  className={`ui-card relative flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1 rounded-xl border p-1.5 ${
                    active ? 'border-transparent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${c.accent}, 0 10px 30px -12px ${c.accent}` } : undefined}
                >
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
                    <ModelThumb url={c.model} accent={c.accent} name={c.name} image={c.image} />
                  </span>
                  <span className="max-w-full truncate text-[9px] font-semibold leading-tight">{c.name}</span>
                  <span className="text-[8px] leading-none text-white/40">{c.gender === 'female' ? '♀' : '♂'}</span>
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <section className="pointer-events-auto">
          <h2 className="mb-1 pl-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
            {t(lang, 'chooseBackground')}
          </h2>
          <HScrollRow ariaLabel="scenes" rowKey="backgrounds" selectedId={live.background}>
            {scenes.map((b) => {
              const active = b.id === live.background;
              const letter = backgroundLetter(b.id);
              return (
                <button
                  key={b.id}
                  data-row-item={b.id}
                  onClick={() => pick({ background: b.id })}
                  aria-label={`${letter} ${t(lang, b.nameKey as never)}`}
                  aria-pressed={active}
                  className={`ui-card relative w-24 shrink-0 snap-start rounded-xl border ${
                    active ? 'border-white/80' : 'border-white/10 hover:border-white/40'
                  }`}
                >
                  <span
                    data-testid="bg-letter"
                    className="absolute -right-1 -top-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-neutral-950 px-1 text-[8px] font-extrabold text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    style={{ background: active ? '#ffffff' : '#e7e5e4' }}
                    title={letter}
                  >
                    {letter}
                  </span>
                  <span className="block overflow-hidden rounded-xl">
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
                  </span>
                </button>
              );
            })}
          </HScrollRow>
        </section>

        <section className="pointer-events-auto">
          <h2 className="mb-1 pl-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
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
                  className={`ui-btn min-h-11 shrink-0 rounded-full px-3 py-1 text-[11px] font-medium hover:scale-105 ${
                    active ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {l.native}
                </button>
              );
            })}
          </HScrollRow>
        </section>
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
