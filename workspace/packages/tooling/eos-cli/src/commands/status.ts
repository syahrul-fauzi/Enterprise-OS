import { getRepositoryState, loadGovernanceState } from "../state.js";

const GATE_LABELS: Record<string, string> = {
  A: "Governance",
  B: "Canonical Foundation",
  C: "First Verified Transformation (T001)",
  D: "Execution Platform",
  E: "Proof of Execution (PoE)",
};

const SEP = "=".repeat(72);
const SUB = "-".repeat(72);

function colorizeStatus(status: string): string {
  switch (status) {
    case "VERIFIED":
    case "FROZEN":
      return `\x1b[32m${status}\x1b[0m`;
    case "REVIEWED":
      return `\x1b[36m${status}\x1b[0m`;
    case "DRAFT":
      return `\x1b[33m${status}\x1b[0m`;
    case "DEPRECATED":
      return `\x1b[35m${status}\x1b[0m`;
    default:
      return status;
  }
}

function colorizeReadiness(ready: boolean): string {
  return ready ? `\x1b[32mREADY\x1b[0m` : `\x1b[31mNOT_READY\x1b[0m`;
}

function colorizeProofEmitStatus(stat: string): string {
  switch (stat) {
    case "NOT_YET_EMITTED":
      return `\x1b[33m${stat}\x1b[0m`;
    default:
      return stat;
  }
}

export async function runStatusCommand(): Promise<number> {
  const full = loadGovernanceState();
  const state = getRepositoryState();
  const outputs = state.outputs.repository_proof;
  const baseline = full.baseline;

  console.log(SEP);
  console.log("EOS  ·  Repository Status  ·  SSOT Stack v1.0 (FROZEN)");
  console.log(SEP);
  console.log(`Source of truth  : governance/GOVERNANCE_STATE.yaml`);
  console.log(`State model      : repository_state (Layer 3 root key, canonical)`);
  console.log(`Baseline         : ${baseline.id} v${baseline.version} (${colorizeStatus(baseline.status)})`);
  console.log(`Arch Freeze      : ACTIVE  ·  thaw only after: T001 deterministic PASS (Golden REQ-0001 + TRF-PROOF-T001 PASS)`);
  console.log("");

  console.log("── Top-level State ───────────────────────────────────────────────");
  console.log(`  Constitution : ${state.constitution === "locked" ? "\x1b[32mLOCKED\x1b[0m" : "\x1b[31mUNLOCKED\x1b[0m"}`);
  console.log(`  Governance   : ${colorizeStatus(state.governance)}`);
  console.log("");

  console.log("── Gate Status (derived from repository_state.gates) ────────────");
  const gateKeys = Object.keys(state.gates) as readonly ("A" | "B" | "C" | "D" | "E")[];
  gateKeys.forEach((gate) => {
    const status = state.gates[gate];
    const label = GATE_LABELS[gate] ?? "";
    console.log(`  Gate ${gate} : ${colorizeStatus(status)}  ·  ${label}`);
  });
  console.log("");

  console.log("── Readiness (derived from repository_state.readiness) ──────────");
  const readinessKeys: readonly ("gate_b" | "gate_c" | "gate_d" | "gate_e")[] = [
    "gate_b",
    "gate_c",
    "gate_d",
    "gate_e",
  ];
  readinessKeys.forEach((key) => {
    const ready = state.readiness[key];
    console.log(`  ${key} : ${colorizeReadiness(ready)}`);
  });
  console.log("");

  console.log("── Hash Pointers (repository_state.proof) ───────────────────────");
  console.log(`  baseline_hash   : ${state.proof.baseline_hash}`);
  console.log(`  governance_hash : ${state.proof.governance_hash}`);
  console.log(`  dependency_hash : ${state.proof.dependency_hash}`);
  console.log(`  registry_hash   : ${state.proof.registry_hash}`);
  console.log("");

  console.log("── Output Pointers (repository_state.outputs) ───────────────────");
  console.log(`  Repository Proof`);
  console.log(`    location : ${outputs.location}`);
  console.log(`    file     : ${outputs.current_file}`);
  console.log(`    status   : ${colorizeProofEmitStatus(outputs.current_status)}`);
  console.log(`    ontologi : OUTPUT (Layer 5) — BUKAN input state.`);
  console.log(SUB);
  console.log("CLI = read model. Status ini BUKAN dihitung oleh CLI.");
  console.log("Status ini DIBACA dari GOVERNANCE_STATE.yaml repository_state.");
  console.log("ACL / CI / Dashboard membaca SUMBER YANG SAMA.");
  console.log(SEP);
  return 0;
}
