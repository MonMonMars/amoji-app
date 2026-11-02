#!/usr/bin/env python3
"""Smoke Lure-TTS-0.6B on DESKTOP (optional). Exit 2 = SKIP."""
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

OUT = Path(os.environ.get("AMOJI_LURE_OUT", r"D:\AI app development\lure-tts-out"))
OUT.mkdir(parents=True, exist_ok=True)

REF = Path(
    os.environ.get(
        "AMOJI_LURE_REF",
        r"D:\AI app development\silencio2-out\happy_filler.wav",
    )
)
REF_TEXT = os.environ.get("AMOJI_LURE_REF_TEXT", "Nice! We can try that.")


def main() -> int:
    print("Lure-TTS-0.6B smoke — EN-only optional sidecar")
    print(f"HF_HOME={os.environ.get('HF_HOME')}")
    print(f"OUT={OUT}")
    print(f"REF={REF}")

    if not REF.is_file():
        msg = f"SKIP: missing ref wav {REF}"
        print(msg)
        (OUT / "smoke_summary.txt").write_text(
            f"status=SKIP\nreason=missing_ref\nref={REF}\n", encoding="utf-8"
        )
        return 2

    try:
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel
    except Exception as e:
        print(f"SKIP import: {e!r}")
        (OUT / "smoke_summary.txt").write_text(
            f"status=SKIP\nreason=import\nerror={e!r}\n"
            "hint=Optional engine. Install qwen-tts into lure-tts-venv or leave SKIP; "
            "UI buttons fail-closed to Edge.\n",
            encoding="utf-8",
        )
        return 2

    t1 = time.perf_counter()
    try:
        tts = Qwen3TTSModel.from_pretrained(
            "Tesslate/Lure-TTS-0.6B",
            device_map="cpu",
            dtype="float32",
        )
    except Exception as e:
        print(f"SKIP load: {e!r}")
        (OUT / "smoke_summary.txt").write_text(
            f"status=SKIP\nreason=load\nerror={e!r}\n", encoding="utf-8"
        )
        return 2
    t_load = time.perf_counter() - t1
    print(f"load_s={t_load:.2f}")

    # Lure uses round-bracket tags, not square.
    cases = [
        ("sigh", "What a long day. (sigh)"),
        ("laugh", "That was funny. (laugh)"),
        ("gasp", "Wait — (gasp) did you hear that?"),
        ("happy_filler", "Nice! We can try that."),
        ("whisper", "Keep your voice down."),
    ]
    results = []
    for name, text in cases:
        out_path = OUT / f"{name}.wav"
        t2 = time.perf_counter()
        try:
            wavs, sr = tts.generate_voice_clone(
                text=text,
                language="English",
                ref_audio=str(REF),
                ref_text=REF_TEXT,
                non_streaming_mode=True,
            )
            sf.write(str(out_path), wavs[0], sr)
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
        "repo=Tesslate/Lure-TTS-0.6B",
        f"load_s={t_load:.2f}",
        f"ref={REF}",
        "scope=EN-only optional sidecar; no Edge replace; no zh/Yue; no code-switch",
    ]
    for name, elapsed, size, err in results:
        lines.append(f"{name}\t{elapsed:.3f}s\t{size}B\t{err or 'ok'}")
    summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {summary}")
    return 1 if any(r[3] for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
