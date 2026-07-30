import { runStatusCommand } from "./commands/status.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

async function main(): Promise<number> {
  switch (command) {
    case "status":
    case "s":
      return runStatusCommand();
    case "help":
    case "-h":
    case "--help":
      process.stdout.write(
        [
          "EOS CLI · Canonical Repository State Read Model",
          "",
          "Usage:",
          "  pnpm eos status    Tampilkan repository state (sumber: GOVERNANCE_STATE.yaml)",
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
