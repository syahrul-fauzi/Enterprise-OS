"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkspace = resolveWorkspace;
const slots_1 = require("../slots");
function resolveWorkspace(graph, ctx) {
    const warnings = [];
    const errors = [];
    const warningsAdd = (s) => warnings.push(s);
    const errorsAdd = (s) => errors.push(s);
    const capabilities = {};
    const activeCapabilityIds = [];
    const activeSet = new Set();
    const registry = ctx.capabilities;
    function hasPermission(action, resource) {
        const required = `${resource}:${action}`;
        for (const p of ctx.actor.permissions)
            if (p === required || p === `${resource}:*` || p === "*")
                return true;
        return ctx.actor.roles.includes("admin") || ctx.actor.roles.includes("owner");
    }
    function lookup(capabilityId) {
        const e = registry.get(capabilityId);
        if (e === undefined)
            return { available: false, fallback: [], reason: `capability "${capabilityId}" tidak terdaftar di registry` };
        if (!e.available)
            return { available: false, fallback: e.fallbackFor ?? [], reason: e.reason ?? `capability "${capabilityId}" marked unavailable` };
        return { available: true, fallback: e.fallbackFor ?? [] };
    }
    function statusFor(capNode) {
        const capId = capNode.capabilityId;
        const existing = capabilities[capId];
        if (existing !== undefined && existing.status === "resolved")
            return existing;
        const base = {
            graphNodeId: capNode.id,
            capabilityId: capId,
            status: "resolved",
        };
        if (!hasPermission("view", capId.replace(/^legal-/, ""))) {
            return { ...base, status: "permission-denied", reason: `actor lacks permission '${capId.replace(/^legal-/, "")}:view'` };
        }
        const fflag = ctx.features.flags[`capability.${capId}`];
        if (fflag === false) {
            return { ...base, status: "disabled", reason: `feature flag 'capability.${capId}' = false` };
        }
        const info = lookup(capId);
        if (info.available) {
            return base;
        }
        if (info.fallback.length > 0) {
            for (const fb of info.fallback) {
                const infoFb = lookup(fb);
                if (infoFb.available) {
                    return { ...base, status: "fallback", reason: info.reason, effectiveCapabilityId: fb };
                }
            }
        }
        return { ...base, status: "unavailable", reason: info.reason };
    }
    const capNodes = graph.byKind.capability
        .map((id) => graph.nodes[id]);
    for (const capNode of capNodes) {
        const st = statusFor(capNode);
        capabilities[capNode.capabilityId] = st;
        if ((st.status === "resolved" || st.status === "fallback") && !activeSet.has(capNode.capabilityId)) {
            activeSet.add(capNode.capabilityId);
            activeCapabilityIds.push(capNode.capabilityId);
        }
        if (st.status === "permission-denied")
            warningsAdd(`[permission] capability '${capNode.capabilityId}': ${st.reason}`);
        if (st.status === "unavailable")
            errorsAdd(`[capability] ${st.reason ?? `capability '${capNode.capabilityId}' unavailable`}`);
    }
    const slotCapMap = {};
    for (const slotNodeId of graph.byKind.slot) {
        const slotNode = graph.nodes[slotNodeId];
        const sid = String(slotNode.slotId);
        slotCapMap[sid] = slotCapMap[sid] ?? [];
        const overrides = ctx.slotOverrides?.[slotNode.slotId];
        const overrideArr = overrides ?? [];
        const sources = [];
        for (let i = 0; i < overrideArr.length; i++) {
            const capId = overrideArr[i];
            const st = capabilities[capId] ?? { graphNodeId: slotNode.id, capabilityId: capId, status: "resolved" };
            if (st.status === "resolved" || st.status === "fallback") {
                sources.push({
                    slotId: slotNode.slotId,
                    capabilityId: st.effectiveCapabilityId ?? capId,
                    priority: i + 1,
                    status: st.status === "fallback" ? "fallback" : "active",
                });
            }
        }
        const defInst = slotNode.defaultInstance;
        if (defInst !== null && overrideArr.length === 0) {
            const defCap = defInst.capabilityId;
            const st = capabilities[defCap] ?? { graphNodeId: slotNode.id, capabilityId: defCap, status: "resolved" };
            if (st.status === "resolved" || st.status === "fallback") {
                sources.push({
                    slotId: slotNode.slotId,
                    capabilityId: st.effectiveCapabilityId ?? defCap,
                    view: defInst.view,
                    priority: defInst.priority ?? 0,
                    status: st.status === "fallback" ? "fallback" : "active",
                });
            }
        }
        slotCapMap[sid] = sources.sort((a, b) => (a.priority - b.priority));
    }
    const regionOrder = graph.byKind.region.map((rId) => graph.nodes[rId].regionId);
    const regionsOut = {};
    for (const rId of graph.byKind.region) {
        const node = graph.nodes[rId];
        const slotsRecord = {};
        for (const childId of node.childIds) {
            const child = graph.nodes[childId];
            if (child.kind !== "slot")
                continue;
            const slotNode = child;
            slotsRecord[slotNode.slotId] = slotCapMap[String(slotNode.slotId)] ?? [];
        }
        Object.keys(slotsRecord).forEach((sid) => {
            if (!(sid in slotsRecord))
                slotsRecord[(0, slots_1.SlotId)(String(sid))] = [];
        });
        const slotArr = Object.values(slotsRecord).flat();
        regionsOut[node.regionId] = {
            regionId: node.regionId,
            region: node.region,
            slots: slotsRecord,
            visible: slotArr.length > 0 || node.region.kind === "workspace" || node.region.kind === "main",
        };
    }
    const navigationOut = [];
    for (const nvId of graph.byKind.navigation) {
        const nvNode = graph.nodes[nvId];
        const visibleIdx = [];
        for (let i = 0; i < nvNode.descriptor.items.length; i++) {
            const it = nvNode.descriptor.items[i];
            if (it.capabilityId) {
                const st = capabilities[it.capabilityId];
                if (st?.status === "permission-denied" || st?.status === "disabled" || st?.status === "unavailable")
                    continue;
            }
            visibleIdx.push(i);
        }
        navigationOut.push({ id: nvNode.navigationId, descriptor: nvNode.descriptor, visibleItems: visibleIdx });
    }
    const workspaceNode = graph.nodes[graph.root];
    const layoutNode = graph.byKind.layout.length > 0 ? graph.nodes[graph.byKind.layout[0]] : undefined;
    const layoutPattern = layoutNode?.layout.pattern ?? "sidebar-main";
    const layoutId = String(layoutNode?.layout.id ?? "default");
    return {
        workspaceId: graph.workspaceId,
        canonicalId: graph.canonicalId,
        name: workspaceNode.name ?? String(graph.workspaceId),
        graphId: graph.id,
        graphHash: graph.hash,
        layoutPattern,
        layoutId,
        regions: regionsOut,
        regionOrder,
        navigation: navigationOut,
        capabilities: Object.freeze({ ...capabilities }),
        activeCapabilityIds: Object.freeze(activeCapabilityIds.slice().sort()),
        warnings: Object.freeze(warnings.slice()),
        errors: Object.freeze(errors.slice()),
        resolved: errors.length === 0,
        workspaceNode,
        sourceGraph: graph,
    };
}
