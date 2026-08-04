import { DigestEngine } from "@repo/core-kernel";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  materializeDecisionImpactGraph,
} from "../../decision/runtime/impact-runtime.js";
import {
  materializeDecisionLedgerEntry,
} from "../../decision/runtime/ledger-runtime.js";
import {
  materializeDecisionLearningRecord,
  materializeDecisionOutcomeRecord,
} from "../../decision/runtime/outcome-runtime.js";
import {
  listRequiredProductProjectionFiles,
  resolveProjectionStorageLocation,
} from "../../projection/index.js";
import {
  readYamlArtifact,
  uniqueStrings,
} from "../../governance-runtime.js";
import type { DecisionSynthesis } from "../../runtime-contracts/models/decision.js";
import type { DecisionImpactGraph } from "../../runtime-contracts/models/impact.js";
import type { DecisionLedgerEntry } from "../../runtime-contracts/models/ledger.js";
import type {
  DecisionLearningRecord,
  DecisionObservedMetric,
  DecisionOutcomeRecord,
} from "../../runtime-contracts/models/outcome.js";
import { EOS_ROOT } from "../../state.js";
import { tryReadWorkspaceCapabilities } from "../../workspace-capability-runtime.js";

export const REQUIRED_PRODUCT_EVIDENCE = [
  "functional-test-report.json",
  "clr-report.json",
  "capability-mapping-matrix.csv",
  "composition-tree.txt",
  "composition-replay.json",
  "atomic-leverage-report.json",
  "proof-of-composition.md",
  "runtime-invocation-report.json",
  ...listRequiredProductProjectionFiles(),
  "verification-summary.md",
] as const;

export const DEFAULT_EXECUTABLE_SPEC_BINDINGS: Record<
  string,
  {
    readonly consumer_command: string;
    readonly stage_chain: {
      readonly planner: boolean;
      readonly composer: boolean;
      readonly runtime: boolean;
      readonly verification: boolean;
      readonly evidence: boolean;
    };
    readonly evidence_artifact: string;
  }
> = {
  "enterprise/specifications/PRODUCT-PORTFOLIO.yaml": {
    consumer_command: "pnpm eos verify-foundation",
    stage_chain: {
      planner: false,
      composer: false,
      runtime: false,
      verification: true,
      evidence: true,
    },
    evidence_artifact:
      "workspace/foundation/evidence/verification/foundation-report.json",
  },
  "enterprise/specifications/GOVERNANCE-PORTFOLIO.yaml": {
    consumer_command: "pnpm eos verify-foundation",
    stage_chain: {
      planner: false,
      composer: false,
      runtime: false,
      verification: true,
      evidence: true,
    },
    evidence_artifact:
      "workspace/foundation/evidence/verification/spec-execution-audit.json",
  },
  "enterprise/execution/QUALITY-GATES.yaml": {
    consumer_command: "pnpm eos verify-foundation",
    stage_chain: {
      planner: false,
      composer: false,
      runtime: false,
      verification: true,
      evidence: true,
    },
    evidence_artifact:
      "workspace/foundation/evidence/verification/guardrail-report.json",
  },
  "enterprise/specifications/specification-registry.yaml": {
    consumer_command: "pnpm eos verify-foundation",
    stage_chain: {
      planner: false,
      composer: false,
      runtime: false,
      verification: true,
      evidence: true,
    },
    evidence_artifact:
      "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
  },
};

export type FoundationEvidenceFiles = {
  readonly artifactRegistry: string;
  readonly capabilityDependencyConstitution: string;
  readonly capabilityCertification: string;
  readonly capabilityOperationalMetrics: string;
  readonly capabilityGovernanceIndex: string;
  readonly capabilityGovernanceVerification: string;
  readonly capabilityGovernanceDir: string;
  readonly capabilityGraph: string;
  readonly capabilityGraphYaml: string;
  readonly capabilityGraphVerification: string;
  readonly enterpriseControlGraph: string;
  readonly enterpriseControlGraphVerification: string;
  readonly contractVersionRegistry: string;
  readonly contractVersionEvolution: string;
  readonly architectureTrend: string;
  readonly governanceSummaryView: string;
  readonly governanceClaimsView: string;
  readonly governanceHealthView: string;
  readonly governanceDashboardView: string;
  readonly governanceReadModelMetrics: string;
  readonly governanceIncrementalMaterialization: string;
  readonly governanceIncrementalMaterializationVerification: string;
  readonly governanceSelectiveExecution: string;
  readonly governanceReadModelSelectiveExecution: string;
  readonly governanceSession: string;
  readonly governanceSessionVerification: string;
  readonly verificationRun: string;
  readonly verificationRunVerification: string;
  readonly governanceCatalog: string;
  readonly governanceCatalogVerification: string;
  readonly trustFramework: string;
  readonly trustFrameworkVerification: string;
  readonly attestationLifecycleVerification: string;
  readonly attestationLifecycleMaterialization: string;
  readonly trustSignatureProviderRegistry: string;
  readonly trustSignatureProviderVerification: string;
  readonly trustSignatureMaterialization: string;
  readonly constitutionAttestationPolicy: string;
  readonly constitutionLawResults: string;
  readonly constitutionEvidencePackages: string;
  readonly constitutionCertificates: string;
  readonly constitutionAttestations: string;
  readonly constitutionClaims: string;
  readonly constitutionSummary: string;
  readonly constitutionProofBundle: string;
  readonly executionChain: string;
  readonly executionEvidence: string;
  readonly executionPlan: string;
  readonly executionGraph: string;
  readonly foundation: string;
  readonly foundationProjection: string;
  readonly foundationEvidence: string;
  readonly evolution: string;
  readonly fitness: string;
  readonly graphFitness: string;
  readonly architectureFitness: string;
  readonly constitution: string;
  readonly guardrails: string;
  readonly granularClr: string;
  readonly artifactGraph: string;
  readonly graphHealth: string;
  readonly specAudit: string;
  readonly decisionQuality: string;
  readonly learningIntelligence: string;
  readonly learningRegistry: string;
  readonly knowledgeRegistry: string;
  readonly evidenceProducerConvergence: string;
  readonly specificationConformance: string;
  readonly specificationConformanceProjection: string;
  readonly specificationConformanceEvidence: string;
  readonly specificationArtifactGraph: string;
  readonly specificationVocabularyAudit: string;
  readonly topologyDrift: string;
  readonly summary: string;
};

export type FoundationProductPortfolio = {
  readonly products?: readonly {
    readonly id: string;
    readonly status?: "ACTIVE" | "PLANNED" | "PLANNED_FUTURE" | "COMPLETE";
    readonly shared_capabilities?: readonly string[];
  }[];
};

export type FoundationProductEvidence = {
  readonly product_id: string;
  readonly app_manifest_exists: boolean;
  readonly evidence_complete: boolean;
  readonly missing_evidence: readonly string[];
  readonly capabilities: readonly string[];
  readonly mapped_capabilities: readonly string[];
  readonly verification_summary_exists: boolean;
  readonly composition_replay_status: "PASS" | "FAIL" | "MISSING";
  readonly runtime_invocation_summary: {
    readonly plan_instance_id: string;
    readonly total_invocations: number;
    readonly observed_capabilities: number;
    readonly verified_capabilities: number;
    readonly reproducible_capabilities: number;
  } | null;
  readonly runtime_invocation_capabilities: readonly {
    readonly capability_id: string;
    readonly status: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
    readonly invocation_count: number;
    readonly success_count: number;
    readonly failure_count: number;
    readonly reproducible_operation_count: number;
  }[];
  readonly execution_chain_summary: {
    readonly plan_instance_id: string;
    readonly total_invocations: number;
    readonly total_chains: number;
    readonly unique_chain_digests: number;
    readonly chains_with_requirement: number;
    readonly chains_with_workflow: number;
    readonly chains_with_plan: number;
    readonly chains_with_evidence: number;
    readonly chains_with_verification: number;
    readonly verified_chains: number;
    readonly reproducible_chains: number;
    readonly stable_chains: number;
    readonly total_projected_edges: number;
    readonly chain_projection_digest: string;
  } | null;
  readonly execution_timeline_summary: {
    readonly total_events: number;
    readonly node_lifecycle_events: number;
    readonly edge_lifecycle_events: number;
    readonly first_event_utc: string;
    readonly last_event_utc: string;
  } | null;
  readonly execution_chains: readonly {
    readonly chain_id: string;
    readonly chain_digest: string;
    readonly product_id: string;
    readonly capability_id: string;
    readonly plan_id: string;
    readonly plan_instance_id: string;
    readonly plan_instance_node_id: string;
    readonly chain_status: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
    readonly capability_status: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
    readonly invocation_count: number;
    readonly capability_node_id: string;
    readonly operation_node_id: string;
    readonly invocation_ids: readonly string[];
    readonly requirement_node_ids: readonly string[];
    readonly workflow_node_ids: readonly string[];
    readonly plan_node_ids: readonly string[];
    readonly evidence_node_ids: readonly string[];
    readonly verification_node_ids: readonly string[];
    readonly replay_node_ids: readonly string[];
    readonly projected_edges: readonly {
      readonly edge_id: string;
      readonly edge_digest: string;
      readonly from: string;
      readonly to: string;
      readonly topology_layer: "observed";
      readonly edge_type: "runtime" | "evidence" | "verification" | "replay";
      readonly claim_status: "OBSERVED" | "VERIFIED";
      readonly lifecycle_state:
        "ACTIVE" | "EXECUTED" | "VERIFIED" | "REPLAYABLE";
      readonly declared: false;
      readonly observed: true;
      readonly created_by_chain: string;
      readonly plan_instance_id: string;
      readonly source_ref: string;
      readonly evidence_ref: string | null;
    }[];
  }[];
  readonly execution_plan_summary: {
    readonly plan_id: string;
    readonly plan_digest: string;
    readonly plan_instance_id: string;
    readonly projection_source: "execution_graph" | "registry_entries";
    readonly execution_graph_digest: string | null;
  } | null;
  readonly functional_tests_passed: number;
  readonly functional_tests_total: number;
  readonly capability_reuse_ratio: number | null;
  readonly experience_reuse_ratio: number | null;
  readonly clr: number | "FULL_REUSE" | null;
};

