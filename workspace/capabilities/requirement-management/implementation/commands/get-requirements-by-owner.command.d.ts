import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
export declare const GetRequirementsByOwnerInputSchema: z.ZodObject<{
    ownerId: z.ZodString;
    productId: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    ownerId: string;
}, {
    ownerId: string;
    productId?: string | undefined;
}>;
export type GetRequirementsByOwnerInput = z.infer<typeof GetRequirementsByOwnerInputSchema>;
export type GetRequirementsByOwnerOutput = readonly {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly status: string;
    readonly author?: {
        name: string;
    };
    readonly createdAt: string;
    readonly updatedAt: string;
}[] | undefined;
export declare const getRequirementsByOwnerCommand: CapabilityCommand;
//# sourceMappingURL=get-requirements-by-owner.command.d.ts.map