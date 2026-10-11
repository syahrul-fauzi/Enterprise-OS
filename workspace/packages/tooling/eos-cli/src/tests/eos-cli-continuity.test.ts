import { test, describe } from "node:test";
import assert from "node:assert";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFileCb);
const eosCliEntry = resolve(process.cwd(), "src/index.ts");

describe("EOS CLI C2-C3 Work Continuity Verification", () => {
  test("C2: JSON output konsisten untuk work inspect", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", eosCliEntry, "work", "inspect", "W-999", "--output", "json"]);
    const jsonOutput = JSON.parse(stdout);
    assert.ok(jsonOutput.workId === "W-999");
    assert.ok(["IN_PROGRESS", "COMPLETED", "FAILED"].includes(jsonOutput.status));
  });

  test("C2: Work continue command blocks execution when capabilities are missing", async () => {
    try {
      await execFileAsync("node", ["--import", "tsx", eosCliEntry, "work", "continue", "W-999"]);
      assert.fail("Expected command to fail with missing capabilities");
    } catch (e: any) {
      assert.ok(e.stderr.includes("BLOCKED") || e.stdout.includes("BLOCKED"));
    }
  });

  test("C3: Work inspect supports human-readable output", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", eosCliEntry, "work", "inspect", "W-999"]);
    assert.ok(stdout.includes("Work W-999 Status"));
    assert.ok(stdout.includes("Evidence files"));
  });
});