import type { CapabilityCommand } from "@repo/core-kernel";
import { type CreateSessionInput, type LoginInput } from "../contracts/identity.contracts";
export type CreateSessionOutput = {
    readonly sessionId: string;
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly productId: string;
    readonly actorLabel: string;
    readonly issuedAt: string;
    readonly expiresAt: string;
};
export type CreateSessionCommand = CapabilityCommand<CreateSessionInput, CreateSessionOutput>;
export declare const createSessionCommand: CreateSessionCommand;
type AuthenticateUserOutput = {
    readonly authenticated: boolean;
    readonly userId: string | undefined;
    readonly actorId: string | undefined;
    readonly actorLabel: string | undefined;
    readonly tenantId: string | undefined;
    readonly workspaceId: string | undefined;
    readonly productId: string | undefined;
    readonly role: string | undefined;
    readonly session: CreateSessionOutput | undefined;
};
type AuthenticateUserCommand = CapabilityCommand<LoginInput, AuthenticateUserOutput>;
export declare const loginUserCommand: AuthenticateUserCommand;
export { loginUserCommand as authenticateUserCommand };
//# sourceMappingURL=login-user.command.d.ts.map