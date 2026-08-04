import {
  type GovernanceSummary,
  type ConstitutionExecutionGraphProof,
} from "../../certificate-runtime.js";
import type { DecisionFoundationProducerProjection } from "../../decision/producers/foundation-producer.js";
import type { EvidenceConvergenceFoundationProducerProjection } from "../../evidence-convergence-foundation-producer.js";
import type { LearningFoundationProducerProjection } from "../../learning/producers/foundation-producer.js";
import type { SpecificationFoundationProducerProjection } from "../../specification/producers/foundation-producer.js";
import type { Projection } from "../../projection/models/domain.js";
import { serializeProjectionArtifact } from "../../projection/runtime/index.js";

type QualityGates = {
  readonly governance_as_automation?: {
    readonly quality_gate?: {
      readonly clr?: string;
      readonly experience_reuse?: string;
      readonly capability_reuse?: string;
      readonly new_patterns?: string;
    };
  };
};

type ProductEvidence = {
  readonly product_id: string;
  readonly capability_reuse_ratio: number | null;
  readonly experience_reuse_ratio: number | null;
  readonly clr: number | "FULL_REUSE" | null;
};

function parseThreshold(expression: string | undefined): { readonly operator: string; readonly value: number } | null {
  if (!expression) {
    return null;
  }

  const match = expression.match(/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$/);
  if (!match) {
    return null;
  }

  return {
    operator: match[1] ?? "=",
    value: Number(match[2] ?? 0),
  };
}

function compare(actual: number, operator: string, expected: number): boolean {
  switch (operator) {
    case ">=":
      return actual >= expected;
    case "<=":
      return actual <= expected;
    case ">":
      return actual > expected;
    case "<":
      return actual < expected;
    case "=":
      return actual === expected;
    default:
      return false;
  }
}

function scoreStatus(value: string, ordering: readonly string[]): number {
  const index = ordering.indexOf(value);
  return index === -1 ? -1 : index;
}

export function materializeGuardrailReport(input: {
  readonly qualityGates: QualityGates;
  readonly productEvidence: readonly ProductEvidence[];
}): Record<string, unknown> {
  const thresholds = input.qualityGates.governance_as_automation?.quality_gate;
  const capabilityThreshold = parseThreshold(thresholds?.capability_reuse);
  const experienceThreshold = parseThreshold(thresholds?.experience_reuse);
  const clrThreshold = parseThreshold(thresholds?.clr);

  return {
    thresholds,
    product_results: input.productEvidence.map((product) => {
      const capabilityActual = product.capability_reuse_ratio;
      const experienceActual = product.experience_reuse_ratio;
      const clrActual =
        product.clr === "FULL_REUSE"
          ? Number.POSITIVE_INFINITY
          : typeof product.clr === "number"
            ? product.clr
            : null;

      return {
        product_id: product.product_id,
        capability_reuse: {
          actual: capabilityActual,
          threshold: thresholds?.capability_reuse ?? null,
          status:
            capabilityActual !== null && capabilityThreshold
              ? compare(capabilityActual, capabilityThreshold.operator, capabilityThreshold.value)
                ? "PASS"
                : "FAIL"
              : "UNVERIFIED",
        },
        experience_reuse: {
          actual: experienceActual,
          threshold: thresholds?.experience_reuse ?? null,
          status:
            experienceActual !== null && experienceThreshold
              ? compare(experienceActual, experienceThreshold.operator, experienceThreshold.value)
                ? "PASS"
                : "FAIL"
              : "UNVERIFIED",
        },
        clr: {
          actual: product.clr,
          threshold: thresholds?.clr ?? null,
          status:
            clrActual !== null && clrThreshold
              ? compare(clrActual, clrThreshold.operator, clrThreshold.value)
                ? "PASS"
                : "FAIL"
              : "UNVERIFIED",
        },
      };
    }),
    claim_boundary:
      "Guardrail evaluation only applies to products with generated empirical evidence. Missing products remain UNVERIFIED.",
  };
}

