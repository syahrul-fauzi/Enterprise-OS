import { ServiceProviderCategory, ServiceProviderRepository, ServiceRequestId, ServiceRequestRepository, ServiceRequestStatus } from "../contracts/service.contracts";
export declare const ServiceProviderRepositoryInMemory: ServiceProviderRepository;
export declare const ServiceRequestRepositoryInMemory: ServiceRequestRepository;
export declare const newServiceRequestId: () => ServiceRequestId;
export declare const defaultServiceRequestStatus: ServiceRequestStatus;
export interface ServiceDirectoryStats {
    readonly totalRequests: number;
    readonly inService: number;
    readonly delivered: number;
    readonly pending: number;
    readonly totalProviders: number;
    readonly categories: readonly ServiceProviderCategory[];
}
export declare function readServiceDirectoryStats(): Promise<ServiceDirectoryStats>;
//# sourceMappingURL=service.repository.d.ts.map