type ClrComponent = {
  readonly key:
    "core" | "workflow" | "capability" | "integration" | "experience" | "ui";
  readonly weight: number;
  readonly target_minimum: number;
  readonly actual_ratio: number | null;
  readonly status: "PASS" | "FAIL" | "UNVERIFIED";
  readonly evidence_basis: string;
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export type FoundationClosedLoopDecisionArtifacts = Readonly<{
  ledgerEntries: readonly DecisionLedgerEntry[];
  outcomeRecords: readonly DecisionOutcomeRecord[];
  learningRecords: readonly DecisionLearningRecord[];
  impactGraphs: readonly DecisionImpactGraph[];
  claim_boundary: string;
}>;

export function loadGateCAcceptanceClosedLoopArtifacts(input?: {
  readonly gateRoot?: string;
  readonly executionRoot?: string;
  readonly acceptanceDecisionsPath?: string;
  readonly proofLedgerPath?: string;
  readonly acceptanceContractPath?: string;
}): FoundationClosedLoopDecisionArtifacts {
  const gateRoot =
    input?.gateRoot ?? resolve(EOS_ROOT, "enterprise/science/gate-c");
  const executionRoot = input?.executionRoot ?? resolve(gateRoot, "execution");
  const acceptanceDecisionsPath =
    input?.acceptanceDecisionsPath ??
    resolve(executionRoot, "acceptance-decisions.yaml");
  const proofLedgerPath =
    input?.proofLedgerPath ?? resolve(executionRoot, "proof-ledger.yaml");
  const acceptanceContractPath =
    input?.acceptanceContractPath ??
    resolve(executionRoot, "acceptance-contract.yaml");

  if (!existsSync(acceptanceDecisionsPath) || !existsSync(proofLedgerPath)) {
    return {
      ledgerEntries: [],
      outcomeRecords: [],
      learningRecords: [],
      impactGraphs: [],
      claim_boundary:
        "Gate C closed-loop artifacts are available only when the acceptance decision log and proof ledger are materialized in enterprise/science/gate-c/execution.",
    };
  }

  const acceptanceDecisions =
    readYamlArtifact<Record<string, unknown>>(acceptanceDecisionsPath);
  const proofLedger = readYamlArtifact<Record<string, unknown>>(proofLedgerPath);
  const acceptanceContract = existsSync(acceptanceContractPath)
    ? readYamlArtifact<Record<string, unknown>>(acceptanceContractPath)
    : {};
  const proofLedgerEntries = readRecordArray(proofLedger.entries);
  const proofLedgerEntryById = new Map(
    proofLedgerEntries
      .map((entry) => {
        const entryId = readOptionalString(entry, "entry_id");
        return entryId === null ? null : [entryId, entry] as const;
      })
      .filter((entry): entry is readonly [string, Record<string, unknown>] => entry !== null),
  );
  const proofLedgerEntriesByRunId = new Map<string, readonly Record<string, unknown>[]>();

  for (const entry of proofLedgerEntries) {
    const runId = readOptionalString(entry, "run_id");
    if (runId === null) {
      continue;
    }
    proofLedgerEntriesByRunId.set(runId, [
      ...(proofLedgerEntriesByRunId.get(runId) ?? []),
      entry,
    ]);
  }

  const acceptanceEntries = [...readRecordArray(acceptanceDecisions.entries)].sort(
    (left, right) =>
      readString(left, "decided_at_utc").localeCompare(
        readString(right, "decided_at_utc"),
      ),
  );

  const ledgerEntries: DecisionLedgerEntry[] = [];
  const outcomeRecords: DecisionOutcomeRecord[] = [];
  const learningRecords: DecisionLearningRecord[] = [];
  const impactGraphs: DecisionImpactGraph[] = [];
  let previousLedgerEntry: DecisionLedgerEntry | null = null;

  for (const acceptanceEntry of acceptanceEntries) {
    const runId = readString(acceptanceEntry, "run_id");
    const decidedAtUtc = readString(acceptanceEntry, "decided_at_utc");
    const runManifestPath = resolve(executionRoot, "runs", runId, "run-manifest.yaml");
    const runReportPath = resolve(executionRoot, "runs", runId, "report.yaml");

    if (!existsSync(runManifestPath) || !existsSync(runReportPath)) {
      continue;
    }

    const runManifest = readYamlArtifact<Record<string, unknown>>(runManifestPath);
    const runReport = readYamlArtifact<Record<string, unknown>>(runReportPath);
    const subject = readRecordArray(runManifest.subjects)[0] ?? {};
    const subjectRef = readOptionalString(subject, "subject_ref");
    const subjectPath = subjectRef === null ? null : resolve(gateRoot, subjectRef);
    const subjectDefinition =
      subjectPath !== null && existsSync(subjectPath)
        ? readYamlArtifact<Record<string, unknown>>(subjectPath)
        : null;
    const proofLedgerEntry =
      proofLedgerEntryById.get(
        readOptionalString(acceptanceEntry, "proof_ledger_entry_id") ?? "",
      ) ??
      (proofLedgerEntriesByRunId.get(runId)?.at(-1) ?? null);
    const blockingConditions = readStringArray(
      acceptanceEntry.blocking_conditions,
    );
    const invariantResults = readBooleanRecord(acceptanceEntry.invariant_results);
    const selectedOption = isAcceptedDecision(acceptanceEntry)
      ? "accept_run"
      : "reject_run";
    const evidenceRefs = buildGateCAcceptanceArtifactRefs({
      executionRoot,
      gateRoot,
      runId,
      runManifestPath,
      runReportPath,
      acceptanceContractPath,
      acceptanceDecisionsPath,
      proofLedgerPath,
      subjectPath,
    });
    const findingRefs = blockingConditions.map((condition) => ({
      ref_id: `gate-c-blocking:${toRuntimeSlug(condition)}`,
      ref_kind: "diagnostic_finding",
    }));
    const followUpActions = blockingConditions.map(
      (condition) => `gate-c-action:${toRuntimeSlug(condition)}`,
    );
    const decision = buildGateCAcceptanceDecisionSynthesis({
      acceptanceEntry,
      acceptanceContract,
      runManifest,
      runReport,
      subject,
      subjectDefinition,
      proofLedgerEntry,
      decidedAtUtc,
      evidenceRefs,
      findingRefs,
      selectedOption,
      followUpActions,
    });
    const ledgerEntry = materializeDecisionLedgerEntry({
      decision,
      decisionTime: decidedAtUtc,
      createdAt: decidedAtUtc,
      supersedesDecisionEntryId: previousLedgerEntry?.decision_entry_id,
      decisionEntryPrefix: "decision-entry-gate-c-acceptance",
    });
    const outcomeRecord = materializeDecisionOutcomeRecord({
      decisionEntry: ledgerEntry,
      observedMetrics: buildGateCAcceptanceObservedMetrics({
        acceptanceEntry,
        proofLedgerEntry,
        decidedAtUtc,
      }),
      summary: buildGateCAcceptanceOutcomeSummary({
        acceptanceEntry,
        blockingConditions,
      }),
      evidenceRefs,
      capabilityRefs: uniqueStrings([
        "gate-c",
        "foundation-verification",
        readOptionalString(runManifest, "gate") ?? "gate-c",
      ]),
      observedAt: decidedAtUtc,
    });
    const learningRecord = materializeDecisionLearningRecord({
      decisionEntry: ledgerEntry,
      outcomeRecord,
      lessons: buildGateCAcceptanceLessons({
        acceptanceEntry,
        blockingConditions,
        invariantResults,
        proofLedgerEntry,
        subjectDefinition,
      }),
      followUpActions,
      createdAt: decidedAtUtc,
      learningPrefix: "decision-learning-gate-c-acceptance",
    });
    const impactGraph = materializeDecisionImpactGraph({
      decisionEntry: ledgerEntry,
      outcomeRecord,
      learningRecord,
    });

    ledgerEntries.push(ledgerEntry);
    outcomeRecords.push(outcomeRecord);
    learningRecords.push(learningRecord);
    impactGraphs.push(impactGraph);
    previousLedgerEntry = ledgerEntry;
  }

  return {
    ledgerEntries,
    outcomeRecords,
    learningRecords,
    impactGraphs,
    claim_boundary:
      "Gate C closed-loop artifacts adapt append-only acceptance decisions, proof-ledger entries, frozen acceptance contract evidence, and per-run manifests/reports into EOS decision, outcome, learning, and impact records. They claim only the observed acceptance-decision stream for Gate C and do not infer hidden business decisions outside that materialized evidence corpus.",
  };
}

function buildGateCAcceptanceDecisionSynthesis(input: {
  readonly acceptanceEntry: Record<string, unknown>;
  readonly acceptanceContract: Record<string, unknown>;
  readonly runManifest: Record<string, unknown>;
  readonly runReport: Record<string, unknown>;
  readonly subject: Record<string, unknown>;
  readonly subjectDefinition: Record<string, unknown> | null;
  readonly proofLedgerEntry: Record<string, unknown> | null;
  readonly decidedAtUtc: string;
  readonly evidenceRefs: readonly {
    readonly ref_id: string;
    readonly ref_kind: string;
    readonly digest?: string;
  }[];
  readonly findingRefs: readonly {
    readonly ref_id: string;
    readonly ref_kind: string;
  }[];
  readonly selectedOption: "accept_run" | "reject_run";
  readonly followUpActions: readonly string[];
}): DecisionSynthesis {
  const blockingConditions = readStringArray(
    input.acceptanceEntry.blocking_conditions,
  );
  const invariantResults = readBooleanRecord(input.acceptanceEntry.invariant_results);
  const contractId =
    readOptionalString(input.acceptanceContract, "contract_id") ??
    "GATE-C-ACCEPTANCE-CONTRACT-001";
  const runId = readString(input.acceptanceEntry, "run_id");
  const expectedEvaluationRef =
    readOptionalString(input.subject, "expected_evaluation_ref") ??
    `gate-c-evaluation:${runId}`;
  const truthTableRow =
    readOptionalString(input.runReport, "truth_table_row") ??
    readOptionalString(input.subjectDefinition ?? {}, "expected_truth_table_row_match") ??
    "UNKNOWN";
  const subjectId =
    readOptionalString(input.subject, "experiment_subject_id") ?? runId;
  const reasonCodes =
    blockingConditions.length > 0
      ? blockingConditions.map((condition) => `gate-c:${toRuntimeSlug(condition)}`)
      : ["gate-c:acceptance-contract-satisfied"];

  return {
    decision_id: `decision:gate-c-acceptance:${toRuntimeSlug(contractId)}`,
    decision_type: "gate-c-acceptance-decision",
    decision: input.selectedOption === "accept_run" ? "ALLOW" : "BLOCK",
    status: input.selectedOption === "accept_run" ? "APPROVED" : "REJECTED",
    trigger: {
      trigger_id:
        readOptionalString(input.acceptanceEntry, "decision_id") ??
        `gate-c-trigger:${runId}`,
      trigger_type: "gate-c-acceptance-evaluation",
      description: `Evaluate Gate C frozen acceptance contract for ${runId} on ${truthTableRow}.`,
      source_refs: input.evidenceRefs.slice(0, 3),
      triggered_at: input.decidedAtUtc,
    },
    finding_refs: [...input.findingRefs],
    evidence_refs: [...input.evidenceRefs],
    assumptions: [
      {
        assumption_id: `gate-c-assumption:${toRuntimeSlug(contractId)}`,
        statement:
          "Gate C acceptance decisions are governed by a frozen append-only acceptance contract and only claim what is materialized in the acceptance log, proof ledger, manifests, and reports.",
        source_refs: [
          input.evidenceRefs.find((ref) =>
            ref.ref_id.endsWith("acceptance-contract.yaml"),
          ) ?? input.evidenceRefs[0]!,
        ],
        validation_status: "VALIDATED",
      },
    ],
    recommendation: {
      recommendation_id: `gate-c-recommendation:${runId}`,
      recommendation_type: "acceptance-decision",
      summary:
        input.selectedOption === "accept_run"
          ? `Accept Gate C run ${runId} into the official evidence corpus.`
          : `Reject Gate C run ${runId} until blocking conditions are resolved.`,
    },
    alternatives: [
      {
        option_id: "accept_run",
        label: "Accept run",
        description:
          "Append the evaluated Gate C run into the official acceptance evidence corpus.",
        evidence_refs: [...input.evidenceRefs],
        tradeoffs: ["Requires all frozen invariants and postconditions to hold."],
      },
      {
        option_id: "reject_run",
        label: "Reject run",
        description:
          "Keep the run outside the official acceptance evidence corpus until failures are remediated.",
        evidence_refs: [...input.evidenceRefs],
        tradeoffs: ["Preserves corpus integrity while delaying acceptance."],
      },
    ],
    selected_option: input.selectedOption,
    expected_outcome: {
      outcome_id: `gate-c-acceptance-outcome:${runId}`,
      hypothesis:
        "A Gate C run with complete frozen acceptance invariants should enter the official evidence corpus and preserve canonical convergence.",
      success_metric: "acceptance_contract_satisfaction",
      target_description:
        "All frozen acceptance invariants and ledger postconditions are satisfied for the evaluated Gate C run.",
      measurement_window: "at acceptance evaluation time",
    },
    owner: {
      owner_id: readOptionalString(input.runManifest, "operator_id") ?? "eos-cli",
      owner_type: "automation_runtime",
      display_name: "EOS CLI",
    },
    confidence: buildGateCAcceptanceConfidence({
      acceptanceEntry: input.acceptanceEntry,
      proofLedgerEntry: input.proofLedgerEntry,
    }),
    reason_codes: reasonCodes,
    reasons: reasonCodes.map((code) => ({
      code,
      source_evaluation_id: expectedEvaluationRef,
      message:
        code === "gate-c:acceptance-contract-satisfied"
          ? `Gate C run ${runId} satisfied the frozen acceptance contract for ${subjectId}.`
          : `Gate C run ${runId} remains blocked by ${code.replace(/^gate-c:/, "")}.`,
    })),
    required_actions: input.followUpActions.map((actionId) => ({
      action_id: actionId,
      action_type: "remediation",
      description: `Resolve ${actionId.replace(/^gate-c-action:/, "").replaceAll("-", " ")} before re-evaluating acceptance.`,
      target_refs: [`gate-c-run:${runId}`],
    })),
    affected_nodes: uniqueStrings([
      "gate-c",
      readOptionalString(input.runManifest, "gate") ?? "gate-c",
      readOptionalString(input.subjectDefinition ?? {}, "domain") ?? "document",
    ]),
    source_evaluation_ids: uniqueStrings([
      expectedEvaluationRef,
      `gate-c-contract:${toRuntimeSlug(contractId)}`,
    ]),
    graph_digest: DigestEngine.digest({
      contract_id: contractId,
      run_id: runId,
      truth_table_row: truthTableRow,
      subject_id: subjectId,
      blocking_conditions: blockingConditions,
      invariant_results: invariantResults,
      proof_ledger_entry_id:
        readOptionalString(input.acceptanceEntry, "proof_ledger_entry_id") ??
        null,
    }),
    policy_version:
      readOptionalString(input.acceptanceContract, "version") ?? "1.0.0",
    created_at: input.decidedAtUtc,
  };
}

function buildGateCAcceptanceObservedMetrics(input: {
  readonly acceptanceEntry: Record<string, unknown>;
  readonly proofLedgerEntry: Record<string, unknown> | null;
  readonly decidedAtUtc: string;
}): readonly DecisionObservedMetric[] {
  const invariantResults = readBooleanRecord(input.acceptanceEntry.invariant_results);
  const invariantValues = Object.values(invariantResults);
  const invariantPassRatio =
    invariantValues.length === 0
      ? null
      : invariantValues.filter(Boolean).length / invariantValues.length;
  const proofLedgerAppended =
    readOptionalBoolean(invariantResults, "ledger_appended") ??
    (input.proofLedgerEntry !== null ? true : null);
  const convergence =
    readOptionalBoolean(invariantResults, "canonical_convergence") ??
    readOptionalBoolean(input.proofLedgerEntry ?? {}, "convergence");

  return [
    {
      metric_id: "acceptance_contract_satisfaction",
      metric_name: "Acceptance Contract Satisfaction",
      unit: "boolean",
      observed_value: isAcceptedDecision(input.acceptanceEntry) ? 1 : 0,
      target_description:
        "1 means the frozen acceptance contract evaluated to an accepted state.",
      status: isAcceptedDecision(input.acceptanceEntry) ? "MET" : "MISSED",
      observed_at: input.decidedAtUtc,
    },
    {
      metric_id: "acceptance_invariant_pass_ratio",
      metric_name: "Acceptance Invariant Pass Ratio",
      unit: "ratio",
      observed_value: invariantPassRatio ?? 1,
      target_description:
        "All frozen invariants and postconditions should evaluate true.",
      status:
        invariantPassRatio === null
          ? "NOT_APPLICABLE"
          : invariantPassRatio === 1
            ? "MET"
            : invariantPassRatio > 0
              ? "PARTIAL"
              : "MISSED",
      observed_at: input.decidedAtUtc,
    },
    {
      metric_id: "proof_ledger_membership",
      metric_name: "Proof Ledger Membership",
      unit: "boolean",
      observed_value: proofLedgerAppended === true ? 1 : 0,
      target_description:
        "Accepted Gate C runs should be appended to the official proof ledger.",
      status:
        proofLedgerAppended === null
          ? "NOT_APPLICABLE"
          : proofLedgerAppended
            ? "MET"
            : "MISSED",
      observed_at: input.decidedAtUtc,
    },
    {
      metric_id: "canonical_convergence",
      metric_name: "Canonical Convergence",
      unit: "boolean",
      observed_value: convergence === true ? 1 : 0,
      target_description:
        "Canonical replay should converge under the frozen measurement apparatus.",
      status:
        convergence === null
          ? "NOT_APPLICABLE"
          : convergence
            ? "MET"
            : "MISSED",
      observed_at: input.decidedAtUtc,
    },
  ];
}

function buildGateCAcceptanceOutcomeSummary(input: {
  readonly acceptanceEntry: Record<string, unknown>;
  readonly blockingConditions: readonly string[];
}): string {
  const runId = readString(input.acceptanceEntry, "run_id");
  if (isAcceptedDecision(input.acceptanceEntry)) {
    return `Gate C acceptance decision for ${runId} satisfied the frozen acceptance contract.`;
  }
  if (input.blockingConditions.length === 0) {
    return `Gate C acceptance decision for ${runId} was rejected without a recorded blocking condition.`;
  }
  return `Gate C acceptance decision for ${runId} was blocked by ${input.blockingConditions.join(", ")}.`;
}

function buildGateCAcceptanceLessons(input: {
  readonly acceptanceEntry: Record<string, unknown>;
  readonly blockingConditions: readonly string[];
  readonly invariantResults: Readonly<Record<string, boolean>>;
  readonly proofLedgerEntry: Record<string, unknown> | null;
  readonly subjectDefinition: Record<string, unknown> | null;
}): readonly string[] {
  if (input.blockingConditions.length > 0) {
    return input.blockingConditions.map(
      (condition) =>
        `Acceptance remained blocked until ${condition.replaceAll("_", " ")} was resolved.`,
    );
  }

  const failedInvariantKeys = Object.entries(input.invariantResults)
    .filter(([, value]) => value === false)
    .map(([key]) => key);
  if (failedInvariantKeys.length > 0) {
    return failedInvariantKeys.map(
      (key) =>
        `Frozen acceptance invariant ${key.replaceAll("_", " ")} failed during evaluation.`,
    );
  }

  const truthTableRow =
    readOptionalString(input.subjectDefinition ?? {}, "expected_truth_table_row_match") ??
    readOptionalString(input.proofLedgerEntry ?? {}, "subject_id") ??
    "Gate C run";
  return [
    `Frozen acceptance contract converged for ${truthTableRow} and preserved official evidence corpus integrity.`,
  ];
}

function buildGateCAcceptanceArtifactRefs(input: {
  readonly executionRoot: string;
  readonly gateRoot: string;
  readonly runId: string;
  readonly runManifestPath: string;
  readonly runReportPath: string;
  readonly acceptanceContractPath: string;
  readonly acceptanceDecisionsPath: string;
  readonly proofLedgerPath: string;
  readonly subjectPath: string | null;
}) {
  return [
    createArtifactReference(
      "enterprise/science/gate-c/execution/acceptance-contract.yaml",
      "yaml_artifact",
      input.acceptanceContractPath,
    ),
    createArtifactReference(
      "enterprise/science/gate-c/execution/acceptance-decisions.yaml",
      "yaml_artifact",
      input.acceptanceDecisionsPath,
    ),
    createArtifactReference(
      "enterprise/science/gate-c/execution/proof-ledger.yaml",
      "yaml_artifact",
      input.proofLedgerPath,
    ),
    createArtifactReference(
      `enterprise/science/gate-c/execution/runs/${input.runId}/run-manifest.yaml`,
      "yaml_artifact",
      input.runManifestPath,
    ),
    createArtifactReference(
      `enterprise/science/gate-c/execution/runs/${input.runId}/report.yaml`,
      "yaml_artifact",
      input.runReportPath,
    ),
    ...(input.subjectPath === null
      ? []
      : [
          createArtifactReference(
            toEnterpriseRelativeRef(input.gateRoot, input.subjectPath),
            "yaml_artifact",
            input.subjectPath,
          ),
        ]),
  ];
}

function createArtifactReference(
  refId: string,
  refKind: string,
  path: string,
): {
  readonly ref_id: string;
  readonly ref_kind: string;
  readonly digest?: string;
} {
  return existsSync(path)
    ? {
        ref_id: refId,
        ref_kind: refKind,
        digest: DigestEngine.digest(readFileSync(path, "utf8")),
      }
    : {
        ref_id: refId,
        ref_kind: refKind,
      };
}

function buildGateCAcceptanceConfidence(input: {
  readonly acceptanceEntry: Record<string, unknown>;
  readonly proofLedgerEntry: Record<string, unknown> | null;
}): number {
  const invariantResults = readBooleanRecord(input.acceptanceEntry.invariant_results);
  const invariantValues = Object.values(invariantResults);
  const invariantConfidence =
    invariantValues.length === 0
      ? isAcceptedDecision(input.acceptanceEntry)
        ? 1
        : 0.5
      : invariantValues.filter(Boolean).length / invariantValues.length;
  const convergenceConfidence =
    readOptionalBoolean(input.proofLedgerEntry ?? {}, "convergence") === true
      ? 1
      : readOptionalBoolean(invariantResults, "canonical_convergence") === true
        ? 1
        : isAcceptedDecision(input.acceptanceEntry)
          ? 0.75
          : 0.5;

  return Number(
    (((invariantConfidence * 2) + convergenceConfidence) / 3).toFixed(2),
  );
}

function isAcceptedDecision(entry: Record<string, unknown>): boolean {
  const decision = readOptionalString(entry, "decision");
  return decision === "ACCEPTED" || decision === "ALREADY_ACCEPTED";
}

function readRecordArray(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry),
  );
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readBooleanRecord(
  value: unknown,
): Readonly<Record<string, boolean>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry) => typeof entry[1] === "boolean"),
  );
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = readOptionalString(record, key);
  if (value === null) {
    throw new Error(`Expected string field ${key}.`);
  }
  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readOptionalBoolean(
  record: Readonly<Record<string, boolean>> | Record<string, unknown>,
  key: string,
): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function toRuntimeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toEnterpriseRelativeRef(gateRoot: string, path: string): string {
  return `enterprise/science/gate-c/${path.slice(gateRoot.length + 1).replaceAll("\\", "/")}`;
}

