export type ServiceRequestStatus = "draft" | "submitted" | "accepted" | "in_service" | "delivered" | "verified" | "settled" | "cancelled";
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
export type SubscriptionType = "monthly-retainer" | "yearly-managed" | "one-time";
export interface ServiceRequestAggregate {
    readonly id: ServiceRequestId;
    readonly workId: string; // Mandatory CORE-001: WorkAggregate sebagai single source of truth boundary metadata
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
    readonly settledAt?: Readonly<Date>;
    readonly executionContext?: ExecutionContextMetadata;
    readonly evidence?: readonly any[];
    readonly category?: string;
    // DIGISC-007: Subscription tracking untuk managed service recurring triggers
    readonly subscriptionId?: string; // ID langganan yang terkait dengan request ini
    readonly subscriptionType?: SubscriptionType; // Jenis langganan untuk managed service
    readonly recurringIntervalDays?: number; // Interval recurring trigger dalam hari (30, 365)
    readonly nextBillingDate?: Readonly<Date>; // Tanggal tagihan berikutnya untuk langganan
    readonly isRecurring?: boolean; // Flag apakah request ini adalah recurring/berulang
}
export interface CreateServiceRequestInput {
    readonly title: string;
    readonly description?: string;
    readonly priority?: ServiceRequestPriority;
    readonly sourceDiscussionId?: string;
    readonly assigneeId?: string;
    readonly workId: string; // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
    readonly sessionId: string;
    readonly category?: string;
    // DIGISC-007: Subscription tracking untuk managed service recurring triggers
    readonly subscriptionId?: string;
    readonly subscriptionType?: SubscriptionType;
    readonly recurringIntervalDays?: number;
    readonly isRecurring?: boolean;
}
export interface CreateServiceRequestOutput {
    readonly id: ServiceRequestId;
    readonly status: ServiceRequestStatus;
}
export interface CloseServiceRequestInput {
    readonly id: string;
    readonly reason?: string;
    readonly sessionId: string;
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
export interface SettleServiceRequestInput {
    readonly id: ServiceRequestId;
    readonly settlementProof?: string;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly workspaceId?: string;
    readonly workId?: string;
}
export interface SettleServiceRequestOutput {
    readonly id: ServiceRequestId;
    readonly status: "settled";
    readonly settledAt: Date;
}

export type ServiceRequestRepository = {
    readonly entityName: "ServiceRequest";
    readonly kind: "repository";
    byId(id: ServiceRequestId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<ServiceRequestAggregate | undefined>;
    list(context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly ServiceRequestAggregate[]>;
    byWorkId(workId: string, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<ServiceRequestAggregate | undefined>;
    // DIGISC-007: Tambahkan bySubscriptionId untuk query berdasarkan ID langganan
    bySubscriptionId(subscriptionId: string, context?: { tenantId: string; workspaceId?: string }): Promise<ServiceRequestAggregate | undefined>;
    save(input: CreateServiceRequestInput): Promise<CreateServiceRequestOutput>;
    settle(input: SettleServiceRequestInput): Promise<SettleServiceRequestOutput>;
};