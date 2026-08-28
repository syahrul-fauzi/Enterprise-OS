//import type { LayoutDescriptor } from "../layouts/index.js";
//import type { NavigationDescriptor } from "../navigation/index.js";
//import type { RegionDescriptor, RegionId } from "../regions/index.js";
//import type { SlotDescriptor, SlotId, SlotInstance } from "../slots/index.js";
//import type { NormalizedWorkspace, ValidationIssue, WorkspaceId } from "../normalizer/types.js";
//import type { CanonicalJsonString, Fnv1a32Hex } from "../canonical/types.js";
//
//export type CapabilityRequirementSource =
//  | "workspace-permission"
//  | "slot-default"
//  | "slot-defaultExperience"
//  | "slot-capabilityIds"
//  | "navigation-item";
//
//export interface CapabilityRequirement {
//  readonly capabilityId: string;
//  readonly sources: readonly CapabilityRequirementSource[];
//  readonly declaredView?: string;
//  readonly declaredPriority?: number;
//  readonly targetingSlot?: SlotId;
//  readonly targetingNavItemId?: string;
//}
//
//export type DependencyKind =
//  | "capability"
//  | "plugin"
//  | "lazy-bundle"
//  | "remote-endpoint"
//  | "product-extension"
//  | "tenant-override";
//
//export interface DependencyEntry {
//  readonly id: string;
//  readonly kind: DependencyKind;
//  readonly required: boolean;
//  readonly triggers: readonly string[];
//}
//
//export interface EmptyRegionReport {
//  readonly regionId: RegionId;
//  readonly regionKind: RegionDescriptor["kind"];
//  readonly reason: "no-slots-declared" | "slots-but-no-defaults";
//  readonly declaredSlots: readonly SlotId[];
//}
//
//export interface SlotWithoutDefaultReport {
//  readonly slotId: SlotId;
//  readonly regionId: RegionId;
//  readonly reason: "required-but-no-default" | "optional-but-capabilityIds-declared" | "optional-empty-slot";
//  readonly capabilityIdsDeclared: readonly string[];
//}
//
//export interface FallbackNeededReport {
//  readonly type: "slot-default-missing" | "capability-referenced-but-not-in-permissions" | "required-slot-empty";
//  readonly referenceId: string;
//  readonly capabilityId?: string;
//  readonly slotId?: SlotId;
//}
//
//export interface PlanValidityReport {
//  readonly structurallyValid: boolean;
//  readonly fatalIssues: readonly ValidationIssue[];
//  readonly warnings: readonly ValidationIssue[];
//  readonly missingRequiredSlots: readonly SlotId[];
//  readonly unknownRegionReferences: readonly RegionId[];
//  readonly unknownSlotReferences: readonly SlotId[];
//}
//
//export interface StructuralOutline {
//  readonly workspaceId: WorkspaceId;
//  readonly workspaceName: string;
//  readonly canonicalId: string;
//  readonly layoutId: string;
//  readonly layoutPattern: LayoutDescriptor["pattern"];
//  readonly regionCount: number;
//  readonly slotCount: number;
//  readonly navigationCount: number;
//  readonly capabilityNodeProjections: {
//    readonly workspaceRequirements: number;
//    readonly slotDefaults: number;
//    readonly navigationReferences: number;
//    readonly totalProjected: number;
//  };
//}
//
//export interface CompositionPlan {
//  readonly id: string;
//  readonly workspaceId: WorkspaceId;
//  readonly name: string;
//  readonly canonicalId: string;
//  readonly sourceNormalizedId: WorkspaceId;
//  readonly sourceNormalizedHash: Fnv1a32Hex;
//  readonly structural: StructuralOutline;
//  readonly layout: LayoutDescriptor;
//  readonly regions: Readonly<Record<RegionId, RegionDescriptor>>;
//  readonly regionOrder: readonly RegionId[];
//  readonly slots: Readonly<Record<SlotId, SlotDescriptor>>;
//  readonly slotRegionMap: Readonly<Record<SlotId, RegionId>>;
//  readonly slotDefaults: Readonly<Record<SlotId, SlotInstance>>;
//  readonly navigation: Readonly<Record<string, NavigationDescriptor>>;
//  readonly navigationOrder: readonly string[];
//  readonly permissions: {
//    readonly requireCapabilities: readonly string[];
//    readonly requireRoles: readonly string[];
//  };
//  readonly capabilitiesRequired: Readonly<Record<string, CapabilityRequirement>>;
//  readonly capabilitiesRequiredOrder: readonly string[];
//  readonly dependencies: Readonly<Record<string, DependencyEntry>>;
//  readonly dependenciesOrder: readonly string[];
//  readonly emptyRegions: readonly EmptyRegionReport[];
//  readonly slotsWithoutDefaults: readonly SlotWithoutDefaultReport[];
//  readonly fallbacksNeeded: readonly FallbackNeededReport[];
//  readonly validation: PlanValidityReport;
//  readonly projectedGraph: {
//    readonly nodeCountProjected: number;
//    readonly byKindProjected: Readonly<Record<string, number>>;
//    readonly willNeedFallbackResolutionAtRuntime: boolean;
//    readonly willNeedPermissionFilteringAtRuntime: boolean;
//    readonly willNeedFeatureFlagEvaluationAtRuntime: boolean;
//  };
//  readonly canonicalHash: Fnv1a32Hex;
//  readonly canonicalJson: CanonicalJsonString;
//}
//
//export type BuildCompositionPlanFn = (normalized: NormalizedWorkspace) => CompositionPlan;
