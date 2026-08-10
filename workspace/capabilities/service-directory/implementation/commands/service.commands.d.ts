import { CreateServiceRequestInput, CreateServiceRequestOutput, ServiceRequestId, ServiceRequestStatus } from "../contracts/service.contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
type CreateServiceRequestCommand = CapabilityCommand<CreateServiceRequestInput, CreateServiceRequestOutput>;
interface AcceptServiceRequestInput {
    readonly id: ServiceRequestId;
    readonly providerId: string;
}
interface AcceptServiceRequestOutput {
    readonly id: ServiceRequestId;
    readonly status: ServiceRequestStatus;
    readonly providerId: string;
}
type AcceptServiceRequestCommand = CapabilityCommand<AcceptServiceRequestInput, AcceptServiceRequestOutput>;
interface MarkServiceDeliveredInput {
    readonly id: ServiceRequestId;
}
interface MarkServiceDeliveredOutput {
    readonly id: ServiceRequestId;
    readonly status: "delivered";
    readonly deliveredAt: Date;
}
type MarkServiceDeliveredCommand = CapabilityCommand<MarkServiceDeliveredInput, MarkServiceDeliveredOutput>;
export declare const createServiceRequest: CreateServiceRequestCommand;
export declare const acceptServiceRequest: AcceptServiceRequestCommand;
export declare const markServiceDelivered: MarkServiceDeliveredCommand;
export declare const serviceDirectoryCommands: Readonly<Record<string, CapabilityCommand>>;
export type { CreateServiceRequestCommand, AcceptServiceRequestCommand, MarkServiceDeliveredCommand, };
//# sourceMappingURL=service.commands.d.ts.map