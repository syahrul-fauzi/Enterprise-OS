import { dirname, join } from "node:path";

type JsonPrimitive = null | boolean | number | string;
export type GateCAcceptanceReportJsonValue =
  | JsonPrimitive
  | readonly GateCAcceptanceReportJsonValue[]
  | { readonly [key: string]: GateCAcceptanceReportJsonValue };

export type GateCAcceptanceReportDeps = Readonly<{
  runsDir: string;
  acceptanceDir: string;
  acceptanceContractPath: string;
  runProofLedgerPath: string;
  acceptanceDecisionsPath: string;
  defaultOperatorId: string;
  readYamlRecord: (path: string) => Record<string, unknown>;
  ensureDir: (path: string) => void;
  writeYamlImmutable: (path: string, value: unknown) => void;
  toGateCRelative: (path: string) => string;
  canonicalizeValue: (value: unknown) => GateCAcceptanceReportJsonValue;
  canonicalJson: (value: unknown) => string;
  deepClone: <T>(value: T) => T;
  isPlainObject: (value: unknown) => value is Record<string, unknown>;
  asMutableRecord: (value: unknown, label: string) => Record<string, unknown>;
  asArray: (value: unknown, label: string) => unknown[];
  asString: (value: unknown, label: string) => string;
  asBoolean: (value: unknown, label: string) => boolean;
  asStringArray: (value: unknown, label: string) => readonly string[];
  sha256: (input: string | Uint8Array) => string;
}>;

export type GateCAcceptanceGovernanceGate = Readonly<{
  snapshot: Record<string, GateCAcceptanceReportJsonValue>;
  blockingConditions: readonly string[];
  overallStatus: "PASS" | "FAIL";
}>;

