#!/usr/bin/env python3
"""Smoke Chatterbox-Turbo on DESKTOP as an EN-only emotion/SFX CPU sidecar.

NOT Edge. NOT zh/Yue. NOT a code-switch / mixed-language pipeline.
Weights stay on D: (HF_HOME). Do not commit WAVs or safetensors.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

os.environ.setdefault("HF_HOME", r"D:\LocalAI\cache\huggingface")
os.environ.setdefault(
    "HUGGINGFACE_HUB_CACHE",
    os.path.join(os.environ["HF_HOME"], "hub"),
)
os.environ.setdefault("TMP", r"D:\AI app development\tmp")
os.environ.setdefault("TEMP", r"D:\AI app development\tmp")
Path(os.environ["TMP"]).mkdir(parents=True, exist_ok=True)

OUT = Path(os.environ.get("AMOJI_CHATTERBOX_OUT", r"D:\AI app development\chatterbox-turbo-out"))
OUT.mkdir(parents=True, exist_ok=True)

REF = Path(
    os.environ.get(
        "AMOJI_CHATTERBOX_REF",
        r"D:\AI app development\chatterbox-turbo-out\ref_en_gt5s.wav",
    )
)


def main() -> int:
    print("Chatterbox-Turbo smoke — EN-only sidecar (Edge zh/Yue untouched)")
    print(f"HF_HOME={os.environ.get('HF_HOME')}")
    print(f"OUT={OUT}")
    print(f"REF={REF}")

    if not REF.is_file():
        print(f"SKIP: missing voice prompt wav at {REF}")
        print("Set AMOJI_CHATTERBOX_REF to a short EN reference wav (~3–10s).")
        (OUT / "smoke_summary.txt").write_text(
            f"status=SKIP\nreason=missing_ref\nref={REF}\n", encoding="utf-8"
        )
        return 2

    t0 = time.perf_counter()
    try:
        import torch
        import torchaudio as ta
        from chatterbox.tts_turbo import ChatterboxTurboTTS
    except Exception as e:
        print(f"SKIP import: {e!r}")
        (OUT / "smoke_summary.txt").write_text(
            f"status=SKIP\nreason=import\nerror={e!r}\n", encoding="utf-8"
        )
        return 2

    device = "cpu"
    print(f"Loading ChatterboxTurboTTS device={device} ...")
    t1 = time.perf_counter()
    try:
        model = ChatterboxTurboTTS.from_pretrained(device=device)
    except Exception as e:
        print(f"FAIL load: {e!r}")
        (OUT / "smoke_summary.txt").write_text(
            f"status=FAIL\nreason=load\nerror={e!r}\n", encoding="utf-8"
        )
        return 1
    t_load = time.perf_counter() - t1
    print(f"load_s={t_load:.2f}")

    cases = [
        ("sigh", "What a long day. [sigh]"),
        ("laugh", "That was funny. [laugh]"),
        ("gasp", "Wait — [gasp] did you hear that?"),
        ("chuckle", "Hi there [chuckle], got a minute?"),
        ("happy_filler", "Nice! We can try that."),
    ]
    results = []
    for name, text in cases:
        out_path = OUT / f"{name}.wav"
        t2 = time.perf_counter()
        try:
            wav = model.generate(text, audio_prompt_path=str(REF))
            ta.save(str(out_path), wav, model.sr)
            elapsed = time.perf_counter() - t2
            size = out_path.stat().st_size if out_path.exists() else 0
            print(f"OK {name}: {elapsed:.2f}s -> {out_path} ({size} bytes)")
            results.append((name, elapsed, size, None))
        except Exception as e:
            elapsed = time.perf_counter() - t2
            print(f"FAIL {name}: {elapsed:.2f}s {e!r}")
            results.append((name, elapsed, 0, str(e)))

    summary = OUT / "smoke_summary.txt"
    lines = [
        "repo=ResembleAI/chatterbox-turbo",
        f"device={device}",
        f"load_s={t_load:.2f}",
        f"wall_s={time.perf_counter() - t0:.2f}",
        f"ref={REF}",
        "scope=EN-only emotion/SFX sidecar; no Edge replace; no zh/Yue; no code-switch",
    ]
    for name, elapsed, size, err in results:
        lines.append(f"{name}\t{elapsed:.3f}s\t{size}B\t{err or 'ok'}")
    summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {summary}")
    return 1 if any(r[3] for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
