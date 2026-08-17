import type { LayoutId } from "../layouts/index.js";
import { LayoutId as makeLayoutId } from "../layouts/index.js";
import type { RegionId, RegionKind, RegionDescriptor } from "../regions/index.js";
import { RegionId as makeRegionId } from "../regions/index.js";
import type { SlotId, SlotDescriptor, SlotInstance, SlotDescriptor as SlotD } from "../slots/index.js";
import { SlotId as makeSlotId } from "../slots/index.js";
import type { CompositionWorkspaceDescriptor } from "../workspace/index.js";
import type { NavigationDescriptor } from "../navigation/index.js";
import type {
  DescriptorSource,
  NormalizedWorkspace,
  NormalizeWorkspaceFn,
  ValidationIssue,
  WorkspaceId,
} from "./types.js";
import { WorkspaceId as makeWorkspaceId } from "./types.js";
import { canonicalSerialize } from "../canonical/serialize.js";
import { fnv1a32 } from "../canonical/hash.js";
import { deepFreeze } from "../canonical/deep-freeze.js";

const DEFAULT_LAYOUT_PATTERN = "sidebar-main";
const DEFAULT_LAYOUT_ID = "layout::sidebar-main" as LayoutId;

function defaultSidebarMainLayout(id: LayoutId): import("../layouts").LayoutDescriptor {
  const sidebar = makeRegionId("region::sidebar") as RegionId;
  const main = makeRegionId("region::main") as RegionId;
  const toolbar = makeRegionId("region::toolbar") as RegionId;
  return {
    id,
    name: "Default Sidebar + Main Layout",
    pattern: DEFAULT_LAYOUT_PATTERN,
    regions: [
      { region: sidebar, kind: "app-sidebar", weight: 1, minSizePx: 240 },
      { region: toolbar, kind: "workspace", weight: 0 },
      { region: main, kind: "main", weight: 4 },
    ],
  };
}

function regionFromId(id: RegionId, kindHint: RegionKind | undefined, index: number): RegionDescriptor {
  const roleName = kindHint ?? (index === 0 ? "app-sidebar" : "main");
  return {
    id,
    kind: roleName,
    name: `Region ${String(id)}`,
    slots: [],
    collapsible: roleName === "app-sidebar",
    defaultOpen: true,
    layoutHint: roleName === "app-sidebar" ? "column" : "column",
  };
}

function slotFromId(id: SlotId, purposeHint: SlotD["purpose"] | undefined, capabilityDefault: string | undefined): SlotDescriptor {
  return {
    id,
    name: `Slot ${String(id)}`,
    purpose: purposeHint ?? "content",
    single: (purposeHint ?? "content") === "content",
    required: false,
    ...(capabilityDefault !== undefined ? { defaultExperience: { capabilityId: capabilityDefault } } : {}),
  };
}

function canonical(wsId: string): string {
  return wsId.trim().toLowerCase().replace(/[^a-z0-9.:-]+/g, "-").replace(/^-+|-+$/g, "") || `workspace-${Math.abs((wsId || "w").length).toString(36)}`;
}

