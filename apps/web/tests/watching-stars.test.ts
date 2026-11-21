import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEMO_PHASE_BUTTONS, demoPhaseLabel, demoPhasePrimaryPrompt } from '../lib/demo-phase';
import {
  WATCHING_STARS_BED_CLIP_ID,
  WATCHING_STARS_DEMO_ID,
  isWatchingStarsAsk,
  watchingStarsIntroLine,
} from '../lib/watching-stars';
import { PERFORMANCE_CLIPS } from '../lib/performance-clips';
import { DEMO_PHASE_TO_REPLY_MODE } from '../lib/reply-mode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PANEL = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
const CHAT_PAGE = fs.readFileSync(path.join(ROOT, 'app/chat/page.tsx'), 'utf8');

describe('watching stars demo chip', () => {
  it('registers chip id and yue label', () => {
    const btn = DEMO_PHASE_BUTTONS.find((b) => b.id === WATCHING_STARS_DEMO_ID);
    expect(btn).toBeDefined();
    expect(demoPhaseLabel(WATCHING_STARS_DEMO_ID, 'yue')).toBe('睇星星');
    expect(demoPhasePrimaryPrompt(btn!, 'yue')).toBe('一齊睇星星');
  });

  it('binds the owner Observing the Star bed clip', () => {
    const clip = PERFORMANCE_CLIPS.find((c) => c.id === WATCHING_STARS_BED_CLIP_ID);
    expect(clip?.file).toContain('bed-observing-star.mp3');
    expect(WATCHING_STARS_BED_CLIP_ID).toBe('bed-observing-star');
  });

  it('maps demo chip to music reply mode (short talk + long listen)', () => {
    expect(DEMO_PHASE_TO_REPLY_MODE[WATCHING_STARS_DEMO_ID]).toBe('music');
  });

  it('detects stargaze prompts for routing tests', () => {
    expect(isWatchingStarsAsk('一齊睇星星')).toBe(true);
    expect(isWatchingStarsAsk('watch the stars with me')).toBe(true);
    expect(isWatchingStarsAsk('今日天氣點呀？')).toBe(false);
  });

  it('ChatPanel fast-path wires bed + overlay without LLM placeholder', () => {
    expect(PANEL).toContain("id === WATCHING_STARS_DEMO_ID");
    expect(PANEL).toContain('WATCHING_STARS_BED_CLIP_ID');
    expect(PANEL).toContain('watchingStarsIntroLine');
    expect(PANEL).toContain('onWatchingStarsActive?.(false)');
    expect(PANEL).not.toMatch(/watchingStars[\s\S]{0,80}setThinkingPose\(true\)/);
    expect(CHAT_PAGE).toContain('WatchingStarsBackdrop');
    expect(CHAT_PAGE).toContain('onWatchingStarsActive={setWatchingStars}');
  });

  it('yue intro is companion tone, not a lecture', () => {
    const line = watchingStarsIntroLine('yue');
    expect(line).toMatch(/一齊|陪/);
    expect(line).not.toMatch(/天文課|科普|星座名|lecture about/i);
  });
});