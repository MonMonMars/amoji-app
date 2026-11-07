import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const sheet = readFileSync(join(__dirname, "../components/SettingsSheet.tsx"), "utf8");

describe("SettingsSheet yourName htmlFor/id", () => {
  it("associates the yourName label with the profile name field", () => {
    expect(sheet).toContain('htmlFor="amoji-settings-your-name"');
    expect(sheet).toContain('id="amoji-settings-your-name"');
    expect(sheet).toContain("t(lang, 'yourName')");
    expect(sheet).toMatch(/<label htmlFor="amoji-settings-your-name"[\s\S]{0,80}t\(lang, 'yourName'\)/);
  });

  it("keeps name + nickname autocomplete on the field", () => {
    expect(sheet).toContain('name="name"');
    expect(sheet).toContain('autoComplete="nickname"');
  });
});