import {
  buildCapabilityCertificationReport,
  type CapabilityCertificationReport,
  type CapabilityDependencyConstitutionReport,
  type CapabilityPerformanceCertificationInput,
  type CapabilityRegistryReport,
  type ContractVersionRegistryReport,
} from "@repo/core-capability-registry";
import { DigestEngine } from "@repo/core-kernel";

import type { EvidenceProducer } from "../../evidence-producer-spi.js";

export type CapabilityOperationalMetricsReport = Readonly<{
  metrics_version: string;
  metrics_digest: string;
  summary: {
    readonly total_capabilities: number;
    readonly observed_capabilities: number;
    readonly verified_capabilities: number;
    readonly reproducible_capabilities: number;
    readonly total_invocations: number;
  };
  capabilities: readonly {
    readonly capability_id: string;
    readonly execution_status:
      | "DECLARED"
      | "OBSERVED"
      | "VERIFIED"
      | "REPRODUCIBLE";
    readonly invocation_count: number;
    readonly success_count: number;
    readonly failure_count: number;
    readonly reproducible_operation_count: number;
    readonly observed_products: readonly string[];
    readonly metrics_digest: string;
  }[];
  readonly claim_boundary: string;
}>;

export type CapabilityFoundationProducerContext = Readonly<{
  registry: CapabilityRegistryReport;
  dependencyConstitution: CapabilityDependencyConstitutionReport;
  contractVersionRegistry: ContractVersionRegistryReport;
  executionEvidence: {
    readonly capabilities: readonly {
      readonly capability_id: string;
      readonly runtime_products?: readonly string[];
      readonly execution_reachability?: {
        readonly status?:
          | "DECLARED"
          | "OBSERVED"
          | "VERIFIED"
          | "REPRODUCIBLE";
      };
      readonly runtime_invocations?: {
        readonly total?: number;
      };
      readonly per_product?: readonly {
        readonly runtime_invocation_count?: number;
        readonly runtime_verified?: boolean;
        readonly runtime_reproducible?: boolean;
      }[];
    }[];
  };
  governanceReadModelMetrics: {
    readonly metrics_digest: string;
    readonly freshness_ms: number;
    readonly generation_duration_ms: number;
    readonly consumer_count: number;
  };
  metricsRef?: string | null;
  certificationRef?: string | null;
}>;

export type CapabilityFoundationProducerProjection = Readonly<{
  capability_operational_metrics: {
    readonly observed_capabilities: number;
    readonly verified_capabilities: number;
    readonly reproducible_capabilities: number;
    readonly total_invocations: number;
  };
  capability_certification: {
    readonly certified_capabilities: number;
    readonly partial_capabilities: number;
    readonly failed_capabilities: number;
    readonly performance_evaluated_capabilities: number;
    readonly overall_status: string;
  };
  metrics_ref: string | null;
  certification_ref: string | null;
}>;

export const CAPABILITY_FOUNDATION_PRODUCER: EvidenceProducer<
  CapabilityFoundationProducerContext,
  {
    readonly operationalMetrics: CapabilityOperationalMetricsReport;
    readonly performanceMetrics: readonly CapabilityPerformanceCertificationInput[];
  },
  CapabilityCertificationReport,
  CapabilityFoundationProducerProjection,
  {
    readonly operationalMetrics: CapabilityOperationalMetricsReport;
    readonly certification: CapabilityCertificationReport;
  }