export function resolveFoundationEvidenceFiles(
  evidenceDir: string,
): FoundationEvidenceFiles {
  return {
    artifactRegistry: resolve(evidenceDir, "artifact-registry.json"),
    capabilityDependencyConstitution: resolve(
      evidenceDir,
      "capability-dependency-constitution.json",
    ),
    capabilityCertification: resolve(
      evidenceDir,
      "capability-certification.json",
    ),
    capabilityOperationalMetrics: resolve(
      evidenceDir,
      "capability-operational-metrics.json",
    ),
    capabilityGovernanceIndex: resolve(
      evidenceDir,
      "capability-governance-index.json",
    ),
    capabilityGovernanceVerification: resolve(
      evidenceDir,
      "capability-governance-verification.json",
    ),
    capabilityGovernanceDir: resolve(evidenceDir, "capability-governance"),
    capabilityGraph: resolve(evidenceDir, "capability-graph.json"),
    capabilityGraphYaml: resolve(evidenceDir, "capability-graph.yaml"),
    capabilityGraphVerification: resolve(
      evidenceDir,
      "capability-graph-verification.json",
    ),
    enterpriseControlGraph: resolve(
      evidenceDir,
      "enterprise-control-graph.json",
    ),
    enterpriseControlGraphVerification: resolve(
      evidenceDir,
      "enterprise-control-graph-verification.json",
    ),
    contractVersionRegistry: resolve(
      evidenceDir,
      "contract-version-registry.json",
    ),
    contractVersionEvolution: resolve(
      evidenceDir,
      "contract-version-evolution.json",
    ),
    architectureTrend: resolveProjectionStorageLocation({
      baseDir: evidenceDir,
      scope: "foundation_verification",
      projectionType: "TrendProjection",
    }),
    governanceSummaryView: resolve(evidenceDir, "governance-summary-view.json"),
    governanceClaimsView: resolve(evidenceDir, "governance-claims-view.json"),
    governanceHealthView: resolve(evidenceDir, "governance-health-view.json"),
    governanceDashboardView: resolve(
      evidenceDir,
      "governance-dashboard-view.json",
    ),
    governanceReadModelMetrics: resolve(
      evidenceDir,
      "governance-read-model-metrics.json",
    ),
    governanceIncrementalMaterialization: resolve(
      evidenceDir,
      "governance-incremental-materialization.json",
    ),
    governanceIncrementalMaterializationVerification: resolve(
      evidenceDir,
      "governance-incremental-materialization-verification.json",
    ),
    governanceSelectiveExecution: resolve(
      evidenceDir,
      "governance-selective-execution.json",
    ),
    governanceReadModelSelectiveExecution: resolve(
      evidenceDir,
      "governance-read-model-selective-execution.json",
    ),
    governanceSession: resolve(evidenceDir, "governance-session.json"),
    governanceSessionVerification: resolve(
      evidenceDir,
      "governance-session-verification.json",
    ),
    verificationRun: resolve(evidenceDir, "verification-run.json"),
    verificationRunVerification: resolve(
      evidenceDir,
      "verification-run-verification.json",
    ),
    governanceCatalog: resolve(evidenceDir, "governance-catalog.json"),
    governanceCatalogVerification: resolve(
      evidenceDir,
      "governance-catalog-verification.json",
    ),
    trustFramework: resolve(evidenceDir, "trust-framework.json"),
    trustFrameworkVerification: resolve(
      evidenceDir,
      "trust-framework-verification.json",
    ),
    attestationLifecycleVerification: resolve(
      evidenceDir,
      "attestation-lifecycle-verification.json",
    ),
    attestationLifecycleMaterialization: resolve(
      evidenceDir,
      "attestation-lifecycle-materialization.json",
    ),
    trustSignatureProviderRegistry: resolve(
      evidenceDir,
      "trust-signature-provider-registry.json",
    ),
    trustSignatureProviderVerification: resolve(
      evidenceDir,
      "trust-signature-provider-verification.json",
    ),
    trustSignatureMaterialization: resolve(
      evidenceDir,
      "trust-signature-materialization.json",
    ),
    constitutionAttestationPolicy: resolve(
      evidenceDir,
      "constitution-attestation-policy.json",
    ),
    constitutionLawResults: resolve(
      evidenceDir,
      "constitution-law-results.json",
    ),
    constitutionEvidencePackages: resolve(
      evidenceDir,
      "constitution-evidence-packages.json",
    ),
    constitutionCertificates: resolve(
      evidenceDir,
      "constitution-certificates.json",
    ),
    constitutionAttestations: resolve(
      evidenceDir,
      "constitution-attestations.json",
    ),
    constitutionClaims: resolve(evidenceDir, "constitution-claims.json"),
    constitutionSummary: resolve(evidenceDir, "constitution-summary.json"),
    constitutionProofBundle: resolve(
      evidenceDir,
      "constitution-proof-bundle.json",
    ),
    executionChain: resolve(evidenceDir, "execution-chain-summary.json"),
    executionEvidence: resolve(evidenceDir, "execution-evidence.json"),
    executionPlan: resolve(evidenceDir, "execution-plan-summary.json"),
    executionGraph: resolveProjectionStorageLocation({
      baseDir: evidenceDir,
      scope: "foundation_verification",
      projectionType: "ExecutionGraphProjection",
    }),
    foundation: resolve(evidenceDir, "foundation-report.json"),
    foundationProjection: resolve(evidenceDir, "foundation-report-projection.json"),
    foundationEvidence: resolve(evidenceDir, "foundation-report-evidence.json"),
    evolution: resolve(evidenceDir, "evolution-delta.json"),
    fitness: resolve(evidenceDir, "fitness-report.json"),
    graphFitness: resolve(evidenceDir, "graph-fitness.json"),
    architectureFitness: resolve(evidenceDir, "architecture-fitness.json"),
    constitution: resolve(evidenceDir, "constitution-report.json"),
    guardrails: resolve(evidenceDir, "guardrail-report.json"),
    granularClr: resolve(evidenceDir, "granular-clr-matrix.json"),
    artifactGraph: resolve(evidenceDir, "artifact-graph.json"),
    graphHealth: resolve(evidenceDir, "graph-health.json"),
    specAudit: resolve(evidenceDir, "spec-execution-audit.json"),
    decisionQuality: resolve(evidenceDir, "decision-quality-report.json"),
    learningIntelligence: resolve(
      evidenceDir,
      "learning-intelligence-report.json",
    ),
    learningRegistry: resolve(
      evidenceDir,
      "learning-registry.json",
    ),
    knowledgeRegistry: resolve(
      evidenceDir,
      "knowledge-registry.json",
    ),
    evidenceProducerConvergence: resolve(
      evidenceDir,
      "evidence-producer-convergence-report.json",
    ),
    specificationConformance: resolve(
      evidenceDir,
      "specification-conformance-report.json",
    ),
    specificationConformanceProjection: resolve(
      evidenceDir,
      "specification-conformance-projection.json",
    ),
    specificationConformanceEvidence: resolve(
      evidenceDir,
      "specification-conformance-evidence.json",
    ),
    specificationArtifactGraph: resolve(
      evidenceDir,
      "specification-artifact-graph.json",
    ),
    specificationVocabularyAudit: resolve(
      evidenceDir,
      "specification-vocabulary-audit.json",
    ),
    topologyDrift: resolveProjectionStorageLocation({
      baseDir: evidenceDir,
      scope: "foundation_verification",
      projectionType: "TopologyDriftProjection",
    }),
    summary: resolve(evidenceDir, "foundation-summary.md"),
  };
}

