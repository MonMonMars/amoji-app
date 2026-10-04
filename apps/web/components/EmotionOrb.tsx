'use client';
// The living voice orb — ChatGPT-style.
// r2026-10-03.13: pure soft blob. One blurry-edged sphere — the alpha melts
// to zero at the rim, so there is NO ring, NO hard outline, no square edge.
// The ball breathes with her voice volume (louder = bigger), and the color
// follows her mood: yellow when happy, red when angry, ChatGPT-blue tint
// with ripple rings while listening.
// r2026-10-04.87: the orb now also breathes for the USER — while the VAD
// hears you speaking, the ball swells bigger and burns white-hot in the
// centre, so the mic shows who currently holds the floor at a glance.
// r2026-10-04.88: ROOT CAUSE of the never-dying "square border" finally
// found. r.29's "safe margin" compared the halo radius (up to 0.72·M)
// against M — but a canvas clips at M/2 from its centre, so the halo and
// the ripple rings were being sliced straight at the canvas boundary and
// rendered as a glowing rounded SQUARE around the ball. All geometry is
// now computed against SAFE = 0.47·M (< M/2), so every gradient reaches
// alpha zero well inside the canvas and nothing can ever be squared off.
import { useEffect, useRef } from 'react';
import { getLatestFrame, dominantMood } from '../lib/companion';
import { sampleSpeech } from '../lib/speech';

const MOOD_RGB: Record<string, [number, number, number]> = {
  joy: [255, 205, 80],
  angry: [255, 95, 90],
  sad: [95, 140, 255],
  surprised: [110, 225, 255],
  relaxed: [125, 255, 175],
  neutral: [150, 220, 220],
};

// ChatGPT "voice active" blue — the tint the orb takes while listening
const LISTEN_RGB: [number, number, number] = [72, 160, 255];

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [150, 220, 220];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function EmotionOrb({
  size = 72,
  accent = '#f9a8d4',
  listening = false,
  userSpeaking = false,
}: {
  size?: number;
  accent?: string;
  listening?: boolean;
  userSpeaking?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const listenRef = useRef(listening);
  listenRef.current = listening;
  const userSpeakRef = useRef(userSpeaking);
  userSpeakRef.current = userSpeaking;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const accentRgb = hexToRgb(accent);

    let raf = 0;
    let t = 0;
    let last = performance.now();
    let vol = 0;
    const cur = { r: 150, g: 220, b: 220 };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, now - last);
      last = now;
      t += dt / 1000;

      const frame = getLatestFrame();
      const mood = dominantMood(frame);
      const base = mood === 'neutral' ? accentRgb : MOOD_RGB[mood]!;
      // r87 — while YOU speak, the ball burns white-hot; while listening
      // (nobody talking yet) it blends toward the ChatGPT voice-blue
      const target: [number, number, number] = userSpeakRef.current
        ? [
            base[0] * 0.35 + 255 * 0.65,
            base[1] * 0.35 + 255 * 0.65,
            base[2] * 0.35 + 255 * 0.65,
          ]
        : listenRef.current
        ? [
            base[0] * 0.55 + LISTEN_RGB[0] * 0.45,
            base[1] * 0.55 + LISTEN_RGB[1] * 0.45,
            base[2] * 0.55 + LISTEN_RGB[2] * 0.45,
          ]
        : base;
      const k = 1 - Math.exp(-dt / 260);
      cur.r += (target[0] - cur.r) * k;
      cur.g += (target[1] - cur.g) * k;
      cur.b += (target[2] - cur.b) * k;

      const sp = sampleSpeech();
      let targetVol: number;
      if (userSpeakRef.current) targetVol = 0.72 + 0.26 * Math.abs(Math.sin(t * 6));
      else if (listenRef.current) targetVol = 0.55 + 0.18 * Math.abs(Math.sin(t * 5));
      else if (sp) targetVol = Math.min(1, 0.25 + sp.mouth * 1.15);
      else targetVol = 0.16 + 0.05 * Math.sin(t * 2.2) + (frame ? Math.max(0, frame.arousal) * 0.12 : 0);
      vol += (targetVol - vol) * (1 - Math.exp(-dt / 90));

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const M = Math.min(w, h);
      // r88 — the hard invariant: NOTHING may be drawn further than SAFE
      // from the centre. The canvas clips at M/2 (not M — that was r.29's
      // fatal slip), so SAFE = 0.47·M guarantees every gradient is fully
      // transparent long before it can touch an edge. No more square halo.
      const SAFE = M * 0.47;
      ctx.clearRect(0, 0, w, h);
      // the ball swells with her voice — high volume = bigger, quiet = smaller.
      // Max body radius 0.30·M, so even the widest adornment (halo/ring at
      // 1.5×R = 0.45·M) stays inside SAFE — blurry-edged circle, never a box.
      const R = M * 0.3 * (0.62 + 0.38 * vol);
      const colA = (a: number) => `rgba(${cur.r | 0},${cur.g | 0},${cur.b | 0},${a})`;

      // fuzzy outer halo — light bleed, feathered to nothing well inside SAFE
      const haloR = Math.min(R * 1.5, SAFE);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, haloR);
      halo.addColorStop(0, colA(0.3 + 0.4 * vol));
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // the blob body — alpha melts to zero AT the rim, so the edge is soft
      const body = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R);
      body.addColorStop(0, colA(0.95));
      body.addColorStop(0.55, colA(0.8));
      body.addColorStop(1, colA(0));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // slow inner swirl keeps the plasma alive — still soft-edged
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const ang = t * (0.6 + 0.35 * i) + i * 2.1;
        const bx = cx + Math.cos(ang) * R * 0.24;
        const by = cy + Math.sin(ang * 1.3 + i) * R * 0.22;
        const br = R * (0.5 + 0.22 * vol) * (1 - i * 0.13);
        const g = ctx.createRadialGradient(bx, by, br * 0.05, bx, by, br);
        g.addColorStop(0, colA(0.35));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // soft specular sheen — a gradient dot, no hard edge
      const sheen = ctx.createRadialGradient(cx - R * 0.24, cy - R * 0.3, 0, cx - R * 0.24, cy - R * 0.3, R * 0.3);
      sheen.addColorStop(0, 'rgba(255,255,255,0.4)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.arc(cx - R * 0.24, cy - R * 0.3, R * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // listening ripple rings (ChatGPT voice pulse) — capped at SAFE, so
      // a ring at its fattest is still a clean circle, never squared off
      if (listenRef.current) {
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.85 + i * 0.5) % 1;
          ctx.globalAlpha = (1 - ph) * 0.6;
          ctx.strokeStyle = `rgb(${LISTEN_RGB[0]},${LISTEN_RGB[1]},${LISTEN_RGB[2]})`;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(R * (1.05 + ph * 0.45), SAFE), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, accent]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}
