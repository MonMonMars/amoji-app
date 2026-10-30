'use client';

// Top-right games button and the same overlapping card fan as character select.
// Drag, wheel, or the arrows move the focus. A tap opens that game's title screen.

import { useEffect, useState } from 'react';
import ArcFan from './ArcFan';
import { GAME_CARDS, gameCardCopy } from '../lib/minigames/catalog';
import { uiCopy } from '../lib/minigames/lines';
import type { ActionGame } from '../lib/minigames/types';
import type { Lang } from '../lib/prefs';

export function MiniGameMenuButton({
  lang,
  onClick,
}: {
  lang: Lang;
  onClick: () => void;
}) {
  const ui = uiCopy(lang);
  return (
    <button
      type="button"
      data-testid="minigame-menu"
      onClick={onClick}
      title={ui.menu}
      aria-label={ui.menu}
      data-dev="G1"
      className="ui-btn pointer-events-auto relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/90 shadow-sm backdrop-blur-md hover:bg-black/50 sm:h-10 sm:w-10"
    >
      <GamepadIcon />
    </button>
  );
}

export default function MiniGamePicker({
  lang,
  onClose,
  onPick,
}: {
  lang: Lang;
  onClose: () => void;
  onPick: (kind: ActionGame) => void;
}) {
  const ui = uiCopy(lang);
  const [focus, setFocus] = useState<ActionGame>(GAME_CARDS[0]!.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const index = GAME_CARDS.findIndex((card) => card.id === focus);
      if (e.key === 'ArrowRight') setFocus(GAME_CARDS[Math.min(GAME_CARDS.length - 1, index + 1)]!.id);
      if (e.key === 'ArrowLeft') setFocus(GAME_CARDS[Math.max(0, index - 1)]!.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, onClose]);

  return (
    <div
      className="fx-select fixed inset-0 z-[80] flex max-w-[100vw] flex-col overflow-x-hidden bg-black/55 text-white backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={ui.menu}
      data-testid="minigame-picker"
      onClick={onClose}
    >
      <div className="flex items-start justify-between gap-3 p-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-lg font-semibold tracking-wide">{ui.menu}</p>
          <p className="text-xs text-white/70">{ui.menuHint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ui-btn rounded-full border border-white/15 bg-black/45 px-3 py-2 text-xs backdrop-blur-md"
        >
          {ui.close}
        </button>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 items-center overflow-x-hidden px-3 sm:px-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-full min-h-[16rem] w-full max-w-full overflow-x-hidden">
          <ArcFan
            ariaLabel={ui.menu}
            size="portrait"
            items={GAME_CARDS.map((card) => ({ ...card }))}
            selectedId={focus}
            onSelect={(id) => setFocus(id as ActionGame)}
            onConfirm={(id) => onPick(id as ActionGame)}
            label={(card) => gameCardCopy(card.id, lang).title}
          >
            {(card, active) => {
              const copy = gameCardCopy(card.id, lang);
              return (
                <>
                  <span
                    className="absolute right-1.5 top-1.5 z-20 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-neutral-950 px-1 text-[9px] font-extrabold text-neutral-950"
                    style={{ background: card.accent }}
                  >
                    {GAME_CARDS.findIndex((item) => item.id === card.id) + 1}
                  </span>
                  {card.id === 'tag' ? <TagArt /> : <LaneArt />}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-1.5 pb-1.5 pt-6 text-center">
                    <span className="block truncate text-[11px] font-semibold leading-tight sm:text-xs">{copy.title}</span>
                    <span className="block truncate text-[9px] leading-tight text-white/75">{active ? ui.play : copy.hint}</span>
                  </span>
                  {active && (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{ boxShadow: `inset 0 0 0 2px ${card.accent}` }}
                    />
                  )}
                </>
              );
            }}
          </ArcFan>
        </div>
      </div>
    </div>
  );
}

function GamepadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="2.5" y="8" width="19" height="9" rx="4.5" />
      <path d="M8 12.5h3M9.5 11v3" strokeLinecap="round" />
      <circle cx="16" cy="11.5" r="0.8" fill="currentColor" />
      <circle cx="17.6" cy="13.2" r="0.8" fill="currentColor" />
    </svg>
  );
}

function TagArt() {
  return (
    <svg viewBox="0 0 160 220" className="absolute inset-0 h-full w-full" aria-hidden>
      <rect width="160" height="220" fill="#b7e4c7" />
      <rect x="12" y="14" width="136" height="150" rx="16" fill="none" stroke="#1b4332" strokeOpacity="0.35" strokeWidth="3" />
      <circle cx="62" cy="96" r="16" fill="none" stroke="#e9c46a" strokeWidth="5" />
      <circle cx="98" cy="70" r="10" fill="#f3c7b0" />
      <path d="M88 84c0-5 5-8 10-8s10 3 10 8v16c0 3-3 6-6 6h-8c-3 0-6-3-6-6z" fill="#f8fafc" />
    </svg>
  );
}

function LaneArt() {
  return (
    <svg viewBox="0 0 160 220" className="absolute inset-0 h-full w-full" aria-hidden>
      <rect width="160" height="220" fill="#2b2d42" />
      <rect x="46" y="0" width="68" height="220" fill="#3a3d58" />
      <path d="M68 0v220M92 0v220" stroke="#f8fafc" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="10 8" />
      <rect x="52" y="36" width="16" height="16" rx="3" fill="#f4a261" />
      <rect x="96" y="78" width="16" height="16" rx="3" fill="#e76f51" />
      <circle cx="80" cy="132" r="8" fill="#f3c7b0" />
    </svg>
  );
}
