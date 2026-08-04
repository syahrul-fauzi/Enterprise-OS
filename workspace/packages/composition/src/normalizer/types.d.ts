import type { LayoutDescriptor, LayoutId } from "../layouts";
import type { NavigationDescriptor } from "../navigation";
import type { RegionDescriptor, RegionId } from "../regions";
import type { SlotDescriptor, SlotId, SlotInstance } from "../slots";
import type { CompositionWorkspaceDescriptor } from "../workspace";
import type { CanonicalJsonString, Fnv1a32Hex } from "../canonical/types";
export type WorkspaceId = string & {
    readonly __workspaceId: unique symbol;
};
export declare function WorkspaceId(s: string): WorkspaceId;
export interface ValidationIssue {
    readonly code: "missing_layout" | "unknown_region" | "unknown_slot" | "duplicate_region" | "duplicate_slot" | "missing_required_slot" | "invalid_capability_ref" | "empty_navigation_items" | "missing_id";
    readonly severity: "error" | "warning";
    readonly path: string;
    readonly message: string;
    readonly ref?: string;
}
export interface NormalizedWorkspace {
    readonly id: WorkspaceId;
    readonly name: string;
    readonly canonicalId: string;
    readonly layout: LayoutDescriptor;
    readonly regions: Readonly<Record<RegionId, RegionDescriptor>>;
    readonly regionOrder: readonly RegionId[];
    readonly slots: Readonly<Record<SlotId, SlotDescriptor>>;
    readonly slotRegionMap: Readonly<Record<SlotId, RegionId>>;
    readonly defaults: Readonly<Record<SlotId, SlotInstance>>;
    readonly navigation: Readonly<Record<string, NavigationDescriptor>>;
    readonly navigationOrder: readonly string[];
    readonly permissions: {
        readonly requireCapabilities: readonly string[];
        readonly requireRoles: readonly string[];
    };
    readonly capabilitiesReferenced: readonly string[];
    readonly validation: {
        readonly issues: readonly ValidationIssue[];
        readonly valid: boolean;
    };
    readonly hash: Fnv1a32Hex;
    readonly canonicalJson: CanonicalJsonString;
}
export interface DescriptorSource {
    readonly workspace: CompositionWorkspaceDescriptor;
    readonly layoutRegistry?: Readonly<Record<LayoutId, LayoutDescriptor>>;
    readonly regionRegistry?: Readonly<Record<RegionId, RegionDescriptor>>;
    readonly slotRegistry?: Readonly<Record<SlotId, SlotDescriptor>>;
    readonly navigationRegistry?: Readonly<Record<string, NavigationDescriptor>>;
}
export type NormalizeWorkspaceFn = (source: DescriptorSource) => NormalizedWorkspace;
//# sourceMappingURL=types.d.ts.map