import type { CapabilityCommand } from "@repo/core-kernel";
// REALITY PATH ONLY - Export required commands only, avoid broken imports
import { loginFlowCommand } from "./login-flow.command";
import { oidcLoginFlowCommand } from "./oidc-login-flow.command";
import { signupAndSessionCommand, SignupAndSessionInputSchema } from "./signup-and-session.command";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.loginFlow": loginFlowCommand,
  "identity.oidcLoginFlow": oidcLoginFlowCommand,
  "identity.signupAndCreateSession": signupAndSessionCommand,
} as const;

export * from "./login-flow.command";
export * from "./oidc-login-flow.command";
export * from "./signup-and-session.command";