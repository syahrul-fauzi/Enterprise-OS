export type ServiceRequestStatus = "draft" | "submitted" | "proposed" | "accepted" | "in_service" | "delivered" | "verified" | "cancelled" | "declined";

export interface CreateServiceRequestInput {
  readonly title: string;
  readonly description: string;
  readonly category: ServiceProviderCategory;
  readonly budget?: string;
  readonly createdBy: string;
  readonly status: ServiceRequestStatus;
}

export type ServiceProviderCategory =
  | "Cloud Services"
  | "IT Support"
  | "Infrastructure"
  | "Cybersecurity"
  | "Software Development"
  | "Managed Services"
  | "Data & Analytics";

export type ServiceProviderId = string & { readonly __serviceProviderId: unique symbol };

export function ServiceProviderId(value: string): ServiceProviderId {
  return value as ServiceProviderId;
}

export type ServiceRequestId = string & { readonly __serviceRequestId: unique symbol };

export function ServiceRequestId(value: string): ServiceRequestId {
  return value as ServiceRequestId;
}

export type SupplyStatus = "PENDING_VERIFICATION" | "VERIFIED" | "INACTIVE";

export interface ServiceProviderAggregate {
  readonly id: ServiceProviderId;
  readonly name: string;
  readonly category: ServiceProviderCategory;
  readonly description: string;
  readonly rating: number;
  readonly location?: string;
  readonly verified: boolean;
  readonly contactEmail?: string;
  readonly contactName?: string;
  readonly responseHours?: string;
  readonly supplyStatus?: SupplyStatus; // CR-004 Supply-side verification tracking
  readonly createdAt: Readonly<Date>;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface ExternalSystemResponse {
  readonly system: string;
  readonly status: string;
  readonly referenceId?: string;
  readonly data?: Record<string, unknown>;
  readonly receivedAt: Readonly<Date>;
}

export interface ServiceRequestAggregate {
  readonly id: ServiceRequestId;
  readonly title: string;
  readonly description?: string;
  readonly category: ServiceProviderCategory;
  readonly status: ServiceRequestStatus;
  readonly requesterName?: string;
  readonly requesterEmail?: string;
  readonly requesterPhone?: string;
  readonly providerId?: ServiceProviderId;
  readonly providerNote?: string;
  readonly providerDecisionAt?: Readonly<Date>;
  readonly proposedPrice?: string;
  readonly priceAcceptedAt?: Readonly<Date>;
  readonly paymentTransactionId?: string;
  readonly paymentStatus?: string;
  readonly budget?: string;
  readonly deadline?: Readonly<Date>;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly deliveredAt?: Readonly<Date>;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId?: string;
  readonly externalResponses?: readonly ExternalSystemResponse[];
}

export interface CreateServiceRequestInput {
  readonly title: string;
  readonly description?: string;
  readonly category: ServiceProviderCategory;
  readonly requesterName?: string;
  readonly budget?: string;
}

export interface CreateServiceRequestOutput {
  readonly id: ServiceRequestId;
  readonly status: ServiceRequestStatus;
}

export interface UpdateExternalSystemStatusInput {
  readonly id: ServiceRequestId;
  readonly externalSystem: string;
  readonly externalStatus: string;
  readonly externalReferenceId?: string;
  readonly responseData?: Record<string, unknown>;
  readonly receivedAt: string;
  readonly sessionId: string;
}

export interface UpdateExternalSystemStatusOutput {
  readonly success: boolean;
  readonly id: ServiceRequestId;
  readonly externalSystem: string;
  readonly externalStatus: string;
  readonly receivedAt: string;
}

export type ServiceProviderRepository = {
  readonly entityName: "ServiceProvider";
  readonly kind: "repository";
  byId(id: ServiceProviderId): Promise<ServiceProviderAggregate | undefined>;
  list(): Promise<readonly ServiceProviderAggregate[]>;
  listByCategory(category: ServiceProviderCategory): Promise<readonly ServiceProviderAggregate[]>;
  listByLocation(location: string): Promise<readonly ServiceProviderAggregate[]>;
  listCategories(): readonly ServiceProviderCategory[];
  save(entity: ServiceProviderAggregate): Promise<ServiceProviderAggregate>;
  remove(id: ServiceProviderId): Promise<boolean>;
};

export type ServiceRequestRepository = {
  readonly entityName: "ServiceRequest";
  readonly kind: "repository";
  byId(id: ServiceRequestId): Promise<ServiceRequestAggregate | undefined>;
  list(): Promise<readonly ServiceRequestAggregate[]>;
  listByStatus(status: ServiceRequestStatus | "all"): Promise<readonly ServiceRequestAggregate[]>;
  listByWorkspace(workspaceId: string): Promise<readonly ServiceRequestAggregate[]>;
  listByTenant(tenantId: string): Promise<readonly ServiceRequestAggregate[]>;
  save(entity: ServiceRequestAggregate): Promise<ServiceRequestAggregate>;
  createMany(entities: CreateServiceRequestInput[]): Promise<string[]>;
  remove(id: ServiceRequestId): Promise<boolean>;
  delete(id: ServiceRequestId): Promise<boolean>;
};