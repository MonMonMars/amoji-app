'use client';
// Story Mode setup panel — embedded under SelectTopBars on /select (in-place).
// Pack picker + roll cast + ENTER STORY. Character-dominant hero (large cast,
// small scene inset) — not the chat-select board layout.
import { useMemo, useState } from 'react';
import { assetUrl } from '../lib/asset';
import { useRouter } from 'next/navigation';
import {
  backgroundById,
  characterById,
  loadPrefs,
  usePrefs,
  type Lang,
} from '../lib/prefs';
import { STORY_SCENES, rollStory, type StoryScene } from '../lib/stories';
import { saveStorySession } from '../lib/story-session';
import { beginMicPreflightFromGesture, primeChatStartGesture } from '../lib/chat-start-gesture';
import { primeLocationForChatEnter } from '../lib/live-tools';

const LABEL: Record<
  'mode' | 'reroll' | 'start' | 'scene' | 'packs' | 'surprise' | 'castAgain' | 'withYou',
  Record<Lang, string>
> = {
  mode: {
    en: 'STORY MODE',
    yue: '故事模式',
    zh: '故事模式',
    ja: 'ストーリーモード',
  },
  reroll: {
    en: 'Another scene',
    yue: '換個場景',
    zh: '换个场景',
    ja: '別の場面',
  },
  castAgain: {
    en: 'Another cast',
    yue: '換個人',
    zh: '换个人',
    ja: '別の相手',
  },
  start: {
    en: 'ENTER STORY',
    yue: '進入故事',
    zh: '进入故事',
    ja: 'ストーリーへ',
  },
  scene: {
    en: 'Scene',
    yue: '場景',
    zh: '场景',
    ja: '場面',
  },
  packs: {
    en: 'Story packs',
    yue: '故事包',
    zh: '故事包',
    ja: 'ストーリーパック',
  },
  surprise: {
    en: 'Surprise me',
    yue: '隨機',
    zh: '随机',
    ja: 'おまかせ',
  },
  withYou: {
    en: 'They lead — you steer the tale together',
    yue: '佢帶你入去，你哋一齊推故事',
    zh: '对方带你进入，一起推动故事',
    ja: '相手が導き、一緒に物語を進める',
  },
};

