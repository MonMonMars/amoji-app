'use client';
// t741: Mode selection BEFORE chat/story setup — Chat Mode vs Story Mode.
import { useRouter } from 'next/navigation';
import { clearStorySession } from '../../lib/story-session';
import { t, usePrefs, type Lang } from '../../lib/prefs';

const COPY: Record<'title' | 'hint' | 'chatTitle' | 'chatHint' | 'storyTitle' | 'storyHint', Record<Lang, string>> = {
  title: {
    en: 'Choose a mode',
    yue: '揀一種模式',
    zh: '选择模式',
    ja: 'モードを選ぶ',
  },
  hint: {
    en: 'Chat with a companion you pick — or drop into a short story scene.',
    yue: '自己揀角色傾偈，或者跌入一個短篇故事場景。',
    zh: '自己选角色聊天，或进入一段短篇故事场景。',
    ja: '好きな相棒と話すか、短いストーリーに入る。',
  },
  chatTitle: {
    en: 'CHAT MODE',
    yue: '傾偈模式',
    zh: '聊天模式',
    ja: 'チャットモード',
  },
  chatHint: {
    en: 'Pick your character and background, then talk freely.',
    yue: '揀角色同背景，之後自由傾偈。',
    zh: '选择角色和背景，然后自由聊天。',
    ja: 'キャラと背景を選んで、自由に話す。',
  },
  storyTitle: {
    en: 'STORY MODE',
    yue: '故事模式',
    zh: '故事模式',
    ja: 'ストーリーモード',
  },
  storyHint: {
    en: 'A random story-fit companion in a fixed scene. Example: night train seatmate.',
    yue: '隨機適合故事嘅角色 + 固定場景。例如：夜車隔籬位。',
    zh: '随机适合故事的角色 + 固定场景。例如：夜车邻座。',
    ja: '物語向きの相棒をランダムに、決まった場面で。例：夜行列車の隣席。',
  },
};

export default function ModePage() {
  const router = useRouter();
  const [prefs] = usePrefs();
  const lang = prefs.lang;
  const c = COPY;

  return (
    <main className="fx-page relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-neutral-950 px-4 py-10 text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Amoji</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{c.title[lang]}</h1>
          <p className="mt-2 text-sm text-white/70">{c.hint[lang]}</p>
        </div>

        <div className="grid w-full max-w-full gap-4 sm:grid-cols-2">
          <button
            type="button"
            data-testid="mode-chat"
            onClick={() => {
              clearStorySession();
              router.push('/select');
            }}
            className="fx-press group flex min-h-[11rem] flex-col items-start justify-between rounded-3xl border border-white/15 bg-gradient-to-br from-sky-500/20 to-black/40 p-5 text-left shadow-xl backdrop-blur-md hover:border-sky-300/60"
          >
            <span className="rounded-full border border-sky-300/40 bg-sky-400/15 px-3 py-1 text-[10px] font-bold tracking-widest text-sky-100">
              01
            </span>
            <div>
              <span className="block text-xl font-extrabold tracking-wide group-hover:text-sky-100">
                {c.chatTitle[lang]}
              </span>
              <span className="mt-2 block text-sm leading-snug text-white/70">{c.chatHint[lang]}</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="mode-story"
            onClick={() => router.push('/story')}
            className="fx-press group flex min-h-[11rem] flex-col items-start justify-between rounded-3xl border border-white/15 bg-gradient-to-br from-fuchsia-500/20 to-black/40 p-5 text-left shadow-xl backdrop-blur-md hover:border-fuchsia-300/60"
          >
            <span className="rounded-full border border-fuchsia-300/40 bg-fuchsia-400/15 px-3 py-1 text-[10px] font-bold tracking-widest text-fuchsia-100">
              02
            </span>
            <div>
              <span className="block text-xl font-extrabold tracking-wide group-hover:text-fuchsia-100">
                {c.storyTitle[lang]}
              </span>
              <span className="mt-2 block text-sm leading-snug text-white/70">{c.storyHint[lang]}</span>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="ui-btn text-xs text-white/50 hover:text-white/80"
        >
          {t(lang, 'back')}
        </button>
      </div>
    </main>
  );
}
