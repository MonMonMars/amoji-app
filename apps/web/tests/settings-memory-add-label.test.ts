import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const sheet = readFileSync(join(__dirname, "../components/SettingsSheet.tsx"), "utf8");

describe("SettingsSheet memory-add label", () => {
  it("labels the teach-her-something memory field", () => {
    expect(sheet).toContain('id="amoji-settings-memory-add"');
    expect(sheet).toContain('name="memory"');
    expect(sheet).toContain("aria-label={t(lang, 'memoryAddPlaceholder')}");
    expect(sheet).toContain("placeholder={t(lang, 'memoryAddPlaceholder')}");
    expect(sheet).toContain('type="text"');
    expect(sheet).toContain('autoComplete="off"');
  });

  it("keeps Enter-to-add on the memory field", () => {
    expect(sheet).toMatch(
      /id="amoji-settings-memory-add"[\s\S]{0,400}onKeyDown=\{\(e\) => e\.key === 'Enter' && addNew\(\)\}/
    );
  });

  it("names the Add control via memoryAdd i18n", () => {
    expect(sheet).toContain("aria-label={t(lang, 'memoryAdd')}");
    expect(sheet).toContain("{t(lang, 'memoryAdd')}");
    expect(sheet).not.toContain('aria-label="Add"');
  });
});