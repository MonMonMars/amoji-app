/**
 * Builds docs/owner-music-picker.html and docs/owner-poke-reactions.html
 * from live SoT modules (performance-clips, music-catalog, poke zones, CMA).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  CMA_REACTION_OWNER_WANT_CODES,
} from '../apps/web/lib/cma-reaction-gallery.ts';
import type { Lang } from '../apps/web/lib/prefs.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    .play-remote { font-size: 0.8rem; }
    input[type="checkbox"] { transform: scale(1.15); cursor: pointer; }
    #exportOut {
      width: 100%; min-height: 4rem; margin-top: 0.75rem; font-family: ui-monospace, monospace;
      font-size: 0.8rem; padding: 0.5rem; border: 1px solid var(--line);
    }
    .filter { padding: 0.35rem 0.5rem; border: 1px solid var(--line); min-width: 12rem; }
  `;
}

function pickerScript(exportKey: string): string {
  return `
    function rowId(cb) { return cb.closest('tr')?.dataset?.id || ''; }
    function collectUnchecked(fmt) {
      const rows = [...document.querySelectorAll('tbody tr[data-id]')];
      const remove = rows.filter(tr => !tr.querySelector('input.keep')?.checked).map(tr => ({
        id: tr.dataset.id,
        label: tr.dataset.label || tr.dataset.id,
        ref: tr.dataset.ref || '',
      }));
      if (fmt === 'json') return JSON.stringify({ remove, kept: rows.length - remove.length }, null, 2);
      const lines = ['## Remove (unchecked rows)', ''];
      for (const r of remove) lines.push('- ' + r.id + (r.label ? ' — ' + r.label : '') + (r.ref ? ' (' + r.ref + ')' : ''));
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
    let currentAudio = null;
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-play]');
      if (!btn) return;
      const src = btn.getAttribute('data-play');
      if (!src) return;
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      currentAudio = new Audio(src);
      currentAudio.play().catch(() => alert('Playback blocked or file missing. Serve from docs/ per instructions.'));
    });
  `;
}

function htmlShell(title: string, eyebrow: string, lede: string, body: string, statsHtml: string): string {
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
      <p class="lede"><strong>Local preview:</strong> <code>cd docs &amp;&amp; python3 -m http.server 8765</code> then open <code>http://127.0.0.1:8765/${title.includes('Music') ? 'owner-music-picker.html' : 'owner-poke-reactions.html'}</code>. Local audio uses symlink <code>docs/amoji-public-serve</code> → <code>apps/web/public</code>.</p>
    </header>
    <section class="instr">
      <strong>Pixel — keep vs remove</strong>
      <ol>
        <li>Every row is <strong>Keep</strong> by default (checked). Uncheck rows you want cut from the ship set.</li>
        <li>Use <strong>Copy JSON</strong> or <strong>Copy Markdown</strong> and paste into chat / a ticket — engineers map IDs to code.</li>
        <li>Licensed / Hold rows are labeled honestly; uncheck means “don’t wire in app”, not “delete files” unless noted.</li>
      </ol>
      <div class="toolbar">
        <input class="filter" id="filterQ" type="search" placeholder="Filter table…" aria-label="Filter" />
        <button type="button" id="copyJson">Copy JSON (remove list)</button>
        <button type="button" id="copyMd">Copy Markdown</button>
      </div>
      <textarea id="exportOut" readonly placeholder="Export appears here…"></textarea>
    </section>
    <div class="grid-stats">${statsHtml}</div>
    ${body}
    <p class="lede" style="margin-top:2rem;font-size:0.85rem;">Generated ${gen} · <a href="project-status.html">Project status</a> · SoT: <code>performance-clips.ts</code>, <code>music-catalog.ts</code>, <code>personality-voice.ts</code>, <code>poke-zones.ts</code>, <code>voice-clips.ts</code></p>
  </div>
  <script>${pickerScript('')}</script>
</body>
</html>`;
}

function stat(n: string | number, label: string): string {
  return `<div class="stat"><div class="n">${escapeHtml(String(n))}</div><div class="l">${escapeHtml(label)}</div></div>`;
}

function buildMusicPage(): { html: string; counts: Record<string, number> } {
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
    perfRows += `<tr data-id="${escapeHtml(c.id)}" data-label="${escapeHtml(c.labels.en)}" data-ref="${escapeHtml(perfRef)}">
      <td><input type="checkbox" class="keep" checked aria-label="Keep ${escapeHtml(c.id)}" /></td>
      <td><button type="button" data-play="${escapeHtml(local)}">▶</button></td>
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
    streamRows += `<tr data-id="${escapeHtml(t.id)}" data-label="${escapeHtml(t.title)}" data-ref="${escapeHtml(streamRef)}">
      <td><input type="checkbox" class="keep" checked /></td>
      <td><button type="button" class="play-remote" data-play="${escapeHtml(t.url)}">▶ Mixkit</button></td>
      <td>${escapeHtml(t.title)}<br/><code>${escapeHtml(t.id)}</code></td>
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
    procRows += `<tr data-id="procedural-${escapeHtml(id)}" data-label="${escapeHtml(th.mood)}" data-ref="${escapeHtml(procRef)}">
      <td><input type="checkbox" class="keep" checked /></td>
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
      <td><input type="checkbox" class="keep" checked /></td>
      <td><button type="button" data-play="${escapeHtml(local)}">▶</button></td>
      <td><code>${escapeHtml(rel)}</code></td>
      <td>orphan file</td>
      <td>—</td>
      <td><span class="tag hold">not in PERFORMANCE_CLIPS</span></td>
      <td>—</td>
      <td>—</td>
      <td><code>apps/web/public/${escapeHtml(rel)}</code></td>
    </tr>`;
  }

  const holdNote = `<p class="lede"><span class="hold">Hold</span> — no copyrighted commercial masters in catalog; Mixkit + CC0/PD only per <code>docs/MUSIC_STREAMING.md</code>. Stripe / licensed spike #1 remains Hold elsewhere.</p>`;

  const totalTracks =
    PERFORMANCE_CLIPS.length + STREAM_TRACKS.length + Object.keys(MUSIC_THEMES).length + orphans.length;

  const body = `
    ${holdNote}
    <h2>Performance library (CC0 / PD files)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Play</th><th>Title</th><th>Kind</th><th>Langs</th><th>Tags</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${perfRows}</tbody>
    </table></div>
    <h2>Mixkit stream previews (remote URL)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Play</th><th>Title</th><th>Kind</th><th>Langs</th><th>Style</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${streamRows}</tbody>
    </table></div>
    <h2>Procedural WebAudio themes (no file)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Play</th><th>Theme</th><th>Kind</th><th>Langs</th><th>Tags</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${procRows}</tbody>
    </table></div>
    ${orphans.length ? `<h2>On-disk audio not wired in PERFORMANCE_CLIPS</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Play</th><th>Path</th><th>Kind</th><th>Langs</th><th>Tags</th><th>License</th><th>Credit</th><th>Source</th></tr></thead>
      <tbody>${orphanRows}</tbody>
    </table></div>` : ''}`;

  const stats = [
    stat(PERFORMANCE_CLIPS.length, 'Performance clips'),
    stat(STREAM_TRACKS.length, 'Mixkit streams'),
    stat(Object.keys(MUSIC_THEMES).length, 'Procedural themes'),
    stat(orphans.length, 'Orphan MP3s'),
    stat(totalTracks, 'Total rows'),
  ].join('');

  const html = htmlShell(
    'Amoji — Owner music picker',
    'Pixel · music & beds',
    'Every dance bed, song, Mixkit stream, and procedural theme the app can pick. Play local files when served from <code>docs/</code> with <code>../apps/web/public</code> reachable.',
    body,
    stats,
  );

  return {
    html,
    counts: {
      performance: PERFORMANCE_CLIPS.length,
      stream: STREAM_TRACKS.length,
      procedural: Object.keys(MUSIC_THEMES).length,
      orphans: orphans.length,
      total: totalTracks,
    },
  };
}

function buildPokePage(): { html: string; counts: Record<string, number> } {
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
    sectionRows += `<tr data-id="${escapeHtml(s.id)}" data-label="${escapeHtml(s.labelTc)}" data-ref="${escapeHtml(sectionsRef)}">
      <td><input type="checkbox" class="keep" checked /></td>
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
        lineRows += `<tr data-id="${escapeHtml(id)}" data-label="${escapeHtml(tpl.slice(0, 60))}" data-ref="${escapeHtml(ref)}">
          <td><input type="checkbox" class="keep" checked /></td>
          <td><code>${escapeHtml(voice)}</code></td>
          <td>${escapeHtml(lang)}</td>
          <td>${idx + 1}</td>
          <td>${escapeHtml(tpl)}</td>
          <td><span class="ref">${escapeHtml(ref)}</span> · <span class="ref">${escapeHtml(voiceRef)}</span></td>
        </tr>`;
      });
    }
  }

  const wantSet = new Set(CMA_REACTION_OWNER_WANT_CODES);
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
      zoneRows += `<tr data-id="${escapeHtml(id)}" data-label="${escapeHtml(zone)}" data-ref="${escapeHtml(sfxRef)}">
        <td><input type="checkbox" class="keep" checked /></td>
        <td>${escapeHtml(gender)}</td>
        <td><code>${escapeHtml(zone)}</code></td>
        <td><button type="button" data-play="${escapeHtml(local)}">▶</button> <code>${escapeHtml(clipPath)}</code></td>
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
    cmaRows += `<tr data-id="${escapeHtml(clip.code)}" data-label="${escapeHtml(clip.burst)}" data-ref="${escapeHtml(cmaRef)}">
      <td><input type="checkbox" class="keep" checked /></td>
      <td><code>${escapeHtml(clip.code)}</code></td>
      <td><button type="button" data-play="${escapeHtml(local)}">▶</button></td>
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
      <thead><tr><th>Keep</th><th>Section ID</th><th>Label</th><th>Tier</th><th>Angle</th><th>Motion</th><th>Code ref</th></tr></thead>
      <tbody>${sectionRows}</tbody>
    </table></div>
    <h2>Poke TTS line bank (personality × language × 8 templates)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Voice</th><th>Lang</th><th>#</th><th>Template</th><th>Source</th></tr></thead>
      <tbody>${lineRows}</tbody>
    </table></div>
    <h2>Recorded poke SFX zones (RECORDED_POKE_ZONE)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Gender</th><th>Zone</th><th>Clip</th><th>CMA</th><th>Source</th></tr></thead>
      <tbody>${zoneRows}</tbody>
    </table></div>
    <h2>CMA reaction ship-set (owner picks)</h2>
    <div class="panel"><table>
      <thead><tr><th>Keep</th><th>Code</th><th>Play</th><th>Use</th><th>License</th><th>Status</th><th>Source</th></tr></thead>
      <tbody>${cmaRows}</tbody>
    </table></div>`;

  const zoneRowCount = zoneKeysSeen.size;
  const stats = [
    stat(POKE_SECTIONS.length, 'Poke sections'),
    stat(pokeLineCount, 'TTS poke templates'),
    stat(zoneRowCount, 'Zone SFX rows'),
    stat(CMA_REACTION_GALLERY.length, 'CMA gallery clips'),
  ].join('');

  const html = htmlShell(
    'Amoji — Owner poke reactions',
    'Pixel · poke motion + voice',
    'Moves (6×4 grid), spoken poke templates, zone SFX map, and CMA ship-set with file:line references into the repo.',
    body,
    stats,
  );

  return {
    html,
    counts: {
      sections: POKE_SECTIONS.length,
      pokeLines: pokeLineCount,
      zones: zoneRowCount,
      cma: CMA_REACTION_GALLERY.length,
    },
  };
}

const music = buildMusicPage();
const poke = buildPokePage();

fs.writeFileSync(path.join(docs, 'owner-music-picker.html'), music.html);
fs.writeFileSync(path.join(docs, 'owner-poke-reactions.html'), poke.html);

console.log('wrote docs/owner-music-picker.html', music.counts);
console.log('wrote docs/owner-poke-reactions.html', poke.counts);