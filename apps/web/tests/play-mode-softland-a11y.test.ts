import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('play/mode SoftLand labelledby a11y', () => {
  it('SoftLandChat links busy main to status copy', () => {
    const chat = read('components/SoftLandChat.tsx');
    expect(chat).toContain('aria-labelledby="amoji-softland-status"');
    expect(chat).toContain('id="amoji-softland-status"');
    expect(chat).toContain('aria-label={label}');
    expect(chat).toContain('role="status"');
    expect(chat).toContain('aria-busy="true"');
  });

  it('SoftLandSelect + play/mode pages keep named soft-land', () => {
    const select = read('components/SoftLandSelect.tsx');
    expect(select).toContain('aria-labelledby="amoji-softland-status"');
    expect(select).toContain('id="amoji-softland-status"');
    expect(select).toContain('aria-label={label}');
    // The status line is localized now, so the pages pass a string key instead
    // of the literal English sentence (which yue/zh/ja users never saw translated).
    expect(read('app/play/page.tsx')).toContain('SoftLandChat');
    expect(read('app/mode/page.tsx')).toContain('SoftLandSelect');
    expect(read('app/story/page.tsx')).toContain('labelKey="softLandStory"');
    expect(read('components/SoftLandSelect.tsx')).toContain("labelKey = 'softLandSelect'");
    expect(read('components/SoftLandChat.tsx')).toContain("labelKey = 'softLandChat'");
  });
});