export function buildGateCAcceptanceReportDocument(
  input: {
    readonly runId: string;
    readonly acceptanceContract: Record<string, unknown>;
    readonly acceptanceAudit: Record<string, GateCAcceptanceReportJsonValue>;
    readonly governanceGate: GateCAcceptanceGovernanceGate;
    readonly decision: "ACCEPTED" | "REJECTED" | "ALREADY_ACCEPTED";
    readonly decisionEntry: Record<string, GateCAcceptanceReportJsonValue>;
    readonly proofLedgerBefore: Record<string, unknown>;
    readonly proofLedgerAfter: Record<string, unknown>;
    readonly acceptanceDecisionsBefore: Record<string, unknown>;
    readonly acceptanceDecisionsAfter: Record<string, unknown>;
    readonly ledgerEntry?: Record<string, GateCAcceptanceReportJsonValue>;
  },
  deps: GateCAcceptanceReportDeps,
): Record<string, GateCAcceptanceReportJsonValue> {
  const manifest = deps.readYamlRecord(join(deps.runsDir, input.runId, "run-manifest.yaml"));
  const report = deps.readYamlRecord(join(deps.runsDir, input.runId, "report.yaml"));
  const comparison = deps.readYamlRecord(
    join(deps.runsDir, input.runId, "metrics", "canonical-evidence-comparison.yaml"),
  );
  const subjectRecord = deps.asMutableRecord(
    deps.asArray(manifest.subjects, "run_manifest.subjects")[0],
    "run_manifest.subjects[0]",
  );
  const definitionOfDone = deps.asMutableRecord(
    report.definition_of_done,
    "acceptance_report.report.definition_of_done",
  );
  const comparisonNode = deps.isPlainObject(comparison.comparison)
    ? deps.asMutableRecord(
        comparison.comparison,
        "acceptance_report.comparison.comparison",
      )
    : {
        same_verdict: deps.asBoolean(
          definitionOfDone.replay,
          "acceptance_report.report.definition_of_done.replay",
        ),
        same_canonical_evidence: deps.asBoolean(
          definitionOfDone.convergence,
          "acceptance_report.report.definition_of_done.convergence",
        ),
        same_canonical_witness_hashes: deps.asBoolean(
          definitionOfDone.convergence,
          "acceptance_report.report.definition_of_done.convergence",
        ),
        converged: deps.asBoolean(
          definitionOfDone.convergence,
          "acceptance_report.report.definition_of_done.convergence",
        ),
      };
  const proofLedgerBeforeEntries = deps.asArray(
    input.proofLedgerBefore.entries,
    "proof_ledger_before.entries",
  );
  const proofLedgerAfterEntries = deps.asArray(
    input.proofLedgerAfter.entries,
    "proof_ledger_after.entries",
  );
  const decisionEntriesBefore = deps.asArray(
    input.acceptanceDecisionsBefore.entries,
    "acceptance_decisions_before.entries",
  );
  const decisionEntriesAfter = deps.asArray(
    input.acceptanceDecisionsAfter.entries,
    "acceptance_decisions_after.entries",
  );
  const invariantResults = deps.deepClone(
    deps.asMutableRecord(
      input.acceptanceAudit.invariant_results ?? {},
      "acceptanceAudit.invariant_results",
    ),
  );
  const checklist = deps.deepClone(
    deps.asMutableRecord(input.acceptanceAudit.checklist ?? {}, "acceptanceAudit.checklist"),
  );
  const blockingConditions = deps.asStringArray(
    input.acceptanceAudit.blocking_conditions ?? [],
    "acceptanceAudit.blocking_conditions",
  );

  return {
    version: "1.0.0",
    run_id: input.runId,
    acceptance_decision_id: deps.asString(
      input.decisionEntry.decision_id,
      "decisionEntry.decision_id",
    ),
    subject_id: deps.asString(
      subjectRecord.experiment_subject_id,
      "run_manifest.subjects[0].experiment_subject_id",
    ),
    truth_table_row: input.acceptanceAudit.truth_table_row ?? "UNKNOWN",
    accepted_by: deps.defaultOperatorId,
    acceptance_time_utc: deps.asString(
      input.decisionEntry.decided_at_utc,
      "decisionEntry.decided_at_utc",
    ),
    contract_id: deps.asString(
      input.acceptanceContract.contract_id,
      "acceptance_contract.contract_id",
    ),
    contract_ref: deps.toGateCRelative(deps.acceptanceContractPath),
    decision: input.decision,
    accepted: input.decision === "ACCEPTED" || input.decision === "ALREADY_ACCEPTED",
    run_refs: {
      manifest_ref: `execution/runs/${input.runId}/run-manifest.yaml`,
      report_ref: `execution/runs/${input.runId}/report.yaml`,
      comparison_ref: `execution/runs/${input.runId}/metrics/canonical-evidence-comparison.yaml`,
    },
    criteria: {
      invariant_results: deps.canonicalizeValue(invariantResults),
      checklist: deps.canonicalizeValue(checklist),
      blocking_conditions: deps.canonicalizeValue(blockingConditions),
    },
    governance_gate: {
      status: input.governanceGate.overallStatus,
      blocking_conditions: deps.canonicalizeValue(input.governanceGate.blockingConditions),
      snapshot: deps.canonicalizeValue(input.governanceGate.snapshot),
      note: "Gate C acceptance is allowed only when repository governance evidence remains healthy: constitution PASS, dependency constitution PASS, contract registry PASS, governance session COMPLETED, and trust framework DECLARED.",
    },
    replay: {
      same_verdict: deps.asBoolean(
        comparisonNode.same_verdict,
        "comparison.comparison.same_verdict",
      ),
      same_canonical_evidence: deps.asBoolean(
        comparisonNode.same_canonical_evidence,
        "comparison.comparison.same_canonical_evidence",
      ),
      same_canonical_witness_hashes: deps.asBoolean(
        comparisonNode.same_canonical_witness_hashes,
        "comparison.comparison.same_canonical_witness_hashes",
      ),
      converged: deps.asBoolean(
        comparisonNode.converged,
        "comparison.comparison.converged",
      ),
    },
    proof_ledger: {
      ref: deps.toGateCRelative(deps.runProofLedgerPath),
      entry_count_before: proofLedgerBeforeEntries.length,
      entry_count_after: proofLedgerAfterEntries.length,
      last_entry_hash_before:
        typeof input.proofLedgerBefore.last_entry_hash === "string"
          ? deps.asString(
              input.proofLedgerBefore.last_entry_hash,
              "proofLedgerBefore.last_entry_hash",
            )
          : null,
      last_entry_hash_after:
        typeof input.proofLedgerAfter.last_entry_hash === "string"
          ? deps.asString(
              input.proofLedgerAfter.last_entry_hash,
              "proofLedgerAfter.last_entry_hash",
            )
          : null,
      appended_in_this_attempt: input.decision === "ACCEPTED",
      proof_ledger_entry_id:
        input.ledgerEntry?.entry_id ?? input.decisionEntry.proof_ledger_entry_id ?? null,
    },
    acceptance_decision_log: {
      ref: deps.toGateCRelative(deps.acceptanceDecisionsPath),
      entry_count_before: decisionEntriesBefore.length,
      entry_count_after: decisionEntriesAfter.length,
      last_decision_hash_before:
        typeof input.acceptanceDecisionsBefore.last_decision_hash === "string"
          ? deps.asString(
              input.acceptanceDecisionsBefore.last_decision_hash,
              "acceptanceDecisionsBefore.last_decision_hash",
            )
          : null,
      last_decision_hash_after:
        typeof input.acceptanceDecisionsAfter.last_decision_hash === "string"
          ? deps.asString(
              input.acceptanceDecisionsAfter.last_decision_hash,
              "acceptanceDecisionsAfter.last_decision_hash",
            )
          : null,
      decision_id: deps.asString(
        input.decisionEntry.decision_id,
        "decisionEntry.decision_id",
      ),
      decision_entry_hash: deps.asString(
        input.decisionEntry.entry_hash,
        "decisionEntry.entry_hash",
      ),
    },
  };
}

export function writeGateCAcceptanceReport(
  input: {
    readonly runId: string;
    readonly decisionId: string;
    readonly report: Record<string, GateCAcceptanceReportJsonValue>;
  },
  deps: GateCAcceptanceReportDeps,
): string {
  const reportPath = join(deps.acceptanceDir, input.runId, `${input.decisionId}.yaml`);
  deps.ensureDir(dirname(reportPath));
  deps.writeYamlImmutable(reportPath, sealAcceptanceReport(input.report, deps));
  return reportPath;
}

function sealAcceptanceReport(
  report: Record<string, GateCAcceptanceReportJsonValue>,
  deps: GateCAcceptanceReportDeps,
): Record<string, GateCAcceptanceReportJsonValue> {
  const sealed = deps.deepClone(report);
  sealed.integrity = {
    hash_basis: "sha256(canonical_json(acceptance_report_excluding_integrity.report_hash))",
    report_hash: "sha256:PENDING",
  };
  const reportForHash = deps.deepClone(sealed);
  delete deps.asMutableRecord(
    deps.asMutableRecord(reportForHash.integrity, "acceptance_report.integrity"),
    "acceptance_report.integrity",
  ).report_hash;
  deps.asMutableRecord(sealed.integrity, "acceptance_report.integrity").report_hash =
    deps.sha256(deps.canonicalJson(reportForHash));
  return sealed;
}
