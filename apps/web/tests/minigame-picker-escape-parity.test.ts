import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const picker = readFileSync(join(__dirname, "../components/MiniGamePicker.tsx"), "utf8");

describe("MiniGamePicker Escape capture parity (SettingsSheet)", () => {
  it("preventDefault + stopPropagation then onClose on Escape", () => {
    expect(picker).toContain("e.key === 'Escape'");
    const idx = picker.indexOf("e.key === 'Escape'");
    expect(idx).toBeGreaterThan(-1);
    const slice = picker.slice(idx, idx + 280);
    expect(slice).toContain("e.preventDefault()");
    expect(slice).toContain("e.stopPropagation()");
    expect(slice).toContain("onClose()");
    expect(slice).toContain("return;");
  });

  it("registers keydown in the capture phase", () => {
    expect(picker).toContain("addEventListener('keydown', onKey, true)");
    expect(picker).toContain("removeEventListener('keydown', onKey, true)");
  });
});