import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(__dirname, '../../..');

describe('owner picker HTML (Pixel)', () => {
  describe('r216 notes export', () => {
    it('generated HTML includes per-row notes + save/import affordances', () => {
      const unified = path.join(repoRoot, 'docs', 'owner-resources.html');
      const text = fs.readFileSync(unified, 'utf8');
      expect(text).toContain('applyImportNotes');
      expect(text).toContain('collectNotesExport');
      expect(text).toContain('Dance / sing body motion tags');
    });
  });
  it('unified owner-resources.html and legacy redirect stubs exist', () => {
    const unified = path.join(repoRoot, 'docs', 'owner-resources.html');
    expect(fs.existsSync(unified), unified).toBe(true);
    const unifiedText = fs.readFileSync(unified, 'utf8');
    expect(unifiedText).toContain('Copy JSON');
    expect(unifiedText).toContain('Fraunces');
    expect(unifiedText).toContain('panel-idle');
    expect(unifiedText).toContain('amoji.idlePick.v6');
    expect(unifiedText).toContain('IdleQuaterniusHuman');
    expect(unifiedText).toContain('Your saved picks');
    expect(unifiedText).toContain('resolvePlaySrc');
    expect(unifiedText).toContain('pickerPlayFailureMessage');
    expect(unifiedText).toContain('Stream preview did not play');
    expect(unifiedText).toContain('data-mv-code="MV039"');
    expect(unifiedText).toContain('data-mv-code="MV068"');
    expect(unifiedText).toContain('data-mv-code="MV069"');
    expect(unifiedText).toContain('data-mv-code="MV098"');
    expect(unifiedText).toContain('panel-stories');
    expect(unifiedText).toContain('panel-demo');
    expect(unifiedText).toContain('panel-news');
    expect(unifiedText).toContain('data-st-code="ST038"');
    expect(unifiedText).toContain('Stories &amp; fairy tales');
    expect(unifiedText).toContain('data-owner-code="CD001"');
    expect(unifiedText).toContain('owner-catalog-registry.ts');
    expect(unifiedText).toContain('data-mv-code="MV118"');
    expect(unifiedText).toContain('Demo-phase chips');
    expect(unifiedText).toContain('amoji.ownerPickerNotes.v1');
    expect(unifiedText).toContain('saveNotesJson');
    expect(unifiedText).toContain('owner-note');
    expect(unifiedText).toContain('Save notes JSON');
    expect(unifiedText).toContain('perf-motion-C61');
    expect(unifiedText).toContain('Poke TTS line bank');
    expect(unifiedText).toContain('CMA reaction ship-set');

    for (const name of ['owner-music-picker.html', 'owner-poke-reactions.html', 'owner-idle-poses.html']) {
      const p = path.join(repoRoot, 'docs', name);
      expect(fs.existsSync(p), p).toBe(true);
      const text = fs.readFileSync(p, 'utf8');
      expect(text).toContain('owner-resources.html');
    }
  });

  it('idle tab lists VRMA library scale', () => {
    const unified = path.join(repoRoot, 'docs', 'owner-resources.html');
    const text = fs.readFileSync(unified, 'utf8');
    const libRows = (text.match(/data-clip-id="/g) || []).length;
    expect(libRows).toBeGreaterThan(100);
    expect(text).toContain('data-rail-num');
  });
});