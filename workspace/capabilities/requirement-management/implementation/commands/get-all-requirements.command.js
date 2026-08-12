"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRequirementsCommand = exports.GetAllRequirementsInputSchema = void 0;
const zod_1 = require("zod");
const repository_1 = require("../repository");
exports.GetAllRequirementsInputSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1).default("academic"),
    searchQuery: zod_1.z.string().default(""),
    filterStatus: zod_1.z.string().default("all"),
});
exports.getAllRequirementsCommand = {
    kind: "command",
    name: "requirement.getAll",
    version: "1.0.0",
    execute(input) {
        const parsed = exports.GetAllRequirementsInputSchema.parse(input);
        const { searchQuery, filterStatus } = parsed;
        const allRequirements = repository_1.RequirementRepositoryCurrent.list();
        const filteredRequirements = allRequirements
            .filter((req) => {
            if (!searchQuery)
                return true;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = req.title.toLowerCase().includes(searchLower) ||
                (req.description && req.description.toLowerCase().includes(searchLower)) ||
                (req.owner && req.owner.toLowerCase().includes(searchLower));
            return matchesSearch;
        })
            .filter((req) => {
            if (filterStatus === "all")
                return true;
            return req.status === filterStatus;
        })
            .map((req) => ({
            id: req.id,
            title: req.title,
            description: req.description,
            status: req.status,
            owner: req.owner,
            createdAt: req.createdAt.toISOString(),
            updatedAt: req.updatedAt.toISOString(),
        }));
        return filteredRequirements;
    },
};
