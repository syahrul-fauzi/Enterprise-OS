import type { LayoutDescriptor } from "../layouts";
import type { NavigationDescriptor, NavigationItem } from "../navigation";
import type { RegionDescriptor, RegionId } from "../regions";
import type { SlotDescriptor, SlotId, SlotInstance } from "../slots";
import type { ValidationIssue, WorkspaceId } from "../normalizer/types";
import type { CanonicalJsonString, Fnv1a32Hex } from "../canonical/types";
export type GraphNodeKind = "workspace" | "layout" | "region" | "slot" | "capability" | "navigation" | "navigation-item";
export type GraphNodeId = string & {
    readonly __graphNodeId: unique symbol;
};
export declare function GraphNodeId(s: string): GraphNodeId;
export interface BaseGraphNode {
    readonly id: GraphNodeId;
    readonly kind: GraphNodeKind;
    readonly parentId: GraphNodeId | null;
    readonly childIds: readonly GraphNodeId[];
    readonly depth: number;
}
export interface WorkspaceGraphNode extends BaseGraphNode {
    readonly kind: "workspace";
    readonly workspaceId: WorkspaceId;
    readonly canonicalId: string;
    readonly name: string;
    readonly requireCapabilities: readonly string[];
    readonly requireRoles: readonly string[];
}
export interface LayoutGraphNode extends BaseGraphNode {
    readonly kind: "layout";
    readonly layout: LayoutDescriptor;
}
export interface RegionGraphNode extends BaseGraphNode {
    readonly kind: "region";
    readonly region: RegionDescriptor;
    readonly regionId: RegionId;
}
export interface SlotGraphNode extends BaseGraphNode {
    readonly kind: "slot";
    readonly slot: SlotDescriptor;
    readonly slotId: SlotId;
    readonly regionId: RegionId;
    readonly defaultInstance: SlotInstance | null;
}
export interface CapabilityGraphNode extends BaseGraphNode {
    readonly kind: "capability";
    readonly capabilityId: string;
    readonly source: "default-experience" | "slot-default" | "navigation" | "workspace-requirement";
    readonly view?: string;
    readonly slotId?: SlotId;
    readonly priority: number;
}
export interface NavigationGraphNode extends BaseGraphNode {
    readonly kind: "navigation";
    readonly descriptor: NavigationDescriptor;
    readonly navigationId: string;
}
export interface NavigationItemGraphNode extends BaseGraphNode {
    readonly kind: "navigation-item";
    readonly item: NavigationItem;
    readonly navigationId: string;
}
export type GraphNode = WorkspaceGraphNode | LayoutGraphNode | RegionGraphNode | SlotGraphNode | CapabilityGraphNode | NavigationGraphNode | NavigationItemGraphNode;
export interface WorkspaceGraph {
    readonly id: GraphNodeId;
    readonly workspaceId: WorkspaceId;
    readonly canonicalId: string;
    readonly root: GraphNodeId;
    readonly nodes: Readonly<Record<GraphNodeId, GraphNode>>;
    readonly order: readonly GraphNodeId[];
    readonly byKind: Readonly<Record<GraphNodeKind, readonly GraphNodeId[]>>;
    readonly slotToCapability: Readonly<Record<SlotId, readonly GraphNodeId[]>>;
    readonly referencedCapabilityIds: readonly string[];
    readonly validationIssues: readonly ValidationIssue[];
    readonly hash: Fnv1a32Hex;
    readonly structuralChecksum: Fnv1a32Hex;
    readonly canonicalJson: CanonicalJsonString;
}
//# sourceMappingURL=types.d.ts.map