export function readPreviousFoundationArtifacts(
  evidenceFiles: FoundationEvidenceFiles,
): {
  readonly previousFitnessReport: Record<string, unknown> | null;
  readonly previousTrendReport: Record<string, unknown> | null;
} {
  return {
    previousFitnessReport: existsSync(evidenceFiles.fitness)
      ? readJsonFile<Record<string, unknown>>(evidenceFiles.fitness)
      : null,
    previousTrendReport: existsSync(evidenceFiles.architectureTrend)
      ? readJsonFile<Record<string, unknown>>(evidenceFiles.architectureTrend)
      : null,
  };
}

function readMappedCapabilities(path: string): readonly string[] {
  if (!existsSync(path)) {
    return [];
  }

  return unique(
    readFileSync(path, "utf8")
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.match(/^[^,]+,([^,]+),/)?.[1]?.trim() ?? null)
      .filter((value): value is string => value !== null && value.length > 0),
  );
}

function normalizeRatio(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value > 1) {
    return Number((value / 100).toFixed(4));
  }
  return Number(value.toFixed(4));
}

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

function averageObservedRatio(
  values: readonly (number | null)[],
): number | null {
  const observed = values.filter((value): value is number => value !== null);
  if (observed.length === 0) {
    return null;
  }
  return Number(
    (observed.reduce((sum, value) => sum + value, 0) / observed.length).toFixed(
      4,
    ),
  );
}

