/**
 * Canonical: docs/owner-resources.html (music + poke + idle tabs).
 * Legacy docs/owner-*-picker.html redirect to the unified page.
 * Generated via scripts/generate-owner-picker-html.mjs — do not hand-edit HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IDLE_POSES } from '../packages/vrm-renderer/src/idle-poses.ts';
import { PERFORMANCE_CLIPS } from '../apps/web/lib/performance-clips.ts';
import { STREAM_TRACKS } from '../apps/web/lib/music-catalog.ts';
import { MUSIC_THEMES } from '../apps/web/lib/music.ts';
import {
  POKE_SECTIONS,
  pokeSectionBodyReaction,
} from '../apps/web/lib/poke-zones.ts';
import {
  POKE_LINE_TEMPLATES,
  VOICE_IDS,
} from '../apps/web/lib/personality-voice.ts';
import { RECORDED_POKE_ZONE } from '../apps/web/lib/voice-clips.ts';
import {
  CMA_REACTION_GALLERY,
  CMA_REACTION_ARCHIVE_CODES,
  CMA_REACTION_GALLERY_KEY,
  CMA_REACTION_KEEP_CODES,
  CMA_REACTION_OWNER_WANT_CODES,
} from '../apps/web/lib/cma-reaction-gallery.ts';
import type { Lang } from '../apps/web/lib/prefs.ts';
import { CHARACTERS_WANT } from '../apps/web/lib/characters-want.ts';
import { PICKER_PLAY_RESOLVE_INLINE_JS } from '../apps/web/lib/owner-picker-media.mjs';
import { audioPlayerBlockHtml, audioPlayerCellHtml, motionPreviewCellHtml, pokeSectionMotionPreview, resolveIdleMotionPreview, resolvePerfMotionPreview } from '../apps/web/lib/owner-picker-html-media.ts';
import { CHAT_IDLE_CURATED, defaultCuratedRailNums } from '../apps/web/lib/idle-curated-rail.ts';
import { idleClipFamily } from '../apps/web/lib/idle-clip-family.ts';
import { IDLE_LIBRARY, idleByClipId, type IdleLibraryEntry } from '../apps/web/lib/idle-library.ts';
import {
  IDLE_ENABLED_KEY,
  IDLE_PICK_KEY,
  IDLE_PREFS_GENERATION,
  KNOWN_BAD_IDLE_CLIP_IDS,
  LEGACY_IDLE_ENABLED_KEYS,
  LEGACY_IDLE_PICK_KEYS,
} from '../apps/web/lib/idle-owner-migrate.ts';
import { DEFAULT_IDLE_CLIP_ID } from '../apps/web/lib/idle-retired.ts';
import { CHARACTER_POSES } from '../apps/web/lib/persona.ts';
import { CLASSIC_FAIRY_TALES } from '../apps/web/lib/classic-fairy-tales.ts';
import { highestStoryOwnerCode } from '../apps/web/lib/story-catalog.ts';
import { DEMO_PHASE_BUTTONS } from '../apps/web/lib/demo-phase.ts';
import { OWNER_NEWS_CATALOG } from '../apps/web/lib/owner-news-catalog.ts';
import { IDLE_OWNER_REF_CATALOG } from '../apps/web/lib/idle-owner-ref-catalog.ts';
import { performanceClipOwnerCodeForId } from '../apps/web/lib/performance-clip-owner.ts';
import { HIGHEST_MV_OWNER_CODE } from '../apps/web/lib/music-mv-registry.ts';
import {
  OWNER_CATALOG_PREFIXES,
  ownerCatalogLookupMap,
  ownerCatalogTsv,
} from '../apps/web/lib/owner-catalog-registry.ts';
import {
  PERF_MOTION_TAGS,
  PERF_MOTION_TAG_LABELS,
  clipBpmForTag,
} from '../apps/web/lib/performance-motion.ts';

/** Same key as in-page script — agent-ingestible notes + keep state. */
export const OWNER_PICKER_NOTES_KEY = 'amoji.ownerPickerNotes.v1';

const NOTE_TD =
  '<td class="note-cell"><input type="text" class="owner-note" placeholder="Usage note…" aria-label="Owner note" /></td>';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = ownerCatalogLookupMap();

function catalogMeta(nativeId: string): { attrs: string; codeCell: string } {
  const row = CATALOG.get(nativeId);
  if (!row) {
    return { attrs: '', codeCell: '—' };
  }
  return {
    attrs: ` data-owner-code="${escapeHtml(row.cdCode)}" data-domain-code="${escapeHtml(row.domainCode)}" data-prefix="${escapeHtml(row.prefix)}"`,
    codeCell: `<code title="${escapeHtml(row.prefix)}">${escapeHtml(row.cdCode)}</code><br/><code class="ref">${escapeHtml(row.domainCode)}</code>`,
  };
}

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const publicRoot = path.join(root, 'apps/web/public');

const LANGS: Lang[] = ['en', 'yue', 'zh', 'ja'];
/** Symlink `docs/amoji-public-serve` → `apps/web/public` so `python3 -m http.server` in docs/ can play MP3s. */
const PUBLIC_PREFIX = 'amoji-public-serve';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lineRef(relPath: string, needle: string, startLine = 1): string {
  const abs = path.join(root, relPath);
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const i = lines.findIndex((l, idx) => idx >= startLine - 1 && l.includes(needle));
  return i >= 0 ? `${relPath}:${i + 1}` : relPath;
}

function findStringLine(relPath: string, fragment: string): string {
  const abs = path.join(root, relPath);
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const frag = fragment.slice(0, 48);
  const i = lines.findIndex((l) => l.includes(frag));
  return i >= 0 ? `${relPath}:${i + 1}` : lineRef(relPath, 'POKE_LINE_TEMPLATES');
}

function sharedCss(): string {
  return `
    :root {
      --ink: #1a2420;
      --muted: #5a6b62;
      --paper: #f3eee4;
      --panel: #fffaf2;
      --line: #d5cdb8;
      --accent: #0e6b5c;
      --accent-deep: #084c42;
      --hold: #8a3b3b;
      --hold-bg: #f3d9d6;
      --shadow: 0 18px 40px rgba(26, 36, 32, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: "Source Sans 3", "Segoe UI", sans-serif;
      background:
        radial-gradient(1200px 600px at 10% -10%, #d9efe6 0%, transparent 55%),
        radial-gradient(900px 500px at 100% 0%, #f0dfb8 0%, transparent 45%),
        linear-gradient(180deg, #efe7d6 0%, var(--paper) 40%, #ebe4d5 100%);
      min-height: 100vh;
    }
    .wrap { width: min(1200px, calc(100% - 2rem)); margin: 0 auto; padding: 2.5rem 0 4rem; }
    header.hero {
      display: grid; gap: 1rem; margin-bottom: 1.5rem; padding: 1.75rem;
      border: 1px solid var(--line);
      background: linear-gradient(135deg, rgba(14, 107, 92, 0.12), transparent 42%), var(--panel);
      box-shadow: var(--shadow);
    }
    .eyebrow { letter-spacing: 0.14em; text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: var(--accent); }
    h1 { margin: 0; font-family: Fraunces, Georgia, serif; font-size: clamp(1.8rem, 3.5vw, 2.6rem); color: var(--accent-deep); }
  .lede { margin: 0; color: var(--muted); line-height: 1.55; max-width: 52rem; }
    .instr {
      margin: 1rem 0 1.5rem; padding: 1rem 1.2rem; border: 1px dashed var(--accent);
      background: #fff; border-radius: 4px; font-size: 0.95rem; line-height: 1.5;
    }
    .instr ol { margin: 0.5rem 0 0; padding-left: 1.2rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 1rem 0; }
    button, .btn {
      font-family: inherit; font-weight: 600; cursor: pointer;
      border: 1px solid var(--line); background: var(--panel); padding: 0.45rem 0.85rem;
      border-radius: 4px; color: var(--accent-deep);
    }
    button:hover { background: #f0f7f4; }
    .grid-stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem; margin-bottom: 1.25rem;
    }
    .stat { background: var(--panel); border: 1px solid var(--line); padding: 0.85rem 1rem; box-shadow: var(--shadow); }
    .stat .n { font-family: Fraunces, Georgia, serif; font-size: 1.75rem; font-weight: 700; }
    .stat .l { color: var(--muted); font-size: 0.85rem; }
    h2 {
      font-family: Fraunces, Georgia, serif; font-size: 1.35rem; margin: 2rem 0 0.75rem;
      color: var(--accent-deep);
    }
    .panel { background: var(--panel); border: 1px solid var(--line); box-shadow: var(--shadow); overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { text-align: left; padding: 0.45rem 0.55rem; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { background: #f6f1e6; font-weight: 700; position: sticky; top: 0; z-index: 1; }
    tr:hover td { background: rgba(14, 107, 92, 0.04); }
    code, .ref { font-size: 0.8rem; color: var(--muted); word-break: break-all; }
    .tag { display: inline-block; padding: 0.1rem 0.35rem; margin: 0.1rem 0.15rem 0.1rem 0;
      border-radius: 3px; background: #e8f4ef; font-size: 0.75rem; }
    .hold { background: var(--hold-bg); color: var(--hold); font-weight: 600; }
    .license-ok { color: var(--accent-deep); }
    audio { height: 28px; max-width: 220px; vertical-align: middle; }
    .audio-player { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; min-width: 11rem; max-width: 20rem; }
    .audio-player .audio-play-toggle { min-width: 2.1rem; padding: 0.25rem 0.45rem; }
    .audio-player .audio-stop { min-width: 2rem; padding: 0.25rem 0.4rem; font-size: 0.72rem; line-height: 1; }
    .audio-player .audio-scrub { flex: 1 1 5rem; min-width: 4.5rem; accent-color: var(--accent); }
    .audio-player .audio-time { font-size: 0.75rem; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .motion-preview img { object-fit: cover; border: 1px solid var(--line); border-radius: 3px; background: #f6f1e6; }
    .motion-preview--missing { font-size: 0.75rem; max-width: 6.5rem; }
    .motion-preview--vrma a { font-size: 0.78rem; }
    .play-remote { font-size: 0.8rem; }
    input[type="checkbox"] { transform: scale(1.15); cursor: pointer; }
    tr.owner-saved td { background: rgba(14, 107, 92, 0.1); }
    tr.owner-saved-pin td:first-child { box-shadow: inset 3px 0 0 var(--accent); }
    tr.owner-bad td { opacity: 0.72; }
    .saved-picks { font-size: 0.78rem; color: var(--accent-deep); max-width: 14rem; }
    #ownerPrefBanner {
      margin: 0.5rem 0 1rem; padding: 0.75rem 1rem; border: 1px solid var(--line);
      background: #fff; font-size: 0.88rem; line-height: 1.45;
    }
    #exportOut {
      width: 100%; min-height: 4rem; margin-top: 0.75rem; font-family: ui-monospace, monospace;
      font-size: 0.8rem; padding: 0.5rem; border: 1px solid var(--line);
    }
    .filter { padding: 0.35rem 0.5rem; border: 1px solid var(--line); min-width: 12rem; }
    .tabs {
      display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0 1.25rem;
    }
    .tab {
      font-family: inherit; font-weight: 700; cursor: pointer;
      border: 1px solid var(--line); background: var(--panel); padding: 0.5rem 1rem;
      border-radius: 4px; color: var(--muted);
    }
    .tab[aria-selected="true"] {
      background: #e8f4ef; color: var(--accent-deep); border-color: var(--accent);
    }
    .tab-panel[hidden] { display: none !important; }
    tr.row-in-use td { background: rgba(14, 107, 92, 0.06); }
    .tag.in-use { background: #d4ebe4; color: var(--accent-deep); font-weight: 700; }
    .tag.pinned { background: #f0e6c8; color: #6b4f12; font-weight: 700; }
    .tag.default-on { background: #e3eef8; color: #1e4a6e; }
    .note-cell { min-width: 9rem; max-width: 18rem; }
  .owner-note {
      width: 100%; font-family: inherit; font-size: 0.82rem;
      padding: 0.28rem 0.4rem; border: 1px solid var(--line); border-radius: 3px;
      background: #fff;
    }
    .owner-note:focus { outline: 2px solid rgba(14, 107, 92, 0.35); border-color: var(--accent); }
    #importNotesWrap[hidden] { display: none !important; }
    #importNotesJson { width: 100%; min-height: 5rem; margin-top: 0.5rem; font-family: ui-monospace, monospace; font-size: 0.8rem; }
  `;
}

