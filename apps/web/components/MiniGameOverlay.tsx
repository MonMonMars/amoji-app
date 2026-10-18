'use client';

// Full-screen HUD + input for Tag and Lane Dodge. The 3D scene stays
// CompanionCanvas; this overlay only runs the kinematic sim and publishes
// a view. rAF pauses while the tab is hidden. No LLM, no gyro.

import { useEffect, useRef, useState } from 'react';
import {
  createLane,
  createTag,
  lineFor,
  pickGround,
  publishMiniGameEmotion,
  setMiniGameView,
  stepLane,
  stepTag,
  uiCopy,
  viewOfLane,
  viewOfTag,
  type ActionGame,
  type LaneCommand,
  type LaneState,
  type MiniEmotionEvent,
  type TagCommand,
  type TagState,
} from '../lib/minigames';
import type { Lang } from '../lib/prefs';

interface Hud {
  phase: 'countdown' | 'playing' | 'result';
  sec: number | null;
  count: number;
  outcome?: 'catch' | 'timeout' | 'crash' | 'survive';
  line: string;
}

function prefersReduced(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ndc(e: { clientX: number; clientY: number }): { nx: number; ny: number } {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  return {
    nx: (e.clientX / w) * 2 - 1,
    ny: -(e.clientY / h) * 2 + 1,
  };
}

export interface MiniGameOverlayProps {
  kind: ActionGame;
  lang: Lang;
  onEmotion: (ev: MiniEmotionEvent) => void;
  onExit: (result: { line: string; hints: MiniEmotionEvent['hints'] }) => void;
}

export default function MiniGameOverlay({ kind, lang, onEmotion, onExit }: MiniGameOverlayProps) {
  const ui = uiCopy(lang);
  const [hud, setHud] = useState<Hud>({ phase: 'countdown', sec: null, count: 3, line: '' });
  const [bubble, setBubble] = useState<string | null>(null);
  const onEmotionRef = useRef(onEmotion);
  const onExitRef = useRef(onExit);
  const langRef = useRef(lang);
  useEffect(() => {
    onEmotionRef.current = onEmotion;
    onExitRef.current = onExit;
    langRef.current = lang;
  });

  const tagCmd = useRef<TagCommand>({ hold: false, aimX: 0, aimZ: 0, dash: false });
  const laneCmd = useRef<LaneCommand>({ swipe: 0, pick: null });
  const tagRef = useRef<TagState | null>(null);
  const laneRef = useRef<LaneState | null>(null);
  const bubbleUntil = useRef(0);
  const tagHold = useRef<{ id: number; x: number; y: number; t: number; held: boolean } | null>(null);
  const lanePtr = useRef<{ id: number; x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hudFrom = (
    phase: Hud['phase'],
    t: number,
    duration: number,
    countdown: number,
    outcome?: Hud['outcome'],
  ): Hud => ({
    phase,
    sec: phase === 'playing' ? Math.max(0, Math.ceil(duration - t)) : null,
    count: phase === 'countdown' ? Math.max(1, Math.ceil(countdown)) : 0,
    outcome,
    line: outcome ? lineFor(outcome, langRef.current) : '',
  });

  const resetRound = (reduced: boolean) => {
    tagCmd.current = { hold: false, aimX: 0, aimZ: 0, dash: false };
    laneCmd.current = { swipe: 0, pick: null };
    tagHold.current = null;
    lanePtr.current = null;
    if (kind === 'tag') {
      tagRef.current = createTag({ reduced });
      laneRef.current = null;
      setMiniGameView(viewOfTag(tagRef.current));
      const s = tagRef.current;
      setHud(hudFrom(s.phase, s.t, s.duration, s.countdown));
    } else {
      laneRef.current = createLane({ reduced });
      tagRef.current = null;
      setMiniGameView(viewOfLane(laneRef.current));
      const s = laneRef.current;
      setHud(hudFrom(s.phase, s.t, s.duration, s.countdown));
    }
    setBubble(null);
    bubbleUntil.current = 0;
  };

  useEffect(() => {
    resetRound(prefersReduced());
    let raf = 0;
    let last = performance.now();

    const emit = (events: MiniEmotionEvent[], now: number) => {
      for (const ev of events) {
        const line = lineFor(ev.kind, langRef.current);
        publishMiniGameEmotion({ kind: ev.kind, hints: ev.hints, line });
        onEmotionRef.current(ev);
        if (ev.kind === 'near_miss' || ev.kind === 'lane_near_miss') {
          bubbleUntil.current = now + 2400;
          setBubble(line);
        }
      }
    };

    const loop = (now: number) => {
      if (document.hidden) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (bubbleUntil.current && now > bubbleUntil.current) {
        bubbleUntil.current = 0;
        setBubble(null);
      }
      if (kind === 'tag' && tagRef.current) {
        const edge = tagCmd.current.dash;
        tagCmd.current.dash = false;
        const res = stepTag(tagRef.current, { ...tagCmd.current, dash: edge }, dt);
        tagRef.current = res.state;
        setMiniGameView(viewOfTag(res.state));
        emit(res.events, now);
        const s = res.state;
        setHud((h) => {
          const next = hudFrom(s.phase, s.t, s.duration, s.countdown, s.outcome);
          if (h.phase === next.phase && h.sec === next.sec && h.count === next.count && h.outcome === next.outcome) return h;
          return next;
        });
      } else if (laneRef.current) {
        const swipe = laneCmd.current.swipe;
        const pick = laneCmd.current.pick;
        laneCmd.current.swipe = 0;
        laneCmd.current.pick = null;
        const res = stepLane(laneRef.current, { swipe, pick }, dt);
        laneRef.current = res.state;
        setMiniGameView(viewOfLane(res.state));
        emit(res.events, now);
        const s = res.state;
        setHud((h) => {
          const next = hudFrom(s.phase, s.t, s.duration, s.countdown, s.outcome);
          if (h.phase === next.phase && h.sec === next.sec && h.count === next.count && h.outcome === next.outcome) return h;
          return next;
        });
      }
    };

    const onVis = () => {
      if (!document.hidden && raf === 0) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      setMiniGameView(null);
    };
    // resetRound/hudFrom are stable for a given kind; lang is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    if (kind !== 'lane') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') laneCmd.current.swipe = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') laneCmd.current.swipe = 1;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind]);

  const aimFromEvent = (e: { clientX: number; clientY: number }) => {
    const { nx, ny } = ndc(e);
    const hit = pickGround(nx, ny);
    if (!hit) return;
    tagCmd.current.aimX = hit.x;
    tagCmd.current.aimZ = hit.z;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (hud.phase === 'result') return;
    if (kind === 'tag') {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      aimFromEvent(e);
      tagHold.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), held: false };
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        if (!tagHold.current) return;
        tagHold.current.held = true;
        tagCmd.current.hold = true;
      }, 170);
      return;
    }
    lanePtr.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (kind !== 'tag' || !tagHold.current || tagHold.current.id !== e.pointerId) return;
    const h = tagHold.current;
    if (Math.hypot(e.clientX - h.x, e.clientY - h.y) > 8) h.held = true;
    if (h.held) {
      tagCmd.current.hold = true;
      aimFromEvent(e);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (kind === 'tag') {
      const h = tagHold.current;
      tagHold.current = null;
      tagCmd.current.hold = false;
      if (!h || h.id !== e.pointerId || hud.phase === 'result') return;
      const moved = Math.hypot(e.clientX - h.x, e.clientY - h.y);
      const quick = performance.now() - h.t < 280;
      if (!h.held && quick && moved < 14) {
        aimFromEvent(e);
        tagCmd.current.dash = true;
      }
      return;
    }
    const start = lanePtr.current;
    lanePtr.current = null;
    if (!start || start.id !== e.pointerId || hud.phase === 'result') return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
      laneCmd.current.swipe = dx < 0 ? -1 : 1;
      return;
    }
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      const third = e.clientX / (window.innerWidth || 1);
      laneCmd.current.pick = third < 1 / 3 ? 0 : third > 2 / 3 ? 2 : 1;
    }
  };

  const leave = (result: { line: string; hints: MiniEmotionEvent['hints'] }) => {
    setMiniGameView(null);
    onExitRef.current(result);
  };

  const back = () => {
    const outcome = hud.outcome;
    if (outcome === 'catch' || outcome === 'survive') {
      leave({ line: lineFor(outcome, lang), hints: { joy: 0.9, pride: 0.4 } });
      return;
    }
    if (outcome === 'timeout' || outcome === 'crash') {
      leave({ line: lineFor(outcome, lang), hints: { sadness: 0.6 } });
      return;
    }
    leave({ line: lineFor('quit', lang), hints: { sadness: 0.25, joy: 0.2 } });
  };

  return (
    <div
      data-minigame={kind}
      data-phase={hud.phase}
      className="pointer-events-auto fixed inset-0 z-50 touch-none select-none text-white"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="rounded-2xl border border-white/15 bg-black/45 px-4 py-2 backdrop-blur-md">
          <p className="text-sm font-semibold tracking-wide">{kind === 'tag' ? ui.tagTitle : ui.laneTitle}</p>
          {hud.sec != null && (
            <p className="text-2xl font-semibold tabular-nums" data-testid="minigame-timer">{hud.sec}</p>
          )}
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); back(); }}
          className="pointer-events-auto rounded-full border border-white/15 bg-black/45 px-3 py-2 text-xs backdrop-blur-md"
        >
          {ui.close}
        </button>
      </div>

      {hud.phase === 'countdown' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-7xl font-semibold drop-shadow" data-testid="minigame-count">{hud.count}</p>
        </div>
      )}

      {bubble && hud.phase === 'playing' && (
        <div className="pointer-events-none absolute inset-x-0 top-[22%] flex justify-center px-6">
          <p
            className="max-w-sm rounded-2xl border border-white/20 bg-black/55 px-4 py-2 text-center text-sm backdrop-blur-md"
            data-testid="minigame-bubble"
          >
            {bubble}
          </p>
        </div>
      )}

      {hud.phase !== 'result' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
          <p className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-center text-xs text-white/80 backdrop-blur-md">
            {kind === 'tag' ? ui.tagHint : ui.laneHint}
          </p>
        </div>
      )}

      {hud.phase === 'result' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div
            role="dialog"
            data-testid="minigame-result"
            className="pointer-events-auto w-full max-w-sm rounded-3xl border border-white/15 bg-black/70 p-6 text-center shadow-2xl backdrop-blur-md"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-lg leading-relaxed">{hud.line}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => resetRound(prefersReduced())}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
              >
                {ui.again}
              </button>
              <button
                type="button"
                onClick={back}
                className="rounded-full border border-white/20 px-5 py-2 text-sm"
              >
                {ui.back}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