export function buildFoundationProductEvidence(input: {
  readonly workspaceRoot: string;
  readonly productId: string;
  readonly requiredProductEvidence?: readonly string[];
}): FoundationProductEvidence {
  const requiredEvidence =
    input.requiredProductEvidence ?? REQUIRED_PRODUCT_EVIDENCE;
  const manifestPath = resolve(
    input.workspaceRoot,
    `apps/${input.productId}/workspace.manifest.ts`,
  );
  const evidenceDir = resolve(
    input.workspaceRoot,
    `products/${input.productId}/evidence/verification`,
  );
  const clrPath = resolve(evidenceDir, "clr-report.json");
  const testsPath = resolve(evidenceDir, "functional-test-report.json");
  const replayPath = resolve(evidenceDir, "composition-replay.json");
  const mappingMatrixPath = resolve(
    evidenceDir,
    "capability-mapping-matrix.csv",
  );
  const runtimeInvocationReportPath = resolve(
    evidenceDir,
    "runtime-invocation-report.json",
  );
  const executionPlanPath = resolveProjectionStorageLocation({
    baseDir: evidenceDir,
    scope: "product_verification",
    projectionType: "ExecutionPlanProjection",
  });
  const executionChainReportPath = resolveProjectionStorageLocation({
    baseDir: evidenceDir,
    scope: "product_verification",
    projectionType: "ExecutionChainProjection",
  });
  const executionTimelinePath = resolveProjectionStorageLocation({
    baseDir: evidenceDir,
    scope: "product_verification",
    projectionType: "ExecutionTimelineProjection",
  });
  const verificationSummaryPath = resolve(
    evidenceDir,
    "verification-summary.md",
  );
  const missingEvidence = requiredEvidence.filter(
    (file) => !existsSync(resolve(evidenceDir, file)),
  );

  const capabilities = existsSync(manifestPath)
    ? tryReadWorkspaceCapabilities(manifestPath)
    : [];
  const functionalTestReport = existsSync(testsPath)
    ? readJsonFile<{
        readonly summary?: {
          readonly pass?: number;
          readonly total?: number;
        };
      }>(testsPath)
    : null;
  const clrReport = existsSync(clrPath)
    ? readJsonFile<{
        readonly capability_reuse?: {
          readonly reuse_ratio?: number;
          readonly clr?: number | "FULL_REUSE";
        };
        readonly experience_module_reuse?: {
          readonly reuse_ratio?: number;
        };
      }>(clrPath)
    : null;
  const replayReport = existsSync(replayPath)
    ? readJsonFile<{
        readonly status?: "PASS" | "FAIL";
      }>(replayPath)
    : null;
  const runtimeInvocationReport = existsSync(runtimeInvocationReportPath)
    ? readJsonFile<{
        readonly plan_instance_id?: string;
        readonly summary?: {
          readonly total_invocations?: number;
          readonly observed_capabilities?: number;
          readonly verified_capabilities?: number;
          readonly reproducible_capabilities?: number;
        };
        readonly capabilities?: readonly {
          readonly capability_id: string;
          readonly status: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
          readonly invocation_count: number;
          readonly success_count: number;
          readonly failure_count: number;
          readonly reproducible_operation_count: number;
        }[];
      }>(runtimeInvocationReportPath)
    : null;
  const executionChainReport = existsSync(executionChainReportPath)
    ? readJsonFile<{
        readonly summary?: {
          readonly plan_instance_id?: string;
          readonly total_invocations?: number;
          readonly total_chains?: number;
          readonly unique_chain_digests?: number;
          readonly chains_with_requirement?: number;
          readonly chains_with_workflow?: number;
          readonly chains_with_plan?: number;
          readonly chains_with_evidence?: number;
          readonly chains_with_verification?: number;
          readonly verified_chains?: number;
          readonly reproducible_chains?: number;
          readonly stable_chains?: number;
          readonly total_projected_edges?: number;
          readonly chain_projection_digest?: string;
        };
        readonly chains?: readonly {
          readonly chain_id?: string;
          readonly chain_digest?: string;
          readonly product_id?: string;
          readonly capability_id?: string;
          readonly plan_id?: string;
          readonly plan_instance_id?: string;
          readonly plan_instance_node_id?: string;
          readonly chain_status?: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
          readonly capability_status?: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
          readonly invocation_count?: number;
          readonly capability_node_id?: string;
          readonly operation_node_id?: string;
          readonly invocation_ids?: readonly string[];
          readonly requirement_node_ids?: readonly string[];
          readonly workflow_node_ids?: readonly string[];
          readonly plan_node_ids?: readonly string[];
          readonly evidence_node_ids?: readonly string[];
          readonly verification_node_ids?: readonly string[];
          readonly replay_node_ids?: readonly string[];
          readonly projected_edges?: readonly {
            readonly edge_id?: string;
            readonly edge_digest?: string;
            readonly from?: string;
            readonly to?: string;
            readonly topology_layer?: "observed";
            readonly edge_type?:
              "runtime" | "evidence" | "verification" | "replay";
            readonly claim_status?: "OBSERVED" | "VERIFIED";
            readonly lifecycle_state?:
              "ACTIVE" | "EXECUTED" | "VERIFIED" | "REPLAYABLE";
            readonly declared?: false;
            readonly observed?: true;
            readonly created_by_chain?: string;
            readonly plan_instance_id?: string;
            readonly source_ref?: string;
            readonly evidence_ref?: string | null;
          }[];
        }[];
      }>(executionChainReportPath)
    : null;
  const executionTimelineReport = existsSync(executionTimelinePath)
    ? readJsonFile<{
        readonly summary?: {
          readonly total_events?: number;
          readonly node_lifecycle_events?: number;
          readonly edge_lifecycle_events?: number;
          readonly first_event_utc?: string;
          readonly last_event_utc?: string;
        };
      }>(executionTimelinePath)
    : null;
  const executionPlanReport = existsSync(executionPlanPath)
    ? readJsonFile<{
        readonly plan_id?: string;
        readonly plan_digest?: string;
        readonly plan_instance?: {
          readonly plan_instance_id?: string;
        };
        readonly projection_source?: "execution_graph" | "registry_entries";
        readonly execution_graph_digest?: string | null;
      }>(executionPlanPath)
    : null;

  return {
    product_id: input.productId,
    app_manifest_exists: existsSync(manifestPath),
    evidence_complete: missingEvidence.length === 0,
    missing_evidence: missingEvidence,
    capabilities,
    mapped_capabilities: readMappedCapabilities(mappingMatrixPath),
    verification_summary_exists: existsSync(verificationSummaryPath),
    composition_replay_status: replayReport?.status ?? "MISSING",
    runtime_invocation_summary: runtimeInvocationReport?.summary
      ? {
          plan_instance_id:
            runtimeInvocationReport.plan_instance_id ?? "UNVERIFIED",
          total_invocations:
            runtimeInvocationReport.summary.total_invocations ?? 0,
          observed_capabilities:
            runtimeInvocationReport.summary.observed_capabilities ?? 0,
          verified_capabilities:
            runtimeInvocationReport.summary.verified_capabilities ?? 0,
          reproducible_capabilities:
            runtimeInvocationReport.summary.reproducible_capabilities ?? 0,
        }
      : null,
    runtime_invocation_capabilities:
      runtimeInvocationReport?.capabilities ?? [],
    execution_chain_summary: executionChainReport?.summary
      ? {
          plan_instance_id:
            executionChainReport.summary.plan_instance_id ?? "UNVERIFIED",
          total_invocations:
            executionChainReport.summary.total_invocations ?? 0,
          total_chains: executionChainReport.summary.total_chains ?? 0,
          unique_chain_digests:
            executionChainReport.summary.unique_chain_digests ?? 0,
          chains_with_requirement:
            executionChainReport.summary.chains_with_requirement ?? 0,
          chains_with_workflow:
            executionChainReport.summary.chains_with_workflow ?? 0,
          chains_with_plan: executionChainReport.summary.chains_with_plan ?? 0,
          chains_with_evidence:
            executionChainReport.summary.chains_with_evidence ?? 0,
          chains_with_verification:
            executionChainReport.summary.chains_with_verification ?? 0,
          verified_chains: executionChainReport.summary.verified_chains ?? 0,
          reproducible_chains:
            executionChainReport.summary.reproducible_chains ?? 0,
          stable_chains: executionChainReport.summary.stable_chains ?? 0,
          total_projected_edges:
            executionChainReport.summary.total_projected_edges ?? 0,
          chain_projection_digest:
            executionChainReport.summary.chain_projection_digest ??
            "UNVERIFIED",
        }
      : null,
    execution_timeline_summary: executionTimelineReport?.summary
      ? {
          total_events: executionTimelineReport.summary.total_events ?? 0,
          node_lifecycle_events:
            executionTimelineReport.summary.node_lifecycle_events ?? 0,
          edge_lifecycle_events:
            executionTimelineReport.summary.edge_lifecycle_events ?? 0,
          first_event_utc:
            executionTimelineReport.summary.first_event_utc ?? "UNVERIFIED",
          last_event_utc:
            executionTimelineReport.summary.last_event_utc ?? "UNVERIFIED",
        }
      : null,
    execution_chains:
      executionChainReport?.chains?.map((chain) => ({
        chain_id: chain.chain_id ?? "UNVERIFIED",
        chain_digest: chain.chain_digest ?? "UNVERIFIED",
        product_id: chain.product_id ?? input.productId,
        capability_id: chain.capability_id ?? "UNVERIFIED",
        plan_id: chain.plan_id ?? "UNVERIFIED",
        plan_instance_id: chain.plan_instance_id ?? "UNVERIFIED",
        plan_instance_node_id: chain.plan_instance_node_id ?? "UNVERIFIED",
        chain_status: chain.chain_status ?? "OBSERVED",
        capability_status: chain.capability_status ?? "OBSERVED",
        invocation_count: chain.invocation_count ?? 0,
        capability_node_id:
          chain.capability_node_id ??
          `CAP:${chain.capability_id ?? "UNVERIFIED"}`,
        operation_node_id:
          chain.operation_node_id ??
          `OP:${chain.capability_id ?? "UNVERIFIED"}:unknown`,
        invocation_ids: chain.invocation_ids ?? [],
        requirement_node_ids: chain.requirement_node_ids ?? [],
        workflow_node_ids: chain.workflow_node_ids ?? [],
        plan_node_ids: chain.plan_node_ids ?? [],
        evidence_node_ids: chain.evidence_node_ids ?? [],
        verification_node_ids: chain.verification_node_ids ?? [],
        replay_node_ids: chain.replay_node_ids ?? [],
        projected_edges:
          chain.projected_edges?.map((edge) => ({
            edge_id: edge.edge_id ?? "UNVERIFIED",
            edge_digest: edge.edge_digest ?? "UNVERIFIED",
            from: edge.from ?? "UNVERIFIED",
            to: edge.to ?? "UNVERIFIED",
            topology_layer: edge.topology_layer ?? "observed",
            edge_type: edge.edge_type ?? "runtime",
            claim_status: edge.claim_status ?? "OBSERVED",
            lifecycle_state: edge.lifecycle_state ?? "ACTIVE",
            declared: false,
            observed: true,
            created_by_chain:
              edge.created_by_chain ?? chain.chain_id ?? "UNVERIFIED",
            plan_instance_id:
              edge.plan_instance_id ?? chain.plan_instance_id ?? "UNVERIFIED",
            source_ref:
              edge.source_ref ??
              `${input.productId}:${chain.chain_id ?? "UNVERIFIED"}`,
            evidence_ref: edge.evidence_ref ?? null,
          })) ?? [],
      })) ?? [],
    execution_plan_summary:
      executionPlanReport?.plan_id && executionPlanReport?.plan_digest
        ? {
            plan_id: executionPlanReport.plan_id,
            plan_digest: executionPlanReport.plan_digest,
            plan_instance_id:
              executionPlanReport.plan_instance?.plan_instance_id ??
              "UNVERIFIED",
            projection_source:
              executionPlanReport.projection_source ?? "registry_entries",
            execution_graph_digest:
              executionPlanReport.execution_graph_digest ?? null,
          }
        : null,
    functional_tests_passed: functionalTestReport?.summary?.pass ?? 0,
    functional_tests_total: functionalTestReport?.summary?.total ?? 0,
    capability_reuse_ratio: normalizeRatio(
      clrReport?.capability_reuse?.reuse_ratio,
    ),
    experience_reuse_ratio: normalizeRatio(
      clrReport?.experience_module_reuse?.reuse_ratio,
    ),
    clr: clrReport?.capability_reuse?.clr ?? null,
  };
}

