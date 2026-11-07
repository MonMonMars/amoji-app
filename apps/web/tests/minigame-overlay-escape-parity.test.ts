import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const overlay = readFileSync(join(__dirname, "../components/MiniGameOverlay.tsx"), "utf8");

describe("MiniGameOverlay Escape capture parity (SettingsSheet)", () => {
  it("preventDefault + stopPropagation then back on Escape", () => {
    expect(overlay).toContain("e.key === 'Escape'");
    const idx = overlay.indexOf("e.key === 'Escape'");
    expect(idx).toBeGreaterThan(-1);
    const slice = overlay.slice(idx, idx + 280);
    expect(slice).toContain("e.preventDefault()");
    expect(slice).toContain("e.stopPropagation()");
    expect(slice).toContain("backRef.current()");
    expect(slice).toContain("return;");
  });

  it("registers keydown in the capture phase", () => {
    expect(overlay).toContain("addEventListener('keydown', onKey, true)");
    expect(overlay).toContain("removeEventListener('keydown', onKey, true)");
  });
});