> = {
  id() {
    return "capability-producer";
  },
  subject() {
    return {
      subject_ref:
        "workspace/foundation/evidence/verification/capability-governance",
      subject_type: "capability-governance",
    };
  },
  collect(context) {
    const operationalMetrics = materializeCapabilityOperationalMetrics({
      executionEvidence: context.executionEvidence,
    });
    const performanceMetrics: CapabilityPerformanceCertificationInput[] = [
      {
        capability_id: "governance-read-model",
        evidence_kind: "materialization",
        metrics_digest: context.governanceReadModelMetrics.metrics_digest,
        freshness_ms: context.governanceReadModelMetrics.freshness_ms,
        generation_duration_ms:
          context.governanceReadModelMetrics.generation_duration_ms,
        consumer_count: context.governanceReadModelMetrics.consumer_count,
      },
      ...operationalMetrics.capabilities
        .filter(
          (capability) =>
            capability.capability_id === "api-platform" ||
            capability.capability_id === "governance-evidence" ||
            capability.capability_id === "trust-framework",
        )
        .map((capability) => ({
          capability_id: capability.capability_id,
          evidence_kind: "runtime_execution" as const,
          metrics_digest: capability.metrics_digest,
          runtime_status: capability.execution_status,
          invocation_count: capability.invocation_count,
          success_count: capability.success_count,
          failure_count: capability.failure_count,
          reproducible_operation_count:
            capability.reproducible_operation_count,
        })),
    ];

    return {
      operationalMetrics,
      performanceMetrics,
    };
  },
  evaluate({ context, collected }) {
    return buildCapabilityCertificationReport({
      registry: context.registry,
      dependencyConstitution: context.dependencyConstitution,
      contractVersionRegistry: context.contractVersionRegistry,
      performanceMetrics: collected.performanceMetrics,
    });
  },
  project({ context, collected, evaluation }) {
    return {
      capability_operational_metrics: {
        observed_capabilities:
          collected.operationalMetrics.summary.observed_capabilities,
        verified_capabilities:
          collected.operationalMetrics.summary.verified_capabilities,
        reproducible_capabilities:
          collected.operationalMetrics.summary.reproducible_capabilities,
        total_invocations:
          collected.operationalMetrics.summary.total_invocations,
      },
      capability_certification: {
        certified_capabilities: evaluation.summary.certified_capabilities,
        partial_capabilities: evaluation.summary.partial_capabilities,
        failed_capabilities: evaluation.summary.failed_capabilities,
        performance_evaluated_capabilities:
          evaluation.summary.performance_evaluated_capabilities,
        overall_status: evaluation.summary.overall_status,
      },
      metrics_ref:
        context.metricsRef ??
        "workspace/foundation/evidence/verification/capability-operational-metrics.json",
      certification_ref:
        context.certificationRef ??
        "workspace/foundation/evidence/verification/capability-certification.json",
    };
  },
  materialize({ collected, evaluation }) {
    return {
      operationalMetrics: collected.operationalMetrics,
      certification: evaluation,
    };
  },
};

function materializeCapabilityOperationalMetrics(input: {
  readonly executionEvidence: CapabilityFoundationProducerContext["executionEvidence"];
}): CapabilityOperationalMetricsReport {
  const capabilities = input.executionEvidence.capabilities
    .map((capability) => {
      const invocationCount = capability.runtime_invocations?.total ?? 0;
      const successCount = (capability.per_product ?? []).reduce(
        (sum, product) =>
          sum +
          (product.runtime_verified ? product.runtime_invocation_count ?? 0 : 0),
        0,
      );
      const reproducibleOperationCount = (capability.per_product ?? []).reduce(
        (sum, product) =>
          sum +
          (product.runtime_reproducible
            ? product.runtime_invocation_count ?? 0
            : 0),
        0,
      );
      const failureCount = Math.max(0, invocationCount - successCount);
      const payload = {
        capability_id: capability.capability_id,
        execution_status:
          capability.execution_reachability?.status ?? "DECLARED",
        invocation_count: invocationCount,
        success_count: successCount,
        failure_count: failureCount,
        reproducible_operation_count: reproducibleOperationCount,
        observed_products: capability.runtime_products ?? [],
      };

      return {
        ...payload,
        metrics_digest: DigestEngine.digest(payload),
      };
    })
    .sort((left, right) => left.capability_id.localeCompare(right.capability_id));

  const summary = {
    total_capabilities: capabilities.length,
    observed_capabilities: capabilities.filter(
      (capability) => capability.execution_status !== "DECLARED",
    ).length,
    verified_capabilities: capabilities.filter(
      (capability) =>
        capability.execution_status === "VERIFIED" ||
        capability.execution_status === "REPRODUCIBLE",
    ).length,
    reproducible_capabilities: capabilities.filter(
      (capability) => capability.execution_status === "REPRODUCIBLE",
    ).length,
    total_invocations: capabilities.reduce(
      (sum, capability) => sum + capability.invocation_count,
      0,
    ),
  };
  const metricsVersion = "1.0.0";
  const metricsDigest = DigestEngine.digest({
    metrics_version: metricsVersion,
    summary,
    capabilities,
  });

  return {
    metrics_version: metricsVersion,
    metrics_digest: metricsDigest,
    summary,
    capabilities,
    claim_boundary:
      "Capability operational metrics summarize runtime invocation evidence observed during verified product execution. They provide operational certification input without changing capability contracts or artifact ownership boundaries.",
  };
}
