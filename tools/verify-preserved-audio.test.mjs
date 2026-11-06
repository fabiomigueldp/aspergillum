import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyPreservedAudio } from "./verify-preserved-audio.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temporary = [];
afterEach(() => { for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true }); });
function copyFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aspergillum-preserved-audio-"));
  temporary.push(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "tools/audio-baseline.json"), "utf8"));
  for (const relative of [...Object.keys(manifest.files), "tools/audio-baseline.json"]) {
    fs.mkdirSync(path.dirname(path.join(directory, relative)), { recursive: true });
    fs.copyFileSync(path.join(root, relative), path.join(directory, relative));
  }
  return { directory, manifest };
}
describe("preserved audio verification", () => {
  it("accepts the exact approved source, master, output and authoring-tool bytes without writes", () => {
    const { directory } = copyFixture();
    expect(verifyPreservedAudio(directory)).toMatchObject({ outputs: 48, baseline: "Aspergillum 1.2.5 imported reference" });
  });
  it.each([".ogg", ".wav", ".mp3"])("rejects changed %s bytes even when all other media are intact", (extension) => {
    const { directory, manifest } = copyFixture();
    const relative = Object.keys(manifest.files).find((name) => name.endsWith(extension));
    fs.appendFileSync(path.join(directory, relative), Buffer.from([0]));
    expect(() => verifyPreservedAudio(directory)).toThrow(`Approved audio bytes changed: ${relative}`);
  });
  it("rejects an incomplete manifest rather than skipping an unpinned output", () => {
    const { directory, manifest } = copyFixture();
    delete manifest.files[Object.keys(manifest.files).find((name) => name.endsWith(".ogg"))];
    fs.writeFileSync(path.join(directory, "tools/audio-baseline.json"), JSON.stringify(manifest));
    expect(() => verifyPreservedAudio(directory)).toThrow("Incomplete preserved-audio hash inventory");
  });
});
