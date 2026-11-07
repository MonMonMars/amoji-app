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
import EmotionClipRow from './EmotionClipRow';
import MuteButton from './MuteButton';
import EarlyAudioWarm from './EarlyAudioWarm';
import EarlyAudioUnlock from './EarlyAudioUnlock';
import TtsVoiceRow from './TtsVoiceRow';
import SelectTopBars, { type BoardMode, type CastGenderFilter } from './SelectTopBars';
import StorySetupPanel from './StorySetupPanel';
import { LangCardFace } from './selectors';
import { assetUrl } from '../lib/asset';
import { bigheadPath } from '../lib/bighead';
import { playVoiceGreeting, primeAudioForChatEnter } from '../lib/voice';
import { primeLocationForChatEnter } from '../lib/live-tools';
import { voicePickFor } from '../lib/voice-picks';
import { resolveEdgeVoice } from '../lib/edge-tts';
import {
  BACKGROUNDS, CHARACTERS, LANGS,
  KID_BACKGROUND, KID_CHARACTER,
  backgroundById, backgroundLetter, characterById, t, usePrefs,
  type Prefs,
} from '../lib/prefs';
import { selectionBadge, selectionCast, selectPortraitPosition } from '../lib/cast-adjust';
import { clearStorySession } from '../lib/story-session';

