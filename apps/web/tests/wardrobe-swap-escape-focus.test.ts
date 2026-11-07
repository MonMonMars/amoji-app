import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../components/WardrobeSwap.tsx"), "utf8");

describe("WardrobeSwap Escape + focus restore", () => {
  it("focuses Close when the wardrobe opens", () => {
    expect(src).toContain("wardrobeCloseRef");
    expect(src).toContain("wardrobeCloseRef.current?.focus()");
    expect(src).toContain("ref={wardrobeCloseRef}");
    expect(src).toContain("aria-label={copy.collapse}");
  });

  it("closes on Escape (SettingsSheet parity, not LegalGate swallow)", () => {
    expect(src).toContain("event.key !== 'Escape'");
    expect(src).toContain("event.preventDefault()");
    expect(src).toContain("event.stopPropagation()");
    expect(src).toContain("addEventListener('keydown', onKey, true)");
    expect(src).toContain("removeEventListener('keydown', onKey, true)");
    const escapeIdx = src.indexOf("event.key !== 'Escape'");
    expect(escapeIdx).toBeGreaterThan(-1);
    expect(src.slice(escapeIdx, escapeIdx + 200)).toContain("setOpen(false)");
  });

  it("restores focus to prior element or expand trigger on close", () => {
    expect(src).toContain("previousFocusRef");
    expect(src).toContain("document.activeElement as HTMLElement | null");
    expect(src).toContain("wardrobeExpandRef");
    expect(src).toContain("ref={wardrobeExpandRef}");
    expect(src).toContain("requestAnimationFrame");
    expect(src).toContain("prior?.isConnected");
    expect(src).toContain("wardrobeExpandRef.current?.focus()");
  });
});