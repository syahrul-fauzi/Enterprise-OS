"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseCommands = exports.assignLawyer = exports.closeCase = exports.createCase = void 0;
exports.nextCaseId = nextCaseId;
const repository_1 = require("../repository");
exports.createCase = {
    kind: "command",
    name: "case.create",
    version: "0.1.0",
    execute(input) {
        const entity = {
            id: (0, repository_1.newCaseId)(),
            title: input.title.trim(),
            ...(input.description !== undefined && input.description !== ""
                ? { description: input.description }
                : {}),
            status: repository_1.defaultCaseStatus,
            priority: input.priority ?? repository_1.defaultCasePriority,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        repository_1.CaseRepositoryInMemory.save(entity);
        return { id: entity.id, status: entity.status };
    },
};
exports.closeCase = {
    kind: "command",
    name: "case.close",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.CaseRepositoryInMemory.byId(input.id);
        if (current === undefined) {
            throw new Error(`[case.close] Case not found: ${input.id}`);
        }
        if (current.status === "closed") {
            return { id: current.id, status: "closed", closedAt: current.closedAt ?? new Date() };
        }
        const closedAt = new Date();
        const next = { ...current, status: "closed", closedAt };
        repository_1.CaseRepositoryInMemory.save(next);
        return { id: next.id, status: "closed", closedAt };
    },
};
exports.assignLawyer = {
    kind: "command",
    name: "case.assignLawyer",
    version: "0.1.0",
    execute(input) {
        const current = repository_1.CaseRepositoryInMemory.byId(input.id);
        if (current === undefined) {
            throw new Error(`[case.assignLawyer] Case not found: ${input.id}`);
        }
        if (current.status === "closed") {
            throw new Error(`[case.assignLawyer] Cannot assign lawyer to closed case: ${input.id}`);
        }
        const nextStatus = current.status === "draft" ? "open" : current.status;
        const next = {
            ...current,
            lawyerId: input.lawyerId,
            status: nextStatus,
        };
        repository_1.CaseRepositoryInMemory.save(next);
        return { id: next.id, lawyerId: next.lawyerId, status: next.status };
    },
};
exports.caseCommands = {
    "case.create": exports.createCase,
    "case.close": exports.closeCase,
    "case.assignLawyer": exports.assignLawyer,
};
function nextCaseId() {
    return (0, repository_1.newCaseId)();
}