export default function SelectionBoard({ mode }: { mode: 'start' | 'change' }) {
  const router = useRouter();
  const [prefs, setPrefs, prefsReady] = usePrefs();
  const [draft, setDraft] = useState<Partial<Prefs> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [boardMode, setBoardMode] = useState<BoardMode>(() => {
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('amoji.selectMode') === 'story') {
        sessionStorage.removeItem('amoji.selectMode');
        return 'story';
      }
    } catch { /* ignore */ }
    return 'chat';
  });
  const [castGender, setCastGender] = useState<CastGenderFilter>('all');
  const live: Prefs = mode === 'change' ? { ...prefs, ...draft } : prefs;
  // /change drafts kidMode before confirm — cast/scenes/badge must follow live, not prefs.

  const character = characterById(live.character);
  const background = backgroundById(live.background);
  const lang = live.lang;
  const dirty = draft !== null;


  const roster = selectionCast(CHARACTERS);
  const cast = roster.filter((c) => {
    if (live.kidMode && !c.kidSafe) return false;
    if (castGender !== 'all' && c.gender !== castGender) return false;
    return true;
  });
  const scenes = live.kidMode ? BACKGROUNDS.filter((b) => b.kidSafe) : BACKGROUNDS;

  const pick = (patch: Partial<Prefs>) => {
    if (mode === 'start') setPrefs(patch);
    else setDraft((d) => ({ ...d, ...patch }));
  };

  const setKidMode = (next: boolean) => {
    const patch: Partial<Prefs> = { kidMode: next };
    if (next) {
      if (!characterById(live.character).kidSafe) patch.character = KID_CHARACTER;
      if (!backgroundById(live.background).kidSafe) patch.background = KID_BACKGROUND;
    }
    pick(patch);
  };

  const applyCastGender = (next: CastGenderFilter) => {
    setCastGender(next);
    const nextCast = roster.filter((c) => {
      if (live.kidMode && !c.kidSafe) return false;
      if (next !== 'all' && c.gender !== next) return false;
      return true;
    });
    if (nextCast.length && !nextCast.some((c) => c.id === live.character)) {
      pick({ character: nextCast[0]!.id });
    }
  };

  const confirm = () => {
    if (leaving) return;
    // t767/t777: one Start gesture unlocks AudioContext + asks location for weather/news.
    // Mute All stays intact; geo deny still enters chat (ask city later if needed).
    // t786: unlock audio FIRST; defer geo so iOS silent-<audio> prime is not raced by the
    // permission dialog (which can drop the gesture unlock on iPhone).
    primeAudioForChatEnter();
    window.setTimeout(() => { try { primeLocationForChatEnter(); } catch { /* ignore */ } }, 120);
    const go = () => {
      clearStorySession();
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
      style={{ background: prefsReady ? background.css : '#0a0a0f' }}
      aria-labelledby="amoji-selection-title"
      aria-busy={!prefsReady}
    >
      <h1 id="amoji-selection-title" className="sr-only">
        {mode === 'start' ? t(lang, 'selectTitle') : t(lang, 'changeCta')}
      </h1>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-30 ${leaving ? 'fx-route-veil-out' : 'fx-route-veil-in'}`}
      />
      <EarlyAudioWarm />
      <EarlyAudioUnlock />
      {prefsReady && (
        <div data-testid="selection-hero" className="pointer-events-none absolute inset-0">
          <SceneBackdrop background={background} />
        </div>
      )}

      {/* Master mute - top-right. Hold until prefsReady so aria/title lang is not DEFAULT_PREFS. */}
      {/* Same numbered idle rails as chat - pin before START; chat hydrates amoji.idlePick.v1. */}
      {prefsReady && (
        <div
          data-testid="selection-mute"
          className="pointer-events-none absolute right-3 top-3 z-40 pt-[env(safe-area-inset-top)]"
        >
          <MuteButton lang={lang} className="pointer-events-auto" />
        </div>
      )}

      <div
        data-testid="selection-thumbs"
        className={`relative z-20 flex min-h-0 flex-1 flex-col items-center ${prefsReady ? '' : 'opacity-0'}`}
      >
        <SelectTopBars
          lang={lang}
          accent={character.accent}
          kidMode={!!live.kidMode}
          onKidMode={setKidMode}
          boardMode={boardMode}
          onBoardMode={setBoardMode}
          castGender={castGender}
          onCastGender={applyCastGender}
          prefsReady={prefsReady}
        />
        {boardMode === 'story' ? (
          <StorySetupPanel />
        ) : (
        <>
        <section className="flex min-h-0 w-full max-w-7xl flex-1 flex-col items-center justify-center px-3 pt-1">
          <div className="w-full shrink-0 px-1 text-center">
            <p className="truncate text-lg font-bold drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)] sm:text-xl">
              {character.name}
              <span className="ml-1.5 text-sm font-normal text-white/75">{character.gender === 'female' ? '♀' : '♂'}</span>
              {live.kidMode && <span className="ml-1 text-sm">🧸</span>}
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

          <div className="relative mx-auto mt-1 min-h-[11rem] w-full flex-1 sm:min-h-[14rem]">
            <ArcFan
              ariaLabel={t(lang, 'chooseCharacter')}
              size="portrait"
              items={cast}
              selectedId={prefsReady ? live.character : ''}
              onSelect={(id) => {
                pick({ character: id });
                const chosen = cast.find((item) => item.id === id);
                if (!chosen) return;
                // Audition the cast slot — a gender pin would make every
                // character of that sex sound identical on select.
                const voiceId = resolveEdgeVoice({
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
                const num = selectionBadge(c.id);
                return (
                  <>
                    <span
                      className="absolute right-2.5 top-2.5 z-20 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-neutral-950 px-1.5 text-xs font-extrabold text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      style={{ background: c.accent }}
                      title={`#${num}`}
                    >
                      {num}
                    </span>
                    <ModelThumb accent={c.accent} name={c.name} image={c.image} bighead={bigheadPath(c.id)} crop="face" portraitPosition={selectPortraitPosition(c.id)} />
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

        <div className="flex max-h-[52dvh] w-full shrink-0 flex-col items-center overflow-y-auto overscroll-contain bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:max-h-[48dvh] sm:px-6 [@media(orientation:landscape)_and_(max-height:500px)]:max-h-[34dvh]">
          <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-center gap-2">
            <section className="pointer-events-auto w-full min-w-0" style={{ '--d': '70ms' } as CSSProperties}>
              <h2 className="mb-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
                {t(lang, 'chooseBackground')}
              </h2>
              <ArcFan
                ariaLabel={t(lang, 'chooseBackground')}
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
                            alt={t(lang, b.nameKey as never)}
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
                ariaLabel={t(lang, 'chooseLanguage')}
                size="compact"
                items={LANGS}
                selectedId={live.lang}
                onSelect={(id) => {
                  if (id !== 'en' && id !== 'yue' && id !== 'zh' && id !== 'ja') return;
                  pick({ lang: id });
                  const voiceId = voicePickFor(id, character.gender)
                    ?? resolveEdgeVoice({
                      lang: id,
                      gender: character.gender,
                      character: character.id,
                      ignoreVoicePick: true,
                    }).name;
                  playVoiceGreeting(character.id, id, voiceId);
                }}
                label={(l) => l.native}
              >
                {(l, active) => (
                  <span className="relative block h-full w-full" data-dev={`L${LANGS.findIndex((x) => x.id === l.id) + 1}`}>
                    <LangCardFace lang={l} active={active} compact />
                  </span>
                )}
              </ArcFan>
            </section>

            <TtsVoiceRow
              lang={lang}
              characterId={character.id}
              companionGender={character.gender}
              accent={character.accent}
              onLang={(next) => pick({ lang: next })}
            />

            <EmotionClipRow lang={lang} gender={character.gender} accent={character.accent} characterId={character.id} />

            <button
              type="button"
              onClick={confirm}
              data-dev="T1"
              aria-label={mode === 'start' ? t(lang, 'confirmCta') : t(lang, 'changeCta')}
              className={`fx-press fx-start ui-btn ui-btn-primary pointer-events-auto relative mt-1 min-h-12 shrink-0 rounded-full px-10 text-sm ${
                mode === 'start' ? 'min-w-40 tracking-[0.28em]' : 'min-w-32'
              }`}
            >
              {mode === 'start' ? t(lang, 'confirmCta') : t(lang, 'changeCta')}
            </button>
          </div>
        </div>
        </>
        )}
      </div>
    </main>
  );
}
