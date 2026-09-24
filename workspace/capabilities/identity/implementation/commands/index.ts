import type { CapabilityCommand } from "../../../../packages/core/kernel/src/index.ts";
// For NodeNext module resolution: use .ts extensions in source files (tsc will rewrite to .js in dist)
import { loginFlowCommand } from "./login-flow.command.ts";
import { oidcLoginFlowCommand } from "./oidc-login-flow.command.ts";
import { signupAndSessionCommand, SignupAndSessionInputSchema } from "./signup-and-session.command.ts";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.loginFlow": loginFlowCommand,
  "identity.oidcLoginFlow": oidcLoginFlowCommand,
  "identity.signupAndCreateSession": signupAndSessionCommand,
} as const;

export * from "./login-flow.command.ts";
export * from "./oidc-login-flow.command.ts";
export * from "./signup-and-session.command.ts";