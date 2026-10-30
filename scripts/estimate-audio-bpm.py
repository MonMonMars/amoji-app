#!/usr/bin/env python3
"""Estimate BPM for Amoji performance MP3s (onset-envelope autocorrelation).

Writes apps/web/lib/measured-bpm.ts — used by performance-motion.
Requires: ffmpeg on PATH, numpy.
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "apps" / "web" / "public" / "audio"
OUT_TS = ROOT / "apps" / "web" / "lib" / "measured-bpm.ts"
OUT_JSON = ROOT / "apps" / "web" / "public" / "audio" / "bpm-map.json"

SR = 22050
HOP = 512
MIN_BPM, MAX_BPM = 60.0, 180.0
# Only ship numbers confident enough to beat style defaults.
MIN_CONF = 0.22


def find_ffmpeg() -> str:
    for cand in [
        os.environ.get("FFMPEG") or "",
        "ffmpeg",
        r"C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe",
    ]:
        if not cand:
            continue
        if cand == "ffmpeg" or Path(cand).exists():
            return cand
    raise SystemExit("ffmpeg not found")


def decode_mono(path: Path, ffmpeg: str) -> np.ndarray:
    cmd = [
        ffmpeg, "-v", "error", "-i", str(path),
        "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode != 0 or not proc.stdout:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace")[:400])
    return np.frombuffer(proc.stdout, dtype=np.float32)


def estimate_bpm(samples: np.ndarray) -> tuple[float, float]:
    if samples.size < SR * 2:
        return 100.0, 0.0
    abs_s = np.abs(samples)
    thr = max(1e-4, float(np.percentile(abs_s, 20)) * 0.5)
    nz = np.where(abs_s > thr)[0]
    if nz.size > SR:
        samples = samples[nz[0]: nz[-1] + 1]
    max_n = SR * 45
    if samples.size > max_n:
        mid = samples.size // 2
        half = max_n // 2
        samples = samples[mid - half: mid + half]

    n_frames = 1 + (samples.size - HOP) // HOP
    if n_frames < 32:
        return 100.0, 0.0
    frames = np.lib.stride_tricks.as_strided(
        samples,
        shape=(n_frames, HOP),
        strides=(samples.strides[0] * HOP, samples.strides[0]),
        writeable=False,
    )
    energy = np.sqrt(np.mean(frames.astype(np.float64) ** 2, axis=1) + 1e-12)
    onset = np.diff(energy, prepend=energy[0])
    onset = np.maximum(0.0, onset)
    onset -= onset.mean()
    if float(np.std(onset)) < 1e-9:
        return 100.0, 0.0
    onset /= float(np.std(onset))

    n = int(2 ** math.ceil(math.log2(onset.size * 2)))
    f = np.fft.rfft(onset, n=n)
    ac = np.fft.irfft(f * np.conj(f), n=n)[: onset.size]
    ac = ac / (ac[0] + 1e-12)

    lag_min = max(2, int(round((60.0 / MAX_BPM) * SR / HOP)))
    lag_max = min(ac.size - 1, int(round((60.0 / MIN_BPM) * SR / HOP)))
    if lag_max <= lag_min + 2:
        return 100.0, 0.0

    window = ac[lag_min: lag_max + 1]
    peak_i = int(np.argmax(window))
    lag = lag_min + peak_i
    conf = float(window[peak_i])
    bpm = 60.0 * SR / (lag * HOP)

    best = bpm
    best_score = conf
    for c in (bpm, bpm * 2, bpm / 2, bpm * 1.5, bpm / 1.5):
        if c < MIN_BPM or c > MAX_BPM:
            continue
        lag_c = int(round((60.0 / c) * SR / HOP))
        if lag_min <= lag_c <= lag_max:
            score = float(ac[lag_c])
            # prefer dance-common range
            if 90 <= c <= 140:
                score *= 1.12
            elif 80 <= c < 90 or 140 < c <= 150:
                score *= 1.04
            if score > best_score:
                best_score = score
                best = c

    # Half-time salvage: strong sub-80 peaks often want 2x for dance beds
    if best < 80 and best * 2 <= MAX_BPM:
        lag2 = int(round((60.0 / (best * 2)) * SR / HOP))
        if lag_min <= lag2 <= lag_max and float(ac[lag2]) >= conf * 0.55:
            best = best * 2
            best_score = max(best_score, float(ac[lag2]))

    return round(float(best), 1), round(float(best_score), 3)


def main() -> int:
    ffmpeg = find_ffmpeg()
    mp3s = sorted(AUDIO.rglob("*.mp3"))
    if not mp3s:
        print("no mp3 under", AUDIO)
        return 1
    results: dict[str, dict] = {}
    for i, p in enumerate(mp3s, 1):
        cid = p.stem
        try:
            samples = decode_mono(p, ffmpeg)
            bpm, conf = estimate_bpm(samples)
            results[cid] = {
                "bpm": bpm,
                "confidence": conf,
                "file": str(p.relative_to(AUDIO)).replace("\\", "/"),
            }
            print(f"[{i}/{len(mp3s)}] {cid}: {bpm} (conf={conf})")
        except Exception as e:
            print(f"[{i}/{len(mp3s)}] {cid}: FAIL {e}")
            results[cid] = {
                "bpm": 100.0,
                "confidence": 0.0,
                "file": str(p.relative_to(AUDIO)).replace("\\", "/"),
                "error": str(e)[:200],
            }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps({"method": "onset-acf", "sr": SR, "minConfidence": MIN_CONF, "clips": results}, indent=2)
        + "\n",
        encoding="utf-8",
    )

    shipped = {cid: r["bpm"] for cid, r in results.items() if float(r.get("confidence") or 0) >= MIN_CONF}
    lines = [
        "// AUTO-GENERATED by scripts/estimate-audio-bpm.py — do not edit by hand.",
        "// Measured BPM from bundled performance MP3s (onset-envelope autocorrelation).",
        f"// Only clips with confidence >= {MIN_CONF} are shipped; others fall back to style BPM.",
        "// Regenerate: python scripts/estimate-audio-bpm.py",
        "",
        "export const MEASURED_BPM: Readonly<Record<string, number>> = {",
    ]
    for cid in sorted(shipped):
        lines.append(f"  '{cid}': {shipped[cid]},")
    lines.append("};")
    lines.append("")
    lines.append("/** Measured track BPM when confidence was high enough; else undefined. */")
    lines.append("export function measuredBpm(clipId: string): number | undefined {")
    lines.append("  const v = MEASURED_BPM[clipId];")
    lines.append("  return typeof v === 'number' && v > 0 ? v : undefined;")
    lines.append("}")
    lines.append("")
    OUT_TS.write_text("\n".join(lines), encoding="utf-8")
    print("shipped", len(shipped), "of", len(results))
    print("wrote", OUT_TS)
    print("wrote", OUT_JSON)
    return 0


if __name__ == "__main__":
    sys.exit(main())
