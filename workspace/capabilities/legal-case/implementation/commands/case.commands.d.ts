import { z } from "zod";
import { AssignLawyerInput, AssignLawyerOutput, CaseId, CloseCaseInput, CloseCaseOutput, CreateCaseOutput, SearchCasesOutput } from "../contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
declare const CreateCaseWithContextSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    sessionId: z.ZodString;
    tenantId: z.ZodString;
    workspaceId: z.ZodString;
    actorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    title: string;
    description?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
}, {
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    title: string;
    description?: string | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
}>;
declare const ListCasesWithContextSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "open", "in_progress", "closed", "all"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical", "all"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sessionId: z.ZodString;
    tenantId: z.ZodString;
    workspaceId: z.ZodString;
    actorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    limit: number;
    offset: number;
    query?: string | undefined;
    status?: "draft" | "open" | "in_progress" | "closed" | "all" | undefined;
    priority?: "low" | "medium" | "high" | "critical" | "all" | undefined;
}, {
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    query?: string | undefined;
    status?: "draft" | "open" | "in_progress" | "closed" | "all" | undefined;
    priority?: "low" | "medium" | "high" | "critical" | "all" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
type CreateCaseWithContextInput = z.infer<typeof CreateCaseWithContextSchema>;
type ListCasesWithContextInput = z.infer<typeof ListCasesWithContextSchema>;
type CreateCaseCommand = CapabilityCommand<CreateCaseWithContextInput, Promise<CreateCaseOutput>>;
type CloseCaseCommand = CapabilityCommand<CloseCaseInput, Promise<CloseCaseOutput>>;
type AssignLawyerCommand = CapabilityCommand<AssignLawyerInput, Promise<AssignLawyerOutput>>;
type ListCasesCommand = CapabilityCommand<ListCasesWithContextInput, Promise<SearchCasesOutput>>;
export declare const createCase: CreateCaseCommand;
export declare const closeCase: CloseCaseCommand;
export declare const assignLawyer: AssignLawyerCommand;
export declare const listCasesByWorkspace: ListCasesCommand;
export declare const caseCommands: Readonly<Record<string, CapabilityCommand>>;
export type { CreateCaseCommand, CloseCaseCommand, AssignLawyerCommand };
export declare function nextCaseId(): CaseId;
//# sourceMappingURL=case.commands.d.ts.map