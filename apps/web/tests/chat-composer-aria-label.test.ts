import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const chat = readFileSync(join(__dirname, "../components/ChatPanel.tsx"), "utf8");

describe("ChatPanel composer field a11y", () => {
  it("labels the message input (placeholder is not enough for SR)", () => {
    expect(chat).toContain('id="amoji-chat-composer"');
    expect(chat).toContain('name="message"');
    expect(chat).toContain('autoComplete="off"');
    expect(chat).toContain("aria-label={t(lang, 'sayHi', { name: characterName })}");
    expect(chat).toContain("placeholder={t(lang, 'sayHi', { name: characterName })}");
  });

  it("keeps mic + send controls labeled", () => {
    expect(chat).toContain("aria-label={t(lang, 'micTitle')}");
    expect(chat).toContain('aria-label="send"');
  });
});