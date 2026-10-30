'use client';
// t740 / t741 / pack picker: Story Mode setup — pick a pack (or surprise),
// roll cast, then enter chat.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  backgroundById,
  characterById,
  t,
  usePrefs,
  type Lang,
} from '../../lib/prefs';
import { STORY_SCENES, rollStory, type StoryScene } from '../../lib/stories';
import { saveStorySession } from '../../lib/story-session';

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

export default function StorySetupPage() {
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
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
    saveStorySession({
      sceneId: scene.id,
      characterId: character.id,
      backgroundId: background.id,
    });
    setPrefs({
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
    <main className="fx-page relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-neutral-950 px-4 py-8 text-white">
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
          <div className="flex max-w-full flex-wrap gap-2">
            {STORY_SCENES.map((s) => {
              const active = packId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`story-pack-${s.id}`}
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
              src={background.image}
              alt=""
              className="h-full w-full object-cover opacity-80"
            />
          ) : (
            <div className="h-full w-full" style={{ background: background.css }} />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
            <p className="text-[10px] uppercase tracking-widest text-white/55">{LABEL.scene[lang]}</p>
            <h1 className="text-xl font-bold leading-tight">{scene.title[lang]}</h1>
            <p className="mt-1 text-sm text-white/75">{scene.blurb[lang]}</p>
          </div>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
          {character.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
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
            onClick={() => setSeed((s) => s + 1 + (STORY_SCENES.length > 1 ? 1 : 0))}
            className="ui-btn flex-1 rounded-full border border-white/20 bg-black/45 px-4 py-3 text-sm backdrop-blur-md"
          >
            {packLocked ? LABEL.castAgain[lang] : LABEL.reroll[lang]}
          </button>
          <button
            type="button"
            data-testid="story-start"
            onClick={enter}
            className="fx-start flex-[1.4] rounded-full bg-white px-4 py-3 text-sm font-bold tracking-wide text-black"
          >
            {LABEL.start[lang]}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push('/mode')}
          className="ui-btn text-xs text-white/50 hover:text-white/80"
        >
          {t(lang, 'back')}
        </button>
      </div>
    </main>
  );
}
