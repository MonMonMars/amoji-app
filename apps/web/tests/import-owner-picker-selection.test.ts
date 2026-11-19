import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildShipSelectionFromNotesExport } from '../../../scripts/import-owner-picker-selection.mjs';

const samplePath = path.join(__dirname, '../../../docs/samples/owner-picker-notes-export-sample.json');

describe('import-owner-picker-selection.mjs', () => {
  it('maps v2 notes export to owner-picker-selection-v1 ship shape', () => {
    const data = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
    const ship = buildShipSelectionFromNotesExport(data);
    expect(ship.version).toBe('owner-picker-selection-v1');
    expect(ship.sourceExportVersion).toBe('owner-picker-notes-v2');
    expect(ship.use).toContain('MV070');
    expect(ship.use).toContain('ID-R05');
    expect(ship.use).toContain('sing-f-silent-night');
    expect(ship.delete).toContain('MV099');
    expect(ship.listenMvCodes).toEqual(['MV070']);
    expect(ship.idleRailNums).toEqual([5]);
    expect(ship.idleClipIds).toContain('IdleQuaterniusHuman');
    expect(ship.songClipIds).toContain('sing-f-silent-night');
  });
});