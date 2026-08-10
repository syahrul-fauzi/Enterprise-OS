import type { CapabilityCommand } from "@repo/core-kernel";
import { type CreateMembershipInput, type Role } from "../contracts/identity.contracts";
type CreateMembershipCommand = CapabilityCommand<CreateMembershipInput, {
    readonly membershipId: string;
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly role: Role;
}>;
export declare const createMembershipCommand: CreateMembershipCommand;
export {};
//# sourceMappingURL=create-membership.command.d.ts.map