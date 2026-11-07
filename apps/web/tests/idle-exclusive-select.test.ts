import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const rails = readFileSync(join(__dirname, "../components/IdlePickRails.tsx"), "utf8");
const row = readFileSync(join(__dirname, "../components/EmotionClipRow.tsx"), "utf8");

describe("idle/pose exclusive single-select", () => {
  it("idle rails only press the picked clip", () => {
    expect(rails).toContain("aria-pressed={ready ? on : undefined}");
    expect(rails).toContain("const on = ready && picked === item.id");
    expect(rails).toContain("ring-1 ring-white/50");
  });

  it("emotion/pose row keeps one playing selection", () => {
    expect(row).toContain("Exclusive single-select");
    expect(row).toContain("const selected = playing === file");
  });
});
