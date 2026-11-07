import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const overlay = readFileSync(join(__dirname, "../components/MiniGameOverlay.tsx"), "utf8");

describe("MiniGameOverlay result dialog a11y", () => {
  it("result panel is an aria-modal dialog labeled by the result line", () => {
    expect(overlay).toContain('data-testid="minigame-result"');
    expect(overlay).toContain('role="dialog"');
    expect(overlay).toContain('aria-modal="true"');
    expect(overlay).toContain('aria-labelledby="amoji-minigame-result-line"');
    expect(overlay).toContain('id="amoji-minigame-result-line"');
  });

  it("result-back control exposes aria-label={ui.back}", () => {
    const result = overlay.slice(overlay.indexOf('data-testid="minigame-result"'));
    expect(result).toMatch(/onClick=\{back\}[\s\S]{0,80}aria-label=\{ui\.back\}/);
    expect(result).toContain("{ui.back}");
  });
});