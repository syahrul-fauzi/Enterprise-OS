//// import type { ResolvedWorkspace WorkspaceId } from "@repo/composition";
//import type {
//  MountedCapability,
//  RuntimeMountResult,
//  RuntimeLifecycle,
//  HostEnvironment,
//} from "./types.js";
//import type React from "react";
//
//type ExtractComponentFn = (resolved: {
//  readonly capabilityId: string;
//  readonly metadata?: Readonly<Record<string, unknown>>;
//}) => React.ComponentType<object> | null;
//
//const defaultExtractComponent: ExtractComponentFn = () => null;
//
//export class Runtime implements RuntimeLifecycle {
//  private readonly extractComponent: ExtractComponentFn;
//  private resolvedWorkspace: ResolvedWorkspace | null = null;
//
//  constructor(options: {
//    extractComponent?: ExtractComponentFn;
//  } = {}) {
//    this.extractComponent = options.extractComponent ?? defaultExtractComponent;
//  }
//
//  load(resolvedWorkspace: ResolvedWorkspace): void {
//    this.resolvedWorkspace = resolvedWorkspace;
//  }
//
//  async mount(hostEnv: HostEnvironment = {}): Promise<RuntimeMountResult> {
//    if (!this.resolvedWorkspace) {
//      const err = new Error(
//        "Runtime.mount() called before load(). Call load(resolvedWorkspace) first. " +
//          "Per ARCH-16, Runtime only consumes ResolvedWorkspace from Composition compiler."
//      );
//      return {
//        ok: false,
//        mounted: [],
//        errors: [{ capabilityId: "(runtime)", error: err }],
//        workspaceId: "(unknown)" as unknown as WorkspaceId,
//        graphHash: "(unknown)",
//        mountedCount: 0,
//        activeCount: 0,
//      };
//    }
//    const resolved = this.resolvedWorkspace;
//    const mounted: MountedCapability[] = [];
//    const errors: Array<{ capabilityId: string; error: Error }> = [];
//
//    for (const capId of resolved.activeCapabilityIds) {
//      const entry = resolved.capabilities[capId];
//      try {
//        const Component = this.extractComponent({ capabilityId: capId, metadata: entry ? { status: entry.status, graphNodeId: entry.graphNodeId } : undefined });
//        if (Component === null) {
//          errors.push({
//            capabilityId: capId,
//            error: new Error(
//              "extractComponent returned null; host environment must provide an extractor for this capabilityId. " +
//                "Runtime has no built-in registry access per ARCH-16 boundary."
//            ),
//          });
//          continue;
//        }
//        mounted.push({
//          capabilityId: capId,
//          Component,
//          status: entry?.status,
//          graphNodeId: entry?.graphNodeId,
//        });
//      } catch (raw) {
//        const error = raw instanceof Error ? raw : new Error(String(raw));
//        errors.push({ capabilityId: capId, error });
//      }
//    }
//
//    void hostEnv;
//
//    return {
//      ok: errors.length === 0,
//      mounted: Object.freeze(mounted),
//      errors: Object.freeze(errors),
//      workspaceId: resolved.workspaceId,
//      graphHash: resolved.graphHash,
//      mountedCount: mounted.length,
//      activeCount: resolved.activeCapabilityIds.length,
//    };
//  }
//}