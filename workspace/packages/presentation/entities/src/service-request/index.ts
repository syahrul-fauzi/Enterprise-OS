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
    readonly evidence?: readonly Record<string, unknown>[];
    readonly tenantId?: string;
    readonly workspaceId?: string;
    readonly actorId?: string;
    readonly category?: string;
}