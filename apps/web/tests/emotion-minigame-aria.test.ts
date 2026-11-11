import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const emotion = readFileSync(join(__dirname, "../components/EmotionClipRow.tsx"), "utf8");
const overlay = readFileSync(join(__dirname, "../components/MiniGameOverlay.tsx"), "utf8");

describe("EmotionClipRow / MiniGameOverlay chrome aria-labels", () => {
  it("EmotionClipRow CMA chips expose aria-label + aria-pressed", () => {
    expect(emotion).toContain("aria-pressed={wanted}");
    expect(emotion).toContain("aria-label={");
    expect(emotion).toContain("clip.code");
    expect(emotion).toContain("CMA_REACTION_GALLERY");
  });

  it("MiniGameOverlay start and again expose aria-label", () => {
    expect(overlay).toMatch(/data-testid="minigame-start"[\s\S]{0,120}aria-label=\{ui\.start\}/);
    expect(overlay).toMatch(/resetRound\(prefersReduced\(\)\)[\s\S]{0,80}aria-label=\{ui\.again\}/);
  });
});