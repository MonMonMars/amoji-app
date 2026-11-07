import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/WardrobeSwap.tsx"), "utf8");

describe("WardrobeSwap overlay dialog a11y", () => {
  it("marks the open overlay as a labeled modal dialog", () => {
    expect(src).toContain('data-testid="wardrobe-swap"');
    expect(src).toContain('role="dialog"');
    expect(src).toContain('aria-modal="true"');
    expect(src).toContain('aria-labelledby="amoji-wardrobe-title"');
    expect(src).toContain('id="amoji-wardrobe-title"');
    expect(src).toContain("{copy.title}");
  });

  it("keeps expand/collapse controls labeled", () => {
    expect(src).toContain("aria-label={copy.expand}");
    expect(src).toContain("aria-label={copy.collapse}");
    expect(src).toContain("aria-expanded={false}");
  });
});