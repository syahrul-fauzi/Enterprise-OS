import type {
  EvidenceProducer,
  EvidenceProducerExecution,
} from "../../evidence-producer-spi.js";
import { executeEvidenceProducer } from "../../evidence-producer-spi.js";
import type { FoundationProducerRegistryExecutions } from "./foundation-producer-registry.js";
import type { DecisionFoundationProducerProjection } from "../../decision/producers/foundation-producer.js";
import type { EvidenceConvergenceFoundationProducerProjection } from "../../evidence-convergence-foundation-producer.js";
import type { LearningFoundationProducerProjection } from "../../learning/producers/foundation-producer.js";
import type { SpecificationFoundationProducerProjection } from "../../specification/producers/foundation-producer.js";

export type FoundationReportProducerProjection = Readonly<{
  producer_id: string;
  producer_class:
    | "specification"
    | "capability"
    | "decision"
    | "learning"
    | "runtime"
    | "gate";
  status: string;
  health: string;
  coverage_ratio: number | null;
  subject: {
    subject_ref: string;
    subject_type: string;
  };
  evidence_ref: string | null;
  projection_ref: string | null;
}>;

export type FoundationReportProducerContext = Readonly<{
  specificationSystem: SpecificationFoundationProducerProjection;
  decisionQuality: DecisionFoundationProducerProjection;
  learningIntelligence: LearningFoundationProducerProjection;
  evidenceConvergence: EvidenceConvergenceFoundationProducerProjection;
  capabilityOperationalMetrics: {
    readonly observed_capabilities: number;
    readonly verified_capabilities: number;
    readonly reproducible_capabilities: number;
    readonly total_invocations: number;
  };
  capabilityCertification: {
    readonly certified_capabilities: number;
    readonly partial_capabilities: number;
    readonly failed_capabilities: number;
    readonly overall_status: string;
  };
  foundationMetrics: {
    readonly verified_products: number;
    readonly declared_products: number;
  };
  gateCStatus: {
    readonly status: string;
    readonly evidence_ref: string | null;
    readonly projection_ref: string | null;
  };
}>;

type FoundationReportProducer = EvidenceProducer<
  FoundationReportProducerContext,
  Record<string, unknown>,
  {
    readonly status: string;
    readonly health: string;
    readonly coverage_ratio: number | null;
    readonly evidence_ref: string | null;
    readonly projection_ref: string | null;
  },
  FoundationReportProducerProjection,
  FoundationReportProducerProjection
>;

function createFoundationReportProducer(input: {
  readonly producer_id: FoundationReportProducerProjection["producer_id"];
  readonly producer_class: FoundationReportProducerProjection["producer_class"];
  readonly subject: {
    readonly subject_ref: string;
    readonly subject_type: string;
  };
  readonly collect: (
    context: FoundationReportProducerContext,
  ) => Record<string, unknown>;
  readonly evaluate: (
    collected: Record<string, unknown>,
    context: FoundationReportProducerContext,
  ) => {
    readonly status: string;
    readonly health: string;
    readonly coverage_ratio: number | null;
    readonly evidence_ref: string | null;
    readonly projection_ref: string | null;
  };
}): FoundationReportProducer {
  return {
    id() {
      return input.producer_id;
    },
    subject() {
      return input.subject;
    },
    collect(context) {
      return input.collect(context);
    },
    evaluate({ context, collected }) {
      return input.evaluate(collected, context);
    },
    project({ subject, evaluation }) {
      return {
        producer_id: input.producer_id,
        producer_class: input.producer_class,
        status: evaluation.status,
        health: evaluation.health,
        coverage_ratio: evaluation.coverage_ratio,
        subject,
        evidence_ref: evaluation.evidence_ref,
        projection_ref: evaluation.projection_ref,
      };
    },
    materialize({ projection }) {
      return projection;
    },
  };
}

