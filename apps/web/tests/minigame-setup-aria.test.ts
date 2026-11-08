import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const picker = readFileSync(join(__dirname, "../components/MiniGamePicker.tsx"), "utf8");
const setup = readFileSync(join(__dirname, "../components/SetupFlow.tsx"), "utf8");

describe("MiniGamePicker / SetupFlow aria-label leftovers", () => {
  it("MiniGamePicker close control exposes aria-label={ui.close}", () => {
    expect(picker).toMatch(/onClick=\{onClose\}[\s\S]{0,80}aria-label=\{ui\.close\}/);
    expect(picker).toContain("{ui.close}");
  });

  it("SetupFlow next labels the arrow step and final startChat", () => {
    expect(setup).toContain("aria-label={step < STEPS.length - 1 ? t(lang, 'next') : t(lang, 'startChat')}");
    expect(setup).toContain("type=\"button\"");
    expect(setup).toContain("onClick={next}");
  });
});