import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const chat = readFileSync(join(__dirname, "../app/chat/page.tsx"), "utf8");
const board = readFileSync(join(__dirname, "../components/SelectionBoard.tsx"), "utf8");

describe("chat MuteButton bootReady gate (select prefsReady parity)", () => {
  it("chat mounts MuteButton only after bootReady", () => {
    expect(chat).toContain("{bootReady && <MuteButton lang={prefs.lang} compact />}");
    expect(chat).not.toMatch(/^\s*<MuteButton lang=\{prefs\.lang\} compact \/>/m);
  });

  it("select still gates MuteButton on prefsReady", () => {
    expect(board).toMatch(/prefsReady && \([\s\S]*?<MuteButton lang=\{lang\}/);
  });
});