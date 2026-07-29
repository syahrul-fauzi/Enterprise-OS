import type { CapabilityAggregateBindingManifest, CapabilityDescriptor } from "@repo/core-kernel";
import type { RegionId } from "../regions";
import type { SlotId, SlotInstance } from "../slots";
import type { LayoutId } from "../layouts";
import type { NavigationDescriptor } from "../navigation";

export interface CompositionWorkspaceDescriptor {
  readonly id: string;
  readonly name?: string;
  readonly workspace: CapabilityAggregateBindingManifest;
  readonly layout: LayoutId;
  readonly regions: readonly RegionId[];
  readonly slots: readonly {
    readonly slot: SlotId;
    readonly region: RegionId;
  }[];
  readonly defaults?: readonly SlotInstance[];
  readonly navigation?: Readonly<{
    readonly global?: NavigationDescriptor["id"];
    readonly primary?: NavigationDescriptor["id"];
    readonly context?: NavigationDescriptor["id"];
  }>;
  readonly permissions?: Readonly<{
    readonly requireCapabilities?: readonly string[];
    readonly requireRoles?: readonly string[];
  }>;
}

export interface ComposedRegion {
  readonly region: RegionId;
  readonly slotMappings: Readonly<Record<SlotId, readonly SlotInstance[]>>;
}

export interface CompositionResult {
  readonly ok: boolean;
  readonly workspace: CompositionWorkspaceDescriptor["id"];
  readonly layout: LayoutId;
  readonly regions: readonly ComposedRegion[];
  readonly navigations: readonly NavigationDescriptor[];
  readonly mountedCapabilities: readonly CapabilityDescriptor[];
  readonly errors: readonly Readonly<{
    readonly kind: "region" | "slot" | "layout" | "capability" | "navigation";
    readonly ref?: string;
    readonly error: Error;
  }>[];
}

export interface Composer {
  readonly kind: string;
  compose(
    workspace: CompositionWorkspaceDescriptor,
    options?: {
      readonly overrides?: readonly SlotInstance[];
    }
  ): Promise<CompositionResult> | CompositionResult;
}


