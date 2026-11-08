import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

const web = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(web, rel), "utf8");

describe("chat / select boot aria-busy parity", () => {
  it("chat main exposes aria-busy until bootReady", () => {
    const chat = read("app/chat/page.tsx");
    expect(chat).toContain("aria-busy={!bootReady}");
    expect(chat).toContain("bootReady ? background.css");
    expect(chat).toContain("bootReady ? '' : 'opacity-0'");
  });

  it("SelectionBoard main exposes aria-busy until prefsReady", () => {
    const board = read("components/SelectionBoard.tsx");
    expect(board).toContain("aria-busy={!prefsReady}");
    expect(board).toContain("prefsReady ? background.css");
    expect(board).toContain("prefsReady ? '' : 'pointer-events-none opacity-0'");
  });
});