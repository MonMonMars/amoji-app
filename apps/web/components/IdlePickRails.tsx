'use client';
// Numbered idle rails (#N). Tap = pin this idle. Right-click / long-press =
// toggle enable (on/off for rotation). Defaults stay #1+#2 until Mon changes.

import { useEffect, useState } from 'react';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import { isIdleEnabled, listEnabledNums, setIdleEnabled } from '../lib/idle-enabled';
import { idlePickFor, isDefaultIdleClip, saveIdlePick } from '../lib/idle-pick';

export default function IdlePickRails({
  characterId,
  onPick,
}: {
  characterId: string;
  onPick: (clipId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<number[]>(() => listEnabledNums());

  useEffect(() => { setPicked(idlePickFor(characterId)); }, [characterId]);

  const tap = (id: string) => {
    const saved = saveIdlePick(characterId, id);
    setPicked(saved);
    if (saved) onPick(saved);
  };

  const toggle = (num: number) => {
    setEnabled(setIdleEnabled(num, !isIdleEnabled(num)));
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
        const en = enabled.includes(item.num);
        const calm = isDefaultIdleClip(item.id);
        const title = [
          `#${item.num}`,
          item.cId ?? 'app',
          item.name,
          en ? 'ON' : 'OFF',
          'tap=use · hold/right-click=toggle',
        ].join(' · ');
        return (
          <button
            key={item.num}
            type="button"
            aria-label={`Idle #${item.num}`}
            title={title}
            aria-pressed={on}
            data-dev={`I${item.num}`}
            data-idle-num={item.num}
            data-c-id={item.cId ?? ''}
            onClick={() => tap(item.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              toggle(item.num);
            }}
            className={`pointer-events-auto relative rounded border px-0.5 py-px text-[8px] font-medium leading-none ${
              on
                ? 'border-white/80 text-white'
                : en
                  ? calm
                    ? 'border-white/35 bg-black/45 text-white/85'
                    : 'border-white/25 bg-black/40 text-white/80'
                  : 'border-white/10 bg-black/25 text-white/40'
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
