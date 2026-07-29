import type { DescriptorSource } from "../normalizer/types";
import { normalizeWorkspace } from "../normalizer/normalize";
import { buildCompositionPlan } from "../plan/build-plan";
import { buildGraphFromPlan } from "../graph/build";
import type { ResolverContext, ResolvedWorkspace } from "../resolver/types";
import { resolveWorkspace } from "../resolver/resolve";
import type { WorkspaceGraph } from "../graph/types";
import type { NormalizedWorkspace } from "../normalizer/types";
import type { ResolverCapabilityEntry } from "../resolver/types";
import type { CompositionPlan } from "../plan/types";

export interface ComposeInput extends DescriptorSource {
  readonly resolver?: Partial<Pick<ResolverContext, "actor" | "features" | "slotOverrides" | "requestId">> & {
    readonly capabilityEntries?: Readonly<Record<string, ResolverCapabilityEntry>>;
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
  const entries: Readonly<Record<string, ResolverCapabilityEntry>> = resolver?.capabilityEntries ?? Object.fromEntries(
    input.workspace.permissions?.requireCapabilities?.map((id) => [id, { id, available: true }] as const) ?? [],
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
