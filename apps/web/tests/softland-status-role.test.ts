import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const web = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(web, rel), "utf8");

describe("SoftLand status role (boot chrome a11y)", () => {
  it("SoftLandChat names the busy main and announces via role=status", () => {
    const chat = read("components/SoftLandChat.tsx");
    expect(chat).toContain('aria-busy="true"');
    expect(chat).toContain("aria-label={label}");
    expect(chat).toContain('role="status"');
    expect(chat).not.toContain("aria-live");
    expect(chat).toContain("Taking you to chat...");
  });

  it("SoftLandSelect names the busy main and announces via role=status", () => {
    const select = read("components/SoftLandSelect.tsx");
    expect(select).toContain('aria-busy="true"');
    expect(select).toContain("aria-label={label}");
    expect(select).toContain('role="status"');
    expect(select).not.toContain("aria-live");
    expect(select).toContain("Taking you to character select...");
  });
});