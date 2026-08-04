import { z } from "zod";

import {
  DeepReadonly,
  RuntimeIdentifierSchema,
  RuntimeTimestampSchema,
} from "./shared.js";

export const EnterpriseControlGraphNodeSchema = z
  .object({
    node_id: RuntimeIdentifierSchema,
    node_kind: RuntimeIdentifierSchema,
    display_name: z.string().min(1),
    digest: RuntimeIdentifierSchema,
    attributes: z.record(z.string(), z.unknown()),
  })
  .strict();

export const EnterpriseControlGraphEdgeSchema = z
  .object({
    edge_id: RuntimeIdentifierSchema,
    edge_kind: RuntimeIdentifierSchema,
    from_node_id: RuntimeIdentifierSchema,
    to_node_id: RuntimeIdentifierSchema,
    rationale: z.string().min(1).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const EnterpriseControlGraphSnapshotSchema = z
  .object({
    graph_id: RuntimeIdentifierSchema,
    graph_digest: RuntimeIdentifierSchema,
    captured_at: RuntimeTimestampSchema,
    nodes: z.array(EnterpriseControlGraphNodeSchema),
    edges: z.array(EnterpriseControlGraphEdgeSchema),
  })
  .strict();

export const EnterpriseControlGraphReferenceSchema = z
  .object({
    graph_id: RuntimeIdentifierSchema,
    graph_digest: RuntimeIdentifierSchema,
    captured_at: RuntimeTimestampSchema.optional(),
  })
  .strict();

export type EnterpriseControlGraphNode = DeepReadonly<
  z.infer<typeof EnterpriseControlGraphNodeSchema>
>;
export type EnterpriseControlGraphEdge = DeepReadonly<
  z.infer<typeof EnterpriseControlGraphEdgeSchema>
>;
export type EnterpriseControlGraphSnapshot = DeepReadonly<
  z.infer<typeof EnterpriseControlGraphSnapshotSchema>
>;
export type EnterpriseControlGraphReference = DeepReadonly<
  z.infer<typeof EnterpriseControlGraphReferenceSchema>
>;