export function materializeFoundationFitnessReport(input: {
  readonly previous: Record<string, unknown> | null;
  readonly foundationMetrics: Record<string, unknown>;
  readonly graphHealth: {
    readonly registry_health: string;
    readonly graph_integrity_status: string;
    readonly owner_coverage_ratio: number;
    readonly reachability_ratio: number;
    readonly orphan_artifacts: readonly string[];
    readonly dead_capabilities: readonly string[];
  };
  readonly specAudit: {
    readonly summary: {
      readonly documentation_only: number;
    };
  };
}): Record<string, unknown> {
  const current = {
    foundation_status: String(input.foundationMetrics.foundation_status ?? "UNVERIFIED_BASELINE"),
    verified_products: Number(input.foundationMetrics.verified_products ?? 0),
    implemented_products: Number(input.foundationMetrics.implemented_products ?? 0),
    declared_products: Number(input.foundationMetrics.declared_products ?? 0),
    registry_health: input.graphHealth.registry_health,
    graph_integrity_status: input.graphHealth.graph_integrity_status,
    owner_coverage_ratio: input.graphHealth.owner_coverage_ratio,
    reachability_ratio: input.graphHealth.reachability_ratio,
    orphan_artifacts: input.graphHealth.orphan_artifacts.length,
    dead_capabilities: input.graphHealth.dead_capabilities.length,
    documentation_only_specs: input.specAudit.summary.documentation_only,
  };

  if (!input.previous) {
    return {
      fitness_status: "BASELINE",
      current,
      previous: null,
      regressions: [],
      improvements: [],
      claim_boundary:
        "Fitness trend requires at least one earlier foundation snapshot. Current run establishes the baseline.",
    };
  }

  const previous = {
    foundation_status: String(input.previous.foundation_status ?? "UNVERIFIED_BASELINE"),
    verified_products: Number(input.previous.verified_products ?? 0),
    implemented_products: Number(input.previous.implemented_products ?? 0),
    declared_products: Number(input.previous.declared_products ?? 0),
    registry_health: String(input.previous.registry_health ?? "BLOCKED"),
    graph_integrity_status: String(input.previous.graph_integrity_status ?? "BLOCKED"),
    owner_coverage_ratio: Number(input.previous.owner_coverage_ratio ?? 0),
    reachability_ratio: Number(input.previous.reachability_ratio ?? 0),
    orphan_artifacts: Number(input.previous.orphan_artifacts ?? 0),
    dead_capabilities: Number(input.previous.dead_capabilities ?? 0),
    documentation_only_specs: Number(input.previous.documentation_only_specs ?? 0),
  };

  const regressions: string[] = [];
  const improvements: string[] = [];

  if (
    scoreStatus(current.foundation_status, ["UNVERIFIED_BASELINE", "PARTIAL_BASELINE", "HEALTHY_BASELINE"]) <
    scoreStatus(previous.foundation_status, ["UNVERIFIED_BASELINE", "PARTIAL_BASELINE", "HEALTHY_BASELINE"])
  ) {
    regressions.push("foundation_status regressed");
  } else if (current.foundation_status !== previous.foundation_status) {
    improvements.push("foundation_status improved");
  }

  if (
    scoreStatus(current.registry_health, ["BLOCKED", "PARTIAL", "HEALTHY"]) <
    scoreStatus(previous.registry_health, ["BLOCKED", "PARTIAL", "HEALTHY"])
  ) {
    regressions.push("registry_health regressed");
  } else if (current.registry_health !== previous.registry_health) {
    improvements.push("registry_health improved");
  }

  if (
    scoreStatus(current.graph_integrity_status, ["BLOCKED", "PARTIAL", "HEALTHY"]) <
    scoreStatus(previous.graph_integrity_status, ["BLOCKED", "PARTIAL", "HEALTHY"])
  ) {
    regressions.push("graph_integrity regressed");
  } else if (current.graph_integrity_status !== previous.graph_integrity_status) {
    improvements.push("graph_integrity improved");
  }

  if (current.owner_coverage_ratio < previous.owner_coverage_ratio) {
    regressions.push("owner_coverage_ratio regressed");
  } else if (current.owner_coverage_ratio > previous.owner_coverage_ratio) {
    improvements.push("owner_coverage_ratio improved");
  }

  if (current.reachability_ratio < previous.reachability_ratio) {
    regressions.push("reachability_ratio regressed");
  } else if (current.reachability_ratio > previous.reachability_ratio) {
    improvements.push("reachability_ratio improved");
  }

  if (current.verified_products < previous.verified_products) {
    regressions.push("verified_products regressed");
  } else if (current.verified_products > previous.verified_products) {
    improvements.push("verified_products improved");
  }

  if (current.implemented_products < previous.implemented_products) {
    regressions.push("implemented_products regressed");
  } else if (current.implemented_products > previous.implemented_products) {
    improvements.push("implemented_products improved");
  }

  if (current.orphan_artifacts > previous.orphan_artifacts) {
    regressions.push("orphan_artifacts increased");
  } else if (current.orphan_artifacts < previous.orphan_artifacts) {
    improvements.push("orphan_artifacts reduced");
  }

  if (current.dead_capabilities > previous.dead_capabilities) {
    regressions.push("dead_capabilities increased");
  } else if (current.dead_capabilities < previous.dead_capabilities) {
    improvements.push("dead_capabilities reduced");
  }

  if (current.documentation_only_specs > previous.documentation_only_specs) {
    regressions.push("documentation_only_specs increased");
  } else if (current.documentation_only_specs < previous.documentation_only_specs) {
    improvements.push("documentation_only_specs reduced");
  }

  return {
    fitness_status:
      regressions.length > 0 ? "REGRESSED" : improvements.length > 0 ? "IMPROVED" : "STABLE",
    current,
    previous,
    regressions,
    improvements,
    claim_boundary:
      "Fitness currently tracks foundation-level verification metrics only. Planner coverage, core delta, and cross-product runtime deltas are not yet included.",
  };
}

