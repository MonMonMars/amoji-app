import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arcPose, portraitCardBox, portraitTop } from '../components/ArcFan';
import { BIGHEAD_IDS, bigheadPath } from '../lib/bighead';
import { CHARACTERS, STRINGS } from '../lib/prefs';

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
    expect(fan).not.toContain('h-[8.4rem]');
    expect(fan).not.toContain('sm:h-[11rem]');
    expect(board).toContain('flex-1');
    const roomy = portraitCardBox(480);
    const oldDesktop = { width: 123, height: 176 };
    expect(roomy.height).toBeGreaterThan(oldDesktop.height * 1.6);
    expect(roomy.width).toBeGreaterThan(oldDesktop.width * 1.6);
    expect(roomy.step).toBeGreaterThan(roomy.width * 0.45);
    expect(roomy.step).toBeLessThan(roomy.width);
    const phone = portraitCardBox(280);
    expect(phone.height).toBeGreaterThan(134);
    expect(phone.height).toBeLessThan(280);
    expect(portraitCardBox(900).height).toBeLessThanOrEqual(520);
    const fitted = portraitCardBox(456);
    expect(portraitTop(456, fitted.height)).toBeGreaterThanOrEqual(Math.ceil(fitted.height * 0.05));
    expect(portraitTop(456, fitted.height) + fitted.height * 1.1).toBeLessThanOrEqual(456 + 1);
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