export function buildFoundationMetrics(
  portfolio: FoundationProductPortfolio,
  productEvidence: readonly FoundationProductEvidence[],
): Record<string, unknown> {
  const portfolioProducts = portfolio.products ?? [];
  const declaredProducts = portfolioProducts.map((product) => product.id);
  const activeProducts = portfolioProducts
    .filter((product) => (product.status ?? "ACTIVE") === "ACTIVE")
    .map((product) => product.id);
  const implementedProducts = productEvidence.filter(
    (product) => product.app_manifest_exists,
  );
  const implementedActiveProducts = implementedProducts.filter((product) =>
    activeProducts.includes(product.product_id),
  );
  const verifiedProducts = productEvidence.filter(
    (product) =>
      product.app_manifest_exists &&
      product.evidence_complete &&
      product.functional_tests_total > 0 &&
      product.functional_tests_passed === product.functional_tests_total,
  );
  const verifiedActiveProducts = verifiedProducts.filter((product) =>
    activeProducts.includes(product.product_id),
  );
  const implementedProductIds = implementedProducts.map(
    (product) => product.product_id,
  );
  const verifiedProductIds = verifiedProducts.map((product) => product.product_id);
  const implementedActiveProductIds = implementedActiveProducts.map(
    (product) => product.product_id,
  );
  const verifiedActiveProductIds = verifiedActiveProducts.map(
    (product) => product.product_id,
  );
  const missingProductImplementation = declaredProducts.filter(
    (productId) => !implementedProductIds.includes(productId),
  );
  const pendingProductVerification = implementedProductIds.filter(
    (productId) => !verifiedProductIds.includes(productId),
  );
  const missingActiveProductImplementation = activeProducts.filter(
    (productId) => !implementedActiveProductIds.includes(productId),
  );
  const pendingActiveProductVerification = implementedActiveProductIds.filter(
    (productId) => !verifiedActiveProductIds.includes(productId),
  );

  const capabilityFrequency = new Map<string, number>();
  for (const product of portfolioProducts) {
    for (const capability of product.shared_capabilities ?? []) {
      capabilityFrequency.set(
        capability,
        (capabilityFrequency.get(capability) ?? 0) + 1,
      );
    }
  }

  const declaredSharedCapabilities = Array.from(capabilityFrequency.entries())
    .filter(([, count]) => count > 1)
    .map(([capability]) => capability)
    .sort();

  return {
    foundation_status:
      verifiedActiveProducts.length === activeProducts.length &&
      activeProducts.length > 0
        ? "HEALTHY_BASELINE"
        : verifiedActiveProducts.length > 0
          ? "PARTIAL_BASELINE"
          : "UNVERIFIED_BASELINE",
    declared_products: declaredProducts.length,
    active_products: activeProducts.length,
    implemented_products: implementedProducts.length,
    verified_products: verifiedProducts.length,
    implemented_active_products: implementedActiveProducts.length,
    verified_active_products: verifiedActiveProducts.length,
    active_portfolio_coverage_ratio:
      activeProducts.length === 0
        ? 0
        : Number(
            (verifiedActiveProducts.length / activeProducts.length).toFixed(4),
          ),
    active_portfolio_coverage_percentage:
      activeProducts.length === 0
        ? 0
        : Number(
            ((verifiedActiveProducts.length / activeProducts.length) * 100).toFixed(
              1,
            ),
          ),
    implementation_coverage_ratio:
      declaredProducts.length === 0
        ? 0
        : Number(
            (implementedProducts.length / declaredProducts.length).toFixed(4),
          ),
    implementation_coverage_percentage:
      declaredProducts.length === 0
        ? 0
        : Number(
            ((implementedProducts.length / declaredProducts.length) * 100).toFixed(
              1,
            ),
          ),
    portfolio_coverage_ratio:
      declaredProducts.length === 0
        ? 0
        : Number(
            (verifiedProducts.length / declaredProducts.length).toFixed(4),
          ),
    portfolio_coverage_percentage:
      declaredProducts.length === 0
        ? 0
        : Number(
            ((verifiedProducts.length / declaredProducts.length) * 100).toFixed(
              1,
            ),
          ),
    declared_shared_capabilities: declaredSharedCapabilities,
    active_product_ids: activeProducts,
    implemented_product_ids: implementedProductIds,
    verified_product_ids: verifiedProductIds,
    implemented_active_product_ids: implementedActiveProductIds,
    verified_active_product_ids: verifiedActiveProductIds,
    missing_product_implementation: missingProductImplementation,
    pending_product_verification: pendingProductVerification,
    missing_active_product_implementation: missingActiveProductImplementation,
    pending_active_product_verification: pendingActiveProductVerification,
    missing_product_verification: declaredProducts.filter(
      (productId) =>
        !verifiedProducts.some((product) => product.product_id === productId),
    ),
    claim_boundary:
      verifiedActiveProducts.length < activeProducts.length
        ? "Foundation verification uses ACTIVE products as the execution baseline and still reports declared portfolio backlog separately. A declared PLANNED product without a workspace manifest is roadmap scope, while an ACTIVE product without evidence is a verification gap."
        : "All ACTIVE portfolio products are implemented in the workspace and have executable verification evidence.",
  };
}

