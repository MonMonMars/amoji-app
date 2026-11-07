import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const settings = readFileSync(join(__dirname, "../components/SettingsSheet.tsx"), "utf8");
const status = readFileSync(join(__dirname, "../components/StatusPlate.tsx"), "utf8");
const robot = readFileSync(join(__dirname, "../app/robot-demo/page.tsx"), "utf8");

describe("icon-only controls aria-label", () => {
  it("SettingsSheet close and clearHistory icon buttons are labeled", () => {
    expect(settings).toMatch(/onClick=\{onClose\}[^>]*aria-label="Close"/);
    expect(settings).toContain("aria-label={t(lang, 'clearHistory')}");
    expect(settings).toMatch(/onClick=\{clearHistory\}[\s\S]{0,80}aria-label=\{t\(lang, 'clearHistory'\)\}/);
  });

  it("StatusPlate open-select exposes aria-label (not title-only)", () => {
    expect(status).toContain("aria-label={t(lang, 'openSelect')}");
    expect(status).toContain("title={t(lang, 'openSelect')}");
  });

  it("robot-demo Speak glyph button has aria-label", () => {
    expect(robot).toMatch(/onClick=\{speak\}[^>]*aria-label="Speak"/);
  });
});