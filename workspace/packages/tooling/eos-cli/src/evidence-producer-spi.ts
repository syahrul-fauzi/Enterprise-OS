export type EvidenceProducerSubject = Readonly<{
  subject_ref: string;
  subject_type: string;
}>;

export interface EvidenceProducer<
  TContext,
  TCollected,
  TEvaluated,
  TProjected,
  TMaterialized,
> {
  id(): string;
  subject(context: TContext): EvidenceProducerSubject;
  collect(context: TContext): TCollected | Promise<TCollected>;
  evaluate(input: {
    readonly context: TContext;
    readonly subject: EvidenceProducerSubject;
    readonly collected: TCollected;
  }): TEvaluated | Promise<TEvaluated>;
  project(input: {
    readonly context: TContext;
    readonly subject: EvidenceProducerSubject;
    readonly collected: TCollected;
    readonly evaluation: TEvaluated;
  }): TProjected | Promise<TProjected>;
  materialize(input: {
    readonly context: TContext;
    readonly subject: EvidenceProducerSubject;
    readonly collected: TCollected;
    readonly evaluation: TEvaluated;
    readonly projection: TProjected;
  }): TMaterialized | Promise<TMaterialized>;
}

export type EvidenceProducerExecution<
  TCollected,
  TEvaluated,
  TProjected,
  TMaterialized,
> = Readonly<{
  producer_id: string;
  subject: EvidenceProducerSubject;
  collected: TCollected;
  evaluation: TEvaluated;
  projection: TProjected;
  materialized: TMaterialized;
}>;

export async function executeEvidenceProducer<
  TContext,
  TCollected,
  TEvaluated,
  TProjected,
  TMaterialized,
>(
  producer: EvidenceProducer<
    TContext,
    TCollected,
    TEvaluated,
    TProjected,
    TMaterialized
  >,
  context: TContext,
): Promise<
  EvidenceProducerExecution<TCollected, TEvaluated, TProjected, TMaterialized>
> {
  const subject = producer.subject(context);
  const collected = await producer.collect(context);
  const evaluation = await producer.evaluate({
    context,
    subject,
    collected,
  });
  const projection = await producer.project({
    context,
    subject,
    collected,
    evaluation,
  });
  const materialized = await producer.materialize({
    context,
    subject,
    collected,
    evaluation,
    projection,
  });

  return {
    producer_id: producer.id(),
    subject,
    collected,
    evaluation,
    projection,
    materialized,
  };
}