export function buildGranularClrMatrix(
  productEvidence: readonly FoundationProductEvidence[],
): Record<string, unknown> {
  const capabilityRatio = averageObservedRatio(
    productEvidence.map((product) => product.capability_reuse_ratio),
  );
  const experienceRatio = averageObservedRatio(
    productEvidence.map((product) => product.experience_reuse_ratio),
  );

  const components: readonly ClrComponent[] = [
    {
      key: "core",
      weight: 0.25,
      target_minimum: 1,
      actual_ratio: null,
      status: "UNVERIFIED",
      evidence_basis: "Dedicated core diff verification not yet implemented",
    },
    {
      key: "workflow",
      weight: 0.2,
      target_minimum: 0.9,
      actual_ratio: null,
      status: "UNVERIFIED",
      evidence_basis: "Workflow reuse telemetry not yet materialized",
    },
    {
      key: "capability",
      weight: 0.2,
      target_minimum: 0.85,
      actual_ratio: capabilityRatio,
      status:
        capabilityRatio === null
          ? "UNVERIFIED"
          : capabilityRatio >= 0.85
            ? "PASS"
            : "FAIL",
      evidence_basis: "clr-report.json capability_reuse.reuse_ratio",
    },
    {
      key: "integration",
      weight: 0.1,
      target_minimum: 0.85,
      actual_ratio: null,
      status: "UNVERIFIED",
      evidence_basis: "Integration reuse audit not yet materialized",
    },
    {
      key: "experience",
      weight: 0.15,
      target_minimum: 0.8,
      actual_ratio: experienceRatio,
      status:
        experienceRatio === null
          ? "UNVERIFIED"
          : experienceRatio >= 0.8
            ? "PASS"
            : "FAIL",
      evidence_basis: "clr-report.json experience_module_reuse.reuse_ratio",
    },
    {
      key: "ui",
      weight: 0.1,
      target_minimum: 0.8,
      actual_ratio: null,
      status: "UNVERIFIED",
      evidence_basis: "UI reuse audit not yet materialized",
    },
  ];

  const observedWeight = Number(
    components
      .filter((component) => component.actual_ratio !== null)
      .reduce((sum, component) => sum + component.weight, 0)
      .toFixed(4),
  );
  const weightedObservedClr = Number(
    components
      .filter(
        (
          component,
        ): component is ClrComponent & { readonly actual_ratio: number } =>
          component.actual_ratio !== null,
      )
      .reduce(
        (sum, component) => sum + component.weight * component.actual_ratio,
        0,
      )
      .toFixed(4),
  );

  return {
    method: "weighted_clr_matrix",
    components,
    weighted_clr_observed: weightedObservedClr,
    observed_weight: observedWeight,
    weighted_clr_normalized:
      observedWeight === 0
        ? null
        : Number((weightedObservedClr / observedWeight).toFixed(4)),
    claim_boundary:
      "Composite CLR is partial until core, workflow, integration, and UI reuse evidence are materialized.",
  };
}

export function buildEvolutionDelta(
  productEvidence: readonly FoundationProductEvidence[],
): Record<string, unknown> {
  const manifestProducts = productEvidence.filter(
    (product) => product.app_manifest_exists,
  );
  if (manifestProducts.length < 2) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason:
        "At least two product manifests are required to measure evolution delta across products.",
      observed_products: manifestProducts.map((product) => product.product_id),
      missing_products: productEvidence
        .filter((product) => !product.app_manifest_exists)
        .map((product) => product.product_id),
    };
  }

  const baseline = manifestProducts[0]!;
  const baselineCapabilities = new Set(baseline.capabilities);

  return {
    status: "PARTIAL",
    baseline_product: baseline.product_id,
    deltas: manifestProducts.slice(1).map((product) => ({
      product_id: product.product_id,
      capability_new: product.capabilities.filter(
        (capability) => !baselineCapabilities.has(capability),
      ).length,
      capability_shared: product.capabilities.filter((capability) =>
        baselineCapabilities.has(capability),
      ).length,
      core_delta: "UNVERIFIED",
      experience_module_delta: "UNVERIFIED",
      policy_delta: "UNVERIFIED",
      theme_delta: "UNVERIFIED",
    })),
    claim_boundary:
      "Only manifest-level capability delta is measured. Core/package/policy/theme delta still requires dedicated diff verification.",
  };
}

export function buildSpecExecutionAudit(input: {
  readonly enterpriseRoot: string;
  readonly executableSpecBindings?: typeof DEFAULT_EXECUTABLE_SPEC_BINDINGS;
}): Record<string, unknown> {
  const executableSpecBindings =
    input.executableSpecBindings ?? DEFAULT_EXECUTABLE_SPEC_BINDINGS;
  const specificationFiles = readdirSync(
    resolve(input.enterpriseRoot, "specifications"),
  )
    .map((file) => `enterprise/specifications/${file}`)
    .filter(
      (path) =>
        path.endsWith(".yaml") ||
        path.endsWith(".spec.yaml") ||
        path.endsWith(".pipeline.yaml"),
    )
    .sort();
  const auditedFiles = [
    ...specificationFiles,
    "enterprise/execution/QUALITY-GATES.yaml",
  ];

  const specs = auditedFiles.map((spec) => {
    const binding = executableSpecBindings[spec];
    return {
      spec,
      executable_ssot: Boolean(binding),
      classification: binding ? "EXECUTABLE_SSOT" : "DOCUMENTATION_ONLY",
      consumer_command: binding?.consumer_command ?? null,
      stage_chain: binding?.stage_chain ?? {
        planner: false,
        composer: false,
        runtime: false,
        verification: false,
        evidence: false,
      },
      evidence_artifact: binding?.evidence_artifact ?? null,
    };
  });

  return {
    summary: {
      total_specs: specs.length,
      executable_ssot: specs.filter((spec) => spec.executable_ssot).length,
      documentation_only: specs.filter((spec) => !spec.executable_ssot).length,
    },
    specs,
    rule: "If a specification is not consumed by planner, composer, runtime, or verification, it must not be presented as executable architecture.",
  };
}

