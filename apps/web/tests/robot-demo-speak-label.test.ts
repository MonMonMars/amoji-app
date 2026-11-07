import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const page = readFileSync(join(__dirname, "../app/robot-demo/page.tsx"), "utf8");

describe("robot-demo speak field a11y", () => {
  it("labels the speak input (placeholder alone is not enough for SR)", () => {
    expect(page).toContain('id="amoji-robot-demo-speak"');
    expect(page).toContain('name="speech"');
    expect(page).toContain('autoComplete="off"');
    expect(page).toContain('aria-label="Type anything - the face feels it"');
    expect(page).toContain('placeholder="Type anything - the face feels it"');
  });

  it("keeps the Speak control labeled", () => {
    expect(page).toContain('aria-label="Speak"');
  });
});