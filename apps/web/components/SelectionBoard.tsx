'use client';
// Shared selection board for /select and /change.
// Character picks are the large 2D bighead fan (local stills when packed,
// otherwise the release poster). Scene cards stay the scene size. Language
// uses that same portrait card, shrunk so it is the smallest row. A last row
// of small TTS buttons persists the Edge voice pin. START / Change writes
// prefs, then /chat loads the chosen character. This page does not stream a model.
import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import ArcFan from './ArcFan';
import SceneBackdrop from './SceneBackdrop';
import ModelThumb from './ModelThumb';
import TtsVoiceRow from './TtsVoiceRow';
import { LangCardFace } from './selectors';
import { assetUrl } from '../lib/asset';
import { bigheadPath } from '../lib/bighead';
import { playVoiceGreeting } from '../lib/voice';
import { voicePickFor } from '../lib/voice-picks';
import { resolveEdgeVoice } from '../lib/edge-tts';
import {
  BACKGROUNDS, CHARACTERS, LANGS,
  backgroundById, backgroundLetter, characterById, t, usePrefs,
  type Prefs,
} from '../lib/prefs';

export default function SelectionBoard({ mode }: { mode: 'start' | 'change' }) {
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
  const [draft, setDraft] = useState<Partial<Prefs> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const live: Prefs = mode === 'change' ? { ...prefs, ...draft } : prefs;

  const character = characterById(live.character);
  const background = backgroundById(live.background);
  const lang = live.lang;
  const dirty = draft !== null;

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
      className={`${leaving ? 'fx-select-out' : 'fx-select-in'} fx-select relative flex h-dvh w-screen flex-col overflow-hidden text-white`}
      style={{ background: background.css }}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-30 ${leaving ? 'fx-route-veil-out' : 'fx-route-veil-in'}`}
      />
      <div data-testid="selection-hero" className="pointer-events-none absolute inset-0">
        <SceneBackdrop background={background} />
      </div>

      <div
        data-testid="selection-thumbs"
        className="relative z-20 flex min-h-0 flex-1 flex-col items-center"
      >
        <section className="flex min-h-0 w-full max-w-7xl flex-1 flex-col items-center justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="w-full shrink-0 px-1 text-center">
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
            <h2 className="mb-1 mt-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
              {t(lang, 'chooseCharacter')}
            </h2>
          </div>

          <div className="relative mx-auto mt-1 min-h-0 w-full flex-1">
            <ArcFan
              ariaLabel="characters"
              size="portrait"
              items={cast}
              selectedId={live.character}
              onSelect={(id) => {
                pick({ character: id });
                const chosen = cast.find((item) => item.id === id);
                if (!chosen) return;
                const voiceId = voicePickFor(lang, chosen.gender)
                  ?? resolveEdgeVoice({
                    lang,
                    gender: chosen.gender,
                    character: chosen.id,
                    ignoreVoicePick: true,
                  }).name;
                playVoiceGreeting(chosen.id, lang, voiceId);
              }}
              label={(c) => c.name}
            >
              {(c, active) => {
                const num = CHARACTERS.findIndex((x) => x.id === c.id) + 1;
                return (
                  <>
                    <span
                      className="absolute right-2.5 top-2.5 z-20 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-neutral-950 px-1.5 text-xs font-extrabold text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      style={{ background: c.accent }}
                      title={`#${num}`}
                    >
                      {num}
                    </span>
                    <ModelThumb accent={c.accent} name={c.name} image={c.image} bighead={bigheadPath(c.id)} crop="face" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-12 text-center">
                      <span className="block whitespace-normal break-words text-base font-semibold leading-tight sm:text-lg">{c.name}</span>
                      <span className="text-xs leading-none text-white/75 sm:text-sm">{c.gender === 'female' ? '♀' : '♂'}</span>
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
          </div>

        </section>

        <div className="flex w-full shrink-0 flex-col items-center bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-center gap-2">
            <section className="pointer-events-auto w-full min-w-0" style={{ '--d': '70ms' } as CSSProperties}>
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
              <ArcFan
                ariaLabel="languages"
                size="compact"
                items={LANGS}
                selectedId={live.lang}
                onSelect={(id) => {
                  if (id === 'en' || id === 'yue' || id === 'zh' || id === 'ja') pick({ lang: id });
                }}
                label={(l) => l.native}
              >
                {(l, active) => <LangCardFace lang={l} active={active} compact />}
              </ArcFan>
            </section>

            <TtsVoiceRow
              lang={lang}
              characterId={character.id}
              companionGender={character.gender}
              accent={character.accent}
              onLang={(next) => pick({ lang: next })}
            />

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
      </div>
    </main>
  );
}
