import type { CapabilityCommand } from "@repo/core-kernel";
import { type CreateTenantInput } from "../contracts/identity.contracts";
type CreateTenantCommand = CapabilityCommand<CreateTenantInput, {
    readonly tenantId: string;
    readonly name: string;
    readonly slug: string;
}>;
export declare const createTenantCommand: CreateTenantCommand;
export {};
//# sourceMappingURL=create-tenant.command.d.ts.map