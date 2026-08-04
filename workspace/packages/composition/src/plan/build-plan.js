"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCompositionPlan = void 0;
const serialize_1 = require("../canonical/serialize");
const hash_1 = require("../canonical/hash");
const deep_freeze_1 = require("../canonical/deep-freeze");
function stableArr(arr, key) {
    return arr.slice().sort((a, b) => key(a).localeCompare(key(b)));
}
function mergeSources(existing, capabilityId, source, extras) {
    if (existing === undefined) {
        return {
            capabilityId,
            sources: Object.freeze([source]),
            ...extras,
        };
    }
    const mergedSources = Array.from(new Set([...existing.sources, source])).sort();
    return {
        capabilityId: existing.capabilityId,
        sources: Object.freeze(mergedSources),
        declaredView: existing.declaredView ?? extras.declaredView,
        declaredPriority: existing.declaredPriority ?? extras.declaredPriority,
        targetingSlot: existing.targetingSlot ?? extras.targetingSlot,
        targetingNavItemId: existing.targetingNavItemId ?? extras.targetingNavItemId,
    };
}
function walkNavForCaps(items, onCap) {
    for (const it of items) {
        if (it.capabilityId)
            onCap(it.capabilityId, it.id);
        if (it.children && it.children.length > 0)
            walkNavForCaps(it.children, onCap);
    }
}
const buildCompositionPlan = function buildCompositionPlan(ws) {
    const capReq = {};
    const addReq = (capabilityId, source, extras = {}) => {
        capReq[capabilityId] = mergeSources(capReq[capabilityId], capabilityId, source, extras);
    };
    for (const cid of ws.permissions.requireCapabilities) {
        addReq(cid, "workspace-permission");
    }
    const slotDefaults = {};
    for (const [k, v] of Object.entries(ws.defaults))
        slotDefaults[k] = v;
    for (const sid of Object.keys(ws.slots)) {
        const slot = ws.slots[sid];
        if (slot === undefined)
            continue;
        if (slot.defaultExperience?.capabilityId) {
            addReq(slot.defaultExperience.capabilityId, "slot-defaultExperience", {
                declaredView: slot.defaultExperience.view,
                targetingSlot: sid,
            });
        }
        if (slot.capabilityIds && slot.capabilityIds.length > 0) {
            for (const cid of slot.capabilityIds) {
                addReq(cid, "slot-capabilityIds", { targetingSlot: sid });
            }
        }
    }
    for (const [k, def] of Object.entries(slotDefaults)) {
        addReq(def.capabilityId, "slot-default", {
            declaredView: def.view,
            declaredPriority: def.priority,
            targetingSlot: k,
        });
    }
    for (const navId of ws.navigationOrder) {
        const nd = ws.navigation[navId];
        if (nd === undefined)
            continue;
        walkNavForCaps(nd.items, (capabilityId, navItemId) => {
            addReq(capabilityId, "navigation-item", { targetingNavItemId: navItemId });
        });
    }
    const capsOrdered = stableArr(Object.keys(capReq), x => x);
    const dependencies = {};
    for (const cid of capsOrdered) {
        dependencies[cid] = {
            id: cid,
            kind: "capability",
            required: capReq[cid].sources.some(s => s === "workspace-permission" || s === "slot-default" || s === "slot-defaultExperience"),
            triggers: Object.freeze(capReq[cid].sources.slice()),
        };
    }
    const depsOrdered = stableArr(Object.keys(dependencies), x => `${dependencies[x].required ? "0" : "1"}-${x}`);
    const regionSlotsIndex = {};
    for (const [sidStr, rid] of Object.entries(ws.slotRegionMap)) {
        const ridStr = String(rid);
        regionSlotsIndex[ridStr] = regionSlotsIndex[ridStr] ?? [];
        regionSlotsIndex[ridStr].push(sidStr);
    }
    const emptyRegions = [];
    for (const rid of ws.regionOrder) {
        const ridStr = String(rid);
        const region = ws.regions[rid];
        if (region === undefined)
            continue;
        const declaredSlots = (regionSlotsIndex[ridStr] ?? []);
        if (declaredSlots.length === 0) {
            emptyRegions.push({ regionId: rid, regionKind: region.kind, reason: "no-slots-declared", declaredSlots: Object.freeze([]) });
            continue;
        }
        const haveDefaults = declaredSlots.some((sid) => {
            const sidStr = String(sid);
            if (sidStr in slotDefaults)
                return true;
            const s = ws.slots[sid];
            return s?.defaultExperience?.capabilityId !== undefined;
        });
        if (!haveDefaults) {
            emptyRegions.push({
                regionId: rid,
                regionKind: region.kind,
                reason: "slots-but-no-defaults",
                declaredSlots: Object.freeze(declaredSlots.slice().sort((a, b) => String(a).localeCompare(String(b)))),
            });
        }
    }
    const slotsWithoutDefaults = [];
    for (const sidStr of Object.keys(ws.slots)) {
        const sid = sidStr;
        const slot = ws.slots[sid];
        if (slot === undefined)
            continue;
        const hasDef = String(sid) in slotDefaults || slot.defaultExperience?.capabilityId !== undefined;
        const rid = ws.slotRegionMap[sid];
        if (!hasDef) {
            if (slot.required) {
                slotsWithoutDefaults.push({
                    slotId: sid,
                    regionId: rid,
                    reason: "required-but-no-default",
                    capabilityIdsDeclared: Object.freeze(slot.capabilityIds ?? []),
                });
            }
            else if (slot.capabilityIds && slot.capabilityIds.length > 0) {
                slotsWithoutDefaults.push({
                    slotId: sid,
                    regionId: rid,
                    reason: "optional-but-capabilityIds-declared",
                    capabilityIdsDeclared: Object.freeze(slot.capabilityIds.slice()),
                });
            }
            else {
                slotsWithoutDefaults.push({
                    slotId: sid,
                    regionId: rid,
                    reason: "optional-empty-slot",
                    capabilityIdsDeclared: Object.freeze([]),
                });
            }
        }
    }
    const fallbacksNeeded = [];
    for (const s of slotsWithoutDefaults) {
        fallbacksNeeded.push({
            type: s.reason === "required-but-no-default" ? "required-slot-empty" : "slot-default-missing",
            referenceId: String(s.slotId),
            slotId: s.slotId,
        });
    }
    for (const cid of capsOrdered) {
        const req = capReq[cid];
        const inPermissions = ws.permissions.requireCapabilities.includes(cid);
        if (!inPermissions && req.sources.some(s => s === "slot-default" || s === "slot-defaultExperience")) {
            fallbacksNeeded.push({
                type: "capability-referenced-but-not-in-permissions",
                referenceId: cid,
                capabilityId: cid,
                slotId: req.targetingSlot,
            });
        }
    }
    const fatalIssues = ws.validation.issues.filter(i => i.severity === "error");
    const warnings = ws.validation.issues.filter(i => i.severity === "warning");
    const missingRequiredSlots = Object.freeze(slotsWithoutDefaults
        .filter(s => s.reason === "required-but-no-default")
        .map(s => s.slotId));
    const unknownRegionReferences = Object.freeze(ws.validation.issues
        .filter(i => i.code === "unknown_region" && i.ref)
        .map(i => i.ref)
        .sort((a, b) => String(a).localeCompare(String(b))));
    const unknownSlotReferences = Object.freeze(ws.validation.issues
        .filter(i => (i.code === "unknown_slot" || i.code === "missing_required_slot") && i.ref)
        .map(i => i.ref)
        .sort((a, b) => String(a).localeCompare(String(b))));
    const validity = {
        structurallyValid: fatalIssues.length === 0 && missingRequiredSlots.length === 0,
        fatalIssues: Object.freeze(fatalIssues.slice()),
        warnings: Object.freeze(warnings.slice()),
        missingRequiredSlots: Object.freeze(missingRequiredSlots),
        unknownRegionReferences,
        unknownSlotReferences,
    };
    const layout = ws.layout;
    const projSlotDefaults = capsOrdered.filter(cid => capReq[cid].sources.some(s => s === "slot-default" || s === "slot-defaultExperience")).length;
    const projNav = capsOrdered.filter(cid => capReq[cid].sources.some(s => s === "navigation-item")).length;
    const projWsReq = ws.permissions.requireCapabilities.length;
    const byKindProjected = {
        workspace: 1,
        layout: 1,
        region: ws.regionOrder.length,
        slot: Object.keys(ws.slots).length,
        capability: projWsReq + projSlotDefaults + projNav,
        navigation: ws.navigationOrder.length,
        "navigation-item": Object.values(ws.navigation).reduce((acc, nd) => {
            let n = 0;
            const walk = (items) => {
                for (const it of items) {
                    n += 1;
                    if (it.children && it.children.length > 0)
                        walk(it.children);
                }
            };
            walk(nd.items);
            return acc + n;
        }, 0),
    };
    const nodeCountProjected = Object.values(byKindProjected).reduce((a, b) => a + b, 0);
    const projectedGraph = {
        nodeCountProjected,
        byKindProjected: Object.freeze({ ...byKindProjected }),
        willNeedFallbackResolutionAtRuntime: fallbacksNeeded.length > 0,
        willNeedPermissionFilteringAtRuntime: ws.permissions.requireRoles.length > 0 || Object.keys(ws.permissions.requireCapabilities).length > 0,
        willNeedFeatureFlagEvaluationAtRuntime: capsOrdered.length > 0,
    };
    const structural = {
        workspaceId: ws.id,
        workspaceName: ws.name,
        canonicalId: ws.canonicalId,
        layoutId: String(layout.id),
        layoutPattern: layout.pattern,
        regionCount: ws.regionOrder.length,
        slotCount: Object.keys(ws.slots).length,
        navigationCount: ws.navigationOrder.length,
        capabilityNodeProjections: {
            workspaceRequirements: projWsReq,
            slotDefaults: projSlotDefaults,
            navigationReferences: projNav,
            totalProjected: projWsReq + projSlotDefaults + projNav,
        },
    };
    const unfrozen = {
        workspaceId: ws.id,
        name: ws.name,
        canonicalId: ws.canonicalId,
        sourceNormalizedId: ws.id,
        sourceNormalizedHash: ws.hash,
        structural,
        layout,
        regions: ws.regions,
        regionOrder: ws.regionOrder,
        slots: ws.slots,
        slotRegionMap: ws.slotRegionMap,
        slotDefaults,
        navigation: ws.navigation,
        navigationOrder: ws.navigationOrder,
        permissions: {
            requireCapabilities: ws.permissions.requireCapabilities.slice(),
            requireRoles: ws.permissions.requireRoles.slice(),
        },
        capabilitiesRequired: { ...capReq },
        capabilitiesRequiredOrder: capsOrdered,
        dependencies: { ...dependencies },
        dependenciesOrder: depsOrdered,
        emptyRegions,
        slotsWithoutDefaults,
        fallbacksNeeded,
        validation: validity,
        projectedGraph,
    };
    const canonicalJson = (0, serialize_1.canonicalSerialize)(unfrozen);
    const canonicalHash = (0, hash_1.fnv1a32)(canonicalJson);
    const planId = `plan::${ws.canonicalId}::${canonicalHash}`;
    return (0, deep_freeze_1.deepFreeze)({
        id: planId,
        ...unfrozen,
        canonicalHash,
        canonicalJson,
    });
};
exports.buildCompositionPlan = buildCompositionPlan;
