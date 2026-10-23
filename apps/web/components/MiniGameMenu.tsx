'use client';

// Top-right entry for Tag and Lane Dodge. Cards open the title screen;
// they do not start the round. No hover-only affordance — a tap toggles.

import { useState } from 'react';
import { assetUrl } from '../lib/asset';
import { HOWTO_SRC, requestOpenMiniGame, uiCopy, type ActionGame } from '../lib/minigames';
import type { Lang } from '../lib/prefs';

const GAMES: ActionGame[] = ['tag', 'lane'];

export default function MiniGameMenu({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const ui = uiCopy(lang);

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        aria-label={ui.menu}
        aria-expanded={open}
        data-testid="minigame-menu"
        onClick={() => setOpen((v) => !v)}
        className="ui-btn flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base text-white/90 shadow-sm backdrop-blur-md"
      >
        <span aria-hidden>🎮</span>
      </button>
      {open && (
        <div
          data-testid="minigame-cards"
          className="absolute right-0 top-12 z-30 w-[min(88vw,20rem)] rounded-2xl border border-white/15 bg-neutral-950/95 p-3 shadow-2xl"
        >
          <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-white/70">{ui.menu}</p>
          <div className="flex flex-col gap-2">
            {GAMES.map((kind) => (
              <button
                key={kind}
                type="button"
                data-testid={`minigame-card-${kind}`}
                onClick={() => {
                  setOpen(false);
                  requestOpenMiniGame(kind);
                }}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2 text-left text-white"
              >
                <img
                  src={assetUrl(HOWTO_SRC[kind])}
                  alt=""
                  className="h-14 w-24 shrink-0 rounded-lg object-cover"
                />
                <span className="text-sm font-semibold">{kind === 'tag' ? ui.tagTitle : ui.laneTitle}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
