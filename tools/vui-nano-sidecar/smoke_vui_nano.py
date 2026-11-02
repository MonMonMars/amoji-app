#!/usr/bin/env python3
"""Smoke Vui Nano on DESKTOP as an EN-only emotion/SFX CPU sidecar.

NOT Edge. NOT zh/Yue. Exit 2 = SKIP (install/import pain).
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
os.environ.setdefault("VUI_TELEMETRY", "0")

OUT = Path(os.environ.get("AMOJI_VUI_OUT", r"D:\AI app development\vui-nano-out"))
OUT.mkdir(parents=True, exist_ok=True)


def main() -> int:
    print("Vui Nano smoke — EN-only sidecar (Edge zh/Yue untouched)")
    print(f"HF_HOME={os.environ.get('HF_HOME')}")
    print(f"OUT={OUT}")

    t0 = time.perf_counter()
    try:
        from vui.engine import Engine, GenConfig
    except Exception as e:
        print(f"SKIP import: {e!r}")
        (OUT / "smoke_summary.txt").write_text(
            f"status=SKIP\nreason=import\nerror={e!r}\n"
            "hint=pip install vui-tts into D:\\AI app development\\vui-nano-venv; "
            "CPU/MLX/CUDA extras may be required. UI buttons fail-closed to Edge.\n",
            encoding="utf-8",
        )
        return 2

    t1 = time.perf_counter()
    try:
        engine = Engine()
    except Exception as e:
        print(f"SKIP/FAIL load: {e!r}")
        (OUT / "smoke_summary.txt").write_text(
            f"status=SKIP\nreason=load\nerror={e!r}\n", encoding="utf-8"
        )
        return 2
    t_load = time.perf_counter() - t1
    print(f"load_s={t_load:.2f}")

    cases = [
        ("sigh", "What a long day. [sigh]"),
        ("laugh", "That was funny. [laugh]"),
        ("gasp", "Wait — [gasp] did you hear that?"),
        ("happy_filler", "Nice! We can try that."),
        ("breath", "So [breath] the thing is, we can try."),
    ]
    results = []
    try:
        import soundfile as sf
    except Exception:
        sf = None

    for name, text in cases:
        out_path = OUT / f"{name}.wav"
        t2 = time.perf_counter()
        try:
            with engine.new_row() as row:
                _codes, audio = row.render(text, GenConfig(temperature=0.7, max_secs=8))
            elapsed = time.perf_counter() - t2
            if sf is not None:
                import numpy as np

                arr = audio.squeeze().detach().cpu().float().numpy() if hasattr(audio, "detach") else audio
                sf.write(str(out_path), arr, 24000)
            else:
                out_path.write_bytes(b"")  # placeholder if soundfile missing
            size = out_path.stat().st_size if out_path.exists() else 0
            print(f"OK {name}: {elapsed:.2f}s -> {out_path} ({size} bytes)")
            results.append((name, elapsed, size, None))
        except Exception as e:
            elapsed = time.perf_counter() - t2
            print(f"FAIL {name}: {elapsed:.2f}s {e!r}")
            results.append((name, elapsed, 0, str(e)))

    summary = OUT / "smoke_summary.txt"
    lines = [
        "repo=fluxions/vui",
        f"load_s={t_load:.2f}",
        f"wall_s={time.perf_counter() - t0:.2f}",
        "scope=EN-only emotion/SFX sidecar; no Edge replace; no zh/Yue; no code-switch",
    ]
    for name, elapsed, size, err in results:
        lines.append(f"{name}\t{elapsed:.3f}s\t{size}B\t{err or 'ok'}")
    summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {summary}")
    return 1 if any(r[3] for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
