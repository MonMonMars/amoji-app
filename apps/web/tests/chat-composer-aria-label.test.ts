import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const chat = readFileSync(join(__dirname, "../components/ChatPanel.tsx"), "utf8");

describe("ChatPanel composer field a11y", () => {
  it("labels the message input (placeholder is not enough for SR)", () => {
    expect(chat).toContain('id="amoji-chat-composer"');
    expect(chat).toContain('name="message"');
    expect(chat).toContain('autoComplete="off"');
    // Chat uses sayHi; Story Mode switches to storyContinue.
    expect(chat).toContain("t(lang, 'sayHi', { name: characterName })");
    expect(chat).toContain("t(lang, 'storyContinue')");
    expect(chat).toMatch(/aria-label=\{[\s\S]*loadStorySession\(\)[\s\S]*storyContinue[\s\S]*sayHi/);
    expect(chat).toMatch(/placeholder=\{[\s\S]*loadStorySession\(\)[\s\S]*storyContinue[\s\S]*sayHi/);
  });

  it("keeps mic + send controls labeled", () => {
    expect(chat).toMatch(/aria-label=\{listening[\s\S]*micOff/);
    expect(chat).toContain("aria-label={t(lang, 'sendBtn')}");
  });
});
