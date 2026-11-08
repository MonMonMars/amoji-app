import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/VoicePicker.tsx"), "utf8");

describe("VoicePicker locale group labels", () => {
  it("locale sections are role=group labeled by their language heading", () => {
    expect(src).toContain('role="group" aria-labelledby={`amoji-voice-locale-${locale}`}');
    expect(src).toContain('id={`amoji-voice-locale-${locale}`}');
  });

  it("has no gender sub-groups; delivery gender is inline on each button label", () => {
    // The old Edge grid used nested gender role=group shells. HTTP gTTS is one
    // speaker per language; delivery gender is stated in the button aria-label.
    expect(src).not.toContain('amoji-voice-gender-');
    expect(src).toContain('genderLabel');
    expect(src).toContain('deliveryGender');
  });

  it("still groups a language's buttons accessibly", () => {
    expect(src).toContain('selectTtsButtons(locale)');
    expect(src).toContain('aria-label={numLabel}');
    expect(src).toContain('aria-pressed={selected}');
  });
});
