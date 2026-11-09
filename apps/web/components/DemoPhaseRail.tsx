'use client';
// Small one-tap demo chips above the chat composer — horizontal scroll so
// iPhone users can browse abilities without typing or talking.

import { DEMO_PHASE_BUTTONS, asDemoLang, type DemoPhaseId } from '../lib/demo-phase';

const RAIL_ARIA: Record<string, string> = {
  en: 'Try what she can do',
  yue: '試吓佢識做咩',
  zh: '试试她会做什么',
  ja: 'できることを試す',
};

export default function DemoPhaseRail({
  lang,
  disabled,
  onPick,
}: {
  lang: string;
  disabled?: boolean;
  onPick: (prompt: string, id: DemoPhaseId) => void;
}) {
  const L = asDemoLang(lang);

  return (
    <div
      data-testid="demo-phase-rail"
      role="list"
      aria-label={RAIL_ARIA[L] ?? RAIL_ARIA.en}
      className="flex w-full min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
    >
      {DEMO_PHASE_BUTTONS.map((btn) => (
        <button
          key={btn.id}
          type="button"
          role="listitem"
          data-demo-phase={btn.id}
          disabled={disabled}
          onClick={() => onPick(btn.prompt[L], btn.id)}
          className="shrink-0 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-medium leading-none text-white/85 transition active:scale-95 enabled:hover:border-white/30 enabled:hover:bg-black/60 disabled:opacity-40"
        >
          {btn.label[L]}
        </button>
      ))}
    </div>
  );
}
