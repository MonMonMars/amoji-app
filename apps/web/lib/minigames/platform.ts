// Host UI for Tag and Lane Dodge. A desktop browser stays on keyboard + mouse
// even when the machine has a touchscreen. Phones and Capacitor shells stay
// on touch. Callers can pass a probe so tests do not need a DOM.

import type { ActionGame } from './types';

export type HostPlatform = 'desktop' | 'ios' | 'android';
export type ControlScheme = 'keyboard' | 'touch';

export interface PlatformProbe {
  userAgent: string;
  maxTouchPoints: number;
  /** matchMedia('(pointer: fine)').matches */
  pointerFine: boolean;
  /** matchMedia('(hover: hover)').matches */
  hoverHover: boolean;
  /** Capacitor.getPlatform(), when the native bridge is present. */
  capacitorPlatform?: string | null;
}

export interface TagKeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

interface CapacitorBridge {
  getPlatform?: () => string;
  platform?: string;
}

export function controlSchemeFor(platform: HostPlatform): ControlScheme {
  return platform === 'desktop' ? 'keyboard' : 'touch';
}

/** CSS-pixel swipe that changes a lane. Android screens are denser, so the gesture is a little shorter. */
export function laneSwipeThreshold(platform: HostPlatform): number {
  return platform === 'android' ? 28 : 36;
}

export function classifyHostPlatform(probe: PlatformProbe): HostPlatform {
  const cap = (probe.capacitorPlatform ?? '').toLowerCase();
  if (cap === 'ios') return 'ios';
  if (cap === 'android') return 'android';

  const ua = probe.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';

  // iPadOS 13+ desktop UA is Macintosh, but it still reports a touch screen.
  // A Mac trackpad stays at maxTouchPoints 0, so this does not catch desktops.
  if (/Macintosh|Mac OS X/i.test(ua) && probe.maxTouchPoints > 1) return 'ios';

  // Touchscreen laptops still expose a fine primary pointer and hover.
  // That is desktop web, not a phone, even though the browser can receive touch.
  if (probe.pointerFine && probe.hoverHover) return 'desktop';

  if (probe.maxTouchPoints > 0 && /Mobile|Mobi/i.test(ua)) return 'android';
  return 'desktop';
}

function readCapacitorPlatform(): string | null {
  const cap = (globalThis as { Capacitor?: CapacitorBridge }).Capacitor;
  if (!cap) return null;
  if (typeof cap.getPlatform === 'function') return cap.getPlatform();
  if (typeof cap.platform === 'string') return cap.platform;
  return null;
}

export function readPlatformProbe(): PlatformProbe {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { userAgent: '', maxTouchPoints: 0, pointerFine: true, hoverHover: true, capacitorPlatform: null };
  }
  const match = (q: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(q).matches : false);
  return {
    userAgent: navigator.userAgent || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    pointerFine: match('(pointer: fine)'),
    hoverHover: match('(hover: hover)'),
    capacitorPlatform: readCapacitorPlatform(),
  };
}

export function detectHostPlatform(probe?: PlatformProbe): HostPlatform {
  return classifyHostPlatform(probe ?? readPlatformProbe());
}

export const HOWTO_SRC: Record<ActionGame, string> = {
  tag: '/minigames/howto-tag.jpg',
  lane: '/minigames/howto-lane-dodge.jpg',
};

export const EMPTY_KEYS: TagKeyState = { w: false, a: false, s: false, d: false };

/**
 * Camera-relative chase aim for desktop Tag. W/↑ moves along the camera's
 * look direction; A/D strafe. Returns hold:false when no movement key is down
 * so a released key does not leave the runner stuck.
 */
export function desktopTagAim(
  keys: TagKeyState,
  player: { x: number; z: number },
  cam: { x: number; z: number },
  look: { x: number; z: number },
): { hold: boolean; aimX: number; aimZ: number } {
  const mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  const mz = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
  if (!mx && !mz) return { hold: false, aimX: player.x, aimZ: player.z };

  let fx = look.x - cam.x;
  let fz = look.z - cam.z;
  const fl = Math.hypot(fx, fz);
  if (fl < 1e-4) {
    fx = 0;
    fz = -1;
  } else {
    fx /= fl;
    fz /= fl;
  }
  const rx = fz;
  const rz = -fx;
  let ax = fx * -mz + rx * mx;
  let az = fz * -mz + rz * mx;
  const al = Math.hypot(ax, az) || 1;
  ax /= al;
  az /= al;
  return { hold: true, aimX: player.x + ax * 4, aimZ: player.z + az * 4 };
}

export function tagKeysFromEvent(key: string, down: boolean, prev: TagKeyState): TagKeyState {
  const next = { ...prev };
  const k = key.toLowerCase();
  if (k === 'w' || k === 'arrowup') next.w = down;
  else if (k === 'a' || k === 'arrowleft') next.a = down;
  else if (k === 's' || k === 'arrowdown') next.s = down;
  else if (k === 'd' || k === 'arrowright') next.d = down;
  return next;
}

