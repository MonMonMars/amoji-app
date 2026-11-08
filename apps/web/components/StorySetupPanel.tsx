'use client';
// Story Mode setup panel — embedded under SelectTopBars on /select (in-place).
// Pack picker + roll cast + ENTER STORY. No route change for mode chips.
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
  'mode' | 'reroll' | 'start' | 'scene' | 'packs' | 'surprise' | 'castAgain',
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
    // t767/t777: ENTER STORY primes voice + location in this gesture.
    primeChatStartGesture();
    beginMicPreflightFromGesture();
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
      className={`relative z-20 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-x-hidden px-4 py-4 text-white ${prefsReady ? '' : 'opacity-0'}`}
      aria-busy={!prefsReady}
      aria-labelledby="amoji-story-setup-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: background.css }}
      />
      <div className="relative z-10 flex w-full max-w-[min(100%,24rem)] flex-col items-center gap-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-fuchsia-200/80">
          {LABEL.mode[lang]}
        </p>

        <div className="w-full">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/55">
            {LABEL.packs[lang]}
          </p>
          <div role="group" aria-label={LABEL.packs[lang]} className="flex max-w-full flex-wrap gap-2">
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
                  className={`ui-btn max-w-full rounded-full border px-3 py-1.5 text-left text-xs backdrop-blur-md ${
                    active
                      ? 'border-fuchsia-300/60 bg-fuchsia-500/25 text-white'
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
              className={`ui-btn rounded-full border px-3 py-1.5 text-xs backdrop-blur-md ${
                !packLocked
                  ? 'border-fuchsia-300/60 bg-fuchsia-500/25 text-white'
                  : 'border-white/15 bg-black/40 text-white/80 hover:border-white/30'
              }`}
            >
              {LABEL.surprise[lang]}
            </button>
          </div>
        </div>

        <div className="relative aspect-square w-full max-w-full overflow-hidden rounded-3xl border border-white/15 bg-black/45 shadow-2xl backdrop-blur-md">
          {background.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(background.image)}
              alt={scene.title[lang]}
              className="h-full w-full object-cover opacity-80"
            />
          ) : (
            <div className="h-full w-full" style={{ background: background.css }} />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
            <p className="text-[10px] uppercase tracking-widest text-white/55">{LABEL.scene[lang]}</p>
            <h1 id="amoji-story-setup-title" className="text-xl font-bold leading-tight">{scene.title[lang]}</h1>
            <p className="mt-1 text-sm text-white/75">{scene.blurb[lang]}</p>
          </div>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
          {character.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(character.image)} alt={character.name} className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
              {character.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{character.name}</p>
            <p className="truncate text-xs text-white/60">{character.tagline[lang]}</p>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2">
          <button
            type="button"
            data-testid="story-reroll"
            aria-label={packLocked ? LABEL.castAgain[lang] : LABEL.reroll[lang]}
            onClick={() => setSeed((s) => s + 1 + (STORY_SCENES.length > 1 ? 1 : 0))}
            className="ui-btn flex-1 rounded-full border border-white/20 bg-black/45 px-4 py-3 text-sm backdrop-blur-md"
          >
            {packLocked ? LABEL.castAgain[lang] : LABEL.reroll[lang]}
          </button>
          <button
            type="button"
            data-testid="story-start"
            aria-label={LABEL.start[lang]}
            onClick={enter}
            className="fx-start flex-[1.4] rounded-full bg-white px-4 py-3 text-sm font-bold tracking-wide text-black"
          >
            {LABEL.start[lang]}
          </button>
        </div>
</div>
    </main>
  );
}
