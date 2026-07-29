import type { CapabilityDescriptor, CapabilityAggregateBindingManifest } from "@repo/core-kernel";
import type { CapabilityRegistry } from "@repo/core-capability-registry";
import type { CompositionResult, CompositionWorkspaceDescriptor } from "../workspace";
import type { Composer } from "../workspace";
import type { NavigationDescriptor } from "../navigation";
import type { RegionId } from "../regions";
import type { SlotInstance } from "../slots";

export interface OrchestratorLoadInput {
  readonly workspace: CapabilityAggregateBindingManifest | CompositionWorkspaceDescriptor;
  readonly layoutHints?: readonly RegionId[];
  readonly slotOverrides?: readonly SlotInstance[];
  readonly navigations?: readonly NavigationDescriptor[];
}

export interface OrchestratorLifecycle {
  readonly kind: string;
  load(input: OrchestratorLoadInput): void;
  resolve(): readonly CapabilityDescriptor[];
  compose(): Promise<CompositionResult> | CompositionResult;
}

export interface CompositionRuntimeBridge {
  readonly registry: CapabilityRegistry;
  readonly composer: Composer;
  readonly navigations?: ReadonlyArray<NavigationDescriptor>;
}

export interface Orchestrator extends OrchestratorLifecycle {
  readonly bridge: CompositionRuntimeBridge;
}


