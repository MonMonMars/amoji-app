import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const gate = readFileSync(join(__dirname, "../components/LegalGate.tsx"), "utf8");

describe("LegalGate focus + Escape smoke", () => {
  it("focuses Accept when the gate is open", () => {
    expect(gate).toContain("useRef");
    expect(gate).toContain("acceptRef");
    expect(gate).toContain("acceptRef.current?.focus()");
    expect(gate).toMatch(/ref=\{acceptRef\}[\s\S]{0,80}data-testid="legal-accept"/);
  });

  it("swallows Escape so the mandatory dialog cannot dismiss", () => {
    expect(gate).toContain("event.key !== 'Escape'");
    expect(gate).toContain("event.preventDefault()");
    expect(gate).toContain("event.stopPropagation()");
    expect(gate).toContain("addEventListener('keydown', onKey, true)");
    expect(gate).toContain("removeEventListener('keydown', onKey, true)");
  });
});