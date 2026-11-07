import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/VoicePicker.tsx"), "utf8");

describe("VoicePicker locale group labels", () => {
  it("locale sections are role=group labeled by their language heading", () => {
    expect(src).toContain('role="group" aria-labelledby={`amoji-voice-locale-${locale}`}');
    expect(src).toContain('id={`amoji-voice-locale-${locale}`}');
  });

  it("has no gender sub-groups, because the live voices are not gendered", () => {
    // The gender sections went away with the Edge grid: a male/female split
    // over one Google Translate voice per language labelled a difference the
    // audio did not have.
    expect(src).not.toContain('amoji-voice-gender-');
    expect(src).not.toContain('genderLabel');
  });

  it("still groups a language's buttons accessibly", () => {
    expect(src).toContain('selectTtsButtons(locale)');
    expect(src).toContain('aria-label={numLabel}');
    expect(src).toContain('aria-pressed={selected}');
  });
});