export default function StorySetupPanel() {
  const router = useRouter();
  const [prefs, setPrefs, prefsReady] = usePrefs();
  const lang = prefs.lang;
  /** null = surprise / any pack; string = locked pack id */
  const [packId, setPackId] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => Date.now());
  const roll = useMemo(
    () => rollStory(packId ? { sceneId: packId, n: seed } : { n: seed }),
    [seed, packId],
  );
  const scene: StoryScene = roll.scene;
  const character = characterById(roll.characterId);
  const background = backgroundById(scene.backgroundId);
  const packLocked = packId != null;

  const enter = () => {
    // t767/t777: ENTER STORY primes voice + mic + location in this gesture.
    primeChatStartGesture();
    try { beginMicPreflightFromGesture(); } catch { /* ignore */ }
    primeLocationForChatEnter();
    saveStorySession({
      sceneId: scene.id,
      characterId: character.id,
      backgroundId: background.id,
    });
    const base = loadPrefs();
    setPrefs({
      ...base,
      ...prefs,
      character: character.id,
      background: background.id,
      ...(character.gender === 'female' ? { lastFemale: character.id } : {}),
    });
    router.push('/chat');
  };

  const pickPack = (id: string) => {
    setPackId(id);
    setSeed((s) => s + 1);
  };

  const surprise = () => {
    setPackId(null);
    setSeed((s) => s + 1 + STORY_SCENES.length);
  };

  return (
    <main
      data-testid="story-setup-panel"
      className={`relative z-20 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-x-hidden px-4 py-4 text-white ${prefsReady ? '' : 'opacity-0'}`}
      aria-busy={!prefsReady}
      aria-labelledby="amoji-story-setup-title"
    >
      {/* Soft scene wash only — not a full chat-select backdrop takeover. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{ background: background.css }}
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-[min(100%,22rem)] flex-col items-center gap-3 sm:max-w-[24rem]">
        <header className="flex w-full flex-col items-center gap-1.5 text-center">
          <p
            data-testid="story-setup-eyebrow"
            className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-200/85"
          >
            {LABEL.mode[lang]}
          </p>
          <p className="max-w-[20rem] text-sm leading-snug text-white/70">{LABEL.withYou[lang]}</p>
        </header>

        <div className="w-full">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/55">
            {LABEL.packs[lang]}
          </p>
          <div
            role="group"
            aria-label={LABEL.packs[lang]}
            className="-mx-1 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible"
          >
            {STORY_SCENES.map((s) => {
              const active = packId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`story-pack-${s.id}`}
                  aria-label={s.title[lang]}
                  aria-pressed={active}
                  onClick={() => pickPack(s.id)}
                  className={`ui-btn shrink-0 rounded-full border px-3.5 py-2.5 text-left text-xs backdrop-blur-md sm:max-w-full ${
                    active
                      ? 'border-amber-300/55 bg-amber-500/20 text-white'
                      : 'border-white/15 bg-black/40 text-white/80 hover:border-white/30'
                  }`}
                >
                  {s.title[lang]}
                </button>
              );
            })}
            <button
              type="button"
              data-testid="story-pack-random"
              aria-label={LABEL.surprise[lang]}
              aria-pressed={!packLocked}
              onClick={surprise}
              className={`ui-btn shrink-0 rounded-full border px-3.5 py-2.5 text-xs backdrop-blur-md ${
                !packLocked
                  ? 'border-amber-300/55 bg-amber-500/20 text-white'
                  : 'border-white/15 bg-black/40 text-white/80 hover:border-white/30'
              }`}
            >
              {LABEL.surprise[lang]}
            </button>
          </div>
        </div>

        {/* Character-dominant hero + small scene inset (not a background-first card). */}
        <div
          data-testid="story-hero"
          className="relative aspect-[3/4] w-full max-w-full overflow-hidden rounded-3xl border border-white/15 bg-black/55 shadow-2xl"
        >
          {character.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(character.image)}
              alt={character.name}
              className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white/10 text-5xl font-bold">
              {character.name.slice(0, 1)}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />

          {/* Tiny scene backdrop chip — combination of cast + place. */}
          <div
            data-testid="story-scene-inset"
            role="img"
            aria-label={`${LABEL.scene[lang]}: ${scene.title[lang]}`}
            className="absolute right-3 top-3 h-[4.25rem] w-[5.75rem] overflow-hidden rounded-xl border border-white/35 shadow-lg ring-1 ring-black/40"
          >
            {background.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assetUrl(background.image)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full" style={{ background: background.css }} />
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide text-white/90">
              {LABEL.scene[lang]}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 pt-20">
            <h1 id="amoji-story-setup-title" className="text-xl font-bold leading-tight drop-shadow sm:text-2xl">
              {scene.title[lang]}
            </h1>
            <p className="mt-1 text-sm font-semibold text-white drop-shadow">{character.name}</p>
            <p className="mt-1.5 text-sm leading-snug text-white/80">{scene.blurb[lang]}</p>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2">
          <button
            type="button"
            data-testid="story-reroll"
            aria-label={packLocked ? LABEL.castAgain[lang] : LABEL.reroll[lang]}
            onClick={() => setSeed((s) => s + 1 + (STORY_SCENES.length > 1 ? 1 : 0))}
            className="ui-btn min-h-12 flex-1 rounded-full border border-white/20 bg-black/45 px-4 py-3 text-sm backdrop-blur-md"
          >
            {packLocked ? LABEL.castAgain[lang] : LABEL.reroll[lang]}
          </button>
          <button
            type="button"
            data-testid="story-start"
            aria-label={LABEL.start[lang]}
            onClick={enter}
            className="fx-start min-h-12 flex-[1.4] rounded-full bg-white px-4 py-3 text-sm font-bold tracking-wide text-black"
          >
            {LABEL.start[lang]}
          </button>
        </div>
      </div>
    </main>
  );
}
