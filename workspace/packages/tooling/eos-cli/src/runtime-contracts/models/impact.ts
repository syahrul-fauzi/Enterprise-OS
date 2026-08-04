import { z } from "zod";

import { DecisionLedgerReferenceSchema } from "./ledger.js";
import {
  DeepReadonly,
  RuntimeIdentifierSchema,
} from "./shared.js";

export const DecisionImpactNodeSchema = z
  .object({
    node_id: RuntimeIdentifierSchema,
    node_kind: z.enum([
      "decision",
      "capability",
      "evidence",
      "outcome",
      "learning",
      "leverage_metric",
    ]),
    display_name: z.string().min(1),
    digest: RuntimeIdentifierSchema,
    status: RuntimeIdentifierSchema,
    attributes: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const DecisionImpactEdgeSchema = z
  .object({
    edge_id: RuntimeIdentifierSchema,
    edge_kind: z.enum([
      "USES_EVIDENCE",
      "IMPACTS_CAPABILITY",
      "REALIZES_OUTCOME",
      "CAPTURES_LEARNING",
      "MEASURES_LEVERAGE",
    ]),
    from_node_id: RuntimeIdentifierSchema,
    to_node_id: RuntimeIdentifierSchema,
    rationale: z.string().min(1),
  })
  .strict();

export const EngineeringLeverageStatusSchema = z.enum([
  "IMPROVED",
  "UNCHANGED",
  "REGRESSED",
  "NOT_MATERIALIZED",
]);

export const DecisionImpactGraphSchema = z
  .object({
    graph_id: RuntimeIdentifierSchema,
    graph_digest: RuntimeIdentifierSchema,
    decision_reference: DecisionLedgerReferenceSchema,
    summary: z
      .object({
        node_count: z.number().int().nonnegative(),
        edge_count: z.number().int().nonnegative(),
        capability_count: z.number().int().nonnegative(),
        evidence_count: z.number().int().nonnegative(),
        learning_count: z.number().int().nonnegative(),
        leverage_measurement_status: EngineeringLeverageStatusSchema,
        leverage_delta_value: z.number().nullable(),
      })
      .strict(),
    nodes: z.array(DecisionImpactNodeSchema),
    edges: z.array(DecisionImpactEdgeSchema),
    claim_boundary: z.string().min(1),
  })
  .strict();

export type DecisionImpactNode = DeepReadonly<
  z.infer<typeof DecisionImpactNodeSchema>
>;
export type DecisionImpactEdge = DeepReadonly<
  z.infer<typeof DecisionImpactEdgeSchema>
>;
export type EngineeringLeverageStatus = DeepReadonly<
  z.infer<typeof EngineeringLeverageStatusSchema>
>;
export type DecisionImpactGraph = DeepReadonly<
  z.infer<typeof DecisionImpactGraphSchema>
>;
