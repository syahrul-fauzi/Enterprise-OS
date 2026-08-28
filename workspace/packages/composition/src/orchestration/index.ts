//import type { CapabilityDescriptor, CapabilityAggregateBindingManifest } from "../workspace/index.js";
//import type { CapabilityRegistry } from "@repo/core-capability-registry";
//import type { CompositionResult, CompositionWorkspaceDescriptor } from "../workspace/index.js";
//import type { Composer } from "../workspace/index.js";
//import type { NavigationDescriptor } from "../navigation/index.js";
//import type { RegionId } from "../regions/index.js";
//import type { SlotInstance } from "../slots/index.js";
//
//export interface OrchestratorLoadInput {
//  readonly workspace: CapabilityAggregateBindingManifest | CompositionWorkspaceDescriptor;
//  readonly layoutHints?: readonly RegionId[];
//  readonly slotOverrides?: readonly SlotInstance[];
//  readonly navigations?: readonly NavigationDescriptor[];
//}
//
//export interface OrchestratorLifecycle {
//  readonly kind: string;
//  load(input: OrchestratorLoadInput): void;
//  resolve(): readonly CapabilityDescriptor[];
//  compose(): Promise<CompositionResult> | CompositionResult;
//}
//
//export interface CompositionRuntimeBridge {
//  readonly registry: CapabilityRegistry;
//  readonly composer: Composer;
//  readonly navigations?: ReadonlyArray<NavigationDescriptor>;
//}
//
//export interface Orchestrator extends OrchestratorLifecycle {
//  readonly bridge: CompositionRuntimeBridge;
//}