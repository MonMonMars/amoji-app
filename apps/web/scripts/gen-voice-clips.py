#!/usr/bin/env python3
"""Build spoken clips under public/voice-clips/{lang}/{gender}/{kind}.mp3.

Laugh, smile, giggle, wow, um, oh, and ha are recorded human files.
This script does not overwrite them. See public/voice-clips/CREDITS.md.

Greetings and the longer think/search lines are espeak-ng, one file per
language and gender.

Run from the repo root:
  python3 apps/web/scripts/gen-voice-clips.py
"""

from __future__ import annotations

import math
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "voice-clips"
SR = 22050

LANGS = ("yue", "zh", "ja", "en")
GENDERS = ("female", "male")

GREETINGS = {
    "en": {
        "hello": "Hello!",
        "nice": "Nice to meet you.",
        "hihi": "Hi hi!",
        "pleasure": "My pleasure.",
    },
    "yue": {
        "hello": "你好！",
        "nice": "好開心認識你。",
        "hihi": "嗨嗨！",
        "pleasure": "唔使客氣。",
    },
    "zh": {
        "hello": "你好！",
        "nice": "很高兴认识你。",
        "hihi": "嗨嗨！",
        "pleasure": "不客气。",
    },
    "ja": {
        "hello": "こんにちは！",
        "nice": "はじめまして。",
        "hihi": "やあやあ！",
        "pleasure": "どういたしまして。",
    },
}
FILLERS = {
    "en": {"think": "um, let me think.", "search": "um, let me search the web."},
    "yue": {"think": "嗯，等我諗下。", "search": "嗯，等我上網搵下。"},
    "zh": {"think": "嗯，让我想想。", "search": "嗯，让我上网查一下。"},
    "ja": {"think": "うーん、考えさせて。", "search": "うーん、ネットで調べるね。"},
}
ESPEAK = {
    "en": "en-us",
    "yue": "yue",
    "zh": "cmn",
    "ja": "ja",
}

# Formant recipes: (freq, bandwidth, gain)
A = ((760, 90, 1.0), (1250, 110, 0.55), (2600, 160, 0.22))
I = ((320, 60, 0.65), (2250, 130, 0.95), (3100, 180, 0.28))
O = ((480, 80, 1.0), (860, 90, 0.45), (2400, 150, 0.18))
U = ((320, 70, 1.0), (760, 90, 0.35), (2200, 160, 0.12))
E = ((500, 70, 0.9), (1760, 120, 0.7), (2500, 160, 0.22))


