//import type { ResolverStatusEntry, ResolvedWorkspace } from "@repo/composition";
//import type React from "react";
//
//export interface MountedCapability {
//  readonly capabilityId: string;
//  readonly Component: React.ComponentType<object>;
//  readonly status?: ResolverStatusEntry["status"];
//  readonly graphNodeId?: ResolverStatusEntry["graphNodeId"];
//  readonly metadata?: Readonly<Record<string, unknown>>;
//}
//
//export interface RuntimeMountResult {
//  readonly ok: boolean;
//  readonly mounted: readonly MountedCapability[];
//  readonly errors: readonly Readonly<{ capabilityId: string; error: Error }>[];
//  readonly workspaceId: ResolvedWorkspace["workspaceId"];
//  readonly graphHash: ResolvedWorkspace["graphHash"];
//  readonly mountedCount: number;
//  readonly activeCount: number;
//}
//
//export interface HostEnvironment {
//  readonly permissions?: Readonly<Record<string, boolean>>;
//  readonly locale?: string;
//  readonly featureFlags?: Readonly<Record<string, boolean>>;
//  readonly requestId?: string;
//}
//
//export interface RuntimeLifecycle {
//  load(resolvedWorkspace: ResolvedWorkspace): void;
//  mount(hostEnv?: HostEnvironment): Promise<RuntimeMountResult>;
//}
//
//export type { ResolvedWorkspace };
