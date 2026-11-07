'use client';
// Numbered idle picks (#N). Tap = pin this idle. Right-click / long-press =
// toggle enable (on/off for rotation). Defaults stay #1+#2 until Mon changes.
// Chat-room only: multi-column CSS grid so every button fits without scrolling
// (Mon: side-rail overflow scroll does not work).

import { useEffect, useState } from 'react';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import { isIdleEnabled, listEnabledNums, setIdleEnabled } from '../lib/idle-enabled';
import { idlePickFor, isDefaultIdleClip, saveIdlePick } from '../lib/idle-pick';

export default function IdlePickRails({
  characterId,
  onPick,
}: {
  characterId: string;
  onPick?: (clipId: string) => void;
}) {
  // null / [] until localStorage sync — avoid default-chip flash then jump to saved pick.
  const [picked, setPicked] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPicked(idlePickFor(characterId));
    setEnabled(listEnabledNums());
    setReady(true);
  }, [characterId]);

  const tap = (id: string, playable: boolean) => {
    if (!playable || !ready) return;
    const saved = saveIdlePick(characterId, id);
    setPicked(saved);
    if (saved) onPick?.(saved);
  };

  const toggle = (num: number) => {
    if (!ready) return;
    setEnabled(setIdleEnabled(num, !isIdleEnabled(num)));
  };

  // Prefer playable clips so the grid stays dense and scroll-free.
  const items = IDLE_CLIP_OPTIONS.filter((item) => item.playable);
  const shown = items.length > 0 ? items : [...IDLE_CLIP_OPTIONS];

  return (
    <div
      data-testid="idle-rail-grid"
      data-ready={ready ? '1' : '0'}
      aria-busy={!ready}
      className={`pointer-events-none absolute bottom-[7.5rem] left-[max(2px,env(safe-area-inset-left))] top-14 z-20 flex w-[min(52vw,15.5rem)] min-h-0 flex-col sm:w-[min(44vw,17rem)] ${ready ? '' : 'opacity-0'}`}
    >
      <div
        data-testid="idle-rail-left"
        className="pointer-events-auto grid h-full min-h-0 max-h-full grid-cols-6 content-start gap-0.5 overflow-hidden sm:grid-cols-8" style={{ gridAutoRows: 'minmax(0, 1fr)' }}
      >
        {shown.map((item) => {
          const on = ready && picked === item.id;
          const en = ready && enabled.includes(item.num);
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
              aria-pressed={ready ? on : undefined}
              disabled={!ready}
              data-dev={`I${item.num}`}
              data-idle-num={item.num}
              data-c-id={item.cId ?? ''}
              onClick={() => tap(item.id, item.playable)}
              onContextMenu={(e) => {
                e.preventDefault();
                toggle(item.num);
              }}
              className={`relative min-h-0 min-w-0 rounded border px-0 py-0 text-center text-[8px] font-semibold leading-none ${
                !item.playable
                  ? 'border-white/10 bg-black/20 text-white/30'
                  : on
                  ? 'border-white/80 bg-white/20 text-white ring-1 ring-white/50'
                  : en
                    ? 'border-white/15 bg-black/30 text-white/55'
                    : 'border-white/10 bg-black/20 text-white/35'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {/* Keep right-rail test id for older layout assertions / smoke. */}
      <div data-testid="idle-rail-right" className="hidden" aria-hidden />
    </div>
  );
}
