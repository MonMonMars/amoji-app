import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const panel = readFileSync(join(__dirname, "../components/DevPanel.tsx"), "utf8");

describe("DevPanel slider a11y", () => {
  it("associates each slider label with a stable id", () => {
    expect(panel).toContain("htmlFor={`amoji-dev-${s.key}`}");
    expect(panel).toContain("id={`amoji-dev-${s.key}`}");
    expect(panel).toContain("name={String(s.key)}");
  });

  it("keeps the known tuning keys in the slider list", () => {
    for (const key of [
      "blendTimeMs",
      "idleAfterMs",
      "saccadeMinMs",
      "saccadeMaxMs",
      "intensity",
    ]) {
      expect(panel).toContain(`key: '${key}'`);
    }
  });
});