export function materializeFoundationReport(input: {
  readonly foundationMetrics: Record<string, unknown>;
  readonly graphHealth: {
    readonly registry_health: string;
    readonly graph_integrity_status: string;
  };
  readonly executionEvidence: { readonly summary: Record<string, unknown> };
  readonly executionPlan: Record<string, unknown>;
  readonly executionChain: Record<string, unknown>;
  readonly topologyDrift: Projection<Record<string, unknown>>;
  readonly architectureTrend: {
    readonly payload: Record<string, unknown>;
  };
  readonly governanceSummary: GovernanceSummary;
  readonly governanceReadModelMetrics: {
    readonly freshness_ms: number;
    readonly generation_duration_ms: number;
    readonly consumer_count: number;
    readonly generation_digest: string;
    readonly source_digest: string;
  };
  readonly governanceIncrementalMaterialization: {
    readonly changed_node_count: number;
    readonly impacted_node_count: number;
    readonly reusable_node_count: number;
    readonly incremental_readiness_status: string;
  };
  readonly governanceSelectiveExecution: {
    readonly reused_node_count: number;
    readonly rematerialized_node_count: number;
  };
  readonly governanceReadModelSelectiveExecution: {
    readonly reused_node_count: number;
    readonly rematerialized_node_count: number;
  };
  readonly capabilityOperationalMetrics: {
    readonly observed_capabilities: number;
    readonly verified_capabilities: number;
    readonly reproducible_capabilities: number;
    readonly total_invocations: number;
  };
  readonly capabilityCertification: {
    readonly certified_capabilities: number;
    readonly partial_capabilities: number;
    readonly failed_capabilities: number;
    readonly performance_evaluated_capabilities: number;
    readonly overall_status: string;
  };
  readonly executionGraphProof: ConstitutionExecutionGraphProof;
  readonly graphFitness: Record<string, unknown>;
  readonly specificationSystem: SpecificationFoundationProducerProjection;
  readonly decisionQuality: DecisionFoundationProducerProjection;
  readonly learningIntelligence: LearningFoundationProducerProjection;
  readonly evidenceConvergence: EvidenceConvergenceFoundationProducerProjection;
  readonly producers: readonly {
    readonly producer_id: string;
    readonly producer_class: string;
    readonly status: string;
    readonly health: string;
    readonly coverage_ratio: number | null;
    readonly subject: {
      readonly subject_ref: string;
      readonly subject_type: string;
    };
    readonly evidence_ref: string | null;
    readonly projection_ref: string | null;
  }[];
  readonly sharedCapabilityInventory: readonly string[];
  readonly products: readonly unknown[];
  readonly governancePortfolioLoaded: boolean;
}): Record<string, unknown> {
  const foundationStatus = String(input.foundationMetrics.foundation_status ?? "UNVERIFIED_BASELINE");
  const producersRecord = Object.fromEntries(
    input.producers.map((producer) => [producer.producer_id, producer]),
  );
  const producerHealthCounts = {
    pass: input.producers.filter((producer) => producer.health === "PASS").length,
    warn: input.producers.filter((producer) => producer.health === "WARN").length,
    fail: input.producers.filter((producer) => producer.health === "FAIL").length,
    other: input.producers.filter(
      (producer) =>
        producer.health !== "PASS" &&
        producer.health !== "WARN" &&
        producer.health !== "FAIL",
    ).length,
  };
  const coverageRatios = input.producers
    .map((producer) => producer.coverage_ratio)
    .filter((value): value is number => typeof value === "number");
  const averageCoverageRatio =
    coverageRatios.length === 0
      ? null
      : Number(
          (
            coverageRatios.reduce((sum, value) => sum + value, 0) /
            coverageRatios.length
          ).toFixed(4),
        );
  const producerHealthStatus =
    producerHealthCounts.fail > 0
      ? "FAIL"
      : producerHealthCounts.warn > 0
        ? "WARN"
        : producerHealthCounts.other > 0
          ? "PARTIAL"
          : "PASS";
  const closedLoopHypothesis = materializeClosedLoopHypothesis({
    decisionQuality: input.decisionQuality,
    learningIntelligence: input.learningIntelligence,
  });
  return {
    verification_result: {
      command_status: "PASS",
      foundation_status: foundationStatus,
      health_status:
        foundationStatus === "HEALTHY_BASELINE"
          ? "HEALTHY"
          : foundationStatus === "PARTIAL_BASELINE"
            ? "PARTIAL"
            : "BLOCKED",
    },
    foundation_metrics: input.foundationMetrics,
    registry_health: input.graphHealth.registry_health,
    graph_integrity_status: input.graphHealth.graph_integrity_status,
    execution_evidence_summary: input.executionEvidence.summary,
    execution_plan_summary: input.executionPlan,
    execution_chain_summary: input.executionChain,
    topology_drift: serializeProjectionArtifact(input.topologyDrift),
    architecture_trend: {
      trend_status: String(input.architectureTrend.payload.trend_status ?? "UNVERIFIED"),
      latest_epoch: String(input.architectureTrend.payload.latest_epoch ?? "epoch-000"),
      total_epochs: Number(input.architectureTrend.payload.total_epochs ?? 0),
    },
    governance_summary: input.governanceSummary,
    governance_read_model_metrics: input.governanceReadModelMetrics,
    governance_incremental_materialization:
      input.governanceIncrementalMaterialization,
    governance_selective_execution: input.governanceSelectiveExecution,
    governance_read_model_selective_execution:
      input.governanceReadModelSelectiveExecution,
    capability_operational_metrics: input.capabilityOperationalMetrics,
    capability_certification: input.capabilityCertification,
    producers: producersRecord,
    summary: {
      producer_count: input.producers.length,
      producer_classes: Array.from(
        new Set(input.producers.map((producer) => producer.producer_class)),
      ).sort((left, right) => left.localeCompare(right)),
      average_coverage_ratio: averageCoverageRatio,
    },
    health: {
      status: producerHealthStatus,
      pass_count: producerHealthCounts.pass,
      warn_count: producerHealthCounts.warn,
      fail_count: producerHealthCounts.fail,
      partial_count: producerHealthCounts.other,
    },
    coverage: {
      average_ratio: averageCoverageRatio,
      by_producer: Object.fromEntries(
        input.producers.map((producer) => [
          producer.producer_id,
          producer.coverage_ratio,
        ]),
      ),
    },
    evidence: {
      by_producer: Object.fromEntries(
        input.producers.map((producer) => [
          producer.producer_id,
          {
            evidence_ref: producer.evidence_ref,
            projection_ref: producer.projection_ref,
          },
        ]),
      ),
      convergence_status: input.evidenceConvergence.status,
      target_coverage_ratio: input.evidenceConvergence.target_coverage_ratio,
    },
    specification_system: input.specificationSystem,
    decision_quality: input.decisionQuality,
    learning_intelligence: input.learningIntelligence,
    knowledge_lineage_preview:
      input.learningIntelligence.knowledge_lineage_preview,
    closed_loop_hypothesis: closedLoopHypothesis,
    evidence_convergence: input.evidenceConvergence,
    execution_graph: input.executionGraphProof,
    graph_fitness: input.graphFitness,
    shared_capability_inventory: input.sharedCapabilityInventory,
    products: input.products,
    product_portfolio_source: "enterprise/specifications/PRODUCT-PORTFOLIO.yaml",
    governance_portfolio_source: "enterprise/specifications/GOVERNANCE-PORTFOLIO.yaml",
    governance_portfolio_loaded: input.governancePortfolioLoaded,
  };
}

