import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const row = readFileSync(join(__dirname, "../components/TtsVoiceRow.tsx"), "utf8");

describe("TtsVoiceRow group parity with VoicePicker", () => {
  it("marks the row as a role=group labeled by chooseVoice heading", () => {
    expect(row).toContain('role="group"');
    expect(row).toContain('aria-labelledby="amoji-tts-voice-title"');
    expect(row).toContain('id="amoji-tts-voice-title"');
    expect(row).toContain("t(lang, 'chooseVoice')");
  });

  it("labels the show-all toggle beside aria-pressed", () => {
    expect(row).toContain("aria-pressed={showAll}");
    expect(row).toContain("aria-label={showAll ? t(lang, 'voiceThisLanguage') : t(lang, 'voiceShowAll')}");
  });
});