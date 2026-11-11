import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const rails = readFileSync(join(__dirname, "../components/IdlePickRails.tsx"), "utf8");
const row = readFileSync(join(__dirname, "../components/EmotionClipRow.tsx"), "utf8");

describe("idle/pose exclusive single-select", () => {
  it("idle rails only press the picked clip", () => {
    expect(rails).toContain("aria-pressed={ready ? on : undefined}");
    expect(rails).toContain("const on = ready && picked === item.id");
    expect(rails).toContain("ring-1 ring-white/50");
  });

  it("emotion/pose row multi-Wants poke SFX (Want/Skip cycle)", () => {
    expect(row).toContain("Want → Skip");
    expect(row).toContain("setCmaReactionVerdict");
    expect(row).toContain("aria-pressed={wanted}");
    expect(row).toContain("CMA_REACTION_GALLERY");
    expect(row).not.toContain("CLIP_LIBRARY");
  });
});