export function buildCapabilityExecutionEvidence(input: {
  readonly registryReport: {
    readonly capabilities: readonly {
      readonly id: string;
      readonly name: string;
      readonly provided_capabilities: readonly string[];
      readonly lifecycle_stage: string;
      readonly governance_status: string;
      readonly consumers: readonly string[];
      readonly empirically_verified_products: readonly string[];
      readonly reachable_from_products: readonly string[];
    }[];
  };
  readonly productEvidence: readonly FoundationProductEvidence[];
}): Record<string, unknown> {
  const matchesCapability = (
    capability: {
      readonly id: string;
      readonly provided_capabilities: readonly string[];
    },
    candidate: string,
  ): boolean =>
    candidate === capability.id ||
    capability.provided_capabilities.includes(candidate);

  const capabilities = input.registryReport.capabilities.map((capability) => {
    const perProduct = input.productEvidence.map((product) => {
      const executionChains = product.execution_chains.filter((chain) =>
        matchesCapability(capability, chain.capability_id),
      );
      const declaredInProduct = product.capabilities.some((entry) =>
        matchesCapability(capability, entry),
      );
      const compositionMapped = product.mapped_capabilities.some((entry) =>
        matchesCapability(capability, entry),
      );
      const runtimeReferenced = capability.reachable_from_products.includes(
        product.product_id,
      );
      const runtimeInvocation = product.runtime_invocation_capabilities.find(
        (entry) => matchesCapability(capability, entry.capability_id),
      );
      const verificationEvidence =
        product.verification_summary_exists &&
        product.evidence_complete &&
        (declaredInProduct || compositionMapped || runtimeReferenced);
      const functionalTestsPassed =
        product.functional_tests_total > 0 &&
        product.functional_tests_passed === product.functional_tests_total &&
        verificationEvidence;
      const replayVerified =
        product.composition_replay_status === "PASS" &&
        (declaredInProduct || compositionMapped);
      const executionStatus =
        runtimeInvocation?.status === "REPRODUCIBLE"
          ? "REPRODUCIBLE"
          : runtimeInvocation?.status === "VERIFIED"
            ? "VERIFIED"
            : runtimeInvocation?.status === "OBSERVED"
              ? "OBSERVED"
              : "DECLARED";

      return {
        product_id: product.product_id,
        declared_in_product: declaredInProduct,
        composition_mapped: compositionMapped,
        runtime_referenced: runtimeReferenced,
        verification_evidence: verificationEvidence,
        functional_tests_passed: functionalTestsPassed,
        replay_verified: replayVerified,
        runtime_invocation_count: runtimeInvocation?.invocation_count ?? 0,
        runtime_observed: runtimeInvocation !== undefined,
        runtime_verified:
          runtimeInvocation?.status === "VERIFIED" ||
          runtimeInvocation?.status === "REPRODUCIBLE",
        runtime_reproducible: runtimeInvocation?.status === "REPRODUCIBLE",
        execution_chain_digests: executionChains.map(
          (chain) => chain.chain_digest,
        ),
        stable_chain_ids: executionChains.map((chain) => chain.chain_id),
        execution_chains: executionChains.map((chain) => ({
          chain_id: chain.chain_id,
          chain_digest: chain.chain_digest,
          product_id: chain.product_id,
          plan_id: chain.plan_id,
          plan_instance_id: chain.plan_instance_id,
          plan_instance_node_id: chain.plan_instance_node_id,
          capability_id: chain.capability_id,
          capability_node_id: chain.capability_node_id,
          operation_node_id: chain.operation_node_id,
          invocation_ids: chain.invocation_ids,
          chain_status: chain.chain_status,
          requirement_node_ids: chain.requirement_node_ids,
          workflow_node_ids: chain.workflow_node_ids,
          plan_node_ids: chain.plan_node_ids,
          evidence_node_ids: chain.evidence_node_ids,
          verification_node_ids: chain.verification_node_ids,
          replay_node_ids: chain.replay_node_ids,
          projected_edges: chain.projected_edges,
        })),
        execution_status: executionStatus,
      };
    });

    const executionReachability = {
      product: perProduct.some((entry) => entry.declared_in_product),
      composition: perProduct.some((entry) => entry.composition_mapped),
      runtime: perProduct.some((entry) => entry.runtime_referenced),
      observed: perProduct.some((entry) => entry.runtime_observed),
      verified: perProduct.some((entry) => entry.runtime_verified),
      reproducible: perProduct.some((entry) => entry.runtime_reproducible),
      evidence: perProduct.some(
        (entry) => entry.verification_evidence && entry.functional_tests_passed,
      ),
      replay: perProduct.some((entry) => entry.replay_verified),
    };

    const status = perProduct.some(
      (entry) => entry.execution_status === "REPRODUCIBLE",
    )
      ? "REPRODUCIBLE"
      : perProduct.some((entry) => entry.execution_status === "VERIFIED")
        ? "VERIFIED"
        : perProduct.some((entry) => entry.execution_status === "OBSERVED")
          ? "OBSERVED"
          : "DECLARED";

    return {
      capability_id: capability.id,
      capability_name: capability.name,
      provided_capabilities: capability.provided_capabilities,
      lifecycle_stage: capability.lifecycle_stage,
      governance_status: capability.governance_status,
      declared_products: perProduct
        .filter((entry) => entry.declared_in_product)
        .map((entry) => entry.product_id),
      mapped_products: perProduct
        .filter((entry) => entry.composition_mapped)
        .map((entry) => entry.product_id),
      runtime_products: perProduct
        .filter((entry) => entry.runtime_referenced)
        .map((entry) => entry.product_id),
      empirically_verified_products: capability.empirically_verified_products,
      execution_reachability: {
        ...executionReachability,
        status,
      },
      runtime_invocations: {
        total: perProduct.reduce(
          (sum, entry) => sum + entry.runtime_invocation_count,
          0,
        ),
        observed_products: perProduct
          .filter((entry) => entry.runtime_observed)
          .map((entry) => entry.product_id),
        claim_boundary:
          "Runtime invocation telemetry is captured from actual capability service execution during product verification tests. Coverage is limited to currently verified products and exercised operations.",
      },
      stewardship_gap:
        capability.consumers.length > 0 &&
        capability.empirically_verified_products.length === 0
          ? "Declared consumer exists without executable product verification evidence."
          : "NONE",
      per_product: perProduct.filter(
        (entry) =>
          entry.declared_in_product ||
          entry.composition_mapped ||
          entry.runtime_referenced ||
          entry.verification_evidence ||
          entry.runtime_observed ||
          entry.execution_chains.length > 0,
      ),
      claim_boundary:
        "Execution evidence now distinguishes declared, observed, verified, and reproducible capability states using direct runtime invocation telemetry from product verification plus verification/replay evidence already present in the foundation pipeline.",
    };
  });

  return {
    summary: {
      total_capabilities: capabilities.length,
      declared_capabilities: capabilities.filter(
        (capability) =>
          (capability.execution_reachability as { readonly status: string })
            .status === "DECLARED",
      ).length,
      observed_capabilities: capabilities.filter((capability) =>
        ["OBSERVED", "VERIFIED", "REPRODUCIBLE"].includes(
          (capability.execution_reachability as { readonly status: string })
            .status,
        ),
      ).length,
      verified_capabilities: capabilities.filter((capability) =>
        ["VERIFIED", "REPRODUCIBLE"].includes(
          (capability.execution_reachability as { readonly status: string })
            .status,
        ),
      ).length,
      reproducible_capabilities: capabilities.filter(
        (capability) =>
          (capability.execution_reachability as { readonly status: string })
            .status === "REPRODUCIBLE",
      ).length,
    },
    capabilities,
    claim_boundary:
      "Execution evidence combines direct runtime invocation telemetry from verified product tests with verification and replay artifacts already produced by the foundation pipeline. It does not yet represent full production-time observability coverage.",
  };
}

export function buildExecutionChainSummary(
  productEvidence: readonly FoundationProductEvidence[],
): {
  readonly total_invocations: number;
  readonly total_chains: number;
  readonly unique_chain_digests: number;
  readonly chains_with_requirement: number;
  readonly chains_with_workflow: number;
  readonly chains_with_evidence: number;
  readonly reproducible_chains: number;
  readonly stable_chains: number;
  readonly chain_projection_digests: readonly string[];
  readonly chain_projection_digest: string;
} {
  const chainFingerprints = unique(
    productEvidence.flatMap((product) =>
      product.execution_chains.map(
        (chain) =>
          `${chain.product_id}:${chain.chain_digest}:${chain.chain_status}`,
      ),
    ),
  );
  return {
    total_invocations: productEvidence.reduce(
      (sum, product) =>
        sum + (product.execution_chain_summary?.total_invocations ?? 0),
      0,
    ),
    total_chains: productEvidence.reduce(
      (sum, product) =>
        sum + (product.execution_chain_summary?.total_chains ?? 0),
      0,
    ),
    unique_chain_digests: unique(
      productEvidence.flatMap((product) =>
        product.execution_chains.map((chain) => chain.chain_digest),
      ),
    ).length,
    chains_with_requirement: productEvidence.reduce(
      (sum, product) =>
        sum + (product.execution_chain_summary?.chains_with_requirement ?? 0),
      0,
    ),
    chains_with_workflow: productEvidence.reduce(
      (sum, product) =>
        sum + (product.execution_chain_summary?.chains_with_workflow ?? 0),
      0,
    ),
    chains_with_evidence: productEvidence.reduce(
      (sum, product) =>
        sum + (product.execution_chain_summary?.chains_with_evidence ?? 0),
      0,
    ),
    reproducible_chains: productEvidence.reduce(
      (sum, product) =>
        sum + (product.execution_chain_summary?.reproducible_chains ?? 0),
      0,
    ),
    stable_chains: productEvidence.reduce(
      (sum, product) =>
        sum + (product.execution_chain_summary?.stable_chains ?? 0),
      0,
    ),
    chain_projection_digests: unique(
      productEvidence
        .map(
          (product) =>
            product.execution_chain_summary?.chain_projection_digest ?? null,
        )
        .filter(
          (value): value is string => value !== null && value !== "UNVERIFIED",
        ),
    ),
    chain_projection_digest: DigestEngine.digest(chainFingerprints),
  };
}

export function buildExecutionPlanSummary(input: {
  readonly portfolio: FoundationProductPortfolio;
  readonly productEvidence: readonly FoundationProductEvidence[];
}): {
  readonly products_with_execution_plan: number;
  readonly execution_plan_coverage_ratio: number;
} {
  const declaredProducts =
    input.portfolio.products?.map((product) => product.id) ?? [];
  const withExecutionPlan = input.productEvidence.filter(
    (product) => product.execution_plan_summary !== null,
  ).length;
  return {
    products_with_execution_plan: withExecutionPlan,
    execution_plan_coverage_ratio:
      declaredProducts.length === 0
        ? 0
        : Number((withExecutionPlan / declaredProducts.length).toFixed(4)),
  };
}
