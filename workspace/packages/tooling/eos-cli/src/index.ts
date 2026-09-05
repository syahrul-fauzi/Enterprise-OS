import { runStatusCommand } from "./commands/status.js";
import {
  runExecutionAdvanceCommand,
  runExecutionCompleteDefinitionOfDoneItemCommand,
  runExecutionNextCommand,
  runExecutionRefreshStatusCommand,
  runExecutionStatusCommand,
} from "./commands/execution.js";
import {
  runDiscoverCapabilityCommand,
  runPlanCapabilityCommand,
  runVerifyCapabilityRegistryCommand,
} from "./commands/capability-registry.js";
import {
  runGateCAcceptCommand,
  runGateCCoverageCommand,
  runGateCRefreshStatusCommand,
  runGateCRegenerateCommand,
  runGateCStatusCommand,
  runGateCGenesisEvidenceCommand,
  runGateCVerifyGenesisBaselineCommand,
  runGateCRunCaseCommand,
} from "./gate/commands/gate-c.js";
import {
  runGateFRunCommand,
  runGateFStatusCommand,
} from "./gate/commands/gate-f.js";
import { runVerifyFoundationCommand } from "./foundation/commands/verify-foundation.js";
import { runVerifyConstitutionCommand } from "./commands/verify-constitution.js";
import { runVerifyPortfolioCommand } from "./commands/verify-portfolio.js";
import { runVerifyProductBindingCommand } from "./commands/verify-product-binding.js";
import { runVerifyProductCommand } from "./commands/verify-product.js";
import { runEnterpriseQueryCommand } from "./commands/query.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const subcommand = args[1] ?? "";

