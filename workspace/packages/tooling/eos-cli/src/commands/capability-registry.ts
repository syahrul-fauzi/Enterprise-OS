import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildArtifactRegistryModel,
  buildCapabilityCertificationReport,
  buildCapabilityDiscoveryReportFromExecutionGraph,
  buildCapabilityDependencyConstitutionReport,
  buildCapabilityPlanningReportFromExecutionGraph,
  buildCapabilityRegistryModel,
  buildContractVersionRegistryReport,
  buildExecutionGraphModel,
  type ArtifactRegistryReport,
  type ExecutionGraphReport,
} from "@repo/core-capability-registry";
import { EOS_ROOT } from "../state.js";

const WORKSPACE_ROOT = resolve(EOS_ROOT, "workspace");
const ENTERPRISE_ROOT = resolve(EOS_ROOT, "enterprise");
const CAPABILITIES_ROOT = resolve(WORKSPACE_ROOT, "capabilities");
const REGISTRY_EVIDENCE_DIR = resolve(WORKSPACE_ROOT, "foundation/evidence/registry");
const DISCOVERY_EVIDENCE_DIR = resolve(WORKSPACE_ROOT, "foundation/evidence/discovery");
const FOUNDATION_ARTIFACT_REGISTRY_PATH = resolve(
  WORKSPACE_ROOT,
  "foundation/evidence/verification/artifact-registry.json",
);
const FOUNDATION_EXECUTION_GRAPH_PATH = resolve(
  WORKSPACE_ROOT,
  "foundation/evidence/verification/execution-graph.json",
);
const CAPABILITY_GOVERNANCE_DEBT_BUDGET = {
  owner_missing_max: 15,
  invalid_capabilities_max: 3,
  duplicate_candidates_max: 0,
} as const;

