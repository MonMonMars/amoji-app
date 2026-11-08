import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const sheet = readFileSync(join(__dirname, "../components/SettingsSheet.tsx"), "utf8");

describe("SettingsSheet Escape + focus restore", () => {
  it("focuses Close when the sheet opens", () => {
    expect(sheet).toContain("settingsCloseRef");
    expect(sheet).toContain("settingsCloseRef.current?.focus()");
    expect(sheet).toContain("ref={settingsCloseRef}");
    expect(sheet).toContain("aria-label={t(lang, 'close')}");
  });

  it("closes on Escape (does not swallow like LegalGate)", () => {
    expect(sheet).toContain("event.key !== 'Escape'");
    expect(sheet).toContain("event.preventDefault()");
    expect(sheet).toContain("event.stopPropagation()");
    expect(sheet).toContain("addEventListener('keydown', onKey, true)");
    expect(sheet).toContain("removeEventListener('keydown', onKey, true)");
    // Dismissible: Escape path must invoke onClose (LegalGate must not).
    const escapeIdx = sheet.indexOf("event.key !== 'Escape'");
    expect(escapeIdx).toBeGreaterThan(-1);
    const slice = sheet.slice(escapeIdx, escapeIdx + 200);
    expect(slice).toContain("onClose()");
  });

  it("restores previous focus when the sheet closes", () => {
    expect(sheet).toContain("previousFocusRef");
    expect(sheet).toContain("document.activeElement as HTMLElement | null");
    expect(sheet).toContain("previousFocusRef.current?.focus?.()");
  });
});