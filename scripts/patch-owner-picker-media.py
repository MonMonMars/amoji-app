#!/usr/bin/env python3
from pathlib import Path
ROOT = Path("/agent/repos/amoji-app")
p = ROOT / "scripts/owner-picker-html-writer.ts"
text = p.read_text()
# imports
if "owner-picker-html-media" not in text:
    text = text.replace(
        "import { CHARACTERS_WANT } from '../apps/web/lib/characters-want.ts';\n",
        "import { CHARACTERS_WANT } from '../apps/web/lib/characters-want.ts';\n"
        "import { PICKER_PLAY_RESOLVE_INLINE_JS } from '../apps/web/lib/owner-picker-media.mjs';\n"
        "import { audioPlayerBlockHtml, audioPlayerCellHtml, motionPreviewCellHtml, pokeSectionMotionPreview, resolveIdleMotionPreview, resolvePerfMotionPreview } from '../apps/web/lib/owner-picker-html-media.ts';\n",
    )
elif "owner-picker-media.mjs" not in text:
    text = text.replace(
        "import { CHARACTERS_WANT } from '../apps/web/lib/characters-want.ts';\n",
        "import { CHARACTERS_WANT } from '../apps/web/lib/characters-want.ts';\nimport { PICKER_PLAY_RESOLVE_INLINE_JS } from '../apps/web/lib/owner-picker-media.mjs';\n",
    )
if ".audio-player {" not in text:
    text = text.replace(
        "    .play-remote { font-size: 0.8rem; }\n",
        "    .audio-player { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; min-width: 11rem; max-width: 20rem; }\n"
        "    .audio-player .audio-play-toggle { min-width: 2.1rem; padding: 0.25rem 0.45rem; }\n"
        "    .audio-player .audio-scrub { flex: 1 1 5rem; min-width: 4.5rem; accent-color: var(--accent); }\n"
        "    .audio-player .audio-time { font-size: 0.75rem; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }\n"
        "    .motion-preview img { object-fit: cover; border: 1px solid var(--line); border-radius: 3px; background: #f6f1e6; }\n"
        "    .motion-preview--missing { font-size: 0.75rem; max-width: 6.5rem; }\n"
        "    .motion-preview--vrma a { font-size: 0.78rem; }\n"
        "    .play-remote { font-size: 0.8rem; }\n",
    )
old_blocks = [
    """    let currentAudio = null;
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-play]');
      if (!btn) return;
      const src = resolvePlaySrc(btn.getAttribute('data-play'));
      if (!src) return;
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      const url = /^https?:/i.test(src) ? src : new URL(src, location.href).href;
      currentAudio = new Audio(url);
      currentAudio.play().catch(() => alert('Playback blocked or file missing. On Pages use /amoji-app/docs/owner-resources.html; local: cd docs && python3 -m http.server 8765'));
  });""",
    """    let currentAudio = null;
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-play]');
      if (!btn) return;
      const src = resolvePlaySrc(btn.getAttribute('data-play'));
      if (!src) return;
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      const url = /^https?:/i.test(src) ? src : new URL(src, location.href).href;
      currentAudio = new Audio(url);
      applyRemoteAudioHints(currentAudio, url);
      currentAudio.onerror = () => alert(pickerPlayFailureMessage(src, btn));
      currentAudio.play().catch(() => alert(pickerPlayFailureMessage(src, btn)));
  });""",
]
new = """    function formatMmSs(sec) {
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
      const scrub = root.querySelector('.audio-scrub');
      const curEl = root.querySelector('.audio-cur');
      const durEl = root.querySelector('.audio-dur');
      if (!toggle || !scrub) return;
      const audio = new Audio();
      let seeking = false;
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
        toggle.textContent = '▶';
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
        const src = resolvePlaySrc(raw);
        if (!src) return;
        if (activePlayer && activePlayer.root !== root) pauseActivePlayer();
        const url = /^https?:/i.test(src) ? src : new URL(src, location.href).href;
        if (!audio.src) { audio.src = url; applyRemoteAudioHints(audio, url); }
        if (audio.paused) {
          audio.play().then(() => { toggle.textContent = '⏸'; activePlayer = { root, audio, toggle }; })
            .catch(() => alert(pickerPlayFailureMessage(src, toggle)));
        } else {
          audio.pause();
          toggle.textContent = '▶';
          if (activePlayer && activePlayer.root === root) activePlayer = null;
        }
      });
    }
    document.querySelectorAll('.audio-player[data-play]').forEach(wireAudioPlayer);
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-play]:not(.audio-player)');
      if (!btn || btn.classList.contains('audio-player')) return;
      const src = resolvePlaySrc(btn.getAttribute('data-play'));
      if (!src) return;
      pauseActivePlayer();
      const url = /^https?:/i.test(src) ? src : new URL(src, location.href).href;
      const oneShot = new Audio(url);
      applyRemoteAudioHints(oneShot, url);
      oneShot.onerror = () => alert(pickerPlayFailureMessage(src, btn));
      oneShot.play().catch(() => alert(pickerPlayFailureMessage(src, btn)));
    });"""
if "wireAudioPlayer" not in text:
    replaced = False
    if "${PICKER_PLAY_RESOLVE_INLINE_JS}" not in text:
        text = text.replace(
            "    function resolvePlaySrc(raw) {",
            "    ${PICKER_PLAY_RESOLVE_INLINE_JS}\n    function resolvePlaySrc_legacy_unused(raw) {",
            1,
        )
    for old in old_blocks:
        if old in text:
            text = text.replace(old, new)
            replaced = True
            break
    if not replaced:
        raise SystemExit("no audio handler block matched")
