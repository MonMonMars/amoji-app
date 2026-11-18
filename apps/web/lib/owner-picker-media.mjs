/**
 * Owner-resources picker: local `amoji-public-serve` paths vs external stream URLs (Mixkit, etc.).
 * Shared by store-bundle verify and the generated owner-resources.html inline player.
 */

const MIXKIT_HOST_RE = /^(?:https?:\/\/)?(?:\/\/)?(?:assets\.)?mixkit\.co\//i;
const WIKIMEDIA_HOST_RE = /^https?:\/\/(?:upload\.)?wikimedia\.org\//i;

/** True when play target is not checked against `out/` bytes on disk. */
export function isExternalOwnerPickerPlaySrc(src) {
  const t = String(src ?? "").trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (t.startsWith("//")) return true;
  if (MIXKIT_HOST_RE.test(t)) return true;
  if (WIKIMEDIA_HOST_RE.test(t)) return true;
  return false;
}

/** Rewrite picker `data-play` for repo `docs/` (symlink) → GitHub Pages `../` layout. */
export function pagesAssetSrcFromPickerRaw(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (isExternalOwnerPickerPlaySrc(t)) {
    return normalizeExternalOwnerPickerPlaySrc(t);
  }
  if (t.startsWith("amoji-public-serve/")) return `../${t.slice("amoji-public-serve/".length)}`;
  if (t.startsWith("amoji-public-serve")) {
    const tail = t.slice("amoji-public-serve".length).replace(/^\//, "");
    return tail ? `../${tail}` : "";
  }
  return t;
}

export function normalizeExternalOwnerPickerPlaySrc(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (/^(?:assets\.)?mixkit\.co\//i.test(t)) return `https://${t.replace(/^\/\//, "")}`;
  return t;
}

/** Inlined into owner-resources.html — keep in sync with unit tests. */
export const PICKER_PLAY_RESOLVE_INLINE_JS = `
    function resolvePlaySrc(raw) {
      if (!raw) return '';
      const t = String(raw).trim();
      if (/^https?:\\/\\//i.test(t)) return t;
      if (t.startsWith('//')) return 'https:' + t;
      if (/^(?:assets\\.)?mixkit\\.co\\//i.test(t)) return 'https://' + t.replace(/^\\/\\//, '');
      if (t.startsWith('amoji-public-serve/')) return '../' + t.slice('amoji-public-serve/'.length);
      if (t.startsWith('amoji-public-serve')) {
        const tail = t.slice('amoji-public-serve'.length).replace(/^\\//, '');
        return tail ? '../' + tail : '';
      }
      return t;
    }
    function isRemotePlaySrc(resolved, el) {
      return !!(el && el.classList && el.classList.contains('play-remote'))
        || /^https?:\\/\\//i.test(resolved)
        || /mixkit\\.co\\//i.test(resolved);
    }
    function pickerPlayFailureMessage(resolved, el, playErr) {
      if (isRemotePlaySrc(resolved, el)) {
        const gesture = playErr && playErr.name === 'NotAllowedError'
          ? ' Browser blocked playback until you interact with the page — tap ▶ again.'
          : '';
        return 'Stream preview did not play' + gesture + ' (Mixkit CDN may 403 on GitHub Pages — not a missing ../audio file). Use the Source link on mixkit.co in this row, or try the live app demo for full playback.';
      }
      return 'Local preview missing or blocked. On Pages use /amoji-app/docs/owner-resources.html; local: cd docs && python3 -m http.server 8765';
    }
    function applyRemoteAudioHints(audio, url) {
      if (/mixkit\\.co\\//i.test(url)) {
        audio.preload = 'metadata';
        audio.referrerPolicy = 'strict-origin-when-cross-origin';
      }
    }
    let pickerGestureUnlocked = false;
    function unlockPickerAudioGesture() {
      if (pickerGestureUnlocked) return;
      pickerGestureUnlocked = true;
      try {
        const probe = new Audio();
        probe.muted = true;
        const pending = probe.play();
        if (pending && pending.then) {
          pending.then(() => { probe.pause(); probe.removeAttribute('src'); }).catch(() => {});
        }
      } catch { /* ignore */ }
    }
    document.body.addEventListener('pointerdown', unlockPickerAudioGesture, { once: true, passive: true });`;