'use client';
// Animated particle layer for the painted anime scenes — drifting sakura
// petals, falling snow, neon bokeh, rising embers… keyed by BackgroundDef.fx.
// Rendered on a transparent canvas over the backdrop image; cheap, capped-DPR,
// pauses when the tab is hidden.
import { useEffect, useRef } from 'react';
import type { FxKind } from '../lib/prefs';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; phase: number; spin: number; hue: string;
}

const HUES: Record<string, string[]> = {
  petals: ['#fbcfe8', '#f9a8d4', '#fda4af', '#fff1f2'],
  snow: ['#ffffff', '#e0f2fe', '#f0f9ff'],
  embers: ['#fdba74', '#fb923c', '#f97316', '#fecaca'],
  bubbles: ['#bae6fd', '#e0f2fe', '#a5f3fc'],
  fireflies: ['#fef08a', '#d9f99d', '#fde68a'],
  neon: ['#22d3ee', '#e879f9', '#fb7185', '#a78bfa'],
  stars: ['#ffffff', '#fde68a', '#bfdbfe'],
};

function spawn(fx: FxKind, w: number, h: number): Particle {
  const R = Math.random;
  const p: Particle = { x: R() * w, y: R() * h, vx: 0, vy: 0, size: 1, phase: R() * Math.PI * 2, spin: (R() - 0.5) * 2, hue: '' };
  switch (fx) {
    case 'petals':
      p.vx = 12 + R() * 26; p.vy = 18 + R() * 30; p.size = 3 + R() * 5;
      p.hue = pick(HUES.petals); break;
    case 'snow':
      p.vx = (R() - 0.5) * 14; p.vy = 12 + R() * 26; p.size = 1 + R() * 2.6;
      p.hue = pick(HUES.snow); break;
    case 'embers':
      p.vx = (R() - 0.5) * 16; p.vy = -(14 + R() * 30); p.size = 1 + R() * 2.4;
      p.hue = pick(HUES.embers); break;
    case 'bubbles':
      p.vx = 0; p.vy = -(10 + R() * 22); p.size = 2 + R() * 5;
      p.hue = pick(HUES.bubbles); break;
    case 'fireflies':
      p.vx = (R() - 0.5) * 24; p.vy = (R() - 0.5) * 18; p.size = 1.4 + R() * 2.2;
      p.hue = pick(HUES.fireflies); break;
    case 'neon':
      p.vx = (R() - 0.5) * 10; p.vy = -(6 + R() * 14); p.size = 3 + R() * 9;
      p.hue = pick(HUES.neon); break;
    case 'stars':
      p.vx = 0; p.vy = 0; p.size = 0.6 + R() * 1.8;
      p.hue = pick(HUES.stars); break;
    default: // shimmer motes
      p.vx = (R() - 0.5) * 10; p.vy = -(2 + R() * 6); p.size = 1 + R() * 2.4;
      p.hue = pick(HUES.snow);
  }
  return p;
}

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]!;

export default function SceneFX({ fx, className }: { fx?: FxKind; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !fx) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const isRain = fx === 'rain';
    const N = isRain ? 90 : fx === 'stars' ? 70 : fx === 'shimmer' ? 24 : 46;
    const ps: Particle[] = Array.from({ length: N }, () => spawn(fx, w, h));
    // rain streaks reuse particles with a long vy
    if (isRain) for (const p of ps) { p.vy = 420 + Math.random() * 380; p.vx = -60 - Math.random() * 40; p.size = 0.8 + Math.random() * 1.2; p.hue = '#9cc3e8'; }

    let raf = 0;
    let last = performance.now();
    let shoot = { t: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0 };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      ctx.clearRect(0, 0, w, h);

      if (fx === 'shimmer') {
        // slow aurora bands drifting sideways
        for (let i = 0; i < 3; i++) {
          const y = h * (0.18 + i * 0.16) + Math.sin(now / 2400 + i * 2.1) * h * 0.05;
          const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
          g.addColorStop(0, 'rgba(110,231,183,0)');
          g.addColorStop(0.5, `rgba(110,231,183,${0.05 + 0.03 * Math.sin(now / 1800 + i)})`);
          g.addColorStop(1, 'rgba(110,231,183,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, y - 40, w, 80);
        }
      }

      for (const p of ps) {
        p.phase += dt * (0.6 + Math.abs(p.spin));
        if (fx === 'fireflies') {
          p.x += (p.vx + Math.sin(p.phase) * 14) * dt;
          p.y += (p.vy + Math.cos(p.phase * 0.8) * 10) * dt;
        } else if (fx === 'bubbles') {
          p.x += Math.sin(p.phase) * 12 * dt;
          p.y += p.vy * dt;
        } else {
          p.x += (p.vx + (fx === 'petals' || fx === 'snow' ? Math.sin(p.phase) * 18 : 0)) * dt;
          p.y += p.vy * dt;
        }

        // wrap / respawn
        if (p.y > h + 12 || p.y < -12 || p.x > w + 12 || p.x < -12) {
          if (fx === 'embers' || fx === 'bubbles' || fx === 'neon') { p.y = h + 10; p.x = Math.random() * w; }
          else if (isRain) { p.y = -10; p.x = Math.random() * (w + 200); }
          else { Object.assign(p, spawn(fx, w, h)); p.y = fx === 'snow' || fx === 'petals' ? -10 : Math.random() * h; }
        }

        const tw = fx === 'stars' ? 0.35 + 0.65 * Math.abs(Math.sin(p.phase * (0.5 + p.size * 0.4))) : 1;
        ctx.globalAlpha = (fx === 'fireflies' ? 0.5 + 0.5 * Math.sin(p.phase * 1.7) : fx === 'neon' ? 0.28 : 0.85) * tw;
        ctx.fillStyle = p.hue;

        if (fx === 'petals') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.phase * p.spin);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (isRain) {
          ctx.strokeStyle = p.hue;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.02, p.y - p.vy * 0.02);
          ctx.stroke();
        } else if (fx === 'bubbles' || fx === 'neon') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.strokeStyle = p.hue;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // an occasional shooting star for the star fields
      if (fx === 'stars') {
        if (shoot.life <= 0 && Math.random() < 0.004) {
          shoot = { t: now, x: Math.random() * w * 0.7 + w * 0.15, y: Math.random() * h * 0.3, vx: -(300 + Math.random() * 250), vy: 140 + Math.random() * 120, life: 0.9 };
        }
        if (shoot.life > 0) {
          shoot.life -= dt;
          shoot.x += shoot.vx * dt;
          shoot.y += shoot.vy * dt;
          const a = Math.max(0, shoot.life / 0.9);
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.14, shoot.y - shoot.vy * 0.14);
          g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 1;
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(shoot.x - shoot.vx * 0.14, shoot.y - shoot.vy * 0.14);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [fx]);

  if (!fx) return null;
  return <canvas ref={ref} className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'} aria-hidden />;
}
