'use client';
import { useEffect, useState } from 'react';
import { getEngine, patchConfig } from '../lib/companion';
import { saveConfig } from '../lib/companion-store';
import type { EmotionConfig } from '@amoji/emotion-core';

interface SliderSpec {
  key: keyof EmotionConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const SLIDERS: SliderSpec[] = [
  { key: 'blendTimeMs', label: 'blend time', min: 50, max: 2000, step: 10, unit: 'ms' },
  { key: 'idleAfterMs', label: 'idle after', min: 0, max: 30000, step: 250, unit: 'ms' },
  { key: 'saccadeMinMs', label: 'saccade min', min: 100, max: 5000, step: 50, unit: 'ms' },
  { key: 'saccadeMaxMs', label: 'saccade max', min: 100, max: 5000, step: 50, unit: 'ms' },
  { key: 'intensity', label: 'intensity', min: 0, max: 1, step: 0.01 },
];

export default function DevPanel() {
  const [cfg, setCfg] = useState<EmotionConfig | null>(null);

  useEffect(() => {
    setCfg(getEngine().getConfig());
  }, []);

  if (!cfg) return null;

  const update = (key: keyof EmotionConfig, value: number) => {
    patchConfig({ [key]: value } as Partial<EmotionConfig>);
    const next = getEngine().getConfig();
    saveConfig(next);
    setCfg(next);
  };

  return (
    <details open className="pointer-events-auto fixed top-3 right-3 z-10 w-64 rounded-lg bg-black/70 p-3 font-mono text-xs text-neutral-200">
      <summary className="cursor-pointer select-none text-neutral-400">dev tuning (persisted)</summary>
      <div className="mt-2 space-y-2">
        {SLIDERS.map((s) => (
          <label key={s.key} className="block">
            <span className="flex justify-between">
              <span>{s.label}</span>
              <span>{Math.round(cfg[s.key] as number * (s.step < 1 ? 100 : 1)) / (s.step < 1 ? 100 : 1)}{s.unit ?? ''}</span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={cfg[s.key] as number}
              onChange={(e) => update(s.key, Number(e.target.value))}
              className="w-full accent-pink-500"
            />
          </label>
        ))}
      </div>
    </details>
  );
}
