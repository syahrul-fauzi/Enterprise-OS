import { z } from "zod";

import {
  DeepReadonly,
  FactReferenceSchema,
  RuntimeIdentifierSchema,
} from "./shared.js";

const QueryFilterSchema = z
  .object({
    field: RuntimeIdentifierSchema,
    operator: z.enum(["EQ", "NEQ", "IN", "CONTAINS"]).default("EQ"),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })
  .strict();

export const EnterpriseQueryRequestSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("SHOW"),
      entity: RuntimeIdentifierSchema,
      filters: z.array(QueryFilterSchema).default([]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("TRACE"),
      subject: FactReferenceSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("IMPACT"),
      subject: FactReferenceSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("WHY"),
      subject: FactReferenceSchema,
      expected_status: z.string().min(1).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("DIFF"),
      from_graph_digest: RuntimeIdentifierSchema,
      to_graph_digest: RuntimeIdentifierSchema,
      scope: RuntimeIdentifierSchema.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("PATH"),
      from_node_id: RuntimeIdentifierSchema,
      to_node_id: RuntimeIdentifierSchema,
    })
    .strict(),
]);

export const EnterpriseQueryResultSchema = z
  .object({
    kind: z.enum(["SHOW", "TRACE", "IMPACT", "WHY", "DIFF", "PATH"]),
    source: z.enum(["ECG", "EDL", "MIXED"]),
    records: z.array(z.record(z.string(), z.unknown())),
    fact_refs: z.array(FactReferenceSchema).default([]),
    decision_refs: z
      .array(
        z
          .object({
            decision_entry_id: RuntimeIdentifierSchema,
            decision_id: RuntimeIdentifierSchema,
          })
          .strict(),
      )
      .default([]),
    explanation: z.string().min(1).optional(),
  })
  .strict();

export type EnterpriseQueryRequest = DeepReadonly<
  z.infer<typeof EnterpriseQueryRequestSchema>
>;
export type EnterpriseQueryResult = DeepReadonly<
  z.infer<typeof EnterpriseQueryResultSchema>
>;
