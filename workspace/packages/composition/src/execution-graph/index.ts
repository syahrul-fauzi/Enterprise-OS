import type {
  ExecutionGraphNode,
  ExecutionGraphReport,
} from "@repo/core-capability-registry";
import type { ResolverCapabilityEntry } from "../resolver/types.js";

function asCapabilityNode(
  node: ExecutionGraphNode,
): node is ExecutionGraphNode & { readonly artifact_type: "capability" } {
  return node.artifact_type === "capability";
}

export function buildCapabilityEntriesFromExecutionGraph(
  executionGraph: ExecutionGraphReport,
): Readonly<Record<string, ResolverCapabilityEntry>> {
  return Object.fromEntries(
    executionGraph.nodes
      .filter(asCapabilityNode)
      .map((node) => {
        const capabilityId = node.id.replace(/^capability:/, "");
        const available = node.governance_status !== "INVALID";
        const reason =
          available
            ? node.execution_status === "DECLARED"
              ? "capability is declared in the shared execution graph but not yet observed in current evidence."
              : undefined
            : "capability is marked INVALID in the shared execution graph.";

        return [
          capabilityId,
          {
            id: capabilityId,
            available,
            reason,
          } satisfies ResolverCapabilityEntry,
        ] as const;
      }),
  );
}