function inUseTag(label = 'In use'): string {
  return `<span class="tag in-use">${escapeHtml(label)}</span>`;
}

function defaultOnTag(): string {
  return '<span class="tag default-on">Default ON</span>';
}

function pickerScript(_exportKey: string): string {
  const notesKey = JSON.stringify(OWNER_PICKER_NOTES_KEY);
  return `
    const NOTES_KEY = ${notesKey};
    let notesSaveTimer = null;
    function rowStorageKey(tr) {
      return tr.dataset.ownerCode || tr.dataset.id || '';
    }
    function readNotesStore() {
      try {
        const raw = localStorage.getItem(NOTES_KEY);
        if (raw) return JSON.parse(raw);
      } catch { /* corrupt */ }
      return { version: 'owner-picker-notes-v1', rows: {} };
    }
    function rowSnapshot(tr) {
      return {
        cd: tr.dataset.ownerCode || '',
        domain: tr.dataset.domainCode || '',
        prefix: tr.dataset.prefix || '',
        id: tr.dataset.id || '',
        label: tr.dataset.label || tr.dataset.id || '',
        ref: tr.dataset.ref || '',
        keep: tr.querySelector('input.keep')?.checked !== false,
        note: (tr.querySelector('.owner-note')?.value || '').trim(),
      };
    }
    function persistNotesStore() {
      const store = { version: 'owner-picker-notes-v1', savedAt: new Date().toISOString(), rows: {} };
      document.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
        const snap = rowSnapshot(tr);
        const key = rowStorageKey(tr);
        if (!key) return;
        if (snap.note || !snap.keep) store.rows[key] = snap;
      });
      try { localStorage.setItem(NOTES_KEY, JSON.stringify(store)); } catch { /* private mode */ }
      return store;
    }
    function findRowForStored(key, row) {
      return [...document.querySelectorAll('tbody tr[data-id]')].find((tr) => {
        if (rowStorageKey(tr) === key) return true;
        if (row?.cd && tr.dataset.ownerCode === row.cd) return true;
        if (row?.id && tr.dataset.id === row.id) return true;
        return false;
      });
    }
    function applyRowState(tr, row) {
      if (!tr || !row) return;
      const inp = tr.querySelector('.owner-note');
      if (inp && row.note != null) inp.value = row.note;
      const cb = tr.querySelector('input.keep');
      if (cb && typeof row.keep === 'boolean') cb.checked = row.keep;
    }
    function applyNotesPayload(data) {
      if (!data) return;
      if (data.rows && typeof data.rows === 'object') {
        for (const [key, row] of Object.entries(data.rows)) {
          applyRowState(findRowForStored(key, row), row);
        }
      }
      if (Array.isArray(data.items)) {
        for (const entry of data.items) {
          const key = entry.cd || entry.id;
          applyRowState(findRowForStored(key, entry), entry);
        }
      }
    }
    function collectNotesExport() {
      const items = [...document.querySelectorAll('tbody tr[data-id]')].map(rowSnapshot);
      const remove = items.filter((r) => !r.keep);
      const removeCd = remove.map((r) => r.cd).filter(Boolean);
      const byPrefix = {};
      for (const r of remove) {
        if (r.prefix) (byPrefix[r.prefix] = byPrefix[r.prefix] || []).push(r.domain || r.id);
      }
      return JSON.stringify({
        version: 'owner-picker-notes-v1',
        exportedAt: new Date().toISOString(),
        items,
        remove,
        removeCd,
        removeByPrefix: byPrefix,
        kept: items.length - remove.length,
      }, null, 2);
    }
    function scheduleNotesPersist() {
      clearTimeout(notesSaveTimer);
      notesSaveTimer = setTimeout(persistNotesStore, 350);
    }
    document.body.addEventListener('input', (e) => {
      if (e.target.matches('.owner-note') || e.target.matches('input.keep')) scheduleNotesPersist();
    });
    document.body.addEventListener('change', (e) => {
      if (e.target.matches('input.keep')) scheduleNotesPersist();
    });
    applyNotesPayload(readNotesStore());

    function rowId(cb) { return cb.closest('tr')?.dataset?.id || ''; }
    function collectUnchecked(fmt) {
      const rows = [...document.querySelectorAll('tbody tr[data-id]')];
      const remove = rows.filter(tr => !tr.querySelector('input.keep')?.checked).map(tr => ({
        cd: tr.dataset.ownerCode || '',
        domain: tr.dataset.domainCode || '',
        prefix: tr.dataset.prefix || '',
        id: tr.dataset.id,
        label: tr.dataset.label || tr.dataset.id,
        ref: tr.dataset.ref || '',
      }));
      const byPrefix = {};
      const removeCd = [];
      for (const r of remove) {
        if (r.cd) removeCd.push(r.cd);
        if (r.prefix) (byPrefix[r.prefix] = byPrefix[r.prefix] || []).push(r.domain || r.id);
      }
      if (fmt === 'json') {
        return JSON.stringify({
          version: 'owner-catalog-export-v1',
          remove,
          removeCd,
          removeByPrefix: byPrefix,
          kept: rows.length - remove.length,
        }, null, 2);
      }
      const lines = ['## Remove (unchecked rows)', ''];
      for (const r of remove) {
        const code = r.cd ? r.cd + ' ' : '';
        const dom = r.domain ? '(' + r.domain + ') ' : '';
        lines.push('- ' + code + dom + r.id + (r.label ? ' — ' + r.label : '') + (r.ref ? ' (' + r.ref + ')' : ''));
      }
      return lines.join('\\n');
    }
    document.getElementById('copyJson')?.addEventListener('click', () => {
      const t = collectUnchecked('json');
      document.getElementById('exportOut').value = t;
      navigator.clipboard?.writeText(t);
    });
    document.getElementById('copyMd')?.addEventListener('click', () => {
      const t = collectUnchecked('md');
      document.getElementById('exportOut').value = t;
      navigator.clipboard?.writeText(t);
    });
    document.getElementById('filterQ')?.addEventListener('input', (e) => {
      const q = (e.target.value || '').toLowerCase();
      document.querySelectorAll('tbody tr[data-id]').forEach(tr => {
        tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    ${PICKER_PLAY_RESOLVE_INLINE_JS}
    function formatMmSs(sec) {
      if (!Number.isFinite(sec) || sec < 0) return '0:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return m + ':' + String(s).padStart(2, '0');
    }
    let activePlayer = null;
    function pauseActivePlayer() {
      if (!activePlayer) return;
      activePlayer.audio.pause();
      activePlayer.toggle.textContent = '▶';
      activePlayer = null;
    }
    function wireAudioPlayer(root) {
      const raw = root.getAttribute('data-play');
      if (!raw) return;
      const toggle = root.querySelector('.audio-play-toggle');
      const stopBtn = root.querySelector('.audio-stop');
      const scrub = root.querySelector('.audio-scrub');
      const curEl = root.querySelector('.audio-cur');
      const durEl = root.querySelector('.audio-dur');
      if (!toggle || !scrub) return;
      const audio = new Audio();
      let seeking = false;
      function resetRowUi() {
        toggle.textContent = '▶';
        scrub.value = '0';
        if (curEl) curEl.textContent = '0:00';
      }
      function stopRowPlayback() {
        audio.pause();
        audio.currentTime = 0;
        resetRowUi();
        if (activePlayer && activePlayer.root === root) activePlayer = null;
      }
      audio.addEventListener('loadedmetadata', () => {
        scrub.disabled = false;
        scrub.max = String(audio.duration || 100);
        if (durEl) durEl.textContent = formatMmSs(audio.duration);
      });
      audio.addEventListener('timeupdate', () => {
        if (seeking || !audio.duration) return;
        scrub.value = String(audio.currentTime);
        if (curEl) curEl.textContent = formatMmSs(audio.currentTime);
      });
      audio.addEventListener('ended', () => {
        resetRowUi();
        if (activePlayer && activePlayer.root === root) activePlayer = null;
      });
      audio.addEventListener('error', () => alert(pickerPlayFailureMessage(resolvePlaySrc(raw), toggle)));
      scrub.addEventListener('input', () => { seeking = true; });
      scrub.addEventListener('change', () => {
        const t = Number(scrub.value);
        if (Number.isFinite(t)) audio.currentTime = t;
        seeking = false;
      });
      toggle.addEventListener('click', () => {
        unlockPickerAudioGesture();
        const src = resolvePlaySrc(raw);
        if (!src) return;
        if (activePlayer && activePlayer.root !== root) pauseActivePlayer();
        const url = /^https?:/i.test(src) ? src : new URL(src, location.href).href;
        if (!audio.src) { audio.src = url; applyRemoteAudioHints(audio, url); }
        if (audio.paused) {
          audio.play().then(() => { toggle.textContent = '⏸'; activePlayer = { root, audio, toggle }; })
            .catch((err) => alert(pickerPlayFailureMessage(src, toggle, err)));
        } else {
          audio.pause();
          toggle.textContent = '▶';
          if (activePlayer && activePlayer.root === root) activePlayer = null;
        }
      });
      stopBtn?.addEventListener('click', () => stopRowPlayback());
    }
    document.querySelectorAll('.audio-player[data-play]').forEach(wireAudioPlayer);
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-play]:not(.audio-player)');
      if (!btn || btn.classList.contains('audio-player')) return;
      if (e.target.closest('.audio-player')) return;
      unlockPickerAudioGesture();
      const src = resolvePlaySrc(btn.getAttribute('data-play'));
      if (!src) return;
      pauseActivePlayer();
      const url = /^https?:/i.test(src) ? src : new URL(src, location.href).href;
      const oneShot = new Audio(url);
      applyRemoteAudioHints(oneShot, url);
      oneShot.onerror = () => alert(pickerPlayFailureMessage(src, btn));
      oneShot.play().catch((err) => alert(pickerPlayFailureMessage(src, btn, err)));
    });
    document.getElementById('saveNotesJson')?.addEventListener('click', async () => {
      const json = collectNotesExport();
      document.getElementById('exportOut').value = json;
      const blob = new Blob([json], { type: 'application/json' });
      const name = 'owner-picker-notes-' + new Date().toISOString().slice(0, 10) + '.json';
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
          });
          const w = await handle.createWritable();
          await w.write(blob);
          await w.close();
          persistNotesStore();
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      persistNotesStore();
    });
    document.getElementById('toggleImportNotes')?.addEventListener('click', () => {
      const w = document.getElementById('importNotesWrap');
      if (w) w.hidden = !w.hidden;
    });
    document.getElementById('applyImportNotes')?.addEventListener('click', () => {
      const raw = document.getElementById('importNotesJson')?.value || '';
      try {
        applyNotesPayload(JSON.parse(raw));
        persistNotesStore();
        document.getElementById('exportOut').value = collectNotesExport();
      } catch {
        alert('Could not parse JSON — paste export from Save notes or a prior ticket.');
      }
    });
  `;
}

