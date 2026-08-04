import { DigestEngine } from "@repo/core-kernel";
import type { ContractVersionRegistryReport } from "@repo/core-capability-registry";

export type ContractVersionEvolutionVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly deterministic_resolution_status: "PASS" | "FAIL";
    readonly consumer_pinning_status: "PASS" | "FAIL";
    readonly parallel_major_evolution_readiness_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
    readonly total_contracts: number;
    readonly ready_contracts: number;
    readonly blocked_contracts: number;
  };
  readonly contracts: readonly {
    readonly contract_name: string;
    readonly provider_count: number;
    readonly consumer_count: number;
    readonly deterministic_resolution_status: "PASS" | "FAIL";
    readonly consumer_pinning_status: "PASS" | "FAIL";
    readonly parallel_major_evolution_readiness_status: "PASS" | "FAIL";
    readonly major_versions_declared: readonly number[];
    readonly blocked_reasons: readonly string[];
  }[];
  readonly claim_boundary: string;
};

export function materializeContractVersionEvolutionVerificationReport(
  registry: ContractVersionRegistryReport,
): ContractVersionEvolutionVerificationReport {
  const contracts = registry.contracts.map((contract) => {
    const blockedReasons: string[] = [];
    const deterministicResolutionStatus =
      contract.ambiguous_consumer_count === 0 &&
      contract.consumers.every(
        (consumer) => consumer.provider_resolution_status === "DETERMINISTIC",
      )
        ? ("PASS" as const)
        : ("FAIL" as const);
    if (deterministicResolutionStatus === "FAIL") {
      blockedReasons.push("non_deterministic_provider_resolution");
    }

    const consumerPinningStatus =
      contract.unbounded_consumer_count === 0 &&
      contract.consumers.every(
        (consumer) =>
          consumer.range_policy_status === "PINNED_MAJOR" ||
          consumer.range_policy_status === "PINNED_VERSION",
      )
        ? ("PASS" as const)
        : ("FAIL" as const);
    if (consumerPinningStatus === "FAIL") {
      blockedReasons.push("consumer_range_not_major_pinned");
    }

    const parallelMajorEvolutionReadinessStatus =
      contract.overall_status === "PASS" &&
      deterministicResolutionStatus === "PASS" &&
      consumerPinningStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const);
    if (parallelMajorEvolutionReadinessStatus === "FAIL") {
      blockedReasons.push("parallel_major_upgrade_not_ready");
    }

    return {
      contract_name: contract.contract_name,
      provider_count: contract.provider_count,
      consumer_count: contract.consumer_count,
      deterministic_resolution_status: deterministicResolutionStatus,
      consumer_pinning_status: consumerPinningStatus,
      parallel_major_evolution_readiness_status:
        parallelMajorEvolutionReadinessStatus,
      major_versions_declared: contract.declared_major_versions,
      blocked_reasons: blockedReasons,
    };
  });

  const summary = {
    deterministic_resolution_status:
      contracts.every(
        (contract) => contract.deterministic_resolution_status === "PASS",
      )
        ? ("PASS" as const)
        : ("FAIL" as const),
    consumer_pinning_status: contracts.every(
      (contract) => contract.consumer_pinning_status === "PASS",
    )
      ? ("PASS" as const)
      : ("FAIL" as const),
    parallel_major_evolution_readiness_status: contracts.every(
      (contract) =>
        contract.parallel_major_evolution_readiness_status === "PASS",
    )
      ? ("PASS" as const)
      : ("FAIL" as const),
    overall_status: "FAIL" as const,
    total_contracts: contracts.length,
    ready_contracts: contracts.filter(
      (contract) =>
        contract.parallel_major_evolution_readiness_status === "PASS",
    ).length,
    blocked_contracts: contracts.filter(
      (contract) =>
        contract.parallel_major_evolution_readiness_status === "FAIL",
    ).length,
  };
  const finalizedSummary = {
    ...summary,
    overall_status:
      summary.deterministic_resolution_status === "PASS" &&
      summary.consumer_pinning_status === "PASS" &&
      summary.parallel_major_evolution_readiness_status === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const payload = {
    summary: finalizedSummary,
    contracts,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Contract version evolution verification proves that declared contract consumers are major-pinned and provider resolution remains deterministic, so the repository can introduce future provider major versions without silently rebinding consumers. It operationalizes contract versioning as an upgrade-safety control rather than a passive registry snapshot.",
  };
}
