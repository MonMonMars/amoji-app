import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const page = readFileSync(join(__dirname, "../app/dialogue-review/page.tsx"), "utf8");

describe("dialogue-review composer a11y", () => {
  it("labels the custom line kind select", () => {
    expect(page).toContain('id="amoji-drv-custom-kind"');
    expect(page).toContain('name="customKind"');
    expect(page).toContain('aria-label="Custom line kind"');
  });

  it("labels the custom line text field", () => {
    expect(page).toContain('id="amoji-drv-custom-line"');
    expect(page).toContain('name="customLine"');
    expect(page).toContain('aria-label="Write your own line"');
    expect(page).toContain('type="text"');
    expect(page).toContain('autoComplete="off"');
  });
});