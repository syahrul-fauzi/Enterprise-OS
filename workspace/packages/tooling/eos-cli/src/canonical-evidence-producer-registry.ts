import type {
  CanonicalEvidenceProducerDefinition,
  CanonicalEvidenceProducerTarget,
} from "./canonical-evidence-producer-runtime.js";
import { DEFAULT_CANONICAL_EVIDENCE_PRODUCER_TARGETS } from "./canonical-evidence-producer-runtime.js";
import { DECISION_IMPACT_EVIDENCE_PRODUCER } from "./decision/runtime/impact-runtime.js";
import { DECISION_OUTCOME_EVIDENCE_PRODUCER } from "./decision/runtime/outcome-runtime.js";
import { FOUNDATION_REPORT_EVIDENCE_PRODUCER } from "./foundation/runtime/report-evidence-runtime.js";
import { GATE_C_STATUS_EVIDENCE_PRODUCER } from "./gate/evidence/status-evidence.js";
import { PRODUCT_RUNTIME_EVIDENCE_PRODUCER } from "./product-runtime-evidence-runtime.js";
import { SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER } from "./specification/runtime/projection-runtime.js";

export type CanonicalEvidenceProducerRegistryEntry = Readonly<{
  target: CanonicalEvidenceProducerTarget;
  producer: CanonicalEvidenceProducerDefinition | null;
}>;

const REGISTERED_PRODUCERS_BY_ID: Readonly<
  Record<string, CanonicalEvidenceProducerDefinition>
> = {
  [FOUNDATION_REPORT_EVIDENCE_PRODUCER.producer_id]:
    FOUNDATION_REPORT_EVIDENCE_PRODUCER,
  [GATE_C_STATUS_EVIDENCE_PRODUCER.producer_id]:
    GATE_C_STATUS_EVIDENCE_PRODUCER,
  [SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER.producer_id]:
    SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER,
  [DECISION_OUTCOME_EVIDENCE_PRODUCER.producer_id]:
    DECISION_OUTCOME_EVIDENCE_PRODUCER,
  [DECISION_IMPACT_EVIDENCE_PRODUCER.producer_id]:
    DECISION_IMPACT_EVIDENCE_PRODUCER,
  [PRODUCT_RUNTIME_EVIDENCE_PRODUCER.producer_id]:
    PRODUCT_RUNTIME_EVIDENCE_PRODUCER,
};

export const CANONICAL_EVIDENCE_PRODUCER_REGISTRY =
  DEFAULT_CANONICAL_EVIDENCE_PRODUCER_TARGETS.map((target) => ({
    target,
    producer: REGISTERED_PRODUCERS_BY_ID[target.producer_id] ?? null,
  })) as readonly CanonicalEvidenceProducerRegistryEntry[];

export function listCanonicalEvidenceProducerTargets(): readonly CanonicalEvidenceProducerTarget[] {
  return CANONICAL_EVIDENCE_PRODUCER_REGISTRY.map((entry) => entry.target);
}

export function listRegisteredCanonicalEvidenceProducers(): readonly CanonicalEvidenceProducerDefinition[] {
  return CANONICAL_EVIDENCE_PRODUCER_REGISTRY.flatMap((entry) =>
    entry.producer === null ? [] : [entry.producer],
  );
}
