'use client';
// Top of /select + /change:
//   row 1 — Chat / Story chips (in-place; no route change). Kid mode lives in Settings.
//   row 2 — anime CHARACTER gender filter: All / Male / Female (cast filter only)

import type { CSSProperties } from 'react';
import { clearStorySession } from '../lib/story-session';
import { t, type Lang } from '../lib/prefs';

export type CastGenderFilter = 'all' | 'male' | 'female';
export type BoardMode = 'chat' | 'story';

export default function SelectTopBars({
  lang,
  accent,
  boardMode = 'chat',
  onBoardMode,
  castGender = 'all',
  onCastGender,
}: {
  lang: Lang;
  accent: string;
  /** chat vs story — both stay on /select; only the board body swaps */
  boardMode?: BoardMode;
  onBoardMode?: (next: BoardMode) => void;
  /** Filter the anime cast by character gender (not the user's gender). */
  castGender?: CastGenderFilter;
  onCastGender?: (next: CastGenderFilter) => void;
}) {
  const modeChip = (active: boolean) =>
    active
      ? {
          className: 'fx-press ui-btn rounded-full border px-3 py-1 text-[11px] font-semibold text-white',
          style: {
            borderColor: 'rgba(255,255,255,0.75)',
            backgroundColor: `${accent}66`,
            color: '#fff',
          } as CSSProperties,
        }
      : {
          className:
            'fx-press ui-btn rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold text-white/75',
          style: undefined as CSSProperties | undefined,
        };

  const chatChip = modeChip(boardMode === 'chat');
  const storyChip = modeChip(boardMode === 'story');

  const genderOpts: { id: CastGenderFilter; label: string; testId: string }[] = [
    { id: 'all', label: t(lang, 'voiceShowAll'), testId: 'select-cast-gender-all' },
    { id: 'male', label: t(lang, 'genderMale'), testId: 'select-cast-gender-male' },
    { id: 'female', label: t(lang, 'genderFemale'), testId: 'select-cast-gender-female' },
  ];

  return (
    <div
      data-testid="select-top-bars"
      className="pointer-events-auto relative z-30 w-full max-w-7xl shrink-0 px-3 pt-[max(0.35rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex w-full flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-black/35 px-2.5 py-2 backdrop-blur-md">
        <div
          role="group"
          aria-label={t(lang, 'settingsMode')}
          className="flex w-full flex-wrap items-center justify-center gap-1.5"
        >
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55" aria-hidden="true">
            {t(lang, 'settingsMode')}
          </span>
          <button
            type="button"
            data-testid="select-mode-chat"
            aria-pressed={boardMode === 'chat'}
            className={chatChip.className}
            style={chatChip.style}
            onClick={() => {
              clearStorySession();
              onBoardMode?.('chat');
            }}
          >
            CHAT
          </button>
          <button
            type="button"
            data-testid="select-mode-story"
            aria-pressed={boardMode === 'story'}
            className={storyChip.className}
            style={storyChip.style}
            onClick={() => onBoardMode?.('story')}
          >
            STORY
          </button>
        </div>
        <div
          role="group"
          aria-label={t(lang, 'chooseCharacter')}
          className="flex w-full flex-wrap items-center justify-center gap-1.5"
        >
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55" aria-hidden="true">
            {t(lang, 'chooseCharacter')}
          </span>
          {genderOpts.map((g) => {
            const on = castGender === g.id;
            return (
              <button
                key={g.id}
                type="button"
                data-testid={g.testId}
                aria-pressed={on}
                onClick={() => onCastGender?.(g.id)}
                className={`fx-press ui-btn rounded-full border px-3 py-1 text-[11px] font-medium ${
                  on ? 'border-white/80 text-neutral-950' : 'border-white/15 bg-black/30 text-white/70'
                }`}
                style={on ? { backgroundColor: accent } : undefined}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