function unifiedOwnerClientScript(): string {
  const pickKeys = [JSON.stringify(IDLE_PICK_KEY), ...LEGACY_IDLE_PICK_KEYS.map((k) => JSON.stringify(k))];
  const enableKeys = [JSON.stringify(IDLE_ENABLED_KEY), ...LEGACY_IDLE_ENABLED_KEYS.map((k) => JSON.stringify(k))];
  const defaultRails = JSON.stringify(defaultCuratedRailNums());
  const cmaKey = JSON.stringify(CMA_REACTION_GALLERY_KEY);
  return `
    const TAB_IDS = ['music', 'stories', 'demo', 'news', 'poke', 'idle'];
    function showTab(id) {
      if (!TAB_IDS.includes(id)) id = 'music';
      for (const t of TAB_IDS) {
        const panel = document.getElementById('panel-' + t);
        const btn = document.querySelector('[data-tab="' + t + '"]');
        if (panel) panel.hidden = t !== id;
        if (btn) btn.setAttribute('aria-selected', t === id ? 'true' : 'false');
      }
      location.hash = id;
    }
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => showTab(btn.getAttribute('data-tab')));
    });
    const hash = (location.hash || '#music').slice(1);
    showTab(hash);
    window.addEventListener('hashchange', () => showTab((location.hash || '#music').slice(1)));

    const PICK_KEYS = [${pickKeys.join(', ')}];
    const ENABLE_KEYS = [${enableKeys.join(', ')}];
    const DEFAULT_RAILS = ${defaultRails};
    const CMA_GALLERY_KEY = ${cmaKey};
    function readJsonKey(keys) {
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) return { key: k, data: JSON.parse(raw) };
        } catch { /* corrupt */ }
      }
      return null;
    }
    function formatSavedPicks() {
      const pick = readJsonKey(PICK_KEYS);
      const en = readJsonKey(ENABLE_KEYS);
      const byClip = new Map();
      if (pick?.data && typeof pick.data === 'object') {
        for (const [charId, clipId] of Object.entries(pick.data)) {
          if (!clipId) continue;
          const list = byClip.get(clipId) || [];
          list.push(charId + ' pin');
          byClip.set(clipId, list);
        }
      }
      if (Array.isArray(en?.data)) {
        const note = 'rail #' + en.data.join(', #') + ' (' + (en.key || '') + ')';
        for (const tr of document.querySelectorAll('tr[data-rail-num]')) {
          const n = Number(tr.dataset.railNum);
          if (en.data.includes(n)) {
            const clip = tr.dataset.clipId;
            if (clip) {
              const list = byClip.get(clip) || [];
              list.push('enabled ' + note);
              byClip.set(clip, list);
            }
          }
        }
      }
      for (const tr of document.querySelectorAll('tr[data-clip-id]')) {
        const clip = tr.dataset.clipId;
        const cell = tr.querySelector('.saved-picks');
        if (!cell || !clip) continue;
        const hits = byClip.get(clip);
        if (hits?.length) {
          cell.textContent = hits.join(' · ');
          tr.classList.add('owner-saved');
          if (hits.some((h) => h.includes('pin'))) tr.classList.add('owner-saved-pin');
        }
      }
      const banner = document.getElementById('ownerPrefBanner');
      if (!banner) return;
      const parts = [];
      if (pick) parts.push('Per-character pins from <code>' + pick.key + '</code>');
      else parts.push('No idle pin map in this browser (open after using the app on the same origin, or paste picks in chat).');
      if (en) parts.push('Enabled rails: #' + en.data.join(', #') + ' via <code>' + en.key + '</code>');
      banner.innerHTML = parts.join('<br/>');
      for (const n of DEFAULT_RAILS) {
        for (const tr of document.querySelectorAll('tr[data-rail-num="' + n + '"]')) {
          const cell = tr.querySelector('.flags');
          if (cell && !cell.textContent?.includes('Pinned')) {
            cell.insertAdjacentHTML('beforeend', ' <span class="tag default-on">Default ON</span>');
          }
        }
      }
      try {
        const raw = localStorage.getItem(CMA_GALLERY_KEY);
        if (raw) {
          const picks = JSON.parse(raw);
          if (picks && typeof picks === 'object') {
            for (const [code, verdict] of Object.entries(picks)) {
              const tr = document.querySelector('tr[data-cma-code="' + code + '"]');
              if (!tr) continue;
              const cell = tr.querySelector('.saved-picks') || tr.querySelector('.flags');
              if (!cell) continue;
              const tag = verdict === 'want' ? 'Your pick (Want)' : verdict === 'skip' ? 'Your skip' : String(verdict);
              cell.insertAdjacentHTML('beforeend', ' <span class="tag pinned">' + tag + '</span>');
              tr.classList.add('owner-saved');
              if (verdict === 'want') tr.classList.add('owner-saved-pin');
            }
          }
        }
      } catch { /* corrupt CMA picks */ }
    }
    formatSavedPicks();
  `;
}

