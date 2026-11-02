#!/usr/bin/env python3
"""Localhost EN SFX A/B gateway — fail-closed to 503 when an engine is unhealthy.

GET  /health
POST /tts  JSON {"engine": "...", "text": "..."} -> audio/wav
"""
from __future__ import annotations

import json
import os
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("AMOJI_EN_SFX_GATEWAY_PORT", "8765"))
ROOT = Path(__file__).resolve().parents[2]

ENGINES = {
    "silencio2": {
        "venv": Path(r"D:\\AI app development\\silencio2-venv\\Scripts\\python.exe"),
        "smoke": ROOT / "tools" / "silencio2-sidecar" / "smoke_silencio2.py",
        "out": Path(r"D:\\AI app development\\silencio2-out"),
        "sample": "laugh.wav",
    },
    "chatterbox-turbo": {
        "venv": Path(r"D:\\AI app development\\chatterbox-turbo-venv\\Scripts\\python.exe"),
        "smoke": ROOT / "tools" / "chatterbox-turbo-sidecar" / "smoke_chatterbox_turbo.py",
        "out": Path(r"D:\\AI app development\\chatterbox-turbo-out"),
        "sample": "laugh.wav",
    },
    "vui-nano": {
        "venv": Path(r"D:\\AI app development\\vui-nano-venv\\Scripts\\python.exe"),
        "smoke": ROOT / "tools" / "vui-nano-sidecar" / "smoke_vui_nano.py",
        "out": Path(r"D:\\AI app development\\vui-nano-out"),
        "sample": "laugh.wav",
    },
    "lure-tts": {
        "venv": Path(r"D:\\AI app development\\lure-tts-venv\\Scripts\\python.exe"),
        "smoke": ROOT / "tools" / "lure-tts-sidecar" / "smoke_lure_tts.py",
        "out": Path(r"D:\\AI app development\\lure-tts-out"),
        "sample": "laugh.wav",
    },
}

GEN_LOCK = threading.Lock()


def engine_status(name: str) -> dict:
    cfg = ENGINES[name]
    venv_ok = cfg["venv"].is_file()
    smoke_ok = cfg["smoke"].is_file()
    sample = cfg["out"] / cfg["sample"]
    sample_ok = sample.is_file() and sample.stat().st_size > 44
    summary = cfg["out"] / "smoke_summary.txt"
    skipped = False
    if summary.is_file():
        try:
            skipped = "status=SKIP" in summary.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            pass
    ready = venv_ok and smoke_ok and sample_ok and not skipped
    return {
        "engine": name,
        "venv": venv_ok,
        "smoke_script": smoke_ok,
        "sample_wav": sample_ok,
        "skipped": skipped,
        "ready": ready,
        "sample_path": str(sample) if sample_ok else None,
    }


def cors(handler: BaseHTTPRequestHandler) -> None:
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        cors(self)
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("/", "/health"):
            body = json.dumps({
                "ok": True,
                "service": "amoji-en-sfx-gateway",
                "engines": {k: engine_status(k) for k in ENGINES},
                "note": "EN emotion/SFX A/B only; Edge/Yue untouched; fail-closed",
            }, indent=2).encode("utf-8")
            self.send_response(200)
            cors(self)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404, "not found")

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/tts":
            self.send_error(404, "not found")
            return
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_error(400, "bad json")
            return
        engine = str(payload.get("engine") or "").strip()
        text = str(payload.get("text") or "").strip()
        if engine not in ENGINES:
            self._json(400, {"error": "unknown engine", "engine": engine})
            return
        if not text:
            self._json(400, {"error": "missing text"})
            return
        if any(ch in text for ch in "的是不了人我在有他这为之"):
            self._json(400, {"error": "EN-only lane; refuse CJK chat line"})
            return
        st = engine_status(engine)
        wav_path = Path(st["sample_path"]) if st.get("sample_path") else None
        force = bool(payload.get("force"))
        if (not wav_path or force) and st["venv"] and st["smoke_script"]:
            with GEN_LOCK:
                try:
                    self._run_smoke(engine)
                except Exception as e:
                    self._json(503, {"error": "smoke failed", "detail": repr(e), "engine": engine})
                    return
            st = engine_status(engine)
            wav_path = Path(st["sample_path"]) if st.get("sample_path") else None
        if not wav_path or not wav_path.is_file():
            self._json(503, {"error": "engine unhealthy — fail-closed to Edge", "engine": engine, "status": st,
                             "hint": "Run tools/<engine>-sidecar/setup-venv.ps1 + smoke_*.py on DESKTOP"})
            return
        chosen = wav_path
        out_dir = ENGINES[engine]["out"]
        low = text.lower()
        for key in ("laugh", "sigh", "gasp", "chuckle", "whisper", "breath", "happy"):
            if key in low:
                cand = out_dir / f"{key}.wav"
                if not cand.is_file() and key == "happy":
                    cand = out_dir / "happy_filler.wav"
                if cand.is_file() and cand.stat().st_size > 44:
                    chosen = cand
                    break
        data = chosen.read_bytes()
        self.send_response(200)
        cors(self)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Amoji-Engine", engine)
        self.send_header("X-Amoji-Sample", chosen.name)
        self.end_headers()
        self.wfile.write(data)

    def _run_smoke(self, engine: str) -> None:
        cfg = ENGINES[engine]
        env = os.environ.copy()
        env.setdefault("HF_HOME", r"D:\\LocalAI\\cache\\huggingface")
        env.setdefault("HUGGINGFACE_HUB_CACHE", str(Path(env["HF_HOME"]) / "hub"))
        print(f"running smoke for {engine} ...")
        t0 = time.perf_counter()
        proc = subprocess.run([str(cfg["venv"]), str(cfg["smoke"])], env=env, cwd=str(ROOT),
                              capture_output=True, text=True, timeout=60 * 30)
        print(f"smoke {engine} exit={proc.returncode} in {time.perf_counter() - t0:.1f}s")
        if proc.stdout:
            print(proc.stdout[-2000:])
        if proc.stderr:
            print(proc.stderr[-2000:])
        if proc.returncode not in (0, 2):
            raise RuntimeError(f"smoke exit {proc.returncode}")

    def _json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        cors(self)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> int:
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"amoji EN SFX gateway on http://{HOST}:{PORT}  (GET /health, POST /tts)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("bye")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
