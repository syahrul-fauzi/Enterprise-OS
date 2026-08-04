import type { NormalizedWorkspace } from "../normalizer/types";
import type { CompositionPlan } from "../plan/types";
import type { WorkspaceGraph } from "./types";
import type { DescriptorSource } from "../normalizer/types";
export declare function buildGraphFromPlan(plan: CompositionPlan): WorkspaceGraph;
export declare function buildGraphFromNormalized(ws: NormalizedWorkspace): WorkspaceGraph;
export declare function buildGraph(source: DescriptorSource): WorkspaceGraph;
//# sourceMappingURL=build.d.ts.map