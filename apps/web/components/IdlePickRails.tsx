'use client';
// Tiny idle A/B buttons in the side gutters. They sit off the character
// and off the chat column. Default rotation is only b01 + b02; a01–a04 /
// b03/b04 are optional one-shot pins.

import { useEffect, useState } from 'react';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import { idlePickFor, isDefaultIdleClip, saveIdlePick } from '../lib/idle-pick';

export default function IdlePickRails({
  characterId,
  onPick,
}: {
  characterId: string;
  onPick: (clipId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { setPicked(idlePickFor(characterId)); }, [characterId]);

  const tap = (id: string) => {
    const saved = saveIdlePick(characterId, id);
    setPicked(saved);
    if (saved) onPick(saved);
  };

  const left = IDLE_CLIP_OPTIONS.filter((_, i) => i % 2 === 0);
  const right = IDLE_CLIP_OPTIONS.filter((_, i) => i % 2 === 1);
  const rail = (side: 'left' | 'right', items: typeof IDLE_CLIP_OPTIONS[number][]) => (
    <div
      data-testid={`idle-rail-${side}`}
      className={`pointer-events-none absolute bottom-36 top-16 z-20 flex w-8 flex-col items-center justify-center gap-0.5 ${
        side === 'left'
          ? 'left-[max(2px,env(safe-area-inset-left))]'
          : 'right-[max(2px,env(safe-area-inset-right))]'
      }`}
    >
      {items.map((item) => {
        const on = picked === item.id;
        const calm = isDefaultIdleClip(item.id);
        return (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            title={calm ? `${item.id} (default rotation)` : item.id}
            aria-pressed={on}
            data-dev={item.label.toUpperCase()}
            onClick={() => tap(item.id)}
            className={`pointer-events-auto relative rounded border px-0.5 py-px text-[8px] font-medium leading-none ${
              on ? 'border-white/80 text-white' : calm ? 'border-white/35 bg-black/45 text-white/85' : 'border-white/20 bg-black/40 text-white/75'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {rail('left', left)}
      {rail('right', right)}
    </>
  );
}
