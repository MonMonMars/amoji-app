import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const row = readFileSync(join(__dirname, "../components/EmotionClipRow.tsx"), "utf8");

describe("EmotionClipRow section role=group", () => {
  it("marks the row as a role=group labeled by previewReactions heading", () => {
    expect(row).toContain('role="group"');
    expect(row).toContain('aria-labelledby="amoji-emotion-clip-title"');
    expect(row).toContain('id="amoji-emotion-clip-title"');
    expect(row).toContain("t(lang, 'previewReactions')");
  });

  it("keeps universal toggle labeled + pressed", () => {
    expect(row).toContain("aria-pressed={universal}");
    expect(row).toContain("aria-label={t(lang, 'previewUniversal')}");
  });
});