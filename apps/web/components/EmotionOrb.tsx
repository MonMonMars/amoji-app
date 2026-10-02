'use client';
// The emotion orb — Unitree-style living ball inside the mic button.
// Color = the companion's current mood (from the shared emotion frame);
// size/glow = voice volume while she speaks, pulse rings while listening.
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

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [150, 220, 220];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function EmotionOrb({
  size = 44,
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
      const target = mood === 'neutral' ? accentRgb : MOOD_RGB[mood]!;
      const k = 1 - Math.exp(-dt / 260);
      cur.r += (target[0] - cur.r) * k;
      cur.g += (target[1] - cur.g) * k;
      cur.b += (target[2] - cur.b) * k;

      const sp = sampleSpeech();
      let targetVol: number;
      if (listenRef.current) targetVol = 0.5 + 0.12 * Math.sin(t * 6);
      else if (sp) targetVol = Math.min(1, 0.25 + sp.mouth * 1.1);
      else targetVol = 0.16 + 0.05 * Math.sin(t * 2.2) + (frame ? Math.max(0, frame.arousal) * 0.12 : 0);
      vol += (targetVol - vol) * (1 - Math.exp(-dt / 90));

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);
      const R = (Math.min(w, h) / 2) * (0.6 + 0.4 * vol);
      const col = `rgb(${cur.r | 0},${cur.g | 0},${cur.b | 0})`;

      // soft halo
      const grad = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 2);
      grad.addColorStop(0, col);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.25 + 0.45 * vol;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // glowing core
      ctx.shadowColor = col;
      ctx.shadowBlur = (8 + 26 * vol) * dpr;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // specular highlight
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(cx - R * 0.3, cy - R * 0.35, Math.max(1.5, R * 0.22), 0, Math.PI * 2);
      ctx.fill();

      // listening pulse rings
      if (listenRef.current) {
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.9 + i * 0.5) % 1;
          ctx.globalAlpha = (1 - ph) * 0.55;
          ctx.strokeStyle = col;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.arc(cx, cy, R * (1.15 + ph * 0.95), 0, Math.PI * 2);
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
