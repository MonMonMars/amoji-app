import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

const src = readFileSync(join(__dirname, '../app/face/page.tsx'), 'utf8');

describe('face page localized labels a11y', () => {
  it('localizes main + canvas labels via FACE_COPY[lang]', () => {
    expect(src).toContain('const FACE_COPY: Record<Lang, { main: string; canvas: string }>');
    expect(src).toContain("main: 'Amoji 面孔'");
    expect(src).toContain("canvas: '表情フェイス'");
    expect(src).toContain('const [lang, setLang] = useState<Lang>(\'yue\')');
    expect(src).toContain('setLang(lang);');
    expect(src).toContain('const faceCopy = FACE_COPY[lang] ?? FACE_COPY.en');
    expect(src).toContain('aria-label={faceCopy.main}');
    expect(src).toContain('aria-label={faceCopy.canvas}');
    expect(src).not.toContain('aria-label="Amoji face"');
    expect(src).not.toContain('aria-label="Emotion face"');
  });
});
