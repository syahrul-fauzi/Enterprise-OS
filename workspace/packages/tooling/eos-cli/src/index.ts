import { runStatusCommand } from "./commands/status.js";
import { runGateCGenesisEvidenceCommand, runGateCRunCaseCommand } from "./commands/gate-c.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const subcommand = args[1] ?? "";

async function main(): Promise<number> {
  switch (command) {
    case "status":
    case "s":
      return runStatusCommand();
    case "gate-c":
      if (subcommand === "genesis-evidence") {
        return runGateCGenesisEvidenceCommand();
      }
      if (subcommand === "run-case") {
        const runId = args[2];
        const subjectRelPath = args[3];
        const prefix = args[4];
        if (!runId || !subjectRelPath) {
          process.stderr.write(
            "Usage: pnpm eos gate-c run-case <run-id> <subject-rel-path> [ledger-entry-prefix]\n" +
              "Example: pnpm eos gate-c run-case run-002 specification/experiments/document/propose-n1.yaml GATE-C1-N\n",
          );
          return 1;
        }
        return runGateCRunCaseCommand({
          runId,
          subjectRelPath,
          proofLedgerEntryPrefix: prefix ?? undefined,
        });
      }
      process.stderr.write(
        `Unknown gate-c subcommand: ${subcommand || "(missing)"}\n` +
          "Run: pnpm eos help\n",
      );
      return 1;
    case "help":
    case "-h":
    case "--help":
      process.stdout.write(
        [
          "EOS CLI · Canonical Repository State Read Model",
          "",
          "Usage:",
          "  pnpm eos status    Tampilkan repository state (sumber: GOVERNANCE_STATE.yaml)",
          "  pnpm eos gate-c genesis-evidence    Materialize frozen bundle + run-001 + clean replay",
          "  pnpm eos gate-c run-case <run-id> <subject-rel-path> [prefix]    Jalankan case C1 melalui apparatus yang sama",
          "  pnpm eos help      Tampilkan bantuan ini",
          "",
          "Prinsip:",
          "  CLI TIDAK menghitung status sendiri.",
          "  CLI HANYA membaca repository_state dari GOVERNANCE_STATE.yaml.",
          "  Sama persis dengan ACL / CI / Dashboard. Single Source of Truth.",
          "",
        ].join("\n")
      );
      return 0;
    default:
      process.stderr.write(`Unknown command: ${command}\nRun: pnpm eos help\n`);
      return 1;
  }
}

process.exitCode = await main();
