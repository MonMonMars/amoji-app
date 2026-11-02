#!/usr/bin/env python3
"""Smoke Silencio-2 on DESKTOP as an EN-only emotion/SFX CPU sidecar.

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

OUT = Path(os.environ.get("AMOJI_SILENCIO2_OUT", r"D:\AI app development\silencio2-out"))
OUT.mkdir(parents=True, exist_ok=True)

REPO = "BlueRoseLabs/Silencio-2"
ROOT = os.environ.get("AMOJI_SILENCIO2_ROOT")


def main() -> int:
    print("Silencio-2 smoke — EN-only sidecar (Edge zh/Yue untouched)")
    print(f"HF_HOME={os.environ.get('HF_HOME')}")
    print(f"OUT={OUT}")

    t0 = time.perf_counter()
    from huggingface_hub import snapshot_download

    if ROOT and Path(ROOT).is_dir():
        local = Path(ROOT)
        print(f"Using AMOJI_SILENCIO2_ROOT={local}")
    else:
        print(f"Downloading/caching {REPO} ...")
        local = Path(snapshot_download(repo_id=REPO))
        print(f"Snapshot: {local}")
    t_dl = time.perf_counter() - t0

    sys.path.insert(0, str(local))
    from silencio2 import Silencio2TTS  # type: ignore

    t1 = time.perf_counter()
    quant = False
    tts = None
    errors = []
    for kwargs in (
        {"quantize": True},
        {},
    ):
        for args in ((str(local),), ()):
            try:
                tts = Silencio2TTS.from_pretrained(*args, **kwargs)
                quant = bool(kwargs.get("quantize"))
                break
            except TypeError as e:
                errors.append(repr(e))
            except Exception as e:
                errors.append(repr(e))
        if tts is not None:
            break
    if tts is None:
        print("FAIL load:", "; ".join(errors[-4:]))
        return 1
    t_load = time.perf_counter() - t1
    print(f"quantize={quant} load_s={t_load:.2f} download_or_resolve_s={t_dl:.2f}")

    cases = [
        ("sigh", "What a long day. [sigh]", None),
        ("laugh", "That was funny. [laugh]", None),
        ("gasp", "Wait — [gasp] did you hear that?", None),
        ("happy_filler", "Nice! We can try that.", "happy"),
        ("whisper", "Keep your voice down.", "whisper"),
    ]
    results = []
    for name, text, emotion in cases:
        out_path = OUT / f"{name}.wav"
        t2 = time.perf_counter()
        try:
            if emotion:
                try:
                    tts.save(str(out_path), text, emotion=emotion, voice="260")
                except TypeError:
                    tts.save(str(out_path), f"<{emotion}> {text}", voice="260")
            else:
                tts.save(str(out_path), text, voice="260")
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
        f"repo={REPO}",
        f"quantize={quant}",
        f"download_or_resolve_s={t_dl:.2f}",
        f"load_s={t_load:.2f}",
        "scope=EN-only emotion/SFX sidecar; no Edge replace; no zh/Yue; no code-switch",
    ]
    for name, elapsed, size, err in results:
        lines.append(f"{name}\t{elapsed:.3f}s\t{size}B\t{err or 'ok'}")
    summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {summary}")
    return 1 if any(r[3] for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
