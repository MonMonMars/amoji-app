import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const row = readFileSync(join(__dirname, "../components/EmotionClipRow.tsx"), "utf8");

describe("EmotionClipRow section role=group", () => {
  it("marks the row as a role=group labeled by previewReactions heading", () => {
    expect(row).toContain('role="group"');
    expect(row).toContain('aria-labelledby="amoji-emotion-clip-title"');
    expect(row).toContain("previewReactions");
  });

  it("numbers CMA reaction chips for Mon assignment and Want/Skip", () => {
    expect(row).toContain("CMA_REACTION_GALLERY");
    expect(row).toContain("data-reaction-n={n}");
    expect(row).toContain("data-cma-code={clip.code}");
    expect(row).toContain("data-verdict={verdict}");
    expect(row).toContain("aria-pressed={wanted}");
    expect(row).toContain("setCmaReactionVerdict");
  });
});
