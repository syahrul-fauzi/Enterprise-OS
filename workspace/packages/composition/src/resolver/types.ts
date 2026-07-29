import type { SlotId } from "../slots";
import type { GraphNodeId, WorkspaceGraph, WorkspaceGraphNode } from "../graph/types";
import type { WorkspaceId } from "../normalizer/types";
import type { NavigationDescriptor } from "../navigation";
import type { RegionDescriptor, RegionId } from "../regions";

export interface ResolverFeatureFlags {
  readonly flags: Readonly<Record<string, boolean>>;
}

export interface ResolverActor {
  readonly id?: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export interface ResolverCapabilityEntry {
  readonly id: string;
  readonly version?: string;
  readonly available: boolean;
  readonly reason?: string;
  readonly fallbackFor?: readonly string[];
}

export interface ResolverCapabilityRegistry {
  readonly list: (ids?: readonly string[]) => readonly ResolverCapabilityEntry[];
  readonly get: (id: string) => ResolverCapabilityEntry | undefined;
}

export interface ResolverContext {
  readonly actor: ResolverActor;
  readonly features: ResolverFeatureFlags;
  readonly capabilities: ResolverCapabilityRegistry;
  readonly slotOverrides?: Readonly<Record<SlotId, readonly string[]>>;
  readonly requestId: string;
}

export interface ResolverStatusEntry {
  readonly graphNodeId: GraphNodeId;
  readonly capabilityId: string;
  readonly status: "resolved" | "permission-denied" | "unavailable" | "fallback" | "disabled";
  readonly reason?: string;
  readonly effectiveCapabilityId?: string;
}

export interface ResolvedSlotInstance {
  readonly slotId: SlotId;
  readonly capabilityId: string;
  readonly view?: string;
  readonly priority: number;
  readonly status: "active" | "fallback";
}

export interface ResolvedRegion {
  readonly regionId: RegionId;
  readonly region: RegionDescriptor;
  readonly slots: Readonly<Record<SlotId, readonly ResolvedSlotInstance[]>>;
  readonly visible: boolean;
}

export interface ResolvedNavigation {
  readonly id: string;
  readonly descriptor: NavigationDescriptor;
  readonly visibleItems: readonly (string | number)[];
}

export interface ResolvedWorkspace {
  readonly workspaceId: WorkspaceId;
  readonly canonicalId: string;
  readonly name: string;
  readonly graphId: GraphNodeId;
  readonly graphHash: string;
  readonly layoutPattern: "single" | "sidebar-main" | "three-pane" | "tabs" | "master-detail" | "dashboard";
  readonly layoutId: string;
  readonly regions: Readonly<Record<RegionId, ResolvedRegion>>;
  readonly regionOrder: readonly RegionId[];
  readonly navigation: readonly ResolvedNavigation[];
  readonly capabilities: Readonly<Record<string, ResolverStatusEntry>>;
  readonly activeCapabilityIds: readonly string[];
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly resolved: boolean;
  readonly workspaceNode: WorkspaceGraphNode;
  readonly sourceGraph: WorkspaceGraph;
}
