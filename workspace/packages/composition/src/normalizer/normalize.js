"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWorkspace = void 0;
const layouts_1 = require("../layouts");
const regions_1 = require("../regions");
const slots_1 = require("../slots");
const types_1 = require("./types");
const serialize_1 = require("../canonical/serialize");
const hash_1 = require("../canonical/hash");
const deep_freeze_1 = require("../canonical/deep-freeze");
const DEFAULT_LAYOUT_PATTERN = "sidebar-main";
const DEFAULT_LAYOUT_ID = "layout::sidebar-main";
function defaultSidebarMainLayout(id) {
    const sidebar = (0, regions_1.RegionId)("region::sidebar");
    const main = (0, regions_1.RegionId)("region::main");
    const toolbar = (0, regions_1.RegionId)("region::toolbar");
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
function regionFromId(id, kindHint, index) {
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
function slotFromId(id, purposeHint, capabilityDefault) {
    return {
        id,
        name: `Slot ${String(id)}`,
        purpose: purposeHint ?? "content",
        single: (purposeHint ?? "content") === "content",
        required: false,
        ...(capabilityDefault !== undefined ? { defaultExperience: { capabilityId: capabilityDefault } } : {}),
    };
}
function canonical(wsId) {
    return wsId.trim().toLowerCase().replace(/[^a-z0-9.:-]+/g, "-").replace(/^-+|-+$/g, "") || `workspace-${Math.abs((wsId || "w").length).toString(36)}`;
}
const normalizeWorkspace = function normalizeWorkspace(source) {
    const ws = source.workspace;
    const issues = [];
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
    const id = (0, types_1.WorkspaceId)(String(rawId ?? "anonymous-workspace"));
    const canonicalId = canonical(String(id));
    const layoutIdRaw = typeof ws.layout === "string" ? (0, layouts_1.LayoutId)(ws.layout) : ws.layout;
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
    const referencedRegionSet = new Set();
    const layoutRegions = layout.regions.map((p) => p.region);
    for (const r of layoutRegions)
        referencedRegionSet.add(r);
    for (const r of regionFromWs)
        referencedRegionSet.add(r);
    const regionOrder = Array.from(referencedRegionSet).sort((a, b) => String(a).localeCompare(String(b)));
    const regionsMap = {};
    const seenRegions = new Set();
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
    const slotSeen = new Set();
    const slotsMap = {};
    const slotRegionMap = {};
    const defaults = {};
    const capabilityRefsSet = new Set();
    for (const cid of requireCapabilities)
        capabilityRefsSet.add(cid);
    const layoutRegionIds = new Set(layout.regions.map((r) => String(r.region)));
    for (const s of rawSlots) {
        const sid = String(s.slot);
        if (slotSeen.has(sid)) {
            issues.push({ code: "duplicate_slot", severity: "warning", path: "workspace.slots", message: `Duplicate slot id: ${sid}`, ref: sid });
            continue;
        }
        slotSeen.add(sid);
        const existing = source.slotRegistry?.[s.slot];
        if (!existing) {
            slotsMap[sid] = slotFromId(s.slot, undefined, undefined);
        }
        else {
            slotsMap[sid] = existing;
            if (existing.defaultExperience?.capabilityId)
                capabilityRefsSet.add(existing.defaultExperience.capabilityId);
        }
        const regStr = String(s.region);
        if (!layoutRegionIds.has(regStr) && !seenRegions.has(regStr)) {
            issues.push({ code: "unknown_region", severity: "error", path: "workspace.slots", message: `Slot ${sid} mereferensikan region "${regStr}" yang tidak dikenal di layout/workspace.`, ref: regStr });
        }
        else {
            slotRegionMap[sid] = (seenRegions.has(regStr) ? (0, regions_1.RegionId)(regStr) : (layout.regions.find((p) => String(p.region) === regStr)?.region ?? (0, regions_1.RegionId)(regStr)));
        }
    }
    for (const slotDef of Object.values(slotsMap)) {
        const sid = String(slotDef.id);
        if (!(sid in slotRegionMap)) {
            const mainRegion = layoutRegions.find((r) => String(r) === "region::main") ?? layoutRegions[layoutRegions.length - 1];
            if (mainRegion !== undefined)
                slotRegionMap[sid] = mainRegion;
        }
    }
    const wsDefaults = ws.defaults ?? [];
    for (const def of wsDefaults) {
        const sid = String(def.slot);
        defaults[sid] = def;
        capabilityRefsSet.add(def.capabilityId);
        if (!slotSeen.has(sid)) {
            issues.push({ code: "unknown_slot", severity: "warning", path: "workspace.defaults", message: `Default untuk slot "${sid}" tapi slot tidak dideklarasikan di workspace.slots. Akan dibuatkan implicit.`, ref: sid });
            const implicit = slotFromId(def.slot, "content", def.capabilityId);
            slotsMap[sid] = implicit;
            slotSeen.add(sid);
        }
        const desc = slotsMap[sid];
        if (desc && desc.required === false && desc.capabilityIds && desc.capabilityIds.length > 0) {
            for (const cid of desc.capabilityIds)
                capabilityRefsSet.add(cid);
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
    const navDescriptors = {};
    const navOrder = [];
    function addNav(id, fallback, kindName) {
        let nd = source.navigationRegistry?.[id];
        if (nd === undefined && fallback !== undefined)
            nd = fallback;
        if (nd === undefined)
            return;
        if (nd.items.length === 0) {
            issues.push({ code: "empty_navigation_items", severity: "warning", path: `workspace.navigation.${kindName}`, message: `Navigation "${id}" items kosong.`, ref: id });
        }
        for (const it of nd.items)
            walkNav(it);
        navDescriptors[id] = nd;
        navOrder.push(id);
    }
    function walkNav(item) {
        if (item.capabilityId)
            capabilityRefsSet.add(item.capabilityId);
        if (item.children && item.children.length > 0)
            for (const c of item.children)
                walkNav(c);
    }
    if (navFromWs !== undefined) {
        const primary = "primary";
        const globalK = "global";
        const contextK = "context";
        if (navFromWs[primary])
            addNav(navFromWs[primary], undefined, primary);
        if (navFromWs[globalK])
            addNav(navFromWs[globalK], undefined, globalK);
        if (navFromWs[contextK])
            addNav(navFromWs[contextK], undefined, contextK);
    }
    const valid = !issues.some((i) => i.severity === "error");
    const regionsOut = {};
    for (const [k, v] of Object.entries(regionsMap))
        regionsOut[(0, regions_1.RegionId)(k)] = v;
    const slotsOut = {};
    for (const [k, v] of Object.entries(slotsMap))
        slotsOut[(0, slots_1.SlotId)(k)] = v;
    const slotRegionOut = {};
    for (const [k, v] of Object.entries(slotRegionMap))
        slotRegionOut[(0, slots_1.SlotId)(k)] = v;
    const defaultsOut = {};
    for (const [k, v] of Object.entries(defaults))
        defaultsOut[(0, slots_1.SlotId)(k)] = v;
    const navOut = { ...navDescriptors };
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
    const canonicalJson = (0, serialize_1.canonicalSerialize)(unfrozen);
    const hash = (0, hash_1.fnv1a32)(canonicalJson);
    return (0, deep_freeze_1.deepFreeze)({
        ...unfrozen,
        hash,
        canonicalJson,
    });
};
exports.normalizeWorkspace = normalizeWorkspace;