# rows
if "audioPlayerCellHtml(local, c.labels.en)" not in text:
    text = text.replace(
        '<td><button type="button" data-play="${escapeHtml(local)}">▶</button></td>\n      <td><strong>${escapeHtml(c.labels.en)}</strong>',
        '${audioPlayerCellHtml(local, c.labels.en)}\n      <td><strong>${escapeHtml(c.labels.en)}</strong>', 1)
    text = text.replace(
        '<td><button type="button" class="play-remote" data-play="${escapeHtml(t.url)}">▶ Mixkit</button></td>',
        '<td class="audio-player-cell">${audioPlayerBlockHtml(t.url, t.title, { remote: true })}<span class="ref"> Mixkit</span></td>')
    text = text.replace(
        '<td><button type="button" data-play="${escapeHtml(local)}">▶</button></td>\n      <td><code>${escapeHtml(rel)}</code></td>',
        '${audioPlayerCellHtml(local, path.basename(rel))}\n      <td><code>${escapeHtml(rel)}</code></td>', 1)
    text = text.replace(
        "      <td class=\"flags\">${inUseTag('performance-motion')}</td>\n      <td><code>${escapeHtml(tag)}</code></td>",
        "      <td class=\"flags\">${inUseTag('performance-motion')}</td>\n      ${motionPreviewCellHtml(resolvePerfMotionPreview(publicRoot, tag))}\n      <td><code>${escapeHtml(tag)}</code></td>")
    text = text.replace(
        "      <td class=\"flags\">${inUseTag('POKE_SECTIONS')}</td>\n      <td><code>${escapeHtml(s.id)}</code></td>",
        "      <td class=\"flags\">${inUseTag('POKE_SECTIONS')}</td>\n      ${motionPreviewCellHtml(pokeSectionMotionPreview(s.id))}\n      <td><code>${escapeHtml(s.id)}</code></td>")
    text = text.replace(
        '<td><button type="button" data-play="${escapeHtml(local)}">▶</button> <code>${escapeHtml(clipPath)}</code></td>',
        '<td>${audioPlayerBlockHtml(local, zone)} <code>${escapeHtml(clipPath)}</code></td>')
    text = text.replace(
        '<td><button type="button" data-play="${escapeHtml(local)}">▶</button></td>\n      <td>${escapeHtml(clip.gender)}',
        '${audioPlayerCellHtml(local, clip.code)}\n      <td>${escapeHtml(clip.gender)}')
    text = text.replace(
        "      <td class=\"flags saved-picks\" title=\"Filled from amoji.idlePick.v${IDLE_PREFS_GENERATION} on this browser\">${wired ? inUseTag(onRail ? 'curated rail' : 'default pool') : '—'}</td>\n      <td><strong>#${e.num}</strong>",
        "      <td class=\"flags saved-picks\" title=\"Filled from amoji.idlePick.v${IDLE_PREFS_GENERATION} on this browser\">${wired ? inUseTag(onRail ? 'curated rail' : 'default pool') : '—'}</td>\n      ${motionPreviewCellHtml(resolveIdleMotionPreview(publicRoot, e))}\n      <td><strong>#${e.num}</strong>")
    text = text.replace(
        "      <td class=\"flags saved-picks\">${inUseTag('CHAT_IDLE_CURATED')}${isDefault ? ` ${defaultOnTag()}` : ''}</td>\n      <td><strong>#${e.railNum}</strong>",
        "      <td class=\"flags saved-picks\">${inUseTag('CHAT_IDLE_CURATED')}${isDefault ? ` ${defaultOnTag()}` : ''}</td>\n      ${lib ? motionPreviewCellHtml(resolveIdleMotionPreview(publicRoot, lib)) : motionPreviewCellHtml({ id: e.clipId, kind: 'placeholder', assetRaw: null, pagesSrc: null, note: 'clip not in IDLE_LIBRARY' })}\n      <td><strong>#${e.railNum}</strong>")
    if "const poolLib = idleByClipId" not in text:
        text = text.replace("      poolClipCount++;\n      poolRows +=", "      poolClipCount++;\n      const poolLib = idleByClipId(clipId);\n      poolRows +=")
        text = text.replace(
            "        <td class=\"flags saved-picks\">${inUseTag('chat-auto-idle')}</td>\n        <td><code>${escapeHtml(pool)}</code></td>",
            "        <td class=\"flags saved-picks\">${inUseTag('chat-auto-idle')}</td>\n        ${motionPreviewCellHtml(poolLib ? resolveIdleMotionPreview(publicRoot, poolLib) : { id: clipId, kind: 'placeholder', assetRaw: null, pagesSrc: null, note: 'No IDLE_LIBRARY row' })}\n        <td><code>${escapeHtml(pool)}</code></td>")
    for a, b in [
        ("<th>Ship</th><th>Tag</th><th>Label</th><th>Clip BPM</th>", "<th>Ship</th><th>Preview</th><th>Tag</th><th>Label</th><th>Clip BPM</th>"),
        ("<th>Ship</th><th>Section ID</th>", "<th>Ship</th><th>Preview</th><th>Section ID</th>"),
        ("<th>Ship / your pick</th><th>Lib # · clipId</th>", "<th>Ship / your pick</th><th>Preview</th><th>Lib # · clipId</th>"),
        ("<th>Ship / your pick</th><th>Rail #</th>", "<th>Ship / your pick</th><th>Preview</th><th>Rail #</th>"),
        ("<th>Ship / your pick</th><th>Pool</th>", "<th>Ship / your pick</th><th>Preview</th><th>Pool</th>"),
    ]:
        text = text.replace(a, b)
p.write_text(text)
print("OK", "wireAudioPlayer" in text, "audioPlayerCellHtml" in text)