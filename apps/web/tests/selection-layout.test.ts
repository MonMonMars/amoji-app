import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTRAIT_CENTER_SCALE, arcPose, compactCardBox, portraitCardBox, portraitTop } from '../components/ArcFan';
import { BIGHEAD_IDS, bigheadPath } from '../lib/bighead';
import { CHARACTERS, LANGS, STRINGS } from '../lib/prefs';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(here, rel), 'utf8');

describe('selection layout', () => {
  const board = read('../components/SelectionBoard.tsx');
  const row = read('../components/HScrollRow.tsx');
  const css = read('../app/globals.css');
  const chat = read('../app/chat/page.tsx');

  it('centers the selection controls and the scroll track', () => {
    expect(board).toContain('mx-auto');
    expect(board).toContain('max-w-7xl');
    expect(board).toContain('items-center');
    expect(board).toContain('text-center');
    expect(board).toContain('justify-center');
    expect(row).toContain('justify-center');
    expect(row).toContain('min-w-full');
    expect(row).toContain('w-max');
    expect(row).toContain('flex-nowrap');
    expect(row).toContain('overflow-x-auto');
  });

  it('puts a shaded START label at the bottom of the board', () => {
    expect(STRINGS.confirmCta).toEqual({ en: 'START', yue: 'START', zh: 'START', ja: 'START' });
    expect(board).toContain("t(lang, 'confirmCta')");
    expect(board).not.toContain('{ name: character.name }');
    expect(board).toContain('fx-start');
    expect(board).toContain("t(lang, 'changeCta')");
    const start = board.indexOf('fx-start');
    const characters = board.indexOf('chooseCharacter');
    expect(start).toBeGreaterThan(characters);
  });

  it('keeps select on 2D cards and leaves the model load to chat', () => {
    expect(board).not.toContain('CompanionCanvas');
    expect(board).not.toContain('ModelPreview');
    expect(board).not.toContain('requestModelThumb');
    expect(board).toContain('ModelThumb');
    expect(board).toContain('SceneBackdrop');
    expect(board).toContain("router.push('/chat')");
    const save = board.indexOf('setPrefs({ ...prefs, ...draft })');
    const push = board.indexOf("router.push('/chat')");
    expect(save).toBeGreaterThan(-1);
    expect(save).toBeLessThan(push);
    expect(chat).toContain('CompanionCanvas');
    expect(read('../app/select/page.tsx')).not.toContain('CompanionCanvas');
    expect(read('../app/change/page.tsx')).not.toContain('CompanionCanvas');
  });

  it('grows the bighead fan into the stage the model used to fill', () => {
    const fan = read('../components/ArcFan.tsx');
    expect(fan).toContain('portraitCardBox');
    expect(fan).toContain('PORTRAIT_CENTER_SCALE');
    expect(fan).not.toContain('h-[8.4rem]');
    expect(fan).not.toContain('sm:h-[11rem]');
    expect(board).toContain('flex-1');
    expect(board).toContain('text-base font-semibold');
    expect(board).toContain('sm:text-lg');
    expect(board).toContain('break-words');
    expect(board).not.toContain('truncate text-sm font-semibold');
    const roomy = portraitCardBox(480);
    const oldDesktop = { width: 123, height: 176 };
    const previousFan = { width: 289, height: 413 };
    expect(roomy.height).toBeGreaterThan(oldDesktop.height * 1.6);
    expect(roomy.width).toBeGreaterThan(oldDesktop.width * 1.6);
    expect(roomy.height).toBeGreaterThan(previousFan.height);
    expect(roomy.width).toBeGreaterThan(previousFan.width);
    expect(roomy.step).toBeGreaterThan(roomy.width * 0.45);
    expect(roomy.step).toBeLessThan(roomy.width);
    const phone = portraitCardBox(280);
    expect(phone.height).toBeGreaterThan(241);
    expect(phone.height).toBeLessThan(280);
    expect(portraitCardBox(900).height).toBeGreaterThan(520);
    expect(portraitCardBox(900).height).toBeLessThanOrEqual(640);
    const fitted = portraitCardBox(456);
    const overflow = (PORTRAIT_CENTER_SCALE - 1) / 2;
    expect(portraitTop(456, fitted.height)).toBeGreaterThanOrEqual(Math.ceil(fitted.height * overflow));
    expect(portraitTop(456, fitted.height) + fitted.height * (1 + overflow)).toBeLessThanOrEqual(456 + 1);
  });

  it('fans character and scene cards around a larger center portrait', () => {
    expect(board).toContain('ArcFan');
    expect(board).toContain('image={c.image}');
    expect(board).toContain('bighead={bigheadPath(c.id)}');
    expect(board).toContain('crop="face"');
    expect(board).not.toContain('requestModelThumb');
    expect(board).not.toContain('url={c.model}');
    const center = arcPose(0, 76);
    const left = arcPose(-2, 76);
    const right = arcPose(2, 76);
    expect(center.scale).toBeGreaterThan(left.scale);
    expect(center.z).toBeGreaterThan(left.z);
    expect(center.x).toBe(0);
    expect(left.rot).toBeLessThan(0);
    expect(right.rot).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(0);
    expect(Math.abs(left.y)).toBeGreaterThan(0);
  });

  it('uses packed bighead stills and falls back when an id has none', () => {
    const dir = path.resolve(here, '../public/thumbs/bighead');
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('_bighead.png'));
    expect(files).toHaveLength(BIGHEAD_IDS.length);
    for (const id of BIGHEAD_IDS) {
      expect(bigheadPath(id)).toBe(`/thumbs/bighead/${id}_bighead.png`);
      expect(files).toContain(`${id}_bighead.png`);
      expect(CHARACTERS.some((c) => c.id === id)).toBe(true);
    }
    const missing = ['a112-mahochan-jk', 'a122-shiratori-hikari-shifuku'];
    for (const id of missing) {
      expect(bigheadPath(id)).toBeUndefined();
      expect(CHARACTERS.some((c) => c.id === id)).toBe(true);
    }
    expect(read('../components/ModelThumb.tsx')).toContain('onError');
  });

  it('keeps language cards in the character style, smaller than scenes', () => {
    expect(LANGS.map((l) => l.id)).toEqual(['yue', 'zh', 'ja', 'en']);
    for (const lang of LANGS) {
      expect(lang.glyph.length).toBeGreaterThan(0);
      expect(lang.mark.length).toBeGreaterThan(0);
      expect(lang.accent.startsWith('#')).toBe(true);
    }
    expect(board).not.toContain('HScrollRow');
    expect(board).not.toContain('rounded-full px-3');
    expect(board).toContain('ariaLabel="languages"');
    expect(board).toContain('size="compact"');
    expect(board.split('size="portrait"').length - 1).toBe(1);
    expect(board).toContain('size="scene"');
    expect(board.match(/relative mx-auto[^"]*flex-1/g)).toHaveLength(1);
    expect(board).toContain('<LangCardFace');
    expect(board).toContain('compact');
    expect(board).toContain('pick({ lang: id })');
    const characters = board.indexOf('ariaLabel="characters"');
    const scenes = board.indexOf('ariaLabel="scenes"');
    const languages = board.indexOf('ariaLabel="languages"');
    const voices = board.indexOf('<TtsVoiceRow');
    const start = board.indexOf('fx-start');
    expect(characters).toBeGreaterThan(-1);
    expect(characters).toBeLessThan(scenes);
    expect(scenes).toBeLessThan(languages);
    expect(languages).toBeLessThan(voices);
    expect(voices).toBeLessThan(start);
    const fan = read('../components/ArcFan.tsx');
    expect(fan).toContain('h-[6.1rem] w-[8.2rem]');
    expect(fan).toContain('sm:h-[7.2rem] sm:w-[10.4rem]');
    expect(fan).toContain('h-[8.6rem]');
    const langCard = compactCardBox();
    const halfCharacter = portraitCardBox(320).height / 2;
    expect(langCard.height).toBeLessThanOrEqual(halfCharacter);
    expect(langCard.height).toBeLessThan(6.1 * 16);
    expect(langCard.width / langCard.height).toBeCloseTo(0.8, 1);
    expect(portraitCardBox(480).height).toBeGreaterThan(langCard.height * 2);
    const selectors = read('../components/selectors.tsx');
    expect(selectors).toContain('export function LangCardFace');
    expect(selectors).toContain('ui-card');
    expect(selectors).toContain('fx-press');
    expect(selectors).toContain('rounded-2xl');
    expect(selectors).toContain('aspect-[6/8.4]');
    expect(selectors).not.toContain('rounded-full px-4');
    const row = read('../components/TtsVoiceRow.tsx');
    expect(row).toContain('selectTtsButtons');
    expect(row).toContain('saveVoicePick');
    expect(row).toContain('playSelectGreeting');
    expect(row).toContain('text-[10px]');
    expect(row).toContain('rounded-full');
    expect(row).not.toContain('ArcFan');
    expect(board).toContain('playSelectGreeting');
    expect(board).not.toContain('stopSpeaking');
    expect(board).not.toContain('CompanionCanvas');
  });

  it('gives selection controls a press flash and a short route transition', () => {
    expect(board).toContain('fx-press');
    expect(board).toContain('fx-select-in');
    expect(board).toContain('fx-select-out');
    expect(css).toContain('@keyframes fx-ripple');
    expect(css).toContain('@keyframes fx-select-in');
    expect(css).toContain('@keyframes fx-select-out');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('.fx-select .fx-press:active');
    expect(css).toContain('scale(0.98)');
    expect(chat).toContain('fx-select-in');
    expect(chat).toContain('fx-select-out');
  });
});
