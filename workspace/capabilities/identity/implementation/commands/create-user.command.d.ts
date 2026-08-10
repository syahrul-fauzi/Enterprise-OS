import type { CapabilityCommand } from "@repo/core-kernel";
import { type RegisterUserInput } from "../contracts/identity.contracts";
type RegisterUserCommand = CapabilityCommand<RegisterUserInput, {
    readonly userId: string;
    readonly actorId: string;
    readonly actorLabel: string;
    readonly email: string;
}>;
export declare const createUserCommand: RegisterUserCommand;
export { createUserCommand as registerUserCommand };
//# sourceMappingURL=create-user.command.d.ts.map