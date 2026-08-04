"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose = compose;
const normalize_1 = require("../normalizer/normalize");
const build_plan_1 = require("../plan/build-plan");
const build_1 = require("../graph/build");
const resolve_1 = require("../resolver/resolve");
function makeDefaultCtx(input) {
    const resolver = input.resolver;
    const entries = resolver?.capabilityEntries ?? Object.fromEntries(input.workspace.permissions?.requireCapabilities?.map((id) => [id, { id, available: true }]) ?? []);
    const listFn = (ids) => {
        const idsArr = ids ?? Object.keys(entries);
        return idsArr.map((id) => entries[id] ?? { id, available: false, reason: `not in entries: ${id}` });
    };
    const getFn = (id) => entries[id];
    return {
        actor: resolver?.actor ?? { roles: ["user"], permissions: [] },
        features: resolver?.features ?? { flags: {} },
        capabilities: { list: listFn, get: getFn },
        slotOverrides: resolver?.slotOverrides ?? {},
        requestId: resolver?.requestId ?? `req-${input.workspace.id ?? "anon"}-0`,
    };
}
function compose(input) {
    const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const normalized = (0, normalize_1.normalizeWorkspace)(input);
    const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const plan = (0, build_plan_1.buildCompositionPlan)(normalized);
    const t2 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const graph = (0, build_1.buildGraphFromPlan)(plan);
    const t3 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const ctx = makeDefaultCtx(input);
    const resolved = (0, resolve_1.resolveWorkspace)(graph, ctx);
    const t4 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    return {
        normalized,
        plan,
        graph,
        resolved,
        graphId: String(graph.id),
        graphHash: graph.hash,
        planId: plan.id,
        duration: {
            normalizeMs: t1 - t0,
            planMs: t2 - t1,
            graphMs: t3 - t2,
            resolveMs: t4 - t3,
            totalMs: t4 - t0,
        },
    };
}