function buildRedirectHtml(targetHash: string, title: string): string {
  const href = `owner-resources.html#${targetHash}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(href)}" />
  <link rel="canonical" href="${escapeHtml(href)}" />
  <title>${escapeHtml(title)} — moved</title>
</head>
<body>
  <p>Moved to <a href="${escapeHtml(href)}">owner-resources.html#${escapeHtml(targetHash)}</a></p>
  <script>location.replace(${JSON.stringify(href)});</script>
</body>
</html>`;
}

function buildStoriesPage(): PickerSection {
  const taleRef = lineRef('apps/web/lib/classic-fairy-tales.ts', 'export const CLASSIC_FAIRY_TALES');
  let rows = '';
  for (const tale of CLASSIC_FAIRY_TALES) {
    const code = tale.ownerCode ?? tale.id;
    const title = tale.title.en;
    const cat = catalogMeta(code);
    rows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(code)}" data-st-code="${escapeHtml(code)}" data-label="${escapeHtml(title)}" data-ref="${escapeHtml(taleRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked aria-label="Keep ${escapeHtml(code)}" /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags">${inUseTag('classic-fairy-tales')}</td>
      <td><strong>${escapeHtml(title)}</strong><br/><code>${escapeHtml(code)}</code></td>
      <td>${escapeHtml(tale.length)}</td>
      <td>en · yue · zh · ja</td>
      <td><span class="tag">${escapeHtml(tale.slug)}</span></td>
      <td class="license-ok">PD</td>
      <td>${escapeHtml(tale.author)}</td>
      <td><code>${escapeHtml(tale.id)}</code><br/><span class="ref">${escapeHtml(taleRef)}</span></td>
    </tr>`;
  }
  const body = `
    <p class="lede">Spoken Story chip + long-read mode. Codes <code>ST001</code>…<code>${escapeHtml(highestStoryOwnerCode())}</code> map to <code>CLASSIC_FAIRY_TALES</code> (PD paraphrases, not Disney scripts).</p>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · ST</th><th>Ship</th><th>Title · ST code</th><th>Length</th><th>Locales</th><th>Slug</th><th>License</th><th>Tradition</th><th>id · source</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  return {
    body,
    stats: stat(CLASSIC_FAIRY_TALES.length, 'Story rows'),
    counts: { total: CLASSIC_FAIRY_TALES.length },
  };
}

function buildDemoPage(): PickerSection {
  const demoRef = lineRef('apps/web/lib/demo-phase.ts', 'export const DEMO_PHASE_BUTTONS');
  let rows = '';
  DEMO_PHASE_BUTTONS.forEach((btn) => {
    const cat = catalogMeta(btn.id);
    const prompts = btn.prompts.en.length;
    rows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(btn.id)}" data-label="${escapeHtml(btn.label.en)}" data-ref="${escapeHtml(demoRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags">${inUseTag('DemoPhaseRail')}</td>
      <td><code>${escapeHtml(btn.id)}</code></td>
      <td>${escapeHtml(btn.label.en)} · ${escapeHtml(btn.label.yue)}</td>
      <td>${prompts} prompts</td>
      <td><span class="ref">${escapeHtml(demoRef)}</span></td>
    </tr>`;
  });
  const prefixRows = Object.entries(OWNER_CATALOG_PREFIXES)
    .map(([k, v]) => `<tr><td><code>${escapeHtml(k)}</code></td><td>${escapeHtml(v)}</td></tr>`)
    .join('');
  const body = `
    <p class="lede">Demo-phase chips use <code>PH001–PH${String(DEMO_PHASE_BUTTONS.length).padStart(3, '0')}</code>. Master keep/remove still cites <code>CD###</code> from the Code column.</p>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · PH</th><th>Ship</th><th>id</th><th>Labels</th><th>Prompts</th><th>Source</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <h2>Owner code prefixes</h2>
    <div class="panel"><table>
      <thead><tr><th>Prefix</th><th>Meaning</th></tr></thead>
      <tbody>${prefixRows}</tbody>
    </table></div>`;
  return {
    body,
    stats: stat(DEMO_PHASE_BUTTONS.length, 'Demo-phase chips'),
    counts: { total: DEMO_PHASE_BUTTONS.length },
  };
}

function buildNewsPage(): PickerSection {
  const newsRef = lineRef('apps/web/lib/owner-news-catalog.ts', 'export const OWNER_NEWS_CATALOG');
  let rows = '';
  for (const nw of OWNER_NEWS_CATALOG) {
    const cat = catalogMeta(nw.urlOrTemplate);
    rows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(nw.urlOrTemplate)}" data-label="${escapeHtml(nw.label)}" data-ref="${escapeHtml(newsRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags">${inUseTag('live-tools')}</td>
      <td><code>${escapeHtml(nw.ownerCode)}</code></td>
      <td>${escapeHtml(nw.kind)}</td>
      <td>${escapeHtml(nw.region)} · ${escapeHtml(nw.lang)}</td>
      <td>${escapeHtml(nw.label)}</td>
      <td class="license-ok">${escapeHtml(nw.license)}</td>
      <td><code>${escapeHtml(nw.urlOrTemplate)}</code></td>
      <td><span class="ref">${escapeHtml(nw.usedBy)}</span></td>
    </tr>`;
  }
  const body = `
    <p class="lede">News feeds/templates from <code>live-tools.ts</code> + <code>owner-news-catalog.ts</code> — public RSS only, no paid APIs.</p>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · NW</th><th>Ship</th><th>NW</th><th>Kind</th><th>Region</th><th>Label</th><th>License</th><th>URL / template</th><th>Used by</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  return {
    body,
    stats: stat(OWNER_NEWS_CATALOG.length, 'News rows'),
    counts: { total: OWNER_NEWS_CATALOG.length },
  };
}

function buildUnifiedResourcesPage(
  music: PickerSection,
  poke: PickerSection,
  idle: PickerSection,
  stories: PickerSection,
  demo: PickerSection,
  news: PickerSection,
): { html: string; counts: Record<string, number> } {
  const grandTotal =
    music.counts.total +
    poke.counts.sections +
    poke.counts.pokeLines +
    poke.counts.zones +
    poke.counts.cma +
    (idle.counts.total as number) +
    (stories.counts.total as number) +
    (demo.counts.total as number) +
    (news.counts.total as number);
  const stats = [
    stat(music.counts.total, 'Music rows'),
    stat(stories.counts.total, 'Story rows'),
    stat(demo.counts.total, 'Demo-phase chips'),
    stat(news.counts.total, 'News feeds'),
    stat(poke.counts.sections + poke.counts.cma, 'Poke rows (core)'),
    stat(idle.counts.total, 'Idle rows'),
    stat(grandTotal, 'All picker rows'),
  ].join('');
  const sotNote = `<p class="lede">Source of truth: <code>owner-picker-html-writer.ts</code> + <code>owner-catalog-registry.ts</code> (master <code>CD###</code>). Imports <code>performance-clips.ts</code>, <code>music-catalog.ts</code>, <code>demo-phase.ts</code>, <code>owner-news-catalog.ts</code>, <code>poke-zones.ts</code>, <code>cma-reaction-gallery.ts</code>, <code>idle-library.ts</code>, <code>idle-owner-ref-catalog.ts</code>, <code>idle-curated-rail.ts</code>, <code>idle-owner-migrate.ts</code> (<code>${escapeHtml(IDLE_PICK_KEY)}</code> / <code>${escapeHtml(IDLE_ENABLED_KEY)}</code>), <code>${escapeHtml(CMA_REACTION_GALLERY_KEY)}</code>. Default idle clip: <code>${escapeHtml(DEFAULT_IDLE_CLIP_ID)}</code>.</p>`;

  const body = `
    <nav class="tabs" aria-label="Resource categories">
      <button type="button" class="tab" data-tab="music" aria-selected="true">Music &amp; beds</button>
      <button type="button" class="tab" data-tab="stories">Stories &amp; fairy tales</button>
      <button type="button" class="tab" data-tab="demo">Demo-phase chips</button>
      <button type="button" class="tab" data-tab="news">News &amp; RSS</button>
      <button type="button" class="tab" data-tab="poke">Poke reactions</button>
      <button type="button" class="tab" data-tab="idle">Idle poses &amp; VRMA</button>
    </nav>
    <section id="panel-music" class="tab-panel" data-section="music">
      <h2 id="music">Music &amp; performance audio</h2>
      ${music.body}
    </section>
    <section id="panel-stories" class="tab-panel" data-section="stories" hidden>
      <h2 id="stories">Stories &amp; fairy tales (ST###)</h2>
      ${stories.body}
    </section>
    <section id="panel-demo" class="tab-panel" data-section="demo" hidden>
      <h2 id="demo">Demo-phase chips (PH###)</h2>
      ${demo.body}
    </section>
    <section id="panel-news" class="tab-panel" data-section="news" hidden>
      <h2 id="news">News feeds &amp; templates (NW###)</h2>
      ${news.body}
    </section>
    <section id="panel-poke" class="tab-panel" data-section="poke" hidden>
      <h2 id="poke">Poke motion, voice lines, VFX / SFX</h2>
      <p class="lede">Sections = body motion routing · TTS poke line bank (PK) · recorded zone SFX + CMA reaction gallery (VFX). CMA gallery picks read from <code>${escapeHtml(CMA_REACTION_GALLERY_KEY)}</code> on this browser (Want / Skip).</p>
      ${poke.body}
    </section>
    <section id="panel-idle" class="tab-panel" data-section="idle" hidden>
      <h2 id="idle">Idle library, chat rail, pools</h2>
      ${idle.body}
    </section>`;

  const lede =
    'One place for Pixel to review ship-eligible resources. Every row has a master <code>CD###</code> plus a domain code (<code>MV</code>/<code>ST</code>/<code>PH</code>/<code>NW</code>/<code>PK</code>/<code>ID</code>/<code>DC</code>). Cite <code>CD022</code> in chat for keep/remove. Rows highlighted <span class="tag in-use">In use</span> match runtime defaults. <span class="tag pinned">Your pick</span> fills from the same localStorage keys as the live app on this origin.';

  const html = htmlShell(
    'Amoji — Owner resource library (unified)',
    'Pixel · all rails',
    lede,
    sotNote + body,
    stats,
    'owner-resources.html',
    '<code>owner-picker-html-writer.ts</code> · <code>owner-resource-manifest.ts</code> · <a href="OWNER_RESOURCE_LIBRARY.md">OWNER_RESOURCE_LIBRARY.md</a>',
    unifiedOwnerClientScript(),
  );

  return {
    html,
    counts: {
      music: music.counts.total,
      poke: poke.counts.sections + poke.counts.pokeLines + poke.counts.zones + poke.counts.cma,
      idle: idle.counts.total,
      grandTotal,
    },
  };
}

function htmlShell(
  title: string,
  eyebrow: string,
  lede: string,
  body: string,
  statsHtml: string,
  previewFilename: string,
  footerSot: string,
  extraScript = '',
): string {
  const gen = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>${sharedCss()}</style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">${lede}</p>
      <p class="lede"><strong>Local preview:</strong> <code>cd docs &amp;&amp; python3 -m http.server 8765</code> then open <code>http://127.0.0.1:8765/${escapeHtml(previewFilename)}</code>. GitHub Pages: <code>https://monmonmars.github.io/amoji-app/docs/${escapeHtml(previewFilename)}</code>${previewFilename.includes('music') ? '. Local audio uses symlink <code>docs/amoji-public-serve</code> → <code>apps/web/public</code>.' : '.'}</p>
    </header>
    <section class="instr">
      <strong>Pixel — keep vs remove + per-row notes</strong>
      <ol>
        <li>Every row is <strong>Keep</strong> by default (checked). Uncheck rows you want cut from the ship set.</li>
        <li>Type <strong>Usage note</strong> per row (music, VFX/CMA, voice/PK, movement/idle, demo PH, news NW, DC/MV/ST, etc.).</li>
        <li><strong>Save notes JSON</strong> exports agent-ingestible file (<code>{ cd, note, keep, … }</code>) — uses <code>showSaveFilePicker</code> when available, else download. Backup: <code>${escapeHtml(OWNER_PICKER_NOTES_KEY)}</code> on this origin.</li>
        <li><strong>Copy JSON</strong> / <strong>Copy Markdown</strong> still export <em>remove lists only</em> (unchecked rows) — unchanged for engineers.</li>
        <li>Licensed / Hold rows are labeled honestly; uncheck means “don’t wire in app”, not “delete files” unless noted.</li>
      </ol>
      <div class="toolbar">
        <input class="filter" id="filterQ" type="search" placeholder="Filter label or code (CD022, MV070, PK…)…" aria-label="Filter" />
        <button type="button" id="saveNotesJson">Save notes JSON</button>
        <button type="button" id="toggleImportNotes">Load / import JSON</button>
        <button type="button" id="copyJson">Copy JSON (remove list)</button>
        <button type="button" id="copyMd">Copy Markdown</button>
      </div>
      <div id="importNotesWrap" hidden>
        <label for="importNotesJson"><strong>Paste prior export</strong> (restores notes + Keep checkboxes)</label>
        <textarea id="importNotesJson" placeholder='{"version":"owner-picker-notes-v1", …}'></textarea>
        <button type="button" id="applyImportNotes">Apply import</button>
      </div>
      <textarea id="exportOut" readonly placeholder="Export appears here…"></textarea>
    </section>
    <div class="grid-stats">${statsHtml}</div>
    ${body}
    <p class="lede" style="margin-top:2rem;font-size:0.85rem;">Generated ${gen} · <a href="project-status.html">Project status</a> · SoT: ${footerSot}</p>
  </div>
  <script>${pickerScript('')}${extraScript}</script>
</body>
</html>`;
}

function stat(n: string | number, label: string): string {
  return `<div class="stat"><div class="n">${escapeHtml(String(n))}</div><div class="l">${escapeHtml(label)}</div></div>`;
}

type PickerSection = { body: string; stats: string; counts: Record<string, number> };

function buildMusicPage(): PickerSection {
  const perfRef = lineRef('apps/web/lib/performance-clips.ts', 'export const PERFORMANCE_CLIPS');
  const streamRef = lineRef('apps/web/lib/music-catalog.ts', 'export const STREAM_TRACKS');
  const procRef = lineRef('apps/web/lib/music.ts', 'export const MUSIC_THEMES');

  const clipPaths = new Set(PERFORMANCE_CLIPS.map((c) => c.file.replace(/^\//, '')));
  const audioRoots = ['audio/dance', 'audio/song-bed', 'audio/sing-female', 'audio/sing-male'];
  const orphans: string[] = [];
  for (const sub of audioRoots) {
    const dir = path.join(publicRoot, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mp3'))) {
      const rel = `${sub}/${f}`;
      if (![...clipPaths].some((p) => p.endsWith(f) || p === rel)) orphans.push(rel);
    }
  }

  let perfRows = '';
  for (const c of PERFORMANCE_CLIPS) {
    const local = `${PUBLIC_PREFIX}${c.file}`;
    const tags = [...c.moods, c.style, c.kind, ...(c.voice ? [c.voice] : [])];
    const cat = catalogMeta(c.id);
    const dc = performanceClipOwnerCodeForId(c.id) ?? '—';
    perfRows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(c.id)}" data-label="${escapeHtml(c.labels.en)}" data-ref="${escapeHtml(perfRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked aria-label="Keep ${escapeHtml(c.id)}" /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags">${inUseTag('performance-clips')}</td>
      ${audioPlayerCellHtml(local, c.labels.en)}
      <td><strong>${escapeHtml(c.labels.en)}</strong><br/><code>${escapeHtml(c.id)}</code></td>
      <td>${escapeHtml(c.kind)}</td>
      <td>${escapeHtml(c.langs.join(', '))}</td>
      <td>${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</td>
      <td class="license-ok">${escapeHtml(c.license)}</td>
      <td>${escapeHtml(c.credit)}</td>
      <td><code>${escapeHtml(c.file)}</code><br/><span class="ref">${escapeHtml(perfRef)}</span></td>
    </tr>`;
  }

  let streamRows = '';
  for (const t of STREAM_TRACKS) {
    const rowId = t.ownerCode ?? t.id;
    const codeLine = t.ownerCode
      ? `<code>${escapeHtml(t.ownerCode)}</code>`
      : `<code>${escapeHtml(t.id)}</code>`;
    const cat = catalogMeta(rowId);
    streamRows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(rowId)}" data-label="${escapeHtml(t.title)}" data-ref="${escapeHtml(streamRef)}"${t.ownerCode ? ` data-mv-code="${escapeHtml(t.ownerCode)}"` : ''}${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags">${inUseTag('STREAM_TRACKS')}</td>
      <td class="audio-player-cell">${audioPlayerBlockHtml(t.url, t.title, { remote: true })}<span class="ref"> Mixkit</span></td>
      <td>${escapeHtml(t.title)}<br/>${codeLine}</td>
      <td>stream</td>
      <td>all</td>
      <td><span class="tag">${escapeHtml(t.style)}</span></td>
      <td class="license-ok">${escapeHtml(t.license)}</td>
      <td>${escapeHtml(t.credit)}</td>
      <td><code>${escapeHtml(t.url)}</code><br/><span class="ref">${escapeHtml(streamRef)}</span></td>
    </tr>`;
  }

  let procRows = '';
  for (const [id, th] of Object.entries(MUSIC_THEMES)) {
    procRows += `<tr class="row-in-use" data-in-use="1" data-id="procedural-${escapeHtml(id)}" data-label="${escapeHtml(th.mood)}" data-ref="${escapeHtml(procRef)}">
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td class="flags">${inUseTag('MUSIC_THEMES')}</td>
      <td>—</td>
      <td>${escapeHtml(id)}<br/><em>${escapeHtml(th.mood)}</em></td>
      <td>procedural</td>
      <td>all</td>
      <td><span class="tag">${escapeHtml(String(th.bpm))} bpm</span><span class="tag">${escapeHtml(th.wave)}</span></td>
      <td class="license-ok">Original (WebAudio)</td>
      <td>—</td>
      <td><span class="ref">${escapeHtml(procRef)} · theme <code>${escapeHtml(id)}</code></span></td>
    </tr>`;
  }

  let orphanRows = '';
  for (const rel of orphans.sort()) {
    const local = `${PUBLIC_PREFIX}/${rel}`;
    orphanRows += `<tr data-id="orphan-${escapeHtml(rel)}" data-label="${escapeHtml(path.basename(rel))}" data-ref="disk only">
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td class="flags">—</td>
      ${audioPlayerCellHtml(local, path.basename(rel))}
      <td><code>${escapeHtml(rel)}</code></td>
      <td>orphan file</td>
      <td>—</td>
      <td><span class="tag hold">not in PERFORMANCE_CLIPS</span></td>
      <td>—</td>
      <td>—</td>
      <td><code>apps/web/public/${escapeHtml(rel)}</code></td>
    </tr>`;
  }

  const motionRef = lineRef('apps/web/lib/performance-motion.ts', 'export const PERF_MOTION_TAGS');
  let motionRows = '';
  for (const tag of PERF_MOTION_TAGS) {
    const nativeId = `perf-motion-${tag}`;
    const cat = catalogMeta(nativeId);
    const bpm = clipBpmForTag(tag);
    motionRows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(nativeId)}" data-label="${escapeHtml(PERF_MOTION_TAG_LABELS[tag])}" data-ref="${escapeHtml(motionRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags">${inUseTag('performance-motion')}</td>
      ${motionPreviewCellHtml(resolvePerfMotionPreview(publicRoot, tag))}
      <td><code>${escapeHtml(tag)}</code></td>
      <td>${escapeHtml(PERF_MOTION_TAG_LABELS[tag])}</td>
      <td>${bpm} bpm (authored)</td>
      <td>sing/dance body VRMA routing</td>
      <td><span class="ref">${escapeHtml(motionRef)}</span></td>
    </tr>`;
  }

  const holdNote = `<p class="lede"><span class="hold">Hold</span> — no copyrighted commercial masters in catalog; Mixkit + CC0/PD only per <code>docs/MUSIC_STREAMING.md</code>. Stripe / licensed spike #1 remains Hold elsewhere.</p>
    <p class="lede">Runtime owner perf prefs: <code>amoji.ownerPerfPicks.v1</code> (<code>listenMvCodes</code>, <code>songClipIds</code>) — ship-set <code>apps/web/data/owner-perf-selection.json</code>. Checked MV stream rows → copy codes into that JSON; idle dance/sing body still uses <code>amoji.idlePick.v6</code> / <code>amoji.idleEnabled.v6</code>.</p>`;

  const totalTracks =
    PERFORMANCE_CLIPS.length +
    STREAM_TRACKS.length +
    Object.keys(MUSIC_THEMES).length +
    orphans.length +
    PERF_MOTION_TAGS.length;

  const body = `
    ${holdNote}
    <p class="lede">Owner codes: <code>DC###</code> performance files · <code>MV039–${escapeHtml(HIGHEST_MV_OWNER_CODE)}</code> Mixkit streams (registry <code>owner-catalog-registry.ts</code>).</p>
    <h2>Dance / sing body motion tags (performance-motion.ts)</h2>
    <p class="lede">Movement shortlist (<code>C03</code>…<code>C128</code>, generic sing/dance) — pairs with DC audio + idle VRMA. Note which tag to prefer per music style.</p>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · ID</th><th>Ship</th><th>Preview</th><th>Tag</th><th>Label</th><th>Clip BPM</th><th>Use</th><th>Source</th></tr></thead>
      <tbody>${motionRows}</tbody>
    </table></div>
    <h2>Performance library (CC0 / PD files)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · domain</th><th>Ship</th><th>Play</th><th>Title</th><th>Kind</th><th>Langs</th><th>Tags</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${perfRows}</tbody>
    </table></div>
    <h2>Mixkit stream previews (remote URL)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · MV</th><th>Ship</th><th>Play</th><th>Title</th><th>Kind</th><th>Langs</th><th>Style</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${streamRows}</tbody>
    </table></div>
    <h2>Procedural WebAudio themes (no file)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>Ship</th><th>Play</th><th>Theme</th><th>Kind</th><th>Langs</th><th>Tags</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${procRows}</tbody>
    </table></div>
    ${orphans.length ? `<h2>On-disk audio not wired in PERFORMANCE_CLIPS</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>Ship</th><th>Play</th><th>Path</th><th>Kind</th><th>Langs</th><th>Tags</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${orphanRows}</tbody>
    </table></div>` : ''}`;

  const stats = [
    stat(PERFORMANCE_CLIPS.length, 'Performance clips'),
    stat(STREAM_TRACKS.length, 'Mixkit streams'),
    stat(Object.keys(MUSIC_THEMES).length, 'Procedural themes'),
    stat(orphans.length, 'Orphan MP3s'),
    stat(totalTracks, 'Total rows'),
  ].join('');

  return {
    body,
    stats,
    counts: {
      performance: PERFORMANCE_CLIPS.length,
      stream: STREAM_TRACKS.length,
      procedural: Object.keys(MUSIC_THEMES).length,
      orphans: orphans.length,
      total: totalTracks,
    },
  };
}

function buildPokePage(): PickerSection {
  const sectionsRef = lineRef('apps/web/lib/poke-zones.ts', 'export const POKE_SECTIONS');
  const motionRef = lineRef('apps/web/lib/poke-zones.ts', 'export function pokeSectionBodyReaction');
  const sfxRef = lineRef('apps/web/lib/voice-clips.ts', 'export const RECORDED_POKE_ZONE');
  const cmaRef = lineRef('apps/web/lib/cma-reaction-gallery.ts', 'export const CMA_REACTION_GALLERY');
  const voiceRef = lineRef('apps/web/lib/personality-voice.ts', 'export const POKE_LINE_TEMPLATES');

  let sectionRows = '';
  for (const s of POKE_SECTIONS) {
    const motion = s.voiceOnly
      ? 'voice only (tier 6)'
      : `pokeSectionBodyReaction → tier ${s.tier} · ${s.angle}`;
    const cat = catalogMeta(s.id);
    sectionRows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(s.id)}" data-label="${escapeHtml(s.labelTc)}" data-ref="${escapeHtml(sectionsRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags">${inUseTag('POKE_SECTIONS')}</td>
      ${motionPreviewCellHtml(pokeSectionMotionPreview(s.id))}
      <td><code>${escapeHtml(s.id)}</code></td>
      <td>${escapeHtml(s.labelTc)}</td>
      <td>${s.tierNumber}</td>
      <td>${escapeHtml(s.angle)}</td>
      <td>${escapeHtml(motion)}</td>
      <td><span class="ref">${escapeHtml(sectionsRef)}</span><br/><span class="ref">${escapeHtml(motionRef)}</span></td>
    </tr>`;
  }

  let lineRows = '';
  let pokeLineCount = 0;
  for (const voice of VOICE_IDS) {
    for (const lang of LANGS) {
      const lines = POKE_LINE_TEMPLATES[voice][lang];
      lines.forEach((tpl, idx) => {
        pokeLineCount++;
        const ref = findStringLine('apps/web/lib/personality-voice.ts', tpl.slice(0, 40));
        const id = `poke-tts-${voice}-${lang}-${idx}`;
        const cat = catalogMeta(id);
        lineRows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(id)}" data-label="${escapeHtml(tpl.slice(0, 60))}" data-ref="${escapeHtml(ref)}"${cat.attrs}>
          <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
          <td>${cat.codeCell}</td>
          <td class="flags">${inUseTag('POKE_LINE_TEMPLATES')}</td>
          <td><code>${escapeHtml(voice)}</code></td>
          <td>${escapeHtml(lang)}</td>
          <td>${idx + 1}</td>
          <td>${escapeHtml(tpl)}</td>
          <td><span class="ref">${escapeHtml(ref)}</span> · <span class="ref">${escapeHtml(voiceRef)}</span></td>
        </tr>`;
      });
    }
  }

  const wantSet = new Set<string>(CMA_REACTION_OWNER_WANT_CODES);
  const keepSet = new Set<string>(CMA_REACTION_KEEP_CODES);
  const archiveSet = new Set(CMA_REACTION_ARCHIVE_CODES);

  let zoneRows = '';
  const zoneKeysSeen = new Set<string>();
  for (const gender of ['female', 'male'] as const) {
    const table = RECORDED_POKE_ZONE[gender];
    for (const [zone, clipPath] of Object.entries(table)) {
      const key = `${gender}:${zone}:${clipPath}`;
      if (zoneKeysSeen.has(key)) continue;
      zoneKeysSeen.add(key);
      const local = `${PUBLIC_PREFIX}${clipPath}`;
      const code = clipPath.match(/CMA\d+/)?.[0] ?? '';
      const id = `poke-sfx-${gender}-${zone}`;
      const zoneInUse = code ? wantSet.has(code) || keepSet.has(code) : false;
      const cat = catalogMeta(id);
      zoneRows += `<tr class="${zoneInUse ? 'row-in-use' : ''}" data-in-use="${zoneInUse ? '1' : '0'}" data-id="${escapeHtml(id)}" data-label="${escapeHtml(zone)}" data-ref="${escapeHtml(sfxRef)}"${code ? ` data-cma-code="${escapeHtml(code)}"` : ''}${cat.attrs}>
        <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
        <td>${cat.codeCell}</td>
        <td class="flags">${zoneInUse ? inUseTag('RECORDED_POKE_ZONE') : '—'}</td>
        <td>${escapeHtml(gender)}</td>
        <td><code>${escapeHtml(zone)}</code></td>
        <td>${audioPlayerBlockHtml(local, zone)} <code>${escapeHtml(clipPath)}</code></td>
        <td>${code ? `<code>${escapeHtml(code)}</code>` : '—'}</td>
        <td><span class="ref">${escapeHtml(sfxRef)}</span></td>
      </tr>`;
    }
  }

  let cmaRows = '';
  for (const clip of CMA_REACTION_GALLERY) {
    const local = `${PUBLIC_PREFIX}/voice-clips/cma-reaction/${clip.file}`;
    let status = 'keeper';
    if (archiveSet.has(clip.code as (typeof CMA_REACTION_ARCHIVE_CODES)[number])) status = 'archive';
    if (!wantSet.has(clip.code as (typeof CMA_REACTION_OWNER_WANT_CODES)[number]) && clip.use === 'poke') {
      if (status !== 'archive') status = 'gallery only';
    }
    if (wantSet.has(clip.code as (typeof CMA_REACTION_OWNER_WANT_CODES)[number])) status = 'owner Want / wired';
    const cmaInUse = wantSet.has(clip.code) || keepSet.has(clip.code);
    const cat = catalogMeta(clip.code);
    cmaRows += `<tr class="${cmaInUse ? 'row-in-use' : ''}" data-in-use="${cmaInUse ? '1' : '0'}" data-id="${escapeHtml(clip.code)}" data-cma-code="${escapeHtml(clip.code)}" data-label="${escapeHtml(clip.burst)}" data-ref="${escapeHtml(cmaRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags saved-picks">${cmaInUse ? inUseTag('ship-set') : '—'}</td>
      <td><code>${escapeHtml(clip.code)}</code></td>
      ${audioPlayerCellHtml(local, clip.code)}
      <td>${escapeHtml(clip.gender)} · ${escapeHtml(clip.burst)} · ${escapeHtml(clip.use)}</td>
      <td>${escapeHtml(clip.license)}</td>
      <td>${escapeHtml(status)}</td>
      <td><span class="ref">${escapeHtml(cmaRef)}</span></td>
    </tr>`;
  }

  // Motion API exists — cite for Pixel
  void pokeSectionBodyReaction;

  const body = `
    <h2>Poke grid sections (6×4) — motion routing</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · PK</th><th>Ship</th><th>Preview</th><th>Section ID</th><th>Label</th><th>Tier</th><th>Angle</th><th>Motion</th><th>Code ref</th></tr></thead>
      <tbody>${sectionRows}</tbody>
    </table></div>
    <h2>Poke TTS line bank (personality × language × 8 templates)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · PK</th><th>Ship</th><th>Voice</th><th>Lang</th><th>#</th><th>Template</th><th>Source</th></tr></thead>
      <tbody>${lineRows}</tbody>
    </table></div>
    <h2>Recorded poke SFX zones (RECORDED_POKE_ZONE)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · code</th><th>Ship</th><th>Gender</th><th>Zone</th><th>Clip</th><th>CMA</th><th>Source</th></tr></thead>
      <tbody>${zoneRows}</tbody>
    </table></div>
    <h2>CMA reaction ship-set (owner picks)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · CMA</th><th>Ship / your pick</th><th>Code</th><th>Play</th><th>Use</th><th>License</th><th>Status</th><th>Source</th></tr></thead>
      <tbody>${cmaRows}</tbody>
    </table></div>`;

  const zoneRowCount = zoneKeysSeen.size;
  const stats = [
    stat(POKE_SECTIONS.length, 'Poke sections'),
    stat(pokeLineCount, 'TTS poke templates'),
    stat(zoneRowCount, 'Zone SFX rows'),
    stat(CMA_REACTION_GALLERY.length, 'CMA gallery clips'),
  ].join('');

  return {
    body,
    stats,
    counts: {
      sections: POKE_SECTIONS.length,
      pokeLines: pokeLineCount,
      zones: zoneRowCount,
      cma: CMA_REACTION_GALLERY.length,
    },
  };
}

/** Auto-idle pool clip ids (mirror chat-auto-idle.ts — document for Pixel review). */
const AUTO_IDLE_POOL_ROWS: { pool: string; clipIds: string[] }[] = [
  { pool: 'BREATHING_CLIPS', clipIds: [DEFAULT_IDLE_CLIP_ID] },
  { pool: 'CHITCHAT_CLIPS', clipIds: [DEFAULT_IDLE_CLIP_ID, 'Thinking'] },
  { pool: 'NEUTRAL_CHAT_CLIPS', clipIds: [DEFAULT_IDLE_CLIP_ID, 'Thinking'] },
  { pool: 'TALK_CALM_CLIPS', clipIds: [DEFAULT_IDLE_CLIP_ID, 'Thinking'] },
  {
    pool: 'MUSIC_POSE_CLIPS',
    clipIds: ['lib_C112', 'lib_C61', 'lib_C03', 'lib_C113', 'lib_C110', 'lib_C41', 'IdleMixamoHappy'],
  },
  {
    pool: 'CATEGORY_CLIP (keyword buckets)',
    clipIds: [
      'lib_C25', 'Thinking', 'lib_C61', 'lib_C112', 'lib_C121', 'lib_C146', 'Cheer',
      DEFAULT_IDLE_CLIP_ID, 'Relax', 'IdleMixamoHappy',
    ],
  },
];

function idleLibraryRowHtml(e: IdleLibraryEntry, libRef: string): string {
  const bad = KNOWN_BAD_IDLE_CLIP_IDS.has(e.clipId);
  const family = idleClipFamily(e.clipId);
  const rowClass = bad ? 'owner-bad' : '';
  const tags = [
    e.planted ? 'planted' : 'feet-free',
    e.playable ? 'playable' : 'no vrma',
    e.defaultEnabled ? 'default ON' : 'default off',
    e.retired ? 'retired' : '',
    bad ? 'known-bad pin' : '',
    family,
  ].filter(Boolean);
  const onRail = !!CHAT_IDLE_CURATED.find((r) => r.clipId === e.clipId);
  const wired = (e.defaultEnabled || onRail) && !bad && e.playable && !e.retired;
  const nativeId = `lib-${e.clipId}`;
  const cat = catalogMeta(nativeId);
  return `<tr class="${rowClass}${wired ? ' row-in-use' : ''}" data-in-use="${wired ? '1' : '0'}" data-id="lib-${escapeHtml(e.clipId)}" data-clip-id="${escapeHtml(e.clipId)}" data-label="${escapeHtml(e.name)}" data-ref="${escapeHtml(libRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked aria-label="Keep ${escapeHtml(e.clipId)}" /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags saved-picks" title="Filled from amoji.idlePick.v${IDLE_PREFS_GENERATION} on this browser">${wired ? inUseTag(onRail ? 'curated rail' : 'default pool') : '—'}</td>
      ${motionPreviewCellHtml(resolveIdleMotionPreview(publicRoot, e))}
      <td><strong>#${e.num}</strong> <code>${escapeHtml(e.clipId)}</code></td>
      <td>${escapeHtml(e.name)}${e.cId ? `<br/><span class="tag">${escapeHtml(e.cId)}</span>` : ''}</td>
      <td>${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</td>
      <td><code>${escapeHtml(e.path)}</code>${e.vrmaUrl ? `<br/><code>${escapeHtml(e.vrmaUrl)}</code>` : ''}</td>
      <td><span class="ref">${escapeHtml(libRef)}</span></td>
    </tr>`;
}

function buildIdlePage(): PickerSection {
  const libRef = lineRef('apps/web/lib/idle-library.ts', 'export const IDLE_LIBRARY');
  const railRef = lineRef('apps/web/lib/idle-curated-rail.ts', 'export const CHAT_IDLE_CURATED');
  const pickRef = lineRef('apps/web/lib/idle-owner-migrate.ts', 'export const IDLE_PICK_KEY');
  const poseRef = lineRef('packages/vrm-renderer/src/idle-poses.ts', 'export const IDLE_POSES');
  const autoRef = lineRef('apps/web/lib/chat-auto-idle.ts', 'export function resolveChatAutoIdle');

  let libRows = '';
  for (const e of IDLE_LIBRARY) {
    libRows += idleLibraryRowHtml(e, libRef);
  }

  const defaultRails = new Set(defaultCuratedRailNums());
  let railRows = '';
  for (const e of CHAT_IDLE_CURATED) {
    const lib = idleByClipId(e.clipId);
    const bad = KNOWN_BAD_IDLE_CLIP_IDS.has(e.clipId);
    const isDefault = defaultRails.has(e.railNum) || e.clipId === DEFAULT_IDLE_CLIP_ID;
    const railNative = `rail-${e.railNum}-${e.clipId}`;
    const cat = catalogMeta(railNative);
    railRows += `<tr class="row-in-use" data-in-use="1" data-id="${escapeHtml(railNative)}" data-clip-id="${escapeHtml(e.clipId)}" data-rail-num="${e.railNum}" data-label="${escapeHtml(e.labelKey)}" data-ref="${escapeHtml(railRef)}"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags saved-picks">${inUseTag('CHAT_IDLE_CURATED')}${isDefault ? ` ${defaultOnTag()}` : ''}</td>
      ${lib ? motionPreviewCellHtml(resolveIdleMotionPreview(publicRoot, lib)) : motionPreviewCellHtml({ id: e.clipId, kind: 'placeholder', assetRaw: null, pagesSrc: null, note: 'clip not in IDLE_LIBRARY' })}
      <td><strong>#${e.railNum}</strong></td>
      <td><code>${escapeHtml(e.clipId)}</code></td>
      <td>${escapeHtml(e.labelKey)} · ${escapeHtml(e.category)}</td>
      <td>lib #${e.legacyLibNum}${lib ? ` · ${escapeHtml(lib.name)}` : ''}</td>
      <td>${bad ? '<span class="tag hold">scrub on save</span>' : '<span class="tag">honorable</span>'}</td>
      <td><span class="ref">${escapeHtml(railRef)}</span></td>
    </tr>`;
  }

  let poolRows = '';
  let poolClipCount = 0;
  for (const { pool, clipIds } of AUTO_IDLE_POOL_ROWS) {
    const uniq = [...new Set(clipIds)];
    for (const clipId of uniq) {
      poolClipCount++;
      const poolLib = idleByClipId(clipId);
      poolRows += `<tr class="row-in-use" data-in-use="1" data-id="pool-${escapeHtml(pool)}-${escapeHtml(clipId)}" data-clip-id="${escapeHtml(clipId)}" data-label="${escapeHtml(pool)}" data-ref="${escapeHtml(autoRef)}">
        <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
        <td class="flags saved-picks">${inUseTag('chat-auto-idle')}</td>
        ${motionPreviewCellHtml(poolLib ? resolveIdleMotionPreview(publicRoot, poolLib) : { id: clipId, kind: 'placeholder', assetRaw: null, pagesSrc: null, note: 'No IDLE_LIBRARY row' })}
        <td><code>${escapeHtml(pool)}</code></td>
        <td><code>${escapeHtml(clipId)}</code></td>
        <td>${escapeHtml(idleClipFamily(clipId))}</td>
        <td><span class="ref">${escapeHtml(autoRef)}</span></td>
      </tr>`;
    }
  }

  let procRows = '';
  for (const p of IDLE_POSES) {
    procRows += `<tr data-id="proc-${escapeHtml(p.id)}" data-label="${escapeHtml(p.id)}" data-ref="${escapeHtml(poseRef)}">
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td class="saved-picks">(procedural)</td>
      <td><code>${escapeHtml(p.id)}</code></td>
      <td>spineΔ ${p.spineDelta} · headYaw ${p.headYaw} · lean ${p.leanSideDelta}</td>
      <td>CompanionCanvas fallback when no VRMA</td>
      <td><span class="ref">${escapeHtml(poseRef)}</span></td>
    </tr>`;
  }

  let charPoseRows = '';
  const castIds = new Set(CHARACTERS_WANT.map((c) => c.id));
  let charPoseCount = 0;
  for (const [charId, poses] of Object.entries(CHARACTER_POSES)) {
    if (!castIds.has(charId) && !charId.startsWith('a')) continue;
    for (const poseId of poses) {
      charPoseCount++;
      charPoseRows += `<tr data-id="char-${escapeHtml(charId)}-${escapeHtml(poseId)}" data-label="${escapeHtml(charId)}" data-ref="apps/web/lib/persona.ts:CHARACTER_POSES">
        <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
        <td class="saved-picks">—</td>
        <td><code>${escapeHtml(charId)}</code></td>
        <td><code>${escapeHtml(poseId)}</code></td>
        <td>legacy subset · live uses personalityMotion()</td>
        <td><span class="ref">persona.ts</span></td>
      </tr>`;
    }
  }

  const storageNote = `
    <div id="ownerPrefBanner">Reading <code>${escapeHtml(IDLE_PICK_KEY)}</code> and <code>${escapeHtml(IDLE_ENABLED_KEY)}</code>…</div>
    <p class="lede">Owner idle prefs (same keys as <code>CompanionCanvas</code> / <code>idle-pick.ts</code>): <code>${escapeHtml(IDLE_PICK_KEY)}</code> (per-character VRMA pin map — <span class="ref">${escapeHtml(pickRef)}</span>), <code>${escapeHtml(IDLE_ENABLED_KEY)}</code> (curated rail #s ON for rotation). Legacy <code>amoji.idlePick.v1</code>…<code>v5</code> migrate forward — never wiped (#432). Fresh default enable rails: <code>#${defaultCuratedRailNums().join(', #')}</code> → <code>${escapeHtml(DEFAULT_IDLE_CLIP_ID)}</code>. Known-bad pins (BreathCalm, Sassy, LookAround, …) scrub on read — see <code>idle-owner-migrate.ts</code>.</p>
    <p class="lede"><span class="tag hold">Your saved picks</span> column highlights rows when this browser’s localStorage already has your pins or enabled rails (open from the same origin as the app, e.g. GitHub Pages, after you have used Amoji on that device).</p>`;

  let refRows = '';
  for (const ref of IDLE_OWNER_REF_CATALOG) {
    const nativeId = `ref-${ref.clipId}`;
    const cat = catalogMeta(nativeId);
    refRows += `<tr data-id="${escapeHtml(nativeId)}" data-label="${escapeHtml(ref.name)}" data-ref="idle-owner-ref-catalog.ts"${cat.attrs}>
      <td><input type="checkbox" class="keep" checked /></td>${NOTE_TD}
      <td>${cat.codeCell}</td>
      <td class="flags"><span class="tag hold">record-only</span></td>
      <td><code>${escapeHtml(ref.ownerCode)}</code> · <code>${escapeHtml(ref.clipId)}</code></td>
      <td>${escapeHtml(ref.name)}</td>
      <td>${escapeHtml(ref.license)}</td>
      <td>${escapeHtml(ref.notes)}</td>
      <td><span class="ref">${escapeHtml(ref.source)}</span></td>
    </tr>`;
  }

  const blendNote = `<p class="lede">Blend rule: A→B crossfades only within the same <code>idleClipFamily</code> (Quaternius / RPM / Mixamo / Innerscene / lib_C*). Mixed-family swaps use a short cut (<code>IDLE_INCOMPAT_CROSSFADE_S</code>). CompanionCanvas sets <code>singleIdleStand</code> to reduce bad A→B blends on phone.</p>`;

  const body = `
    ${storageNote}
    ${blendNote}
    <h2>Owner idle refs (metadata — ${IDLE_OWNER_REF_CATALOG.length} rows, not yet in IDLE_LIBRARY)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · ID</th><th>Status</th><th>Code · clipId</th><th>Name</th><th>License</th><th>Notes</th><th>Source</th></tr></thead>
      <tbody>${refRows}</tbody>
    </table></div>
    <h2>Full idle library (VRMA / FBX map — ${IDLE_LIBRARY.length} rows)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · ID</th><th>Ship / your pick</th><th>Preview</th><th>Lib # · clipId</th><th>Name</th><th>Tags</th><th>Path</th><th>Source</th></tr></thead>
      <tbody>${libRows}</tbody>
    </table></div>
    <h2>Chat curated rail (#1..${CHAT_IDLE_CURATED.length})</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>CD · ID</th><th>Ship / your pick</th><th>Preview</th><th>Rail #</th><th>clipId</th><th>labelKey</th><th>Library</th><th>Owner</th><th>Source</th></tr></thead>
      <tbody>${railRows}</tbody>
    </table></div>
    <h2>Chat-auto idle pools (content-driven picks)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>Ship / your pick</th><th>Preview</th><th>Pool</th><th>clipId</th><th>Family</th><th>Source</th></tr></thead>
      <tbody>${poolRows}</tbody>
    </table></div>
    <h2>Procedural idle bone poses (@amoji/vrm-renderer)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>Notes</th><th>poseId</th><th>Offsets</th><th>Use</th><th>Source</th></tr></thead>
      <tbody>${procRows}</tbody>
    </table></div>
  ${charPoseCount ? `<h2>Character procedural pose subsets (legacy map)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Note</th><th>Saved</th><th>Character</th><th>poseId</th><th>Notes</th><th>Source</th></tr></thead>
      <tbody>${charPoseRows}</tbody>
    </table></div>` : ''}`;

  const playable = IDLE_LIBRARY.filter((e) => e.playable && !e.retired).length;
  const totalRows =
  IDLE_LIBRARY.length +
    IDLE_OWNER_REF_CATALOG.length +
    CHAT_IDLE_CURATED.length +
    poolClipCount +
    IDLE_POSES.length +
    charPoseCount;

  const stats = [
    stat(IDLE_LIBRARY.length, 'Library rows'),
    stat(playable, 'Playable VRMA'),
    stat(CHAT_IDLE_CURATED.length, 'Curated rail'),
    stat(IDLE_POSES.length, 'Bone poses'),
    stat(totalRows, 'Total picker rows'),
  ].join('');

  return {
    body,
    stats,
    counts: {
      library: IDLE_LIBRARY.length,
      rail: CHAT_IDLE_CURATED.length,
      pools: poolClipCount,
      procedural: IDLE_POSES.length,
      charPoses: charPoseCount,
      total: totalRows,
    },
  };
}

const music = buildMusicPage();
const stories = buildStoriesPage();
const demo = buildDemoPage();
const news = buildNewsPage();
const poke = buildPokePage();
const idle = buildIdlePage();
const unified = buildUnifiedResourcesPage(music, poke, idle, stories, demo, news);

fs.writeFileSync(path.join(docs, 'owner-resources.html'), unified.html);
const artifactDir = '/opt/cursor/artifacts';
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, 'owner-catalog-codes-pixel.tsv'), ownerCatalogTsv());
console.log('wrote', path.join(artifactDir, 'owner-catalog-codes-pixel.tsv'));
fs.writeFileSync(path.join(docs, 'owner-music-picker.html'), buildRedirectHtml('music', 'Owner music picker'));
fs.writeFileSync(path.join(docs, 'owner-poke-reactions.html'), buildRedirectHtml('poke', 'Owner poke reactions'));
fs.writeFileSync(path.join(docs, 'owner-idle-poses.html'), buildRedirectHtml('idle', 'Owner idle poses'));

console.log('wrote docs/owner-resources.html', unified.counts);
console.log('wrote redirect stubs → owner-resources.html#*', { music: music.counts, poke: poke.counts, idle: idle.counts });