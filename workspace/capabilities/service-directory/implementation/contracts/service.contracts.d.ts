export type ServiceRequestStatus = "draft" | "accepted" | "in_service" | "delivered" | "verified";
export type ServiceProviderCategory = "Cloud Services" | "IT Support" | "Infrastructure" | "Cybersecurity" | "Software Development" | "Managed Services" | "Data & Analytics";
export type ServiceProviderId = string & {
    readonly __serviceProviderId: unique symbol;
};
export declare function ServiceProviderId(value: string): ServiceProviderId;
export type ServiceRequestId = string & {
    readonly __serviceRequestId: unique symbol;
};
export declare function ServiceRequestId(value: string): ServiceRequestId;
export interface ServiceProviderAggregate {
    readonly id: ServiceProviderId;
    readonly name: string;
    readonly category: ServiceProviderCategory;
    readonly description: string;
    readonly rating: number;
    readonly location?: string;
    readonly verified: boolean;
    readonly createdAt: Readonly<Date>;
}
export interface ServiceRequestAggregate {
    readonly id: ServiceRequestId;
    readonly title: string;
    readonly description?: string;
    readonly category: ServiceProviderCategory;
    readonly status: ServiceRequestStatus;
    readonly requesterName?: string;
    readonly providerId?: ServiceProviderId;
    readonly budget?: string;
    readonly deadline?: Readonly<Date>;
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
    readonly deliveredAt?: Readonly<Date>;
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
export type ServiceProviderRepository = {
    readonly entityName: "ServiceProvider";
    readonly kind: "repository";
    byId(id: ServiceProviderId): ServiceProviderAggregate | undefined;
    list(): readonly ServiceProviderAggregate[];
    listByCategory(category: ServiceProviderCategory): readonly ServiceProviderAggregate[];
    listCategories(): readonly ServiceProviderCategory[];
    save(entity: ServiceProviderAggregate): ServiceProviderAggregate;
    remove(id: ServiceProviderId): boolean;
};
export type ServiceRequestRepository = {
    readonly entityName: "ServiceRequest";
    readonly kind: "repository";
    byId(id: ServiceRequestId): ServiceRequestAggregate | undefined;
    list(): readonly ServiceRequestAggregate[];
    listByStatus(status: ServiceRequestStatus | "all"): readonly ServiceRequestAggregate[];
    save(entity: ServiceRequestAggregate): ServiceRequestAggregate;
    remove(id: ServiceRequestId): boolean;
};
//# sourceMappingURL=service.contracts.d.ts.map