export const FOUNDATION_REPORT_PRODUCER_REGISTRY: readonly FoundationReportProducer[] =
  [
    createFoundationReportProducer({
      producer_id: "specification",
      producer_class: "specification",
      subject: {
        subject_ref: "enterprise/specifications/specification-registry.yaml",
        subject_type: "specification-registry",
      },
      collect(context) {
        return context.specificationSystem as Record<string, unknown>;
      },
      evaluate(collected) {
        const warnings = Number(collected.conformance_warnings ?? 0);
        const failures = Number(collected.conformance_failures ?? 0);
        const registryArtifacts = Number(collected.registry_artifacts ?? 0);
        const registryEdges = Number(collected.registry_edges ?? 0);
        return {
          status: String(collected.overall_status ?? "UNVERIFIED"),
          health:
            failures > 0 ? "FAIL" : warnings > 0 ? "WARN" : "PASS",
          coverage_ratio:
            registryArtifacts > 0
              ? Number((registryEdges / registryArtifacts).toFixed(4))
              : null,
          evidence_ref:
            "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
          projection_ref:
            "workspace/foundation/evidence/verification/specification-conformance-projection.json",
        };
      },
    }),
    createFoundationReportProducer({
      producer_id: "capability",
      producer_class: "capability",
      subject: {
        subject_ref:
          "workspace/foundation/evidence/verification/capability-governance",
        subject_type: "capability-governance",
      },
      collect(context) {
        return {
          ...context.capabilityOperationalMetrics,
          ...context.capabilityCertification,
        };
      },
      evaluate(collected) {
        const observed = Number(collected.observed_capabilities ?? 0);
        const verified = Number(collected.verified_capabilities ?? 0);
        return {
          status: String(collected.overall_status ?? "UNVERIFIED"),
          health: String(collected.overall_status ?? "UNVERIFIED"),
          coverage_ratio:
            observed > 0 ? Number((verified / observed).toFixed(4)) : null,
          evidence_ref:
            "workspace/foundation/evidence/verification/capability-operational-metrics.json",
          projection_ref:
            "workspace/foundation/evidence/verification/capability-graph.json",
        };
      },
    }),
    createFoundationReportProducer({
      producer_id: "decision",
      producer_class: "decision",
      subject: {
        subject_ref:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
        subject_type: "decision-ledger",
      },
      collect(context) {
        return context.decisionQuality as Record<string, unknown>;
      },
      evaluate(collected) {
        const decisionCount = Number(collected.decision_count ?? 0);
        const outcomeCoverage = Number(collected.decision_outcome_coverage ?? 0);
        return {
          status: String(collected.status ?? "UNVERIFIED"),
          health: String(collected.status ?? "UNVERIFIED"),
          coverage_ratio: decisionCount > 0 ? outcomeCoverage : 0,
          evidence_ref:
            "workspace/foundation/evidence/verification/decision-quality-report.json",
          projection_ref: null,
        };
      },
    }),
    createFoundationReportProducer({
      producer_id: "learning",
      producer_class: "learning",
      subject: {
        subject_ref:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
        subject_type: "decision-outcome-registry",
      },
      collect(context) {
        return context.learningIntelligence as Record<string, unknown>;
      },
      evaluate(collected) {
        const decisionCount = Number(collected.decision_count ?? 0);
        return {
          status: String(collected.status ?? "UNVERIFIED"),
          health: String(collected.status ?? "UNVERIFIED"),
          coverage_ratio:
            decisionCount > 0
              ? Number(collected.outcome_registry_coverage ?? 0)
              : 0,
          evidence_ref:
            "workspace/foundation/evidence/verification/learning-intelligence-report.json",
          projection_ref: null,
        };
      },
    }),
    createFoundationReportProducer({
      producer_id: "runtime",
      producer_class: "runtime",
      subject: {
        subject_ref: "workspace/products",
        subject_type: "product-runtime",
      },
      collect(context) {
        return {
          ...context.capabilityOperationalMetrics,
          ...context.foundationMetrics,
        };
      },
      evaluate(collected) {
        const declaredProducts = Number(collected.declared_products ?? 0);
        const verifiedProducts = Number(collected.verified_products ?? 0);
        return {
          status: verifiedProducts > 0 ? "PASS" : "UNVERIFIED",
          health: verifiedProducts > 0 ? "PASS" : "WARN",
          coverage_ratio:
            declaredProducts > 0
              ? Number((verifiedProducts / declaredProducts).toFixed(4))
              : null,
          evidence_ref:
            "workspace/products/lawyershub/evidence/verification/product-runtime-verification-evidence.json",
          projection_ref:
            "workspace/products/lawyershub/evidence/verification/product-verification-projection.json",
        };
      },
    }),
    createFoundationReportProducer({
      producer_id: "gate-c",
      producer_class: "gate",
      subject: {
        subject_ref: "enterprise/science/gate-c/execution/gate-c-status.yaml",
        subject_type: "gate-c-status",
      },
      collect(context) {
        return context.gateCStatus as Record<string, unknown>;
      },
      evaluate(collected) {
        const status = String(collected.status ?? "UNVERIFIED");
        return {
          status,
          health: status === "UNVERIFIED" ? "WARN" : status,
          coverage_ratio: status === "UNVERIFIED" ? 0 : 1,
          evidence_ref:
            "workspace/foundation/evidence/verification/gate-c-status-evidence.json",
          projection_ref:
            "workspace/foundation/evidence/verification/gate-c-status-projection.json",
        };
      },
    }),
  ];

export function listFoundationReportProducers(): readonly FoundationReportProducer[] {
  return FOUNDATION_REPORT_PRODUCER_REGISTRY;
}

export async function executeFoundationReportProducerRegistry(
  context: FoundationReportProducerContext,
): Promise<
  readonly EvidenceProducerExecution<
    Record<string, unknown>,
    {
      readonly status: string;
      readonly health: string;
      readonly coverage_ratio: number | null;
      readonly evidence_ref: string | null;
      readonly projection_ref: string | null;
    },
    FoundationReportProducerProjection,
    FoundationReportProducerProjection
  >[]
> {
  return Promise.all(
    FOUNDATION_REPORT_PRODUCER_REGISTRY.map((producer) =>
      executeEvidenceProducer(producer, context),
    ),
  );
}

export function buildFoundationReportProducerContext(input: {
  readonly producerExecutions: FoundationProducerRegistryExecutions;
  readonly foundationMetrics: {
    readonly verified_products: number;
    readonly declared_products: number;
  };
  readonly gateCStatus: FoundationReportProducerContext["gateCStatus"];
}): FoundationReportProducerContext {
  return {
    specificationSystem: input.producerExecutions.specification.projection,
    decisionQuality: input.producerExecutions.decision.projection,
    learningIntelligence: input.producerExecutions.learning.projection,
    evidenceConvergence: input.producerExecutions.evidenceConvergence.projection,
    capabilityOperationalMetrics:
      input.producerExecutions.capability.projection.capability_operational_metrics,
    capabilityCertification:
      input.producerExecutions.capability.projection.capability_certification,
    foundationMetrics: input.foundationMetrics,
    gateCStatus: input.gateCStatus,
  };
}