function materializeClosedLoopHypothesis(input: {
  readonly decisionQuality: DecisionFoundationProducerProjection;
  readonly learningIntelligence: LearningFoundationProducerProjection;
}): Record<string, unknown> {
  const stages = {
    evidence: buildHypothesisStage({
      observed:
        input.decisionQuality.decision_count > 0 &&
        input.decisionQuality.evidence_utilization_rate > 0,
      saturated: input.decisionQuality.evidence_strength_index >= 1,
      metric_name: "evidence_strength_index",
      metric: input.decisionQuality.evidence_strength_index,
      evidence_ref:
        input.decisionQuality.report_ref ??
        "workspace/foundation/evidence/verification/decision-quality-report.json",
    }),
    decision: buildHypothesisStage({
      observed: input.decisionQuality.decision_count > 0,
      saturated: input.decisionQuality.decision_count > 0,
      metric_name: "decision_count",
      metric: input.decisionQuality.decision_count,
      evidence_ref:
        input.decisionQuality.report_ref ??
        "workspace/foundation/evidence/verification/decision-quality-report.json",
    }),
    outcome: buildHypothesisStage({
      observed: input.decisionQuality.decision_outcome_coverage > 0,
      saturated: input.decisionQuality.decision_outcome_coverage >= 1,
      metric_name: "decision_outcome_coverage",
      metric: input.decisionQuality.decision_outcome_coverage,
      evidence_ref:
        input.decisionQuality.report_ref ??
        "workspace/foundation/evidence/verification/decision-quality-report.json",
    }),
    learning: buildHypothesisStage({
      observed:
        input.decisionQuality.decision_learning_closure > 0 ||
        input.learningIntelligence.knowledge_gain_units > 0,
      saturated: input.decisionQuality.decision_learning_closure >= 1,
      metric_name: "decision_learning_closure",
      metric: input.decisionQuality.decision_learning_closure,
      evidence_ref:
        input.learningIntelligence.report_ref ??
        "workspace/foundation/evidence/verification/learning-intelligence-report.json",
    }),
    knowledge: buildHypothesisStage({
      observed:
        input.learningIntelligence.knowledge_object_count > 0 ||
        input.learningIntelligence.knowledge_gain_units > 0,
      saturated:
        input.learningIntelligence.operationalized_knowledge_count > 0,
      metric_name: "knowledge_availability_rate",
      metric:
        input.learningIntelligence.knowledge_availability_rate ??
        input.learningIntelligence.knowledge_object_count,
      evidence_ref:
        input.learningIntelligence.knowledge_registry_ref ??
        "workspace/foundation/evidence/verification/knowledge-registry.json",
    }),
    better_decision: buildHypothesisStage({
      observed:
        input.decisionQuality.knowledge_reuse_rate > 0 ||
        (input.learningIntelligence.decision_pattern_change_rate ?? 0) > 0,
      saturated: input.decisionQuality.knowledge_weighted_quality_index > 0,
      metric_name: "knowledge_weighted_quality_index",
      metric: input.decisionQuality.knowledge_weighted_quality_index,
      evidence_ref:
        input.decisionQuality.report_ref ??
        "workspace/foundation/evidence/verification/decision-quality-report.json",
    }),
    better_outcome: buildHypothesisStage({
      observed:
        input.decisionQuality.outcome_improvement_rate > 0 ||
        (input.learningIntelligence.future_decision_improvement_rate ?? 0) > 0,
      saturated: input.decisionQuality.outcome_improvement_rate > 0,
      metric_name: "outcome_improvement_rate",
      metric: input.decisionQuality.outcome_improvement_rate,
      evidence_ref:
        input.learningIntelligence.report_ref ??
        "workspace/foundation/evidence/verification/learning-intelligence-report.json",
    }),
  } as const;

  const stageStatuses = Object.values(stages).map((stage) => stage.status);
  return {
    statement:
      "Evidence -> Decision -> Outcome -> Learning -> Knowledge -> Better Decision -> Better Outcome",
    status:
      stageStatuses.every((status) => status === "PASS")
        ? "PASS"
        : stageStatuses.some((status) => status === "PASS")
          ? "PARTIAL"
          : "BLOCKED",
    stages,
    claim_boundary:
      "Closed-loop hypothesis status is derived only from the materialized decision-quality and learning-intelligence projections produced during this foundation verification run.",
  };
}

