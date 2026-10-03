'use client';
// The living voice orb — ChatGPT-style.
// Swirling mood-colored plasma: breathes when idle, dances with her voice
// while she speaks, and tints ChatGPT-blue with ripple rings while listening.
// Sits inside the hero mic button.
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
  size = 52,
  accent = '#f9a8d4',
  listening = false,
}: {
  size?: number;
  accent?: string;
  listening?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const listenRef = useRef(listening);
  listenRef.current = listening;

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
      // while listening, blend toward the ChatGPT voice-blue
      const target: [number, number, number] = listenRef.current
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
      if (listenRef.current) targetVol = 0.55 + 0.18 * Math.abs(Math.sin(t * 5));
      else if (sp) targetVol = Math.min(1, 0.25 + sp.mouth * 1.15);
      else targetVol = 0.16 + 0.05 * Math.sin(t * 2.2) + (frame ? Math.max(0, frame.arousal) * 0.12 : 0);
      vol += (targetVol - vol) * (1 - Math.exp(-dt / 90));

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);
      const R = (Math.min(w, h) / 2) * (0.62 + 0.38 * vol);
      const col = `rgb(${cur.r | 0},${cur.g | 0},${cur.b | 0})`;
      const dim = `rgb(${(cur.r * 0.45) | 0},${(cur.g * 0.45) | 0},${(cur.b * 0.45) | 0})`;

      // soft outer halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 2.1);
      halo.addColorStop(0, col);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.22 + 0.5 * vol;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // swirling plasma blobs — the ChatGPT-orb "smoke", additive for glow
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const ang = t * (0.7 + 0.4 * i) + i * 2.1;
        const bx = cx + Math.cos(ang) * R * 0.3;
        const by = cy + Math.sin(ang * 1.35 + i) * R * 0.28;
        const br = R * (0.55 + 0.3 * vol) * (1 - i * 0.14);
        const g = ctx.createRadialGradient(bx, by, br * 0.05, bx, by, br);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // glowing core
      ctx.shadowColor = col;
      ctx.shadowBlur = (10 + 30 * vol) * dpr;
      ctx.fillStyle = dim;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // bright rim
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5 * dpr;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // specular highlight
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(cx - R * 0.26, cy - R * 0.32, Math.max(1.5, R * 0.18), 0, Math.PI * 2);
      ctx.fill();

      // listening ripple rings (ChatGPT voice pulse)
      if (listenRef.current) {
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.85 + i * 0.5) % 1;
          ctx.globalAlpha = (1 - ph) * 0.6;
          ctx.strokeStyle = `rgb(${LISTEN_RGB[0]},${LISTEN_RGB[1]},${LISTEN_RGB[2]})`;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.arc(cx, cy, R * (1.1 + ph * 0.9), 0, Math.PI * 2);
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
