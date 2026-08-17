import type { DescriptorSource } from "../normalizer/types.js";
import { normalizeWorkspace } from "../normalizer/normalize.js";
import { buildCompositionPlan } from "../plan/build-plan.js";
import { buildGraphFromPlan } from "../graph/build.js";
import type { ResolverContext, ResolvedWorkspace } from "../resolver/types.js";
import { resolveWorkspace } from "../resolver/resolve.js";
import type { WorkspaceGraph } from "../graph/types.js";
import type { NormalizedWorkspace } from "../normalizer/types.js";
import type { ResolverCapabilityEntry } from "../resolver/types.js";
import type { CompositionPlan } from "../plan/types.js";
import type { ExecutionGraphReport } from "@repo/core-capability-registry";
import { buildCapabilityEntriesFromExecutionGraph } from "../execution-graph/index.js";

export interface ComposeInput extends DescriptorSource {
  readonly resolver?: Partial<Pick<ResolverContext, "actor" | "features" | "slotOverrides" | "requestId">> & {
    readonly capabilityEntries?: Readonly<Record<string, ResolverCapabilityEntry>>;
    readonly executionGraph?: ExecutionGraphReport;
  };
}

export interface ComposeResult {
  readonly normalized: NormalizedWorkspace;
  readonly plan: CompositionPlan;
  readonly graph: WorkspaceGraph;
  readonly resolved: ResolvedWorkspace;
  readonly graphId: string;
  readonly graphHash: string;
  readonly planId: string;
  readonly duration: {
    readonly normalizeMs: number;
    readonly planMs: number;
    readonly graphMs: number;
    readonly resolveMs: number;
    readonly totalMs: number;
  };
}

function makeDefaultCtx(input: ComposeInput): ResolverContext {
  const resolver = input.resolver;
  const entries: Readonly<Record<string, ResolverCapabilityEntry>> =
    resolver?.executionGraph
      ? buildCapabilityEntriesFromExecutionGraph(resolver.executionGraph)
      : resolver?.capabilityEntries ?? Object.fromEntries(
          input.workspace.permissions?.requireCapabilities?.map((id) => [id, { id, available: true }] as const) ??
            [],
        );
  const listFn = (ids?: readonly string[]) => {
    const idsArr = ids ?? Object.keys(entries);
    return idsArr.map((id) => entries[id] ?? { id, available: false, reason: `not in entries: ${id}` });
  };
  const getFn = (id: string) => entries[id];
  return {
    actor: resolver?.actor ?? { roles: ["user"], permissions: [] },
    features: resolver?.features ?? { flags: {} },
    capabilities: { list: listFn, get: getFn },
    slotOverrides: resolver?.slotOverrides ?? {},
    requestId: resolver?.requestId ?? `req-${input.workspace.id ?? "anon"}-0`,
  };
}

export function compose(input: ComposeInput): ComposeResult {
  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const normalized = normalizeWorkspace(input);
  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const plan = buildCompositionPlan(normalized);
  const t2 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const graph = buildGraphFromPlan(plan);
  const t3 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const ctx = makeDefaultCtx(input);
  const resolved = resolveWorkspace(graph, ctx);
  const t4 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  return {
    normalized,
    plan,
    graph,
    resolved,
    graphId: String(graph.id),
    graphHash: graph.hash,
    planId: plan.id,
    duration: {
      normalizeMs: t1 - t0,
      planMs: t2 - t1,
      graphMs: t3 - t2,
      resolveMs: t4 - t3,
      totalMs: t4 - t0,
    },
  } as const;
}
