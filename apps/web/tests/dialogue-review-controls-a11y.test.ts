import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const page = readFileSync(join(__dirname, "../app/dialogue-review/page.tsx"), "utf8");

describe("dialogue-review controls a11y", () => {
  it("labels the search field", () => {
    expect(page).toContain('id="amoji-drv-search"');
    expect(page).toContain('name="search"');
    expect(page).toContain('type="search"');
    expect(page).toContain('aria-label={searchLinesLabel}');
    expect(page).toContain('placeholder="Search lines..."');
  });

  it("labels the character filter select", () => {
    expect(page).toContain('id="amoji-drv-char-filter"');
    expect(page).toContain('name="character"');
    expect(page).toContain('aria-label="Filter by character"');
  });
});