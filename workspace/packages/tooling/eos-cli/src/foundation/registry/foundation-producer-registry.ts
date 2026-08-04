import type {
  EvidenceProducerExecution,
} from "../../evidence-producer-spi.js";
import { executeEvidenceProducer } from "../../evidence-producer-spi.js";
import {
  CAPABILITY_FOUNDATION_PRODUCER,
  type CapabilityFoundationProducerContext,
} from "../../capability/producers/foundation-producer.js";
import {
  DECISION_FOUNDATION_PRODUCER,
  type DecisionFoundationProducerContext,
} from "../../decision/producers/foundation-producer.js";
import {
  EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER,
  type EvidenceConvergenceFoundationProducerContext,
} from "../../evidence-convergence-foundation-producer.js";
import {
  LEARNING_FOUNDATION_PRODUCER,
  type LearningFoundationProducerContext,
} from "../../learning/producers/foundation-producer.js";
import {
  SPECIFICATION_FOUNDATION_PRODUCER,
  type SpecificationFoundationProducerContext,
} from "../../specification/producers/foundation-producer.js";

export type FoundationProducerRegistryContext = Readonly<{
  specification: SpecificationFoundationProducerContext;
  decision: DecisionFoundationProducerContext;
  learning: LearningFoundationProducerContext;
  evidenceConvergence: EvidenceConvergenceFoundationProducerContext;
  capability: CapabilityFoundationProducerContext;
}>;

export type FoundationProducerRegistryExecutions = Readonly<{
  specification: EvidenceProducerExecution<
    Awaited<ReturnType<typeof SPECIFICATION_FOUNDATION_PRODUCER.collect>>,
    Awaited<ReturnType<typeof SPECIFICATION_FOUNDATION_PRODUCER.evaluate>>,
    Awaited<ReturnType<typeof SPECIFICATION_FOUNDATION_PRODUCER.project>>,
    Awaited<ReturnType<typeof SPECIFICATION_FOUNDATION_PRODUCER.materialize>>
  >;
  decision: EvidenceProducerExecution<
    Awaited<ReturnType<typeof DECISION_FOUNDATION_PRODUCER.collect>>,
    Awaited<ReturnType<typeof DECISION_FOUNDATION_PRODUCER.evaluate>>,
    Awaited<ReturnType<typeof DECISION_FOUNDATION_PRODUCER.project>>,
    Awaited<ReturnType<typeof DECISION_FOUNDATION_PRODUCER.materialize>>
  >;
  learning: EvidenceProducerExecution<
    Awaited<ReturnType<typeof LEARNING_FOUNDATION_PRODUCER.collect>>,
    Awaited<ReturnType<typeof LEARNING_FOUNDATION_PRODUCER.evaluate>>,
    Awaited<ReturnType<typeof LEARNING_FOUNDATION_PRODUCER.project>>,
    Awaited<ReturnType<typeof LEARNING_FOUNDATION_PRODUCER.materialize>>
  >;
  evidenceConvergence: EvidenceProducerExecution<
    Awaited<ReturnType<typeof EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER.collect>>,
    Awaited<ReturnType<typeof EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER.evaluate>>,
    Awaited<ReturnType<typeof EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER.project>>,
    Awaited<
      ReturnType<typeof EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER.materialize>
    >
  >;
  capability: EvidenceProducerExecution<
    Awaited<ReturnType<typeof CAPABILITY_FOUNDATION_PRODUCER.collect>>,
    Awaited<ReturnType<typeof CAPABILITY_FOUNDATION_PRODUCER.evaluate>>,
    Awaited<ReturnType<typeof CAPABILITY_FOUNDATION_PRODUCER.project>>,
    Awaited<ReturnType<typeof CAPABILITY_FOUNDATION_PRODUCER.materialize>>
  >;
}>;

export async function executeFoundationProducerRegistry(
  context: FoundationProducerRegistryContext,
): Promise<FoundationProducerRegistryExecutions> {
  const [
    specification,
    learning,
    evidenceConvergence,
    capability,
  ] = await Promise.all([
    executeEvidenceProducer(SPECIFICATION_FOUNDATION_PRODUCER, context.specification),
    executeEvidenceProducer(LEARNING_FOUNDATION_PRODUCER, context.learning),
    executeEvidenceProducer(
      EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER,
      context.evidenceConvergence,
    ),
    executeEvidenceProducer(CAPABILITY_FOUNDATION_PRODUCER, context.capability),
  ]);
  const decision = await executeEvidenceProducer(
    DECISION_FOUNDATION_PRODUCER,
    context.decision,
  );

  return {
    specification,
    decision,
    learning,
    evidenceConvergence,
    capability,
  };
}
