import { z } from "zod";
import { CreateServiceRequestOutput, ServiceRequestAggregate, ServiceRequestId, ServiceRequestStatus } from "../contracts/service.contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
interface AcceptServiceRequestOutput {
    readonly id: ServiceRequestId;
    readonly status: ServiceRequestStatus;
    readonly providerId: string;
}
interface MarkServiceDeliveredOutput {
    readonly id: ServiceRequestId;
    readonly status: "delivered";
    readonly deliveredAt: Date;
}
declare const AcceptServiceRequestWithContextSchema: z.ZodObject<{
    id: z.ZodString;
    providerId: z.ZodString;
    sessionId: z.ZodString;
    tenantId: z.ZodString;
    workspaceId: z.ZodString;
    actorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    providerId: string;
}, {
    id: string;
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    providerId: string;
}>;
type AcceptServiceRequestWithContextInput = z.infer<typeof AcceptServiceRequestWithContextSchema>;
type AcceptServiceRequestCommand = CapabilityCommand<AcceptServiceRequestWithContextInput, Promise<AcceptServiceRequestOutput>>;
declare const MarkServiceDeliveredWithContextSchema: z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    tenantId: z.ZodString;
    workspaceId: z.ZodString;
    actorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
}, {
    id: string;
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
}>;
type MarkServiceDeliveredWithContextInput = z.infer<typeof MarkServiceDeliveredWithContextSchema>;
type MarkServiceDeliveredCommand = CapabilityCommand<MarkServiceDeliveredWithContextInput, Promise<MarkServiceDeliveredOutput>>;
declare const ListServiceRequestsWithContextSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "accepted", "in_service", "delivered", "all"]>>;
    category: z.ZodOptional<z.ZodEnum<["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development", "all"]>>;
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
    status?: "all" | "draft" | "delivered" | "accepted" | "in_service" | undefined;
    category?: "all" | "Cloud Services" | "Cybersecurity" | "IT Support" | "Infrastructure" | "Software Development" | undefined;
}, {
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    query?: string | undefined;
    status?: "all" | "draft" | "delivered" | "accepted" | "in_service" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    category?: "all" | "Cloud Services" | "Cybersecurity" | "IT Support" | "Infrastructure" | "Software Development" | undefined;
}>;
type ListServiceRequestsWithContextInput = z.infer<typeof ListServiceRequestsWithContextSchema>;
type ListServiceRequestsOutput = {
    readonly items: readonly ServiceRequestAggregate[];
    readonly total: number;
    readonly matched: number;
    readonly offset: number;
    readonly limit: number;
};
type ListServiceRequestsCommand = CapabilityCommand<ListServiceRequestsWithContextInput, Promise<ListServiceRequestsOutput>>;
declare const CreateServiceRequestWithContextSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development"]>;
    requesterName: z.ZodOptional<z.ZodString>;
    budget: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodString;
    tenantId: z.ZodString;
    workspaceId: z.ZodString;
    actorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    category: "Cloud Services" | "Cybersecurity" | "IT Support" | "Infrastructure" | "Software Development";
    description?: string | undefined;
    requesterName?: string | undefined;
    budget?: string | undefined;
}, {
    title: string;
    sessionId: string;
    actorId: string;
    tenantId: string;
    workspaceId: string;
    category: "Cloud Services" | "Cybersecurity" | "IT Support" | "Infrastructure" | "Software Development";
    description?: string | undefined;
    requesterName?: string | undefined;
    budget?: string | undefined;
}>;
type CreateServiceRequestWithContextInput = z.infer<typeof CreateServiceRequestWithContextSchema>;
type CreateServiceRequestCommand = CapabilityCommand<CreateServiceRequestWithContextInput, Promise<CreateServiceRequestOutput>>;
export declare const createServiceRequest: CreateServiceRequestCommand;
export declare const acceptServiceRequest: AcceptServiceRequestCommand;
export declare const markServiceDelivered: MarkServiceDeliveredCommand;
export declare const listServiceRequestsByWorkspace: ListServiceRequestsCommand;
export declare const serviceDirectoryCommands: Readonly<Record<string, CapabilityCommand>>;
export type { CreateServiceRequestCommand, AcceptServiceRequestCommand, MarkServiceDeliveredCommand, };
//# sourceMappingURL=service.commands.d.ts.map