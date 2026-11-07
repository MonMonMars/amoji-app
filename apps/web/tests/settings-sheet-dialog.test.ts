import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/SettingsSheet.tsx"), "utf8");

describe("SettingsSheet dialog a11y", () => {
  it("marks the sheet panel as a labeled modal dialog", () => {
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain('aria-labelledby="amoji-settings-title"');
    expect(src).toContain('id="amoji-settings-title"');
    expect(src).toContain("t(lang, 'settings')");
  });
});