"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCasePriority = exports.defaultCaseStatus = exports.newCaseId = exports.CaseRepositoryInMemory = void 0;
const contracts_1 = require("../contracts");
const seed = () => [
    {
        id: (0, contracts_1.CaseId)("case-001"),
        title: "Vendor Agreement Review",
        description: "Review and finalize vendor contract for Q3 procurement.",
        status: "open",
        priority: "high",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
        id: (0, contracts_1.CaseId)("case-002"),
        title: "IP Filing — Trade Secret Protection",
        description: "Prepare and file intellectual property trade secret documentation package.",
        status: "in_progress",
        priority: "critical",
        lawyerId: "lawyer-007",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
    {
        id: (0, contracts_1.CaseId)("case-003"),
        title: "Employment Handbook Update",
        status: "draft",
        priority: "medium",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
];
function hydrate() {
    const store = new Map();
    for (const c of seed()) {
        store.set(c.id, c);
    }
    return store;
}
const STORE = hydrate();
function clone(entity) {
    return {
        ...entity,
        createdAt: new Date(entity.createdAt),
        updatedAt: new Date(entity.updatedAt),
        ...(entity.closedAt !== undefined ? { closedAt: new Date(entity.closedAt) } : {}),
    };
}
exports.CaseRepositoryInMemory = {
    kind: "repository",
    entityName: "Case",
    async byId(id) {
        const raw = STORE.get(id);
        return raw !== undefined ? clone(raw) : undefined;
    },
    async list() {
        return Array.from(STORE.values()).map(clone);
    },
    async listByTenant(tenantId) {
        // In-memory implementation - filter by tenant if available on aggregate
        return Array.from(STORE.values())
            .filter(c => c.tenantId === tenantId)
            .map(clone);
    },
    async listByWorkspace(workspaceId) {
        // In-memory implementation - filter by workspace if available on aggregate
        return Array.from(STORE.values())
            .filter(c => c.workspaceId === workspaceId)
            .map(clone);
    },
    async save(entity) {
        const updated = { ...clone(entity), updatedAt: new Date() };
        STORE.set(updated.id, updated);
        return clone(updated);
    },
    async remove(id) {
        return STORE.delete(id);
    },
};
exports.newCaseId = (() => {
    let seq = 100;
    return () => {
        seq += 1;
        return (0, contracts_1.CaseId)(`case-${String(seq).padStart(3, "0")}`);
    };
})();
exports.defaultCaseStatus = "draft";
exports.defaultCasePriority = "medium";
