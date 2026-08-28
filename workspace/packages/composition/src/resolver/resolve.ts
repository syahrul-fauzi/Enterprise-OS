//import type { SlotId } from "../slots/index.js";
//import { SlotId as makeSlotId } from "../slots/index.js";
//import type { RegionId } from "../regions/index.js";
//import type { WorkspaceGraph, CapabilityGraphNode, SlotGraphNode, GraphNodeId, WorkspaceGraphNode } from "../graph/types.js";
//import type { NavigationDescriptor } from "../navigation/index.js";
//import type {
//  ResolvedNavigation,
//  ResolvedRegion,
//  ResolvedSlotInstance,
//  ResolvedWorkspace,
//  ResolverCapabilityRegistry,
//  ResolverContext,
//  ResolverStatusEntry,
//} from "./types.js";
//
//export function resolveWorkspace(graph: WorkspaceGraph, ctx: ResolverContext): ResolvedWorkspace {
//  const warnings: string[] = [];
//  const errors: string[] = [];
//  const warningsAdd = (s: string) => warnings.push(s);
//  const errorsAdd = (s: string) => errors.push(s);
//
//  const capabilities: Record<string, ResolverStatusEntry> = {};
//  const activeCapabilityIds: string[] = [];
//  const activeSet = new Set<string>();
//
//  const registry: ResolverCapabilityRegistry = ctx.capabilities;
//
//  function hasPermission(action: string, resource: string): boolean {
//    const required = `${resource}:${action}`;
//    for (const p of ctx.actor.permissions) if (p === required || p === `${resource}:*` || p === "*") return true;
//    return ctx.actor.roles.includes("admin") || ctx.actor.roles.includes("owner");
//  }
//
//  function lookup(capabilityId: string): { available: boolean; fallback: readonly string[]; reason?: string } {
//    const e = registry.get(capabilityId);
//    if (e === undefined) return { available: false, fallback: [], reason: `capability "${capabilityId}" tidak terdaftar di registry` };
//    if (!e.available) return { available: false, fallback: e.fallbackFor ?? [], reason: e.reason ?? `capability "${capabilityId}" marked unavailable` };
//    return { available: true, fallback: e.fallbackFor ?? [] };
//  }
//
//  function statusFor(capNode: CapabilityGraphNode): ResolverStatusEntry {
//    const capId = capNode.capabilityId;
//    const existing = capabilities[capId];
//    if (existing !== undefined && existing.status === "resolved") return existing;
//
//    const base: ResolverStatusEntry = {
//      graphNodeId: capNode.id,
//      capabilityId: capId,
//      status: "resolved",
//    };
//
//    if (!hasPermission("view", capId.replace(/^legal-/, ""))) {
//      return { ...base, status: "permission-denied", reason: `actor lacks permission '${capId.replace(/^legal-/, "")}:view'` };
//    }
//
//    const fflag = ctx.features.flags[`capability.${capId}`];
//    if (fflag === false) {
//      return { ...base, status: "disabled", reason: `feature flag 'capability.${capId}' = false` };
//    }
//
//    const info = lookup(capId);
//    if (info.available) {
//      return base;
//    }
//    if (info.fallback.length > 0) {
//      for (const fb of info.fallback) {
//        const infoFb = lookup(fb);
//        if (infoFb.available) {
//          return { ...base, status: "fallback", reason: info.reason, effectiveCapabilityId: fb };
//        }
//      }
//    }
//    return { ...base, status: "unavailable", reason: info.reason };
//  }
//
//  const capNodes: CapabilityGraphNode[] = graph.byKind.capability
//    .map((id) => graph.nodes[id] as CapabilityGraphNode);
//  for (const capNode of capNodes) {
//    const st = statusFor(capNode);
//    capabilities[capNode.capabilityId] = st;
//    if ((st.status === "resolved" || st.status === "fallback") && !activeSet.has(capNode.capabilityId)) {
//      activeSet.add(capNode.capabilityId);
//      activeCapabilityIds.push(capNode.capabilityId);
//    }
//    if (st.status === "permission-denied") warningsAdd(`[permission] capability '${capNode.capabilityId}': ${st.reason}`);
//    if (st.status === "unavailable") errorsAdd(`[capability] ${st.reason ?? `capability '${capNode.capabilityId}' unavailable`}`);
//  }
//
//  const slotCapMap: Record<string, ResolvedSlotInstance[]> = {};
//  for (const slotNodeId of graph.byKind.slot) {
//    const slotNode = graph.nodes[slotNodeId] as SlotGraphNode;
//    const sid = String(slotNode.slotId);
//    slotCapMap[sid] = slotCapMap[sid] ?? [];
//    const overrides = ctx.slotOverrides?.[slotNode.slotId];
//    const overrideArr = overrides ?? [];
//    const sources: ResolvedSlotInstance[] = [];
//
//    for (let i = 0; i < overrideArr.length; i++) {
//      const capId = overrideArr[i];
//      const st = capabilities[capId] ?? { graphNodeId: slotNode.id, capabilityId: capId, status: "resolved" };
//      if (st.status === "resolved" || st.status === "fallback") {
//        sources.push({
//          slotId: slotNode.slotId,
//          capabilityId: st.effectiveCapabilityId ?? capId,
//          priority: i + 1,
//          status: st.status === "fallback" ? "fallback" : "active",
//        });
//      }
//    }
//
//    const defInst = slotNode.defaultInstance;
//    if (defInst !== null && overrideArr.length === 0) {
//      const defCap = defInst.capabilityId;
//      const st = capabilities[defCap] ?? { graphNodeId: slotNode.id, capabilityId: defCap, status: "resolved" };
//      if (st.status === "resolved" || st.status === "fallback") {
//        sources.push({
//          slotId: slotNode.slotId,
//          capabilityId: st.effectiveCapabilityId ?? defCap,
//          view: defInst.view,
//          priority: defInst.priority ?? 0,
//          status: st.status === "fallback" ? "fallback" : "active",
//        });
//      }
//    }
//    slotCapMap[sid] = sources.sort((a, b) => (a.priority - b.priority));
//  }
//
//  const regionOrder: RegionId[] = graph.byKind.region.map((rId) => (graph.nodes[rId] as { readonly regionId: RegionId }).regionId);
//  const regionsOut: Record<RegionId, ResolvedRegion> = {} as Record<RegionId, ResolvedRegion>;
//  for (const rId of graph.byKind.region) {
//    const node = graph.nodes[rId] as { readonly regionId: RegionId; readonly region: import("../regions").RegionDescriptor; readonly childIds: readonly GraphNodeId[] };
//    const slotsRecord: Record<SlotId, readonly ResolvedSlotInstance[]> = {} as Record<SlotId, readonly ResolvedSlotInstance[]>;
//    for (const childId of node.childIds) {
//      const child = graph.nodes[childId];
//      if (child.kind !== "slot") continue;
//      const slotNode = child as SlotGraphNode;
//      slotsRecord[slotNode.slotId] = slotCapMap[String(slotNode.slotId)] ?? [];
//    }
//    (Object.keys(slotsRecord) as unknown as SlotId[]).forEach((sid) => {
//      if (!(sid in slotsRecord)) slotsRecord[makeSlotId(String(sid)) as SlotId] = [];
//    });
//    const slotArr = (Object.values(slotsRecord) as unknown as readonly (readonly ResolvedSlotInstance[])[]).flat();
//    regionsOut[node.regionId] = {
//      regionId: node.regionId,
//      region: node.region,
//      slots: slotsRecord,
//      visible: slotArr.length > 0 || node.region.kind === "workspace" || node.region.kind === "main",
//    };
//  }
//
//  const navigationOut: ResolvedNavigation[] = [];
//  for (const nvId of graph.byKind.navigation) {
//    const nvNode = graph.nodes[nvId] as { readonly navigationId: string; readonly descriptor: NavigationDescriptor; readonly childIds: readonly GraphNodeId[] };
//    const visibleIdx: (string | number)[] = [];
//    for (let i = 0; i < nvNode.descriptor.items.length; i++) {
//      const it = nvNode.descriptor.items[i];
//      if (it.capabilityId) {
//        const st = capabilities[it.capabilityId];
//        if (st?.status === "permission-denied" || st?.status === "disabled" || st?.status === "unavailable") continue;
//      }
//      visibleIdx.push(i);
//    }
//    navigationOut.push({ id: nvNode.navigationId, descriptor: nvNode.descriptor, visibleItems: visibleIdx });
//  }
//
//  const workspaceNode = graph.nodes[graph.root] as WorkspaceGraphNode;
//  const layoutNode = graph.byKind.layout.length > 0 ? graph.nodes[graph.byKind.layout[0]] as { readonly layout: import("../layouts").LayoutDescriptor } : undefined;
//  const layoutPattern = layoutNode?.layout.pattern ?? "sidebar-main";
//  const layoutId = String(layoutNode?.layout.id ?? "default");
//
//  return {
//    workspaceId: graph.workspaceId,
//    canonicalId: graph.canonicalId,
//    name: workspaceNode.name ?? String(graph.workspaceId),
//    graphId: graph.id,
//    graphHash: graph.hash,
//    layoutPattern,
//    layoutId,
//    regions: regionsOut,
//    regionOrder,
//    navigation: navigationOut,
//    capabilities: Object.freeze({ ...capabilities }),
//    activeCapabilityIds: Object.freeze(activeCapabilityIds.slice().sort()),
//    warnings: Object.freeze(warnings.slice()),
//    errors: Object.freeze(errors.slice()),
//    resolved: errors.length === 0,
//    workspaceNode,
//    sourceGraph: graph,
//  } as const;
//}
