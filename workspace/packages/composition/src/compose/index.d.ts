import type { DescriptorSource } from "../normalizer/types";
import type { ResolverContext, ResolvedWorkspace } from "../resolver/types";
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
export declare function compose(input: ComposeInput): ComposeResult;
//# sourceMappingURL=index.d.ts.map