def glottal(n: int, f0: np.ndarray, breath: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    f0 = f0 * (1 + 0.015 * np.sin(2 * np.pi * 4.2 * t))
    phase = np.cumsum(f0 / SR) % 1.0
    y = np.zeros(n)
    mask = phase < 0.4
    y[mask] = np.sin(np.pi * phase[mask] / 0.4) ** 2
    y = np.diff(y, prepend=y[0])
    peak = np.max(np.abs(y)) + 1e-8
    noise = rng.normal(0, 1, n) * breath
    return y / peak + noise


def resonator(x: np.ndarray, freq: float, bw: float, gain: float) -> np.ndarray:
    r = math.exp(-math.pi * bw / SR)
    a1 = -2 * r * math.cos(2 * math.pi * freq / SR)
    a2 = r * r
    g = (1 - r) * 0.5 * gain
    y = np.empty(len(x), dtype=np.float64)
    y1 = 0.0
    y2 = 0.0
    for i, sample in enumerate(x):
        v = g * float(sample) - a1 * y1 - a2 * y2
        y[i] = v
        y2 = y1
        y1 = v
    return y


def shape(n: int, attack: float, release: float) -> np.ndarray:
    env = np.ones(n)
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    if a + r >= n:
        a = max(1, n // 5)
        r = max(1, n // 4)
    env[:a] = np.linspace(0, 1, a)
    env[-r:] = np.linspace(1, 0, r)
    return env


def tone(f0: float, dur: float, formants, amp: float, breath: float, seed: int, fall: float = 0.12) -> np.ndarray:
    n = max(2, int(SR * dur))
    t = np.linspace(0, 1, n)
    contour = f0 * (1 - fall * t)
    src = glottal(n, contour, breath, seed)
    y = np.zeros(n)
    for freq, bw, gain in formants:
        y += resonator(src, freq, bw, gain)
    y *= shape(n, 0.02, 0.05) * amp
    return y


def gap(dur: float) -> np.ndarray:
    return np.zeros(max(1, int(SR * dur)))


def concat(parts: list[np.ndarray]) -> np.ndarray:
    y = np.concatenate(parts) if parts else np.zeros(1)
    peak = np.max(np.abs(y)) + 1e-8
    return (y / peak * 0.72).astype(np.float64)


# Not called. Recorded bursts replaced this formant recipe. Do not wire it back.
def burst(kind: str, lang: str, gender: str) -> np.ndarray:
    female = gender == "female"
    base = 228 if female else 118
    if lang == "ja":
        base += 12
    elif lang == "yue":
        base += 6
    elif lang == "en":
        base -= 4
    seed = (sum(ord(c) for c in lang + gender + kind) * 17) % 10000
    if kind == "laugh":
        parts = []
        for i in range(4):
            parts.append(tone(base * (1.05 - i * 0.06), 0.11, A, 0.9 - i * 0.08, 0.04, seed + i, 0.22))
            parts.append(gap(0.045))
        return concat(parts)
    if kind == "giggle":
        formants = U if lang == "ja" else I
        breath = 0.22 if lang == "ja" else 0.08
        parts = []
        for i in range(5):
            parts.append(tone(base * (1.18 + (i % 2) * 0.06), 0.07, formants, 0.7, breath, seed + i, 0.18))
            parts.append(gap(0.03))
        return concat(parts)
    if kind == "smile":
        return concat([tone(base * 0.98, 0.26, E, 0.45, 0.12, seed, 0.2)])
    if kind == "wow":
        rise = tone(base * 0.9, 0.18, ((500, 80, 0.8), (1100, 100, 0.7), (2400, 150, 0.2)), 0.8, 0.05, seed, -0.25)
        fall = tone(base * 1.15, 0.28, O, 0.75, 0.04, seed + 3, 0.35)
        return concat([rise, fall])
    if kind == "um":
        return concat([tone(base * 0.85, 0.38, U, 0.55, 0.02, seed, 0.08)])
    if kind == "oh":
        return concat([tone(base, 0.32, O, 0.7, 0.05, seed, 0.16)])
    if kind == "ha":
        return concat([tone(base * 1.02, 0.16, A, 0.75, 0.05, seed, 0.2)])
    raise KeyError(kind)


def write_wav(path: Path, samples: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(samples, -1, 1)
    ints = (pcm * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(ints.tobytes())


def to_mp3(wav: Path, mp3: Path) -> None:
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(wav),
            "-af", "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse",
            "-ar", "22050", "-ac", "1",
            "-codec:a", "libmp3lame", "-b:a", "40k",
            str(mp3),
        ]
    )


def espeak(text: str, voice: str, wav: Path, speed: int, pitch: int) -> None:
    wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        ["espeak-ng", "-v", voice, "-s", str(speed), "-p", str(pitch), "-a", "118", "-w", str(wav), text]
    )


def main() -> None:
    if shutil.which("ffmpeg") is None or shutil.which("espeak-ng") is None:
        raise SystemExit("ffmpeg and espeak-ng are required")
    tmp = OUT / "_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    spoken = ("hello", "nice", "hihi", "pleasure", "think", "search")
    for lang in LANGS:
        for gender in GENDERS:
            folder = OUT / lang / gender
            folder.mkdir(parents=True, exist_ok=True)
            voice = f"{ESPEAK[lang]}+{'f3' if gender == 'female' else 'm3'}"
            pitch = 58 if gender == "female" else 28
            lines = {**GREETINGS[lang], **FILLERS[lang]}
            for kind in spoken:
                wav = tmp / f"{lang}-{gender}-{kind}.wav"
                speed = 132 if kind in ("think", "search") else 152
                espeak(lines[kind], voice, wav, speed, pitch)
                to_mp3(wav, folder / f"{kind}.mp3")
    shutil.rmtree(tmp)
    count = len(list(OUT.glob("*/*/*.mp3")))
    print(f"wrote {count} clips under {OUT}")


if __name__ == "__main__":
    main()
