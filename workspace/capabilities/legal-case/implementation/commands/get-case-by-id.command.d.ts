import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
export declare const GetCaseByIdInputSchema: z.ZodObject<{
    caseId: z.ZodString;
    sessionId: z.ZodString;
    tenantId: z.ZodString;
    workspaceId: z.ZodString;
    actorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    caseId: string;
}, {
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    caseId: string;
}>;
export type GetCaseByIdInput = z.infer<typeof GetCaseByIdInputSchema>;
export type GetCaseByIdOutput = {
    readonly type: "lawyershub.case";
    readonly id: string;
    readonly displayTitle: string;
    readonly displaySubtitle: string;
    readonly rawStatus: string;
    readonly owner: string | undefined;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly evidenceCount: number;
    readonly priority: string;
} | undefined;
export declare const getCaseByIdCommand: CapabilityCommand<GetCaseByIdInput, Promise<GetCaseByIdOutput>>;
//# sourceMappingURL=get-case-by-id.command.d.ts.map