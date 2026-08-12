import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-capability-registry";
export declare const GetAllRequirementsInputSchema: z.ZodObject<{
    productId: z.ZodDefault<z.ZodString>;
    searchQuery: z.ZodDefault<z.ZodString>;
    filterStatus: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    searchQuery: string;
    filterStatus: string;
}, {
    productId?: string | undefined;
    searchQuery?: string | undefined;
    filterStatus?: string | undefined;
}>;
export type GetAllRequirementsInput = z.infer<typeof GetAllRequirementsInputSchema>;
export type GetAllRequirementsOutput = readonly {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly status: string;
    readonly owner?: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}[] | undefined;
export declare const getAllRequirementsCommand: CapabilityCommand;
//# sourceMappingURL=get-all-requirements.command.d.ts.map