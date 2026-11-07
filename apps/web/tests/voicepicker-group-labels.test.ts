import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/VoicePicker.tsx"), "utf8");

describe("VoicePicker locale/gender group labels", () => {
  it("locale sections are role=group labeled by language heading", () => {
    expect(src).toContain('role="group" aria-labelledby={`amoji-voice-locale-${locale}`}');
    expect(src).toContain('id={`amoji-voice-locale-${locale}`}');
  });

  it("gender sections are role=group labeled by gender heading", () => {
    expect(src).toContain('role="group" aria-labelledby={`amoji-voice-gender-${locale}-${gender}`}');
    expect(src).toContain('id={`amoji-voice-gender-${locale}-${gender}`}');
  });
});