function buildHypothesisStage(input: {
  readonly observed: boolean;
  readonly saturated: boolean;
  readonly metric_name: string;
  readonly metric: number | null;
  readonly evidence_ref: string;
}): Record<string, unknown> {
  return {
    status: input.saturated ? "PASS" : input.observed ? "PARTIAL" : "BLOCKED",
    metric_name: input.metric_name,
    metric: input.metric,
    evidence_ref: input.evidence_ref,
  };
}

export function materializeFoundationSummaryMarkdown(input: {
  readonly foundationMetrics: {
    readonly foundation_status: string;
    readonly declared_products: number;
    readonly active_products: number;
    readonly implemented_products: number;
    readonly verified_products: number;
    readonly implemented_active_products: number;
    readonly verified_active_products: number;
    readonly active_portfolio_coverage_percentage: number;
    readonly implementation_coverage_percentage: number;
    readonly portfolio_coverage_percentage: number;
    readonly missing_active_product_implementation: readonly string[];
    readonly pending_active_product_verification: readonly string[];
    readonly missing_product_implementation: readonly string[];
    readonly pending_product_verification: readonly string[];
    readonly missing_product_verification: readonly string[];
  };
  readonly graphHealth: {
    readonly registry_health: string;
    readonly graph_integrity_status: string;
    readonly owner_coverage_ratio: number;
    readonly reachability_ratio: number;
    readonly orphan_artifacts: readonly string[];
    readonly dead_capabilities: readonly string[];
    readonly orphan_capability_classification: readonly {
      readonly classification: string;
    }[];
  };
  readonly specAudit: {
    readonly summary: {
      readonly total_specs: number;
      readonly executable_ssot: number;
      readonly documentation_only: number;
    };
  };
  readonly fitnessReport: {
    readonly fitness_status: string;
  };
  readonly executionEvidence: {
    readonly summary: {
      readonly declared_capabilities: number;
      readonly observed_capabilities: number;
      readonly verified_capabilities: number;
      readonly reproducible_capabilities: number;
    };
  };
  readonly executionChain: {
    readonly total_invocations: number;
    readonly total_chains: number;
    readonly unique_chain_digests: number;
    readonly chains_with_requirement: number;
    readonly chains_with_workflow: number;
    readonly chains_with_evidence: number;
    readonly reproducible_chains: number;
    readonly stable_chains: number;
  };
  readonly executionPlan: {
    readonly products_with_execution_plan: number;
    readonly execution_plan_coverage_ratio: number;
  };
  readonly topologyDrift: {
    readonly drift_status: string;
    readonly aligned_products: number;
    readonly drifted_products: number;
    readonly undeclared_observed_edges: number;
    readonly unobserved_declared_edges: number;
    readonly unmodeled_observed_requirements: number;
    readonly unmodeled_observed_workflows: number;
    readonly unmodeled_observed_plans: number;
  };
  readonly architectureTrend: {
    readonly trend_status: string;
    readonly latest_epoch: string;
    readonly total_epochs: number;
  };
  readonly graphFitness: {
    readonly fitness_status: string;
    readonly connectivity_ratio: number;
    readonly planner_coverage_ratio: number;
    readonly runtime_coverage_ratio: number;
    readonly verification_coverage_ratio: number;
    readonly replay_stability_ratio: number;
  };
  readonly specificationSystem: SpecificationFoundationProducerProjection;
  readonly governanceReadModelMetrics: {
    readonly freshness_ms: number;
    readonly generation_duration_ms: number;
    readonly consumer_count: number;
  };
  readonly governanceIncrementalMaterialization: {
    readonly changed_node_count: number;
    readonly impacted_node_count: number;
    readonly reusable_node_count: number;
    readonly incremental_readiness_status: string;
  };
  readonly governanceSelectiveExecution: {
    readonly reused_node_count: number;
    readonly rematerialized_node_count: number;
  };
  readonly governanceReadModelSelectiveExecution: {
    readonly reused_node_count: number;
    readonly rematerialized_node_count: number;
  };
  readonly capabilityOperationalMetrics: {
    readonly observed_capabilities: number;
    readonly verified_capabilities: number;
    readonly reproducible_capabilities: number;
    readonly total_invocations: number;
  };
  readonly capabilityCertification: {
    readonly certified_capabilities: number;
    readonly partial_capabilities: number;
    readonly failed_capabilities: number;
    readonly performance_evaluated_capabilities: number;
    readonly overall_status: string;
  };
  readonly evidenceFiles: readonly string[];
}): string {
  return [
    "# Foundation Verification Summary",
    "",
    `- foundation status: ${input.foundationMetrics.foundation_status}`,
    `- active products: ${input.foundationMetrics.active_products}`,
    `- implemented active products: ${input.foundationMetrics.implemented_active_products}/${input.foundationMetrics.active_products}`,
    `- verified active products: ${input.foundationMetrics.verified_active_products}/${input.foundationMetrics.active_products}`,
    `- active portfolio coverage: ${input.foundationMetrics.active_portfolio_coverage_percentage}%`,
    `- declared products: ${input.foundationMetrics.declared_products}`,
    `- implemented products: ${input.foundationMetrics.implemented_products}/${input.foundationMetrics.declared_products}`,
    `- implementation coverage: ${input.foundationMetrics.implementation_coverage_percentage}%`,
    `- verified products: ${input.foundationMetrics.verified_products}/${input.foundationMetrics.declared_products}`,
    `- portfolio coverage: ${input.foundationMetrics.portfolio_coverage_percentage}%`,
    `- registry health: ${input.graphHealth.registry_health}`,
    `- graph integrity: ${input.graphHealth.graph_integrity_status}`,
    `- owner coverage ratio: ${input.graphHealth.owner_coverage_ratio}`,
    `- reachability ratio: ${input.graphHealth.reachability_ratio}`,
    `- orphan artifacts: ${input.graphHealth.orphan_artifacts.length}`,
    `- dead capabilities: ${input.graphHealth.dead_capabilities.length}`,
    `- orphan active_waiting_composition: ${
      input.graphHealth.orphan_capability_classification.filter(
        (entry) => entry.classification === "ACTIVE_WAITING_COMPOSITION",
      ).length
    }`,
    `- orphan planned: ${
      input.graphHealth.orphan_capability_classification.filter(
        (entry) => entry.classification === "PLANNED",
      ).length
    }`,
    `- orphan retired: ${
      input.graphHealth.orphan_capability_classification.filter(
        (entry) => entry.classification === "RETIRED",
      ).length
    }`,
    `- fitness status: ${input.fitnessReport.fitness_status}`,
    `- declared capabilities: ${input.executionEvidence.summary.declared_capabilities}`,
    `- observed capabilities: ${input.executionEvidence.summary.observed_capabilities}`,
    `- verified capabilities: ${input.executionEvidence.summary.verified_capabilities}`,
    `- reproducible capabilities: ${input.executionEvidence.summary.reproducible_capabilities}`,
    `- execution chain invocations: ${input.executionChain.total_invocations}`,
    `- execution chains: ${input.executionChain.total_chains}`,
    `- unique chain digests: ${input.executionChain.unique_chain_digests}`,
    `- chains with requirement: ${input.executionChain.chains_with_requirement}`,
    `- chains with workflow: ${input.executionChain.chains_with_workflow}`,
    `- chains with evidence: ${input.executionChain.chains_with_evidence}`,
    `- reproducible chains: ${input.executionChain.reproducible_chains}`,
    `- stable chains: ${input.executionChain.stable_chains}`,
    `- products with execution plan: ${input.executionPlan.products_with_execution_plan}/${input.foundationMetrics.declared_products}`,
    `- execution plan coverage ratio: ${input.executionPlan.execution_plan_coverage_ratio}`,
    `- topology drift status: ${input.topologyDrift.drift_status}`,
    `- aligned products: ${input.topologyDrift.aligned_products}`,
    `- drifted products: ${input.topologyDrift.drifted_products}`,
    `- undeclared observed edges: ${input.topologyDrift.undeclared_observed_edges}`,
    `- unobserved declared edges: ${input.topologyDrift.unobserved_declared_edges}`,
    `- unmodeled observed requirements: ${input.topologyDrift.unmodeled_observed_requirements}`,
    `- unmodeled observed workflows: ${input.topologyDrift.unmodeled_observed_workflows}`,
    `- unmodeled observed plans: ${input.topologyDrift.unmodeled_observed_plans}`,
    `- architecture trend: ${input.architectureTrend.trend_status}`,
    `- latest epoch: ${input.architectureTrend.latest_epoch}`,
    `- total epochs: ${input.architectureTrend.total_epochs}`,
    `- governance read model freshness ms: ${input.governanceReadModelMetrics.freshness_ms}`,
    `- governance read model generation duration ms: ${input.governanceReadModelMetrics.generation_duration_ms}`,
    `- governance read model consumer count: ${input.governanceReadModelMetrics.consumer_count}`,
    `- incremental materialization status: ${input.governanceIncrementalMaterialization.incremental_readiness_status}`,
    `- incremental changed nodes: ${input.governanceIncrementalMaterialization.changed_node_count}`,
    `- incremental impacted nodes: ${input.governanceIncrementalMaterialization.impacted_node_count}`,
    `- incremental reusable nodes: ${input.governanceIncrementalMaterialization.reusable_node_count}`,
    `- selective reused nodes: ${input.governanceSelectiveExecution.reused_node_count}`,
    `- selective rematerialized nodes: ${input.governanceSelectiveExecution.rematerialized_node_count}`,
    `- read-model reused nodes: ${input.governanceReadModelSelectiveExecution.reused_node_count}`,
    `- read-model rematerialized nodes: ${input.governanceReadModelSelectiveExecution.rematerialized_node_count}`,
    `- capability operational observed: ${input.capabilityOperationalMetrics.observed_capabilities}`,
    `- capability operational verified: ${input.capabilityOperationalMetrics.verified_capabilities}`,
    `- capability operational reproducible: ${input.capabilityOperationalMetrics.reproducible_capabilities}`,
    `- capability operational invocations: ${input.capabilityOperationalMetrics.total_invocations}`,
    `- capability certification status: ${input.capabilityCertification.overall_status}`,
    `- certified capabilities: ${input.capabilityCertification.certified_capabilities}`,
    `- partial capabilities: ${input.capabilityCertification.partial_capabilities}`,
    `- failed capabilities: ${input.capabilityCertification.failed_capabilities}`,
    `- performance-evaluated capabilities: ${input.capabilityCertification.performance_evaluated_capabilities}`,
    `- graph fitness: ${input.graphFitness.fitness_status}`,
    `- graph connectivity ratio: ${input.graphFitness.connectivity_ratio}`,
    `- planner coverage ratio: ${input.graphFitness.planner_coverage_ratio}`,
    `- runtime coverage ratio: ${input.graphFitness.runtime_coverage_ratio}`,
    `- verification coverage ratio: ${input.graphFitness.verification_coverage_ratio}`,
    `- replay stability ratio: ${input.graphFitness.replay_stability_ratio}`,
    `- specification system status: ${input.specificationSystem.overall_status}`,
    `- specification registry artifacts: ${input.specificationSystem.registry_artifacts}`,
    `- specification registry edges: ${input.specificationSystem.registry_edges}`,
    `- specification RFC count: ${input.specificationSystem.rfc_count}`,
    `- specification CONF count: ${input.specificationSystem.conf_count}`,
    `- specification SPEC count: ${input.specificationSystem.spec_count}`,
    `- specification conformance status: ${input.specificationSystem.conformance_status}`,
    `- specification conformance warnings: ${input.specificationSystem.conformance_warnings}`,
    `- specification conformance failures: ${input.specificationSystem.conformance_failures}`,
    `- specification vocabulary status: ${input.specificationSystem.vocabulary_status}`,
    `- specification vocabulary terms: ${input.specificationSystem.vocabulary_terms}`,
    `- specification vocabulary duplicates: ${input.specificationSystem.vocabulary_duplicates}`,
    `- executable specs: ${input.specAudit.summary.executable_ssot}/${input.specAudit.summary.total_specs}`,
    `- documentation-only specs: ${input.specAudit.summary.documentation_only}`,
    `- missing active product implementation: ${
      input.foundationMetrics.missing_active_product_implementation.length > 0
        ? input.foundationMetrics.missing_active_product_implementation.join(", ")
        : "none"
    }`,
    `- pending active product verification: ${
      input.foundationMetrics.pending_active_product_verification.length > 0
        ? input.foundationMetrics.pending_active_product_verification.join(", ")
        : "none"
    }`,
    `- missing product implementation: ${
      input.foundationMetrics.missing_product_implementation.length > 0
        ? input.foundationMetrics.missing_product_implementation.join(", ")
        : "none"
    }`,
    `- pending implemented product verification: ${
      input.foundationMetrics.pending_product_verification.length > 0
        ? input.foundationMetrics.pending_product_verification.join(", ")
        : "none"
    }`,
    `- missing product verification: ${
      input.foundationMetrics.missing_product_verification.length > 0
        ? input.foundationMetrics.missing_product_verification.join(", ")
        : "none"
    }`,
    "",
    "## Evidence",
    ...input.evidenceFiles.map((file) => `- ${file}`),
    "",
  ].join("\n");
}
