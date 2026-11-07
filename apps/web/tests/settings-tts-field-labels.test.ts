import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const sheet = readFileSync(join(__dirname, "../components/SettingsSheet.tsx"), "utf8");

describe("SettingsSheet TTS field associations", () => {
  it("labels the OpenAI API key field", () => {
    expect(sheet).toContain('id="amoji-settings-openai-key"');
    expect(sheet).toContain('name="openai-api-key"');
    expect(sheet).toContain("aria-label={t(lang, 'openaiKeyPlaceholder')}");
    expect(sheet).toContain('type="password"');
  });

  it("labels the OpenAI endpoint field", () => {
    expect(sheet).toContain('id="amoji-settings-openai-endpoint"');
    expect(sheet).toContain('name="openai-endpoint"');
    expect(sheet).toContain("aria-label={t(lang, 'openaiEndpointPlaceholder')}");
  });

  it("associates the neural voice proxy label with its input", () => {
    expect(sheet).toContain('htmlFor="amoji-settings-tts-proxy"');
    expect(sheet).toContain('id="amoji-settings-tts-proxy"');
    expect(sheet).toContain('name="tts-proxy"');
    expect(sheet).toContain("aria-label={t(lang, 'ttsProxy')}");
    expect(sheet).toMatch(
      /<label htmlFor="amoji-settings-tts-proxy"[\s\S]{0,80}t\(lang, 'ttsProxy'\)/
    );
  });
});