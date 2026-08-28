//// Local type definitions to break circular dependency with @repo/core-kernel
//// These types are identical to their counterparts in @repo/core-kernel to maintain compatibility
//export interface CapabilityContracts {
//  readonly entities?: readonly unknown[];
//  readonly valueObjects?: readonly unknown[];
//  readonly domainEvents?: readonly unknown[];
//  readonly dtos?: readonly unknown[];
//}
//
//export interface CapabilityCommand<TInput = unknown, TOutput = unknown> {
//  readonly kind: "command";
//  readonly name: string;
//  readonly version?: string;
//  readonly input?: TInput;
//  readonly output?: TOutput;
//  execute(input: TInput): Promise<TOutput> | TOutput;
//}
//
//export interface CapabilityQuery<TInput = unknown, TOutput = unknown> {
//  readonly kind: "query";
//  readonly name: string;
//  readonly output?: TOutput;
//  execute(input: TInput): Promise<TOutput> | TOutput;
//}
//
//export interface CapabilityRepository<TEntity = unknown, TId = string> {
//  readonly kind: "repository";
//  readonly entityName: string;
//  byId(id: TId): Promise<TEntity | undefined> | TEntity | undefined;
//  list(): Promise<readonly TEntity[]> | readonly TEntity[];
//  save(entity: TEntity): Promise<TEntity> | TEntity;
//  remove(id: TId): Promise<boolean> | boolean;
//}
//
//export interface CapabilityImplementation {
//  readonly commands?: Readonly<Record<string, CapabilityCommand>>;
//  readonly queries?: Readonly<Record<string, CapabilityQuery>>;
//  readonly repositories?: Readonly<Record<string, CapabilityRepository>>;
//  readonly services?: Readonly<Record<string, unknown>>;
//  readonly entry?: unknown;
//}
//
//export interface CapabilityDescriptor {
//  readonly id: string;
//  readonly version: string;
//  readonly name: string;
//  readonly contracts?: CapabilityContracts;
//  readonly presentation?: unknown;
//  readonly experience?: unknown;
//  readonly implementation: CapabilityImplementation;
//}
//
//export interface CapabilityAggregateBindingManifest {
//  readonly id: string;
//  readonly capabilities: readonly string[];
//}
//
//import type { RegionId } from "../regions/index.js";
//import type { SlotId, SlotInstance } from "../slots/index.js";
//import type { LayoutId } from "../layouts/index.js";
//import type { NavigationDescriptor } from "../navigation/index.js";
//
//export interface CompositionWorkspaceDescriptor {
//  readonly id: string;
//  readonly name?: string;
//  readonly workspace: CapabilityAggregateBindingManifest;
//  readonly layout: LayoutId;
//  readonly regions: readonly RegionId[];
//  readonly slots: readonly {
//    readonly slot: SlotId;
//    readonly region: RegionId;
//  }[];
//  readonly defaults?: readonly SlotInstance[];
//  readonly navigation?: Readonly<{
//    readonly global?: NavigationDescriptor["id"];
//    readonly primary?: NavigationDescriptor["id"];
//    readonly context?: NavigationDescriptor["id"];
//  }>;
//  readonly permissions?: Readonly<{
//    readonly requireCapabilities?: readonly string[];
//    readonly requireRoles?: readonly string[];
//  }>;
//}
//
//export interface ComposedRegion {
//  readonly region: RegionId;
//  readonly slotMappings: Readonly<Record<SlotId, readonly SlotInstance[]>>;
//}
//
//export interface CompositionResult {
//  readonly ok: boolean;
//  readonly workspace: CompositionWorkspaceDescriptor["id"];
//  readonly layout: LayoutId;
//  readonly regions: readonly ComposedRegion[];
//  readonly navigations: readonly NavigationDescriptor[];
//  readonly mountedCapabilities: readonly CapabilityDescriptor[];
//  readonly errors: readonly Readonly<{
//    readonly kind: "region" | "slot" | "layout" | "capability" | "navigation";
//    readonly ref?: string;
//    readonly error: Error;
//  }>[];
//}
//
//export interface Composer {
//  readonly kind: string;
//  compose(
//    workspace: CompositionWorkspaceDescriptor,
//    options?: {
//      readonly overrides?: readonly SlotInstance[];
//    }
//  ): Promise<CompositionResult> | CompositionResult;
//}