export const normalizeWorkspace: NormalizeWorkspaceFn = function normalizeWorkspace(source: DescriptorSource): NormalizedWorkspace {
  const ws: CompositionWorkspaceDescriptor = source.workspace;
  const issues: ValidationIssue[] = [];
  const requireCapabilities = ws.permissions?.requireCapabilities ?? [];
  const requireRoles = ws.permissions?.requireRoles ?? [];

  const rawId = ws.id;
  if (rawId === undefined || String(rawId).trim().length === 0) {
    issues.push({
      code: "missing_id",
      severity: "error",
      path: "workspace.id",
      message: "WorkspaceDescriptor harus punya field `id` (non-empty string).",
    });
  }
  const id: WorkspaceId = makeWorkspaceId(String(rawId ?? "anonymous-workspace"));
  const canonicalId = canonical(String(id));

  const layoutIdRaw: LayoutId | undefined = typeof ws.layout === "string" ? (makeLayoutId(ws.layout) as LayoutId) : ws.layout;
  const layoutId = layoutIdRaw ?? DEFAULT_LAYOUT_ID;
  let layout = source.layoutRegistry?.[layoutId];
  if (layout === undefined) {
    layout = defaultSidebarMainLayout(layoutId);
    issues.push({
      code: "missing_layout",
      severity: "warning",
      path: "workspace.layout",
      message: `Layout "${String(layoutId)}" tidak ditemukan di layoutRegistry. Pakai default sidebar-main.`,
      ref: String(layoutId),
    });
  }

  const regionFromWs = (ws.regions ?? []).slice().sort((a, b) => String(a).localeCompare(String(b)));
  const referencedRegionSet = new Set<RegionId>();
  const layoutRegions = layout.regions.map((p) => p.region);
  for (const r of layoutRegions) referencedRegionSet.add(r);
  for (const r of regionFromWs) referencedRegionSet.add(r as RegionId);
  const regionOrder: RegionId[] = Array.from(referencedRegionSet).sort((a, b) => String(a).localeCompare(String(b)));
  const regionsMap: Record<string, RegionDescriptor> = {};
  const seenRegions = new Set<string>();
  for (let i = 0; i < regionOrder.length; i++) {
    const rid = regionOrder[i];
    const ridStr = String(rid);
    if (seenRegions.has(ridStr)) {
      issues.push({ code: "duplicate_region", severity: "warning", path: "workspace.regions", message: `Duplicate region id: ${ridStr}`, ref: ridStr });
      continue;
    }
    seenRegions.add(ridStr);
    const layoutPos = layout.regions.find((p) => String(p.region) === ridStr);
    const kind = layoutPos?.kind;
    const existing = source.regionRegistry?.[rid];
    regionsMap[ridStr] = existing ?? regionFromId(rid, kind, i);
  }

  const rawSlots = (ws.slots ?? []).slice();
  const slotSeen = new Set<string>();
  const slotsMap: Record<string, SlotDescriptor> = {};
  const slotRegionMap: Record<string, RegionId> = {};
  const defaults: Record<string, SlotInstance> = {};
  const capabilityRefsSet = new Set<string>();
  for (const cid of requireCapabilities) capabilityRefsSet.add(cid);

  const layoutRegionIds = new Set(layout.regions.map((r) => String(r.region)));

  for (const s of rawSlots) {
    const sid = String(s.slot);
    if (slotSeen.has(sid)) {
      issues.push({ code: "duplicate_slot", severity: "warning", path: "workspace.slots", message: `Duplicate slot id: ${sid}`, ref: sid });
      continue;
    }
    slotSeen.add(sid);
    const existing = source.slotRegistry?.[s.slot as SlotId];
    if (!existing) {
      slotsMap[sid] = slotFromId(s.slot as SlotId, undefined, undefined);
    } else {
      slotsMap[sid] = existing;
      if (existing.defaultExperience?.capabilityId) capabilityRefsSet.add(existing.defaultExperience.capabilityId);
    }
    const regStr = String(s.region);
    if (!layoutRegionIds.has(regStr) && !seenRegions.has(regStr)) {
      issues.push({ code: "unknown_region", severity: "error", path: "workspace.slots", message: `Slot ${sid} mereferensikan region "${regStr}" yang tidak dikenal di layout/workspace.`, ref: regStr });
    } else {
      slotRegionMap[sid] = (seenRegions.has(regStr) ? makeRegionId(regStr) : (layout.regions.find((p) => String(p.region) === regStr)?.region ?? makeRegionId(regStr))) as RegionId;
    }
  }

  for (const slotDef of Object.values(slotsMap)) {
    const sid = String(slotDef.id);
    if (!(sid in slotRegionMap)) {
      const mainRegion = layoutRegions.find((r) => String(r) === "region::main") ?? layoutRegions[layoutRegions.length - 1];
      if (mainRegion !== undefined) slotRegionMap[sid] = mainRegion;
    }
  }

  const wsDefaults = ws.defaults ?? [];
  for (const def of wsDefaults) {
    const sid = String(def.slot);
    defaults[sid] = def;
    capabilityRefsSet.add(def.capabilityId);
    if (!slotSeen.has(sid)) {
      issues.push({ code: "unknown_slot", severity: "warning", path: "workspace.defaults", message: `Default untuk slot "${sid}" tapi slot tidak dideklarasikan di workspace.slots. Akan dibuatkan implicit.`, ref: sid });
      const implicit = slotFromId(def.slot as SlotId, "content", def.capabilityId);
      slotsMap[sid] = implicit;
      slotSeen.add(sid);
    }
    const desc = slotsMap[sid];
    if (desc && desc.required === false && desc.capabilityIds && desc.capabilityIds.length > 0) {
      for (const cid of desc.capabilityIds) capabilityRefsSet.add(cid);
    }
  }

  for (const desc of Object.values(slotsMap)) {
    if (desc.required) {
      const sid = String(desc.id);
      const hasDefault = sid in defaults;
      const hasInlineDefault = Boolean(desc.defaultExperience?.capabilityId);
      if (!hasDefault && !hasInlineDefault) {
        issues.push({
          code: "missing_required_slot",
          severity: "error",
          path: `workspace.slots.${sid}`,
          message: `Slot "${sid}" ditandai required tapi tidak ada defaultExperience dan tidak ada di workspace.defaults.`,
          ref: sid,
        });
      }
    }
  }

  const navFromWs = ws.navigation;
  const navDescriptors: Record<string, NavigationDescriptor> = {};
  const navOrder: string[] = [];
  type NavKey = "global" | "primary" | "context";
  function addNav(id: string, fallback: NavigationDescriptor | undefined, kindName: NavKey): void {
    let nd = source.navigationRegistry?.[id];
    if (nd === undefined && fallback !== undefined) nd = fallback;
    if (nd === undefined) return;
    if (nd.items.length === 0) {
      issues.push({ code: "empty_navigation_items", severity: "warning", path: `workspace.navigation.${kindName}`, message: `Navigation "${id}" items kosong.`, ref: id });
    }
    for (const it of nd.items) walkNav(it);
    navDescriptors[id] = nd;
    navOrder.push(id);
  }
  function walkNav(item: import("../navigation").NavigationItem): void {
    if (item.capabilityId) capabilityRefsSet.add(item.capabilityId);
    if (item.children && item.children.length > 0) for (const c of item.children) walkNav(c);
  }
  if (navFromWs !== undefined) {
    const primary: NavKey = "primary";
    const globalK: NavKey = "global";
    const contextK: NavKey = "context";
    if (navFromWs[primary]) addNav(navFromWs[primary]!, undefined, primary);
    if (navFromWs[globalK]) addNav(navFromWs[globalK]!, undefined, globalK);
    if (navFromWs[contextK]) addNav(navFromWs[contextK]!, undefined, contextK);
  }

  const valid = !issues.some((i) => i.severity === "error");
  const regionsOut: Record<RegionId, RegionDescriptor> = {} as Record<RegionId, RegionDescriptor>;
  for (const [k, v] of Object.entries(regionsMap)) regionsOut[makeRegionId(k) as RegionId] = v;
  const slotsOut: Record<SlotId, SlotDescriptor> = {} as Record<SlotId, SlotDescriptor>;
  for (const [k, v] of Object.entries(slotsMap)) slotsOut[makeSlotId(k) as SlotId] = v;
  const slotRegionOut: Record<SlotId, RegionId> = {} as Record<SlotId, RegionId>;
  for (const [k, v] of Object.entries(slotRegionMap)) slotRegionOut[makeSlotId(k) as SlotId] = v;
  const defaultsOut: Record<SlotId, SlotInstance> = {} as Record<SlotId, SlotInstance>;
  for (const [k, v] of Object.entries(defaults)) defaultsOut[makeSlotId(k) as SlotId] = v;
  const navOut: Record<string, NavigationDescriptor> = { ...navDescriptors };

  const unfrozen = {
    id,
    name: ws.name ?? String(id),
    canonicalId,
    layout,
    regions: regionsOut,
    regionOrder: regionOrder,
    slots: slotsOut,
    slotRegionMap: slotRegionOut,
    defaults: defaultsOut,
    navigation: navOut,
    navigationOrder: navOrder,
    permissions: {
      requireCapabilities,
      requireRoles,
    },
    capabilitiesReferenced: Array.from(capabilityRefsSet).sort(),
    validation: {
      issues: issues.slice(),
      valid,
    },
  };
  const canonicalJson = canonicalSerialize(unfrozen);
  const hash = fnv1a32(canonicalJson);
  return deepFreeze({
    ...unfrozen,
    hash,
    canonicalJson,
  }) as NormalizedWorkspace;
};
