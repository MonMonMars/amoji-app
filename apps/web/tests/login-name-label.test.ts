import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const login = readFileSync(join(__dirname, "../app/login/page.tsx"), "utf8");

describe("login name htmlFor/id association", () => {
  it("wires the prompt label to the name field", () => {
    expect(login).toContain('htmlFor="amoji-login-name"');
    expect(login).toContain('id="amoji-login-name"');
    expect(login).toContain("t(lang, 'loginPrompt')");
  });

  it("keeps a stable name + autocomplete hint for the field", () => {
    expect(login).toContain('name="name"');
    expect(login).toContain('autoComplete="nickname"');
  });
});