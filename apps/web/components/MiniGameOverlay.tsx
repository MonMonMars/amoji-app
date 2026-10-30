'use client';

// Title screen, then a full-screen HUD for Tag and Lane Dodge.
// The 3D scene stays CompanionCanvas; this overlay runs the kinematic sim
// only after START. Desktop uses keyboard + mouse. iOS and Android stay on
// touch (Android uses a shorter swipe and tighter insets). Chat chrome is
// not rendered while this is mounted.

import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../lib/asset';
import {
  HOWTO_SRC,
  controlHint,
  controlSchemeFor,
  createLane,
  createTag,
  desktopTagAim,
  detectHostPlatform,
  getMiniGameView,
  laneSwipeThreshold,
  lineFor,
  pickGround,
  publishMiniGameEmotion,
  setMiniGameView,
  stepLane,
  stepTag,
  tagKeysFromEvent,
  uiCopy,
  viewOfLane,
  viewOfTag,
  EMPTY_KEYS,
  type ActionGame,
  type ControlScheme,
  type HostPlatform,
  type LaneCommand,
  type LaneState,
  type MiniEmotionEvent,
  type TagCommand,
  type TagKeyState,
  type TagState,
} from '../lib/minigames';
import type { Lang } from '../lib/prefs';

interface Hud {
  phase: 'countdown' | 'playing' | 'result';
  sec: number | null;
  count: number;
  score: number;
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

function scoreOf(kind: ActionGame, t: number, z: number): number {
  if (kind === 'lane') return Math.max(0, Math.floor(z));
  return Math.max(0, Math.floor(t));
}

function insetTop(platform: HostPlatform): string {
  return platform === 'android'
    ? 'max(0.5rem, env(safe-area-inset-top))'
    : 'max(0.75rem, env(safe-area-inset-top))';
}

export interface MiniGameOverlayProps {
  kind: ActionGame;
  lang: Lang;
  onEmotion: (ev: MiniEmotionEvent) => void;
  onExit: (result: { line: string; hints: MiniEmotionEvent['hints'] }) => void;
}

export default function MiniGameOverlay({ kind, lang, onEmotion, onExit }: MiniGameOverlayProps) {
  const ui = uiCopy(lang);
  const [started, setStarted] = useState(false);
  const [platform] = useState<HostPlatform>(() => detectHostPlatform());
  const scheme: ControlScheme = controlSchemeFor(platform);
  const [hud, setHud] = useState<Hud>({ phase: 'countdown', sec: null, count: 3, score: 0, line: '' });
  const [bubble, setBubble] = useState<string | null>(null);
  const onEmotionRef = useRef(onEmotion);
  const onExitRef = useRef(onExit);
  const langRef = useRef(lang);
  const schemeRef = useRef(scheme);
  useEffect(() => {
    onEmotionRef.current = onEmotion;
    onExitRef.current = onExit;
    langRef.current = lang;
    schemeRef.current = scheme;
  });

  const tagCmd = useRef<TagCommand>({ hold: false, aimX: 0, aimZ: 0, dash: false });
  const laneCmd = useRef<LaneCommand>({ swipe: 0, pick: null });
  const tagRef = useRef<TagState | null>(null);
  const laneRef = useRef<LaneState | null>(null);
  const bubbleUntil = useRef(0);
  const tagHold = useRef<{ id: number; x: number; y: number; t: number; held: boolean } | null>(null);
  const lanePtr = useRef<{ id: number; x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerHold = useRef(false);
  const tagKeys = useRef<TagKeyState>({ ...EMPTY_KEYS });

  const hudFrom = (
    phase: Hud['phase'],
    t: number,
    duration: number,
    countdown: number,
    z: number,
    outcome?: Hud['outcome'],
  ): Hud => ({
    phase,
    sec: phase === 'playing' ? Math.max(0, Math.ceil(duration - t)) : null,
    count: phase === 'countdown' ? Math.max(1, Math.ceil(countdown)) : 0,
    score: scoreOf(kind, t, z),
    outcome,
    line: outcome ? lineFor(outcome, langRef.current) : '',
  });

  const resetRound = (reduced: boolean) => {
    tagCmd.current = { hold: false, aimX: 0, aimZ: 0, dash: false };
    laneCmd.current = { swipe: 0, pick: null };
    tagHold.current = null;
    lanePtr.current = null;
    pointerHold.current = false;
    tagKeys.current = { ...EMPTY_KEYS };
    if (kind === 'tag') {
      tagRef.current = createTag({ reduced });
      laneRef.current = null;
      setMiniGameView(viewOfTag(tagRef.current));
      const s = tagRef.current;
      setHud(hudFrom(s.phase, s.t, s.duration, s.countdown, 0));
    } else {
      laneRef.current = createLane({ reduced });
      tagRef.current = null;
      setMiniGameView(viewOfLane(laneRef.current));
      const s = laneRef.current;
      setHud(hudFrom(s.phase, s.t, s.duration, s.countdown, s.z));
    }
    setBubble(null);
    bubbleUntil.current = 0;
  };

  useEffect(() => {
    if (!started) {
      setMiniGameView(null);
      return;
    }
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
        if (schemeRef.current === 'keyboard') {
          const view = getMiniGameView();
          const player = view?.marker ?? tagRef.current.player;
          const aim = desktopTagAim(
            tagKeys.current,
            player,
            { x: view?.camX ?? player.x, z: view?.camZ ?? player.z + 4 },
            { x: view?.lookX ?? player.x, z: view?.lookZ ?? player.z },
          );
          if (aim.hold) {
            tagCmd.current.hold = true;
            tagCmd.current.aimX = aim.aimX;
            tagCmd.current.aimZ = aim.aimZ;
          } else if (!pointerHold.current) {
            tagCmd.current.hold = false;
          }
        }
        const edge = tagCmd.current.dash;
        tagCmd.current.dash = false;
        const res = stepTag(tagRef.current, { ...tagCmd.current, dash: edge }, dt);
        tagRef.current = res.state;
        setMiniGameView(viewOfTag(res.state));
        emit(res.events, now);
        const s = res.state;
        setHud((h) => {
          const next = hudFrom(s.phase, s.t, s.duration, s.countdown, 0, s.outcome);
          if (
            h.phase === next.phase &&
            h.sec === next.sec &&
            h.count === next.count &&
            h.score === next.score &&
            h.outcome === next.outcome
          ) return h;
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
          const next = hudFrom(s.phase, s.t, s.duration, s.countdown, s.z, s.outcome);
          if (
            h.phase === next.phase &&
            h.sec === next.sec &&
            h.count === next.count &&
            h.score === next.score &&
            h.outcome === next.outcome
          ) return h;
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
  }, [kind, started]);

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
  const backRef = useRef(back);
  useEffect(() => {
    backRef.current = back;
  }, [back]);

  useEffect(() => {
    if (scheme !== 'keyboard') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        backRef.current();
        return;
      }
      if (!started) return;
      if (kind === 'lane') {
        if (e.repeat) return;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') laneCmd.current.swipe = -1;
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') laneCmd.current.swipe = 1;
        return;
      }
      if (e.key === ' ') {
        if (!e.repeat) tagCmd.current.dash = true;
        e.preventDefault();
        return;
      }
      tagKeys.current = tagKeysFromEvent(e.key, true, tagKeys.current);
      if (/^(w|a|s|d|arrow)/i.test(e.key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (kind !== 'tag') return;
      tagKeys.current = tagKeysFromEvent(e.key, false, tagKeys.current);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
      tagKeys.current = { ...EMPTY_KEYS };
    };
  }, [scheme, started, kind]);

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
        pointerHold.current = true;
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
      pointerHold.current = true;
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
      pointerHold.current = false;
      const keys = tagKeys.current;
      const keyHeld = keys.w || keys.a || keys.s || keys.d;
      if (scheme !== 'keyboard' || !keyHeld) tagCmd.current.hold = false;
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
    const swipeMin = laneSwipeThreshold(platform);
    if (Math.abs(dx) > swipeMin && Math.abs(dx) > Math.abs(dy)) {
      laneCmd.current.swipe = dx < 0 ? -1 : 1;
      return;
    }
    // Lane pick by screen third is a mouse/tap affordance. Touch keeps swipe as the primary gesture.
    if (scheme === 'keyboard' && Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      const third = e.clientX / (window.innerWidth || 1);
      laneCmd.current.pick = third < 1 / 3 ? 0 : third > 2 / 3 ? 2 : 1;
    }
  };

  const top = insetTop(platform);
  const backLabel = scheme === 'keyboard' ? 'Esc' : '←';
  const title = kind === 'tag' ? ui.tagTitle : ui.laneTitle;
  const scoreText = kind === 'lane' ? `${hud.score}m` : String(hud.score);

  if (!started) {
    return (
      <div
        data-minigame={kind}
        data-phase="title"
        data-host={platform}
        data-scheme={scheme}
        className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 text-white"
        style={{
          paddingTop: top,
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <button
          type="button"
          data-testid="minigame-back"
          aria-label={ui.back}
          onClick={back}
          className={`absolute left-[max(1rem,env(safe-area-inset-left))] z-10 rounded-full border border-white/20 bg-black/55 font-semibold backdrop-blur-md ${
            scheme === 'keyboard' ? 'h-10 min-w-10 px-3 text-sm' : 'h-11 min-w-11 px-3 text-lg'
          }`}
          style={{ top }}
        >
          {backLabel}
        </button>
        <div className="flex w-full max-w-[min(100%,22rem)] flex-col items-center gap-3 sm:max-w-[min(100%,24rem)] sm:gap-4">
          <h1 className="text-center text-2xl font-semibold tracking-wide sm:text-3xl">{title}</h1>
          <div
            className="aspect-square w-full max-w-full overflow-hidden rounded-2xl border border-white/15 bg-black/35 shadow-2xl"
            data-testid="minigame-howto-frame"
          >
            <img
              src={assetUrl(HOWTO_SRC[kind])}
              alt={title}
              data-testid="minigame-howto"
              className="h-full w-full object-contain"
            />
          </div>
          <button
            type="button"
            data-testid="minigame-start"
            onClick={() => setStarted(true)}
            className="min-h-11 min-w-36 rounded-full bg-white px-10 py-3 text-base font-semibold tracking-widest text-black"
          >
            {ui.start}
          </button>
          <p data-testid="minigame-controls" className="text-center text-sm text-white/80">
            {controlHint(kind, platform, lang)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-minigame={kind}
      data-phase={hud.phase}
      data-host={platform}
      data-scheme={scheme}
      className="pointer-events-auto fixed inset-0 z-50 touch-none select-none text-white"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <button
        type="button"
        data-testid="minigame-back"
        aria-label={ui.back}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); back(); }}
        className={`pointer-events-auto absolute left-[max(1rem,env(safe-area-inset-left))] z-10 rounded-full border border-white/20 bg-black/55 font-semibold backdrop-blur-md ${
          scheme === 'keyboard' ? 'h-10 min-w-10 px-3 text-sm' : 'h-11 min-w-11 px-3 text-lg'
        }`}
        style={{ top }}
      >
        {backLabel}
      </button>
      <div
        data-testid="minigame-score"
        className={`pointer-events-none absolute right-[max(1rem,env(safe-area-inset-right))] z-10 max-w-[45vw] rounded-2xl border border-white/15 bg-black/45 px-4 py-2 text-right backdrop-blur-md ${
          platform === 'android' ? 'min-w-[4.5rem]' : 'min-w-[5.5rem]'
        }`}
        style={{ top }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">{ui.score}</p>
        <p className={`font-semibold tabular-nums ${platform === 'android' ? 'text-xl' : 'text-2xl'}`} data-testid="minigame-timer">
          {scoreText}
        </p>
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
                className="min-h-11 rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
              >
                {ui.again}
              </button>
              <button
                type="button"
                onClick={back}
                className="min-h-11 rounded-full border border-white/20 px-5 py-2 text-sm"
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
