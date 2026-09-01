export type ServiceRequestStatus = "draft" | "open" | "in_progress" | "closed";
export type ServiceRequestPriority = "low" | "medium" | "high" | "critical";
export type ServiceRequestId = string & {
    readonly __serviceRequestId: unique symbol;
};
export function ServiceRequestId(value: string): ServiceRequestId {
    return value as ServiceRequestId;
}
export interface ExecutionContextMetadata {
    readonly decision_id?: string | null;
    readonly last_invocation_digest?: string | null;
    readonly propagated_from: "cross-capability" | "direct-api";
}
export interface ServiceRequestAggregate {
    readonly id: ServiceRequestId;
    readonly workId?: string;
    readonly title: string;
    readonly description?: string;
    readonly status: ServiceRequestStatus;
    readonly priority: ServiceRequestPriority;
    readonly assigneeId?: string;
    readonly sourceDiscussionId?: string;
    readonly deadline?: string;
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
    readonly closedAt?: Readonly<Date>;
    readonly executionContext?: ExecutionContextMetadata;
    readonly evidence?: readonly any[];
    readonly tenantId?: string;
    readonly workspaceId?: string;
    readonly actorId?: string;
    readonly category?: string;
}
export interface CreateServiceRequestInput {
    readonly title: string;
    readonly description?: string;
    readonly priority?: ServiceRequestPriority;
    readonly sourceDiscussionId?: string;
    readonly assigneeId?: string;
    readonly workId?: string;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly actorId: string;
    readonly category?: string;
}
export interface CreateServiceRequestOutput {
    readonly id: ServiceRequestId;
    readonly status: ServiceRequestStatus;
}
export interface CloseServiceRequestInput {
    readonly id: ServiceRequestId;
    readonly reason?: string;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly actorId: string;
}
export interface CloseServiceRequestOutput {
    readonly id: ServiceRequestId;
    readonly status: "closed";
    readonly closedAt: Date;
}
export interface AssignAssigneeInput {
    readonly id: ServiceRequestId;
    readonly assigneeId: string;
    readonly transferReason?: string;
    readonly workId?: string;
    readonly parentContextTraceId?: string;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly actorId: string;
}
export interface AssignAssigneeOutput {
    readonly id: ServiceRequestId;
    readonly assigneeId: string;
    readonly status: ServiceRequestStatus;
}
export interface GetServiceRequestInput {
    readonly id: ServiceRequestId;
}
export type GetServiceRequestOutput = ServiceRequestAggregate | undefined;
export interface SearchServiceRequestsInput {
    readonly query?: string;
    readonly status?: ServiceRequestStatus | "all";
    readonly priority?: ServiceRequestPriority | "all";
    readonly limit?: number;
    readonly offset?: number;
}
export interface SearchServiceRequestsOutput {
    readonly items: readonly ServiceRequestAggregate[];
    readonly total: number;
    readonly matched: number;
    readonly offset: number;
    readonly limit: number;
}
export type ServiceRequestRepository = {
    readonly entityName: "ServiceRequest";
    readonly kind: "repository";
    byId(id: ServiceRequestId, context?: { tenantId: string; workspaceId: string }): Promise<ServiceRequestAggregate | undefined>;
    list(context?: { tenantId: string; workspaceId: string }): Promise<readonly ServiceRequestAggregate[]>;
};