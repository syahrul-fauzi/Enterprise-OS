////import type { LayoutDescriptor } from "../layouts/index.js";
////import type { NavigationItem } from "../navigation/index.js";
////import type { RegionDescriptor, RegionId } from "../regions/index.js";
////import type { SlotId, SlotDescriptor, SlotInstance } from "../slots/index.js";
////import type { NormalizedWorkspace, WorkspaceId, ValidationIssue } from "../normalizer/types.js";
////import { normalizeWorkspace } from "../normalizer/normalize.js";
////import type { CompositionPlan } from "../plan/types.js";
////import { buildCompositionPlan } from "../plan/build-plan.js";
////import type {
////  CapabilityGraphNode,
////  GraphNode,
////  GraphNodeId,
////  GraphNodeKind,
////  LayoutGraphNode,
////  NavigationGraphNode,
////  NavigationItemGraphNode,
////  RegionGraphNode,
////  SlotGraphNode,
////  WorkspaceGraph,
////  WorkspaceGraphNode,
////} from "./types.js";
////import { GraphNodeId as GID } from "./types.js";
////import type { DescriptorSource } from "../normalizer/types.js";
////import { canonicalSerialize } from "../canonical/serialize.js";
////import { fnv1a32 } from "../canonical/hash.js";
////import { deepFreeze } from "../canonical/deep-freeze.js";
////import type { Fnv1a32Hex } from "../canonical/types.js";
////
////function kindPrefix(kind: GraphNodeKind): string {
////  switch (kind) {
////    case "workspace": return "ws";
////    case "layout": return "ly";
////    case "region": return "rg";
////    case "slot": return "sl";
////    case "capability": return "cp";
////    case "navigation": return "nv";
////    case "navigation-item": return "ni";
////  }
////}
////
////function nid(kind: GraphNodeKind, parts: readonly string[]): GraphNodeId {
////  return GID([kindPrefix(kind), ...parts.map((p) => String(p).replace(/[:/|]/g, "-"))].join("|"));
////}
////
////function stable<T>(arr: readonly T[], key: (t: T) => string): readonly T[] {
////  return arr.slice().sort((a, b) => key(a).localeCompare(key(b)));
////}
////
////interface GraphBuildStructural {
////  readonly id: WorkspaceId;
////  readonly canonicalId: string;
////  readonly name: string;
////  readonly layout: LayoutDescriptor;
////  readonly regions: Readonly<Record<RegionId, RegionDescriptor>>;
////  readonly regionOrder: readonly RegionId[];
////  readonly slots: Readonly<Record<SlotId, SlotDescriptor>>;
////  readonly slotRegionMap: Readonly<Record<SlotId, RegionId>>;
////  readonly slotDefaults: Readonly<Record<SlotId, SlotInstance>>;
////  readonly navigation: Readonly<Record<string, import("../navigation").NavigationDescriptor>>;
////  readonly navigationOrder: readonly string[];
////  readonly permissions: {
////    readonly requireCapabilities: readonly string[];
////    readonly requireRoles: readonly string[];
////  };
////  readonly validationIssues: readonly ValidationIssue[];
////  readonly workspaceIdRef: WorkspaceId;
////}
////
////function buildGraphInternal(ctx: GraphBuildStructural): WorkspaceGraph {
////  type NodeBuilder = Omit<GraphNode, "childIds">;
////  const builders: Record<string, NodeBuilder> = {};
////  const childrenBuild: Record<string, GraphNodeId[]> = {};
////  const order: GraphNodeId[] = [];
////  const byKind: Record<GraphNodeKind, GraphNodeId[]> = {
////    workspace: [], layout: [], region: [], slot: [], capability: [], navigation: [], "navigation-item": [],
////  };
////  const slotToCapability: Record<string, GraphNodeId[]> = {};
////  const capSet = new Set<string>();
////
////  const addBuilder = <T extends NodeBuilder>(node: T): T => {
////    builders[String(node.id)] = node;
////    childrenBuild[String(node.id)] = [];
////    order.push(node.id);
////    byKind[node.kind].push(node.id);
////    return node;
////  };
////
////  const pushChild = (parentId: GraphNodeId, childId: GraphNodeId): void => {
////    childrenBuild[String(parentId)] = childrenBuild[String(parentId)] ?? [];
////    childrenBuild[String(parentId)].push(childId);
////  };
////
////  const wsId = ctx.id;
////  const rootId = nid("workspace", [String(wsId)]);
////  addBuilder({
////    id: rootId,
////    kind: "workspace",
////    parentId: null,
////    depth: 0,
////    workspaceId: wsId,
////    canonicalId: ctx.canonicalId,
////    name: ctx.name,
////    requireCapabilities: ctx.permissions.requireCapabilities,
////    requireRoles: ctx.permissions.requireRoles,
////  } as WorkspaceGraphNode);
////  for (const rc of ctx.permissions.requireCapabilities) capSet.add(rc);
////
////  const layout: LayoutDescriptor = ctx.layout;
////  const layoutNodeId = nid("layout", [String(layout.id)]);
////  addBuilder({
////    id: layoutNodeId,
////    kind: "layout",
////    parentId: rootId,
////    depth: 1,
////    layout,
////  } as LayoutGraphNode);
////  pushChild(rootId, layoutNodeId);
////
////  const regionOrder = stable(ctx.regionOrder, (r) => String(r));
////  for (const rid of regionOrder) {
////    const region: RegionDescriptor | undefined = ctx.regions[rid];
////    if (region === undefined) continue;
////    const rgnId = nid("region", [String(rid)]);
////    addBuilder({
////      id: rgnId, kind: "region", parentId: layoutNodeId, depth: 2, region, regionId: rid,
////    } as RegionGraphNode);
////    pushChild(layoutNodeId, rgnId);
////
////    const slotsHere = (Object.keys(ctx.slotRegionMap) as unknown as SlotId[])
////      .filter((sid) => String(ctx.slotRegionMap[sid]) === String(rid));
////    const slotsSorted = stable(slotsHere, (s) => String(s));
////    for (const sid of slotsSorted) {
////      const slot: SlotDescriptor | undefined = ctx.slots[sid];
////      if (slot === undefined) continue;
////      const slotNodeId = nid("slot", [String(sid)]);
////      const defInst: SlotInstance | null = ctx.slotDefaults[sid] ?? (slot.defaultExperience ? { slot: sid, capabilityId: slot.defaultExperience.capabilityId, view: slot.defaultExperience.view, priority: 0 } : null);
////      addBuilder({
////        id: slotNodeId, kind: "slot", parentId: rgnId, depth: 3, slot, slotId: sid, regionId: rid, defaultInstance: defInst,
////      } as SlotGraphNode);
////      pushChild(rgnId, slotNodeId);
////      slotToCapability[String(sid)] = slotToCapability[String(sid)] ?? [];
////      if (defInst !== null) {
////        capSet.add(defInst.capabilityId);
////        const capId = nid("capability", [defInst.capabilityId, "slot", String(sid)]);
////        addBuilder({
////          id: capId, kind: "capability", parentId: slotNodeId, depth: 4,
////          capabilityId: defInst.capabilityId, source: "slot-default", view: defInst.view ?? slot.defaultExperience?.view,
////          slotId: sid, priority: defInst.priority ?? 0,
////        } as CapabilityGraphNode);
////        pushChild(slotNodeId, capId);
////        slotToCapability[String(sid)].push(capId);
////      }
////    }
////  }
////
////  const wsReq = ctx.permissions.requireCapabilities;
////  if (wsReq.length > 0) {
////    for (const rc of stable(wsReq, (x) => x)) {
////      const capId = nid("capability", [rc, "ws-require"]);
////      addBuilder({
////        id: capId, kind: "capability", parentId: rootId, depth: 1,
////        capabilityId: rc, source: "workspace-requirement", priority: -10,
////      } as CapabilityGraphNode);
////      pushChild(rootId, capId);
////    }
////  }
////
////  const navOrdered = stable(ctx.navigationOrder, (x) => x);
////  for (const navId of navOrdered) {
////    const nd = ctx.navigation[navId];
////    if (nd === undefined) continue;
////    const nvNodeId = nid("navigation", [navId]);
////    addBuilder({
////      id: nvNodeId, kind: "navigation", parentId: rootId, depth: 1, descriptor: nd, navigationId: navId,
////    } as NavigationGraphNode);
////    pushChild(rootId, nvNodeId);
////
////    const walkItems = (items: readonly NavigationItem[], parentNid: GraphNodeId, depth: number): void => {
////      const orderedItems = stable(items, (i) => `${i.order ?? 0}|${i.id}`);
////      for (const it of orderedItems) {
////        const niId = nid("navigation-item", [navId, it.id]);
////        addBuilder({
////          id: niId, kind: "navigation-item", parentId: parentNid, depth, item: it, navigationId: navId,
////        } as NavigationItemGraphNode);
////        pushChild(parentNid, niId);
////        if (it.capabilityId) {
////          capSet.add(it.capabilityId);
////          const cId = nid("capability", [it.capabilityId, "nav", it.id]);
////          addBuilder({
////            id: cId, kind: "capability", parentId: niId, depth: depth + 1,
////            capabilityId: it.capabilityId, source: "navigation", view: it.href ?? undefined, priority: it.order ?? 0,
////          } as CapabilityGraphNode);
////          pushChild(niId, cId);
////        }
////        if (it.children && it.children.length > 0) walkItems(it.children, niId, depth + 1);
////      }
////    };
////    walkItems(nd.items, nvNodeId, 2);
////  }
////
////  const nodes: Record<string, GraphNode> = {};
////  for (const id of order) {
////    const b = builders[String(id)] as NodeBuilder;
////    const childArr = (childrenBuild[String(id)] ?? []).slice();
////    nodes[String(id)] = { ...(b as GraphNode), childIds: childArr } as GraphNode;
////  }
////
////  const orderedByKind: Record<GraphNodeKind, readonly GraphNodeId[]> = {
////    workspace: byKind.workspace.slice(),
////    layout: byKind.layout.slice(),
////    region: byKind.region.slice(),
////    slot: byKind.slot.slice(),
////    capability: byKind.capability.slice(),
////    navigation: byKind.navigation.slice(),
////    "navigation-item": byKind["navigation-item"].slice(),
////  };
////  const slotToCapOut: Record<string, readonly GraphNodeId[]> = {};
////  for (const k of Object.keys(slotToCapability)) slotToCapOut[k] = slotToCapability[k].slice();
////
////  const structuralOnly = order.map((id) => {
////    const n = nodes[String(id)];
////    return {
////      id: String(n.id),
////      kind: n.kind,
////      parentId: n.parentId ? String(n.parentId) : null,
////      depth: n.depth,
////      childIds: stable(n.childIds.slice(), (x) => String(x)).map(String),
////    };
////  });
////  const structuralChecksum = fnv1a32(canonicalSerialize(structuralOnly)) as Fnv1a32Hex;
////
////  const unfrozen = {
////    id: rootId,
////    workspaceId: ctx.workspaceIdRef,
////    canonicalId: ctx.canonicalId,
////    root: rootId,
////    nodes: { ...nodes } as unknown as Readonly<Record<GraphNodeId, GraphNode>>,
////    order: order.slice(),
////    byKind: orderedByKind,
////    slotToCapability: slotToCapOut as unknown as Readonly<Record<SlotId, readonly GraphNodeId[]>>,
////    referencedCapabilityIds: Array.from(capSet).sort(),
////    validationIssues: ctx.validationIssues.slice(),
////  };
////  const canonicalJson = canonicalSerialize(unfrozen);
////  const hash = fnv1a32(canonicalJson) as Fnv1a32Hex;
////
////  return deepFreeze({
////    ...unfrozen,
////    structuralChecksum,
////    canonicalJson,
////    hash,
////  }) as unknown as WorkspaceGraph;
////}
////
////export function buildGraphFromPlan(plan: CompositionPlan): WorkspaceGraph {
////  return buildGraphInternal({
////    id: plan.workspaceId,
////    canonicalId: plan.canonicalId,
////    name: plan.name,
////    layout: plan.layout,
////    regions: plan.regions,
////    regionOrder: plan.regionOrder,
////    slots: plan.slots,
////    slotRegionMap: plan.slotRegionMap,
////    slotDefaults: plan.slotDefaults,
////    navigation: plan.navigation,
////    navigationOrder: plan.navigationOrder,
////    permissions: plan.permissions,
////    validationIssues: [
////      ...plan.validation.fatalIssues,
////      ...plan.validation.warnings,
////    ],
////    workspaceIdRef: plan.workspaceId,
////  });
////}
////
////export function buildGraphFromNormalized(ws: NormalizedWorkspace): WorkspaceGraph {
////  const plan = buildCompositionPlan(ws);
////  return buildGraphFromPlan(plan);
////}
////
////export function buildGraph(source: DescriptorSource): WorkspaceGraph {
////  const normalized = normalizeWorkspace(source);
////  return buildGraphFromNormalized(normalized);
////}
