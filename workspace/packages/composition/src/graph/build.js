"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGraphFromPlan = buildGraphFromPlan;
exports.buildGraphFromNormalized = buildGraphFromNormalized;
exports.buildGraph = buildGraph;
const normalize_1 = require("../normalizer/normalize");
const build_plan_1 = require("../plan/build-plan");
const types_1 = require("./types");
const serialize_1 = require("../canonical/serialize");
const hash_1 = require("../canonical/hash");
const deep_freeze_1 = require("../canonical/deep-freeze");
function kindPrefix(kind) {
    switch (kind) {
        case "workspace": return "ws";
        case "layout": return "ly";
        case "region": return "rg";
        case "slot": return "sl";
        case "capability": return "cp";
        case "navigation": return "nv";
        case "navigation-item": return "ni";
    }
}
function nid(kind, parts) {
    return (0, types_1.GraphNodeId)([kindPrefix(kind), ...parts.map((p) => String(p).replace(/[:/|]/g, "-"))].join("|"));
}
function stable(arr, key) {
    return arr.slice().sort((a, b) => key(a).localeCompare(key(b)));
}
function buildGraphInternal(ctx) {
    const builders = {};
    const childrenBuild = {};
    const order = [];
    const byKind = {
        workspace: [], layout: [], region: [], slot: [], capability: [], navigation: [], "navigation-item": [],
    };
    const slotToCapability = {};
    const capSet = new Set();
    const addBuilder = (node) => {
        builders[String(node.id)] = node;
        childrenBuild[String(node.id)] = [];
        order.push(node.id);
        byKind[node.kind].push(node.id);
        return node;
    };
    const pushChild = (parentId, childId) => {
        childrenBuild[String(parentId)] = childrenBuild[String(parentId)] ?? [];
        childrenBuild[String(parentId)].push(childId);
    };
    const wsId = ctx.id;
    const rootId = nid("workspace", [String(wsId)]);
    addBuilder({
        id: rootId,
        kind: "workspace",
        parentId: null,
        depth: 0,
        workspaceId: wsId,
        canonicalId: ctx.canonicalId,
        name: ctx.name,
        requireCapabilities: ctx.permissions.requireCapabilities,
        requireRoles: ctx.permissions.requireRoles,
    });
    for (const rc of ctx.permissions.requireCapabilities)
        capSet.add(rc);
    const layout = ctx.layout;
    const layoutNodeId = nid("layout", [String(layout.id)]);
    addBuilder({
        id: layoutNodeId,
        kind: "layout",
        parentId: rootId,
        depth: 1,
        layout,
    });
    pushChild(rootId, layoutNodeId);
    const regionOrder = stable(ctx.regionOrder, (r) => String(r));
    for (const rid of regionOrder) {
        const region = ctx.regions[rid];
        if (region === undefined)
            continue;
        const rgnId = nid("region", [String(rid)]);
        addBuilder({
            id: rgnId, kind: "region", parentId: layoutNodeId, depth: 2, region, regionId: rid,
        });
        pushChild(layoutNodeId, rgnId);
        const slotsHere = Object.keys(ctx.slotRegionMap)
            .filter((sid) => String(ctx.slotRegionMap[sid]) === String(rid));
        const slotsSorted = stable(slotsHere, (s) => String(s));
        for (const sid of slotsSorted) {
            const slot = ctx.slots[sid];
            if (slot === undefined)
                continue;
            const slotNodeId = nid("slot", [String(sid)]);
            const defInst = ctx.slotDefaults[sid] ?? (slot.defaultExperience ? { slot: sid, capabilityId: slot.defaultExperience.capabilityId, view: slot.defaultExperience.view, priority: 0 } : null);
            addBuilder({
                id: slotNodeId, kind: "slot", parentId: rgnId, depth: 3, slot, slotId: sid, regionId: rid, defaultInstance: defInst,
            });
            pushChild(rgnId, slotNodeId);
            slotToCapability[String(sid)] = slotToCapability[String(sid)] ?? [];
            if (defInst !== null) {
                capSet.add(defInst.capabilityId);
                const capId = nid("capability", [defInst.capabilityId, "slot", String(sid)]);
                addBuilder({
                    id: capId, kind: "capability", parentId: slotNodeId, depth: 4,
                    capabilityId: defInst.capabilityId, source: "slot-default", view: defInst.view ?? slot.defaultExperience?.view,
                    slotId: sid, priority: defInst.priority ?? 0,
                });
                pushChild(slotNodeId, capId);
                slotToCapability[String(sid)].push(capId);
            }
        }
    }
    const wsReq = ctx.permissions.requireCapabilities;
    if (wsReq.length > 0) {
        for (const rc of stable(wsReq, (x) => x)) {
            const capId = nid("capability", [rc, "ws-require"]);
            addBuilder({
                id: capId, kind: "capability", parentId: rootId, depth: 1,
                capabilityId: rc, source: "workspace-requirement", priority: -10,
            });
            pushChild(rootId, capId);
        }
    }
    const navOrdered = stable(ctx.navigationOrder, (x) => x);
    for (const navId of navOrdered) {
        const nd = ctx.navigation[navId];
        if (nd === undefined)
            continue;
        const nvNodeId = nid("navigation", [navId]);
        addBuilder({
            id: nvNodeId, kind: "navigation", parentId: rootId, depth: 1, descriptor: nd, navigationId: navId,
        });
        pushChild(rootId, nvNodeId);
        const walkItems = (items, parentNid, depth) => {
            const orderedItems = stable(items, (i) => `${i.order ?? 0}|${i.id}`);
            for (const it of orderedItems) {
                const niId = nid("navigation-item", [navId, it.id]);
                addBuilder({
                    id: niId, kind: "navigation-item", parentId: parentNid, depth, item: it, navigationId: navId,
                });
                pushChild(parentNid, niId);
                if (it.capabilityId) {
                    capSet.add(it.capabilityId);
                    const cId = nid("capability", [it.capabilityId, "nav", it.id]);
                    addBuilder({
                        id: cId, kind: "capability", parentId: niId, depth: depth + 1,
                        capabilityId: it.capabilityId, source: "navigation", view: it.href ?? undefined, priority: it.order ?? 0,
                    });
                    pushChild(niId, cId);
                }
                if (it.children && it.children.length > 0)
                    walkItems(it.children, niId, depth + 1);
            }
        };
        walkItems(nd.items, nvNodeId, 2);
    }
    const nodes = {};
    for (const id of order) {
        const b = builders[String(id)];
        const childArr = (childrenBuild[String(id)] ?? []).slice();
        nodes[String(id)] = { ...b, childIds: childArr };
    }
    const orderedByKind = {
        workspace: byKind.workspace.slice(),
        layout: byKind.layout.slice(),
        region: byKind.region.slice(),
        slot: byKind.slot.slice(),
        capability: byKind.capability.slice(),
        navigation: byKind.navigation.slice(),
        "navigation-item": byKind["navigation-item"].slice(),
    };
    const slotToCapOut = {};
    for (const k of Object.keys(slotToCapability))
        slotToCapOut[k] = slotToCapability[k].slice();
    const structuralOnly = order.map((id) => {
        const n = nodes[String(id)];
        return {
            id: String(n.id),
            kind: n.kind,
            parentId: n.parentId ? String(n.parentId) : null,
            depth: n.depth,
            childIds: stable(n.childIds.slice(), (x) => String(x)).map(String),
        };
    });
    const structuralChecksum = (0, hash_1.fnv1a32)((0, serialize_1.canonicalSerialize)(structuralOnly));
    const unfrozen = {
        id: rootId,
        workspaceId: ctx.workspaceIdRef,
        canonicalId: ctx.canonicalId,
        root: rootId,
        nodes: { ...nodes },
        order: order.slice(),
        byKind: orderedByKind,
        slotToCapability: slotToCapOut,
        referencedCapabilityIds: Array.from(capSet).sort(),
        validationIssues: ctx.validationIssues.slice(),
    };
    const canonicalJson = (0, serialize_1.canonicalSerialize)(unfrozen);
    const hash = (0, hash_1.fnv1a32)(canonicalJson);
    return (0, deep_freeze_1.deepFreeze)({
        ...unfrozen,
        structuralChecksum,
        canonicalJson,
        hash,
    });
}
function buildGraphFromPlan(plan) {
    return buildGraphInternal({
        id: plan.workspaceId,
        canonicalId: plan.canonicalId,
        name: plan.name,
        layout: plan.layout,
        regions: plan.regions,
        regionOrder: plan.regionOrder,
        slots: plan.slots,
        slotRegionMap: plan.slotRegionMap,
        slotDefaults: plan.slotDefaults,
        navigation: plan.navigation,
        navigationOrder: plan.navigationOrder,
        permissions: plan.permissions,
        validationIssues: [
            ...plan.validation.fatalIssues,
            ...plan.validation.warnings,
        ],
        workspaceIdRef: plan.workspaceId,
    });
}
function buildGraphFromNormalized(ws) {
    const plan = (0, build_plan_1.buildCompositionPlan)(ws);
    return buildGraphFromPlan(plan);
}
function buildGraph(source) {
    const normalized = (0, normalize_1.normalizeWorkspace)(source);
    return buildGraphFromNormalized(normalized);
}