function ensureDirectory(path: string): void {
  mkdirSync(path, { recursive: true });
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function relativeToRepo(path: string): string {
  return path.replace(`${EOS_ROOT}/`, "");
}

function buildRegistrySummaryMarkdown(input: {
  readonly summary: {
    readonly total_capabilities: number;
    readonly with_owner: number;
    readonly owner_missing: number;
    readonly invalid_capabilities: number;
    readonly duplicate_candidates: number;
  };
  readonly dependencyConstitution: {
    readonly overall_status: string;
    readonly missing_dependencies: number;
    readonly api_runtime_violations: number;
    readonly consumer_mismatches: number;
    readonly unsatisfied_contract_requirements: number;
    readonly dependency_cycles: number;
    readonly boundary_violations: number;
    readonly dependency_policy_violations: number;
  };
  readonly contractVersionRegistry: {
    readonly total_contracts: number;
    readonly consumer_requirements: number;
    readonly unsatisfied_requirements: number;
    readonly multi_major_contracts: number;
    readonly pinned_consumer_requirements: number;
    readonly unbounded_consumer_requirements: number;
    readonly ambiguous_provider_bindings: number;
    readonly stable_contracts_with_multi_major: number;
    readonly overall_status: string;
  };
  readonly capabilityCertification: {
    readonly certified_capabilities: number;
    readonly partial_capabilities: number;
    readonly failed_capabilities: number;
    readonly performance_evaluated_capabilities: number;
    readonly overall_status: string;
  };
  readonly governanceDebtBudget: {
    readonly overall_status: string;
    readonly owner_missing: {
      readonly observed: number;
      readonly maximum_allowed: number;
      readonly status: string;
    };
    readonly invalid_capabilities: {
      readonly observed: number;
      readonly maximum_allowed: number;
      readonly status: string;
    };
    readonly duplicate_candidates: {
      readonly observed: number;
      readonly maximum_allowed: number;
      readonly status: string;
    };
  };
  readonly evidenceFiles: readonly string[];
}): string {
  return [
    "# Capability Registry Summary",
    "",
    `- total capabilities: ${input.summary.total_capabilities}`,
    `- with owner: ${input.summary.with_owner}`,
    `- owner missing: ${input.summary.owner_missing}`,
    `- invalid capabilities: ${input.summary.invalid_capabilities}`,
    `- duplicate candidates: ${input.summary.duplicate_candidates}`,
    `- dependency constitution: ${input.dependencyConstitution.overall_status}`,
    `- missing dependencies: ${input.dependencyConstitution.missing_dependencies}`,
    `- api runtime violations: ${input.dependencyConstitution.api_runtime_violations}`,
    `- consumer mismatches: ${input.dependencyConstitution.consumer_mismatches}`,
    `- unsatisfied contract requirements: ${input.dependencyConstitution.unsatisfied_contract_requirements}`,
    `- dependency cycles: ${input.dependencyConstitution.dependency_cycles}`,
    `- boundary violations: ${input.dependencyConstitution.boundary_violations}`,
    `- dependency policy violations: ${input.dependencyConstitution.dependency_policy_violations}`,
    `- contract registry status: ${input.contractVersionRegistry.overall_status}`,
    `- tracked contracts: ${input.contractVersionRegistry.total_contracts}`,
    `- contract requirements: ${input.contractVersionRegistry.consumer_requirements}`,
    `- unsatisfied registry requirements: ${input.contractVersionRegistry.unsatisfied_requirements}`,
    `- multi-major contracts: ${input.contractVersionRegistry.multi_major_contracts}`,
    `- pinned consumer requirements: ${input.contractVersionRegistry.pinned_consumer_requirements}`,
    `- unbounded consumer requirements: ${input.contractVersionRegistry.unbounded_consumer_requirements}`,
    `- ambiguous provider bindings: ${input.contractVersionRegistry.ambiguous_provider_bindings}`,
    `- stable contracts with multi-major: ${input.contractVersionRegistry.stable_contracts_with_multi_major}`,
    `- capability certification status: ${input.capabilityCertification.overall_status}`,
    `- certified capabilities: ${input.capabilityCertification.certified_capabilities}`,
    `- partial capabilities: ${input.capabilityCertification.partial_capabilities}`,
    `- failed capabilities: ${input.capabilityCertification.failed_capabilities}`,
    `- performance-evaluated capabilities: ${input.capabilityCertification.performance_evaluated_capabilities}`,
    `- governance debt budget status: ${input.governanceDebtBudget.overall_status}`,
    `- owner missing budget: ${input.governanceDebtBudget.owner_missing.observed}/${input.governanceDebtBudget.owner_missing.maximum_allowed} ${input.governanceDebtBudget.owner_missing.status}`,
    `- invalid capabilities budget: ${input.governanceDebtBudget.invalid_capabilities.observed}/${input.governanceDebtBudget.invalid_capabilities.maximum_allowed} ${input.governanceDebtBudget.invalid_capabilities.status}`,
    `- duplicate candidates budget: ${input.governanceDebtBudget.duplicate_candidates.observed}/${input.governanceDebtBudget.duplicate_candidates.maximum_allowed} ${input.governanceDebtBudget.duplicate_candidates.status}`,
    "",
    "## Evidence",
    ...input.evidenceFiles.map((file) => `- ${file}`),
    "",
  ].join("\n");
}

function buildCapabilityGovernanceDebtBudget(input: {
  readonly summary: {
    readonly owner_missing: number;
    readonly invalid_capabilities: number;
    readonly duplicate_candidates: number;
  };
}) {
  const budget = {
    owner_missing: {
      observed: input.summary.owner_missing,
      maximum_allowed: CAPABILITY_GOVERNANCE_DEBT_BUDGET.owner_missing_max,
      status:
        input.summary.owner_missing <=
        CAPABILITY_GOVERNANCE_DEBT_BUDGET.owner_missing_max
          ? ("PASS" as const)
          : ("FAIL" as const),
      enforcement_mode: "NO_REGRESSION" as const,
      rationale:
        "Owner coverage debt is tolerated only up to the current stabilization baseline. New regressions must not increase ownerless capabilities while the platform hardens.",
    },
    invalid_capabilities: {
      observed: input.summary.invalid_capabilities,
      maximum_allowed: CAPABILITY_GOVERNANCE_DEBT_BUDGET.invalid_capabilities_max,
      status:
        input.summary.invalid_capabilities <=
        CAPABILITY_GOVERNANCE_DEBT_BUDGET.invalid_capabilities_max
          ? ("PASS" as const)
          : ("FAIL" as const),
      enforcement_mode: "NO_REGRESSION" as const,
      rationale:
        "Invalid capability debt is frozen at the current stabilization baseline. Repository changes may reduce it, but must not increase it.",
    },
    duplicate_candidates: {
      observed: input.summary.duplicate_candidates,
      maximum_allowed: CAPABILITY_GOVERNANCE_DEBT_BUDGET.duplicate_candidates_max,
      status:
        input.summary.duplicate_candidates <=
        CAPABILITY_GOVERNANCE_DEBT_BUDGET.duplicate_candidates_max
          ? ("PASS" as const)
          : ("FAIL" as const),
      enforcement_mode: "ENFORCED_ZERO" as const,
      rationale:
        "Capability duplication introduces immediate architectural ambiguity, so duplicate candidates remain a strict zero-tolerance gate.",
    },
  };

  return {
    policy_version: "1.0.0",
    policy_name: "CapabilityGovernanceDebtBudget",
    summary: {
      overall_status:
        budget.owner_missing.status === "PASS" &&
        budget.invalid_capabilities.status === "PASS" &&
        budget.duplicate_candidates.status === "PASS"
          ? ("PASS" as const)
          : ("FAIL" as const),
      owner_missing: budget.owner_missing,
      invalid_capabilities: budget.invalid_capabilities,
      duplicate_candidates: budget.duplicate_candidates,
    },
    claim_boundary:
      "Capability governance debt budget freezes non-architectural cleanup debt at an explicit stabilization baseline while dependency law and contract law continue to fail hard. This supports platform maturity without forcing horizontal refactors during governance hardening.",
  };
}

function buildModel() {
  return buildCapabilityRegistryModel({
    eosRoot: EOS_ROOT,
    workspaceRoot: WORKSPACE_ROOT,
    enterpriseRoot: ENTERPRISE_ROOT,
    capabilitiesRoot: CAPABILITIES_ROOT,
  });
}

function loadExecutionGraphSnapshot(): {
  readonly executionGraph: ExecutionGraphReport;
  readonly source: "foundation_snapshot" | "live_build";
  readonly source_path: string;
} {
  if (existsSync(FOUNDATION_EXECUTION_GRAPH_PATH)) {
    return {
      executionGraph: readJson<ExecutionGraphReport>(FOUNDATION_EXECUTION_GRAPH_PATH),
      source: "foundation_snapshot",
      source_path: FOUNDATION_EXECUTION_GRAPH_PATH,
    };
  }

  if (existsSync(FOUNDATION_ARTIFACT_REGISTRY_PATH)) {
    const artifactRegistry = readJson<ArtifactRegistryReport>(FOUNDATION_ARTIFACT_REGISTRY_PATH);
    return {
      executionGraph: buildExecutionGraphModel(artifactRegistry),
      source: "foundation_snapshot",
      source_path: FOUNDATION_ARTIFACT_REGISTRY_PATH,
    };
  }

  const registry = buildModel();
  const artifactRegistry = buildArtifactRegistryModel(
    {
      eosRoot: EOS_ROOT,
      workspaceRoot: WORKSPACE_ROOT,
      enterpriseRoot: ENTERPRISE_ROOT,
      capabilitiesRoot: CAPABILITIES_ROOT,
    },
    registry,
  );
  return {
    executionGraph: buildExecutionGraphModel(artifactRegistry),
    source: "live_build",
    source_path: "live_build_from_repository",
  };
}

export async function runVerifyCapabilityRegistryCommand(): Promise<number> {
  ensureDirectory(REGISTRY_EVIDENCE_DIR);
  const report = buildModel();
  const dependencyConstitution = buildCapabilityDependencyConstitutionReport(
    {
      eosRoot: EOS_ROOT,
      workspaceRoot: WORKSPACE_ROOT,
      enterpriseRoot: ENTERPRISE_ROOT,
      capabilitiesRoot: CAPABILITIES_ROOT,
    },
    report,
  );
  const contractVersionRegistry = buildContractVersionRegistryReport(report);
  const capabilityCertification = buildCapabilityCertificationReport({
    registry: report,
    dependencyConstitution,
    contractVersionRegistry,
  });
  const governanceDebtBudget = buildCapabilityGovernanceDebtBudget({
    summary: report.summary,
  });
  const evidenceFiles = {
    registry: resolve(REGISTRY_EVIDENCE_DIR, "capability-registry-report.json"),
    dependencyConstitution: resolve(
      REGISTRY_EVIDENCE_DIR,
      "capability-dependency-constitution.json",
    ),
    contractVersionRegistry: resolve(
      REGISTRY_EVIDENCE_DIR,
      "contract-version-registry.json",
    ),
    capabilityCertification: resolve(
      REGISTRY_EVIDENCE_DIR,
      "capability-certification.json",
    ),
    governanceDebtBudget: resolve(
      REGISTRY_EVIDENCE_DIR,
      "capability-governance-debt-budget.json",
    ),
    summary: resolve(REGISTRY_EVIDENCE_DIR, "capability-registry-summary.md"),
  };

  writeJson(evidenceFiles.registry, report);
  writeJson(evidenceFiles.dependencyConstitution, dependencyConstitution);
  writeJson(evidenceFiles.contractVersionRegistry, contractVersionRegistry);
  writeJson(evidenceFiles.capabilityCertification, capabilityCertification);
  writeJson(evidenceFiles.governanceDebtBudget, governanceDebtBudget);
  writeFileSync(
    evidenceFiles.summary,
    buildRegistrySummaryMarkdown({
      summary: report.summary,
      dependencyConstitution: dependencyConstitution.summary,
      contractVersionRegistry: contractVersionRegistry.summary,
      capabilityCertification: capabilityCertification.summary,
      governanceDebtBudget: governanceDebtBudget.summary,
      evidenceFiles: Object.values(evidenceFiles).map(relativeToRepo),
    }),
    "utf8",
  );

  process.stdout.write(
    [
      "Capability registry verification complete",
      `Capabilities: ${report.summary.total_capabilities}`,
      `Owner missing: ${report.summary.owner_missing}`,
      `Invalid capabilities: ${report.summary.invalid_capabilities}`,
      `Duplicate candidates: ${report.summary.duplicate_candidates}`,
      `Dependency constitution: ${dependencyConstitution.summary.overall_status}`,
      `Contract registry: ${contractVersionRegistry.summary.overall_status}`,
      `Capability certification: ${capabilityCertification.summary.overall_status}`,
      `Governance debt budget: ${governanceDebtBudget.summary.overall_status}`,
      `Evidence directory: ${REGISTRY_EVIDENCE_DIR}`,
    ].join("\n") + "\n",
  );

  const blockingStatuses = [
    dependencyConstitution.summary.overall_status,
    contractVersionRegistry.summary.overall_status,
    governanceDebtBudget.summary.overall_status,
  ];

  return blockingStatuses.every((status) => status === "PASS") ? 0 : 1;
}

export async function runDiscoverCapabilityCommand(query: string): Promise<number> {
  ensureDirectory(DISCOVERY_EVIDENCE_DIR);
  const executionGraphSnapshot = loadExecutionGraphSnapshot();
  const report = {
    ...buildCapabilityDiscoveryReportFromExecutionGraph(
      query,
      executionGraphSnapshot.executionGraph,
    ),
    graph_source: executionGraphSnapshot.source,
    graph_source_path: executionGraphSnapshot.source_path,
  };
  const evidencePath = resolve(DISCOVERY_EVIDENCE_DIR, "last-discovery.json");

  writeJson(evidencePath, report);

  process.stdout.write(
    [
      `Discovery status: ${report.status}`,
      `Query: ${query}`,
      `Top candidate: ${report.top_candidate ? `${report.top_candidate.id} (${report.top_candidate.similarity})` : "NONE"}`,
      `Graph source: ${report.graph_source}`,
      `Evidence: ${evidencePath}`,
    ].join("\n") + "\n",
  );

  return 0;
}

export async function runPlanCapabilityCommand(query: string): Promise<number> {
  ensureDirectory(DISCOVERY_EVIDENCE_DIR);
  const executionGraphSnapshot = loadExecutionGraphSnapshot();
  const report = {
    ...buildCapabilityPlanningReportFromExecutionGraph(
      query,
      executionGraphSnapshot.executionGraph,
    ),
    graph_source: executionGraphSnapshot.source,
    graph_source_path: executionGraphSnapshot.source_path,
  };
  const evidencePath = resolve(DISCOVERY_EVIDENCE_DIR, "last-capability-plan.json");

  writeJson(evidencePath, report);

  process.stdout.write(
    [
      `Planner decision: ${report.decision}`,
      `Query: ${query}`,
      `Blocking candidate: ${report.blocking_candidate ? `${report.blocking_candidate.id} (${report.blocking_candidate.similarity})` : "NONE"}`,
      `Graph source: ${report.graph_source}`,
      `Evidence: ${evidencePath}`,
    ].join("\n") + "\n",
  );

  return report.decision === "CREATION_ALLOWED" ? 0 : 2;
}
