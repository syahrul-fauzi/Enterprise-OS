import type { CapabilityCommand } from "@repo/core-kernel";
type LogoutInput = {
    readonly sessionId?: string;
};
type LogoutOutput = {
    readonly ok: true;
    readonly revokedSessionId?: string;
    readonly revokedAt?: string;
};
type LogoutUserCommand = CapabilityCommand<LogoutInput, LogoutOutput>;
export declare const logoutUserCommand: LogoutUserCommand;
export { logoutUserCommand as revokeSessionCommand };
//# sourceMappingURL=logout-user.command.d.ts.map