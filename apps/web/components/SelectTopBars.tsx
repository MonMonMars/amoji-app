'use client';
// Top of /select + /change: Chat vs Story mode chips + "You are" gender.
// Mon: these two selectors must sit at the very top of the character page.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearStorySession } from '../lib/story-session';
import { loadProfile, saveProfile, type Gender } from '../lib/profile';
import { t, type Lang } from '../lib/prefs';

export default function SelectTopBars({
  lang,
  accent,
  kidMode,
  onKidMode,
  prefsReady = true,
}: {
  lang: Lang;
  accent: string;
  kidMode: boolean;
  onKidMode: (next: boolean) => void;
  /** false until amoji.prefs.v1 sync - hold kid chip highlight */
  prefsReady?: boolean;
}) {
  const router = useRouter();
  // null until profile localStorage sync - avoid secret-chip flash when user saved male/female.
  const [gender, setGender] = useState<Gender | null>(null);

  useEffect(() => {
    setGender(loadProfile().gender ?? 'secret');
  }, []);
  const genderReady = gender !== null;
  const genderOn = gender ?? 'secret';

  const setGenderPick = (g: Gender) => {
    setGender(g);
    saveProfile({ ...loadProfile(), gender: g });
    window.dispatchEvent(new Event('amoji:profile'));
  };

  return (
    <div
      data-testid="select-top-bars"
      className="pointer-events-auto relative z-30 w-full max-w-7xl shrink-0 px-3 pt-[max(0.35rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex w-full flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-black/35 px-2.5 py-2 backdrop-blur-md">
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
            {t(lang, 'settingsMode')}
          </span>
          <button
            type="button"
            data-testid="select-mode-chat"
            aria-pressed="true"
            className="fx-press ui-btn rounded-full border px-3 py-1 text-[11px] font-semibold"
            style={{
              borderColor: 'rgba(255,255,255,0.75)',
              backgroundColor: `${accent}66`,
              color: '#fff',
            }}
            onClick={() => clearStorySession()}
          >
            CHAT
          </button>
          <button
            type="button"
            data-testid="select-mode-story"
            aria-pressed="false"
            className="fx-press ui-btn rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold text-white/75"
            onClick={() => router.push('/story')}
          >
            STORY
          </button>
          <button
            type="button"
            data-testid="select-mode-kid"
            aria-pressed={prefsReady ? kidMode : undefined}
            aria-busy={!prefsReady}
            disabled={!prefsReady}
            className={`fx-press ui-btn rounded-full border px-3 py-1 text-[11px] font-semibold ${
              prefsReady && kidMode
                ? 'border-white/75 text-white'
                : 'border-white/20 bg-black/30 text-white/70'
            }`}
            style={prefsReady && kidMode ? { backgroundColor: `${accent}66` } : undefined}
            onClick={() => onKidMode(!kidMode)}
          >
            {t(lang, 'kidMode')}
          </button>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
            {t(lang, 'yourGender')}
          </span>
          {(['male', 'female', 'secret'] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              data-testid={`select-gender-${g}`}
              aria-pressed={genderReady ? genderOn === g : undefined}
              aria-busy={!genderReady}
              disabled={!genderReady}
              onClick={() => setGenderPick(g)}
              className={`fx-press ui-btn rounded-full border px-3 py-1 text-[11px] font-medium ${
                genderReady && genderOn === g
                  ? 'border-white/80 text-neutral-950'
                  : 'border-white/15 bg-black/30 text-white/70'
              }`}
              style={genderReady && genderOn === g ? { backgroundColor: accent } : undefined}
            >
              {t(lang, g === 'male' ? 'genderMale' : g === 'female' ? 'genderFemale' : 'genderSecret')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