async function main(): Promise<number> {
  switch (command) {
    case "inventory": {
      const { runInventoryScanCommand } = await import("./rl4/commands/inventory.js");
      return runInventoryScanCommand();
    }
    case "status":
    case "s":
      return runStatusCommand();
    case "execution":
      if (subcommand === "status") {
        return runExecutionStatusCommand();
      }
      if (subcommand === "refresh-status") {
        return runExecutionRefreshStatusCommand();
      }
      if (subcommand === "next") {
        return runExecutionNextCommand();
      }
      if (subcommand === "advance") {
        const capabilityId = args[2];
        if (!capabilityId) {
          process.stderr.write(
            "Usage: pnpm eos execution advance <capability-id>\n" +
              "Example: pnpm eos execution advance EOS-001\n",
          );
          return 1;
        }
        return runExecutionAdvanceCommand(capabilityId);
      }
      if (subcommand === "complete-dod") {
        const capabilityId = args[2];
        const item = args[3];
        if (!capabilityId || !item) {
          process.stderr.write(
            "Usage: pnpm eos execution complete-dod <capability-id> <definition-of-done-item>\n" +
              "Example: pnpm eos execution complete-dod EOS-001 feature_complete\n",
          );
          return 1;
        }
        return runExecutionCompleteDefinitionOfDoneItemCommand(capabilityId, item);
      }
      process.stderr.write(
        `Unknown execution subcommand: ${subcommand || "(missing)"}\n` +
          "Run: pnpm eos help\n",
      );
      return 1;
    case "gate-c":
      if (subcommand === "status") {
        return runGateCStatusCommand();
      }
      if (subcommand === "refresh-status") {
        return runGateCRefreshStatusCommand();
      }
        if (subcommand === "regenerate") {
          return runGateCRegenerateCommand();
        }
      if (subcommand === "accept") {
        const runId = args[2];
        const prefix = args[3];
        if (!runId) {
          process.stderr.write(
            "Usage: pnpm eos gate-c accept <run-id> [ledger-entry-prefix]\n" +
              "Example: pnpm eos gate-c accept run-004 GATE-C1-ACCEPT\n",
          );
          return 1;
        }
        return runGateCAcceptCommand({
          runId,
          entryPrefix: prefix ?? undefined,
        });
      }
      if (subcommand === "genesis-evidence") {
        return runGateCGenesisEvidenceCommand();
      }
      if (subcommand === "verify-genesis-baseline") {
        return runGateCVerifyGenesisBaselineCommand();
      }
      if (subcommand === "coverage") {
        return runGateCCoverageCommand();
      }
      if (subcommand === "run-case") {
        const runId = args[2];
        const subjectRelPath = args[3];
        if (!runId || !subjectRelPath) {
          process.stderr.write(
            "Usage: pnpm eos gate-c run-case <run-id> <subject-rel-path>\n" +
              "Example: pnpm eos gate-c run-case run-006 specification/experiments/document/propose-n4.yaml\n",
          );
          return 1;
        }
        return runGateCRunCaseCommand({
          runId,
          subjectRelPath,
        });
      }
      process.stderr.write(
        `Unknown gate-c subcommand: ${subcommand || "(missing)"}\n` +
          "Run: pnpm eos help\n",
      );
      return 1;
    case "gate-f": {
      const subcommand = args[1];
      if (subcommand === "run") {
        return runGateFRunCommand();
      }
      if (subcommand === "status") {
        return runGateFStatusCommand();
      }
      process.stderr.write(
        `Unknown gate-f subcommand: ${subcommand || "(missing)"}\n` +
          "Run: pnpm eos help\n",
      );
      return 1;
    }
    case "help":
    case "-h":
    case "--help":
      process.stdout.write(
        [
          "EOS CLI · Canonical Repository State Read Model",
          "",
          "Usage:",
          "  pnpm eos status    Tampilkan repository state (sumber: GOVERNANCE_STATE.yaml)",
          "  pnpm eos execution status    Baca read model execution graph dari enterprise/execution/EXECUTION-STATUS.yaml",
          "  pnpm eos execution refresh-status    Regenerasi execution graph dari CAPABILITY-REGISTRY.yaml",
          "  pnpm eos execution next    Ambil capability berikutnya yang READY berdasarkan dependency graph",
          "  pnpm eos execution advance <capability-id>    Majukan capability satu langkah sesuai state machine",
          "  pnpm eos execution complete-dod <capability-id> <item>    Tandai satu item Definition of Done sebagai selesai",
          "  pnpm eos gate-c status    Baca SSOT status operasional Gate C1 dari execution/gate-c-status.yaml",
          "  pnpm eos gate-c refresh-status    Regenerasi SSOT status operasional Gate C1",
            "  pnpm eos gate-c regenerate    Verifikasi regenerasi deterministik Gate C1 dari evidence historis",
          "  pnpm eos gate-c accept <run-id> [prefix]    Terima run ke proof ledger melalui jalur resmi append-only",
          "  pnpm eos gate-c coverage    Tampilkan dashboard operasional Gate C1 dari execution/coverage-matrix.yaml",
          "  pnpm eos gate-c genesis-evidence    Materialize frozen bundle + run-001 + clean replay",
          "  pnpm eos gate-c verify-genesis-baseline    Replay immutable run-001 tanpa memutasi baseline",
          "  pnpm eos gate-c run-case <run-id> <subject-rel-path>    Jalankan case C1 tanpa auto-accept",
          "  pnpm eos gate-f run    Jalankan Gate F: Production Readiness Validation",
          "  pnpm eos gate-f status    Tampilkan status operasional Gate F terakhir",
          "  pnpm eos verify-product <product-id>    Hasilkan evidence verifikasi empiris untuk produk nyata",
          "  pnpm eos verify-product-binding <product-id>    Verifikasi jalur product binding ke experience surface",
          "  pnpm eos verify-portfolio <portfolio-id>    Hasilkan evidence verifikasi tingkat portofolio",
          "  pnpm eos verify-capability-registry    Bangun registry capability dengan lifecycle dan reuse evidence",
          "  pnpm eos discover-capability <query>    Cari reuse di registry sebelum membuat capability baru",
          "  pnpm eos plan-capability <query>    Mandatory planner gate; exit non-zero jika reuse wajib dipakai",
          "  pnpm eos verify-foundation    Hasilkan evidence verifikasi lintas produk dan audit executable SSOT",
          "  pnpm eos verify-constitution    Verifikasi hukum konstitusional projection dan graph purity",
          "  pnpm eos query '<DSL>'    Jalankan query deterministik di atas enterprise control graph + Gate C snapshot",
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
    case "verify-product": {
      const productId = args[1];
      if (!productId) {
        process.stderr.write(
          "Usage: pnpm eos verify-product <product-id>\n" +
            "Example: pnpm eos verify-product lawyershub\n",
        );
        return 1;
      }
      return runVerifyProductCommand(productId);
    }
    case "verify-product-binding": {
      const productId = args[1];
      if (!productId) {
        process.stderr.write(
          "Usage: pnpm eos verify-product-binding <product-id>\n" +
            "Example: pnpm eos verify-product-binding services-id\n",
        );
        return 1;
      }
      return runVerifyProductBindingCommand(productId);
    }
    case "verify-portfolio": {
      const portfolioId = args[1];
      if (!portfolioId) {
        process.stderr.write(
          "Usage: pnpm eos verify-portfolio <portfolio-id>\n" +
            "Example: pnpm eos verify-portfolio enterprise\n",
        );
        return 1;
      }
      return runVerifyPortfolioCommand(portfolioId);
    }
    case "verify-capability-registry":
      return runVerifyCapabilityRegistryCommand();
    case "discover-capability": {
      const query = args.slice(1).join(" ").trim();
      if (!query) {
        process.stderr.write(
          "Usage: pnpm eos discover-capability <query>\n" +
            "Example: pnpm eos discover-capability workflow approval\n",
        );
        return 1;
      }
      return runDiscoverCapabilityCommand(query);
    }
    case "plan-capability": {
      const query = args.slice(1).join(" ").trim();
      if (!query) {
        process.stderr.write(
          "Usage: pnpm eos plan-capability <query>\n" +
            "Example: pnpm eos plan-capability workflow approval\n",
        );
        return 1;
      }
      return runPlanCapabilityCommand(query);
    }
    case "verify-foundation":
      return runVerifyFoundationCommand();
    case "verify-constitution":
      return runVerifyConstitutionCommand();
    case "query": {
      const query = args.slice(1).join(" ").trim();
      return runEnterpriseQueryCommand(query);
    }
    // RL4-001 Production Inventory commands (added per Reality Loop 4 mandate)
    case "rl4":
    case "inventory": {
      const { runProductionInventoryScan } = await import("./rl4/production-inventory-scanner.js");
      const rootDir = process.cwd();
      const result = await runProductionInventoryScan(rootDir);
      return 0;
    }
    default:
      process.stderr.write(`Unknown command: ${command}\nRun: pnpm eos help\n`);
      return 1;
  }
}

try {
  process.exitCode = await main();
} catch (raw) {
  const error = raw instanceof Error ? raw : new Error(String(raw));
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}