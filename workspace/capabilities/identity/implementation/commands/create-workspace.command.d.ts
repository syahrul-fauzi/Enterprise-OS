import type { CapabilityCommand } from "@repo/core-kernel";
import { type CreateWorkspaceInput } from "../contracts/identity.contracts";
type CreateWorkspaceCommand = CapabilityCommand<CreateWorkspaceInput, {
    readonly workspaceId: string;
    readonly tenantId: string;
    readonly name: string;
    readonly productId: string;
}>;
export declare const createWorkspaceCommand: CreateWorkspaceCommand;
export {};
//# sourceMappingURL=create-workspace.command.d.ts.map