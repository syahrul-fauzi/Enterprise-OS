export const CAPABILITY_GOVERNANCE_DEBT_BUDGET = {
  owner_missing_max: 15,
  invalid_capabilities_max: 3,
  duplicate_candidates_max: 0,
} as const;

export function buildRegistrySummaryMarkdown(input: {
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