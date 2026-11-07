'use client';
import { useEffect, useState } from 'react';
import { getEngine, patchConfig } from '../lib/companion';
import { saveConfig } from '../lib/companion-store';
import type { EmotionConfig } from '@amoji/emotion-core';
import { loadPrefs, type Lang } from '../lib/prefs';

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


const COPY: Record<Lang, { region: string; toggle: string; summary: string }> = {
  en: { region: 'dev tuning', toggle: 'Toggle dev tuning', summary: 'dev tuning (persisted)' },
  yue: { region: '開發調校', toggle: '開關開發調校', summary: '開發調校（會儲存）' },
  zh: { region: '开发调试', toggle: '切换开发调试', summary: '开发调试（已保存）' },
  ja: { region: '開発チューニング', toggle: '開発チューニングを切替', summary: '開発チューニング（保存あり）' },
};

export default function DevPanel() {
  const [cfg, setCfg] = useState<EmotionConfig | null>(null);
  const copy = COPY[loadPrefs().lang] ?? COPY.en;

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
    <details
      open
      role="region"
      aria-label={copy.region}
      className="pointer-events-auto fixed top-3 right-3 z-10 w-64 rounded-lg bg-black/70 p-3 font-mono text-xs text-neutral-200"
    >
      <summary className="cursor-pointer select-none text-neutral-400" aria-label={copy.toggle}>{copy.summary}</summary>
      <div className="mt-2 space-y-2">
        {SLIDERS.map((s) => (
          <label key={s.key} htmlFor={`amoji-dev-${s.key}`} className="block">
            <span className="flex justify-between">
              <span>{s.label}</span>
              <span>{Math.round(cfg[s.key] as number * (s.step < 1 ? 100 : 1)) / (s.step < 1 ? 100 : 1)}{s.unit ?? ''}</span>
            </span>
            <input
              id={`amoji-dev-${s.key}`}
              name={String(s.key)}
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={cfg[s.key] as number}
              aria-valuetext={`${Math.round((cfg[s.key] as number) * (s.step < 1 ? 100 : 1)) / (s.step < 1 ? 100 : 1)}${s.unit ?? ''}`}
              onChange={(e) => update(s.key, Number(e.target.value))}
              className="w-full accent-pink-500"
            />
          </label>
        ))}
      </div>
    </details>
  );
}
