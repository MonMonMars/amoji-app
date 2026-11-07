import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const picker = readFileSync(join(__dirname, "../components/MiniGamePicker.tsx"), "utf8");
const overlay = readFileSync(join(__dirname, "../components/MiniGameOverlay.tsx"), "utf8");

describe("MiniGame focus restore on close", () => {
  it("MiniGamePicker focuses Close on open and restores prior focus on close", () => {
    expect(picker).toContain("pickerCloseRef");
    expect(picker).toContain("pickerCloseRef.current?.focus()");
    expect(picker).toContain("ref={pickerCloseRef}");
    expect(picker).toContain("previousFocusRef");
    expect(picker).toContain("document.activeElement as HTMLElement | null");
    expect(picker).toContain("previousFocusRef.current?.focus?.()");
    // Escape already dismisses.
    expect(picker).toContain("e.key === 'Escape'");
    expect(picker).toContain("onClose()");
  });

  it("MiniGameOverlay restores prior focus when the overlay unmounts", () => {
    expect(overlay).toContain("previousFocusRef");
    expect(overlay).toContain("document.activeElement as HTMLElement | null");
    expect(overlay).toContain("previousFocusRef.current?.focus?.()");
    // Escape already backs out (keyboard scheme).
    expect(overlay).toContain("e.key === 'Escape'");
    expect(overlay).toContain("backRef.current()");
  });
});