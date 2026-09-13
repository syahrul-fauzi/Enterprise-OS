import type { CapabilityCommand } from "../../../../packages/core/kernel/src/index.js";
// REALITY PATH ONLY - Export required commands only, avoid broken imports
import { loginFlowCommand } from "./login-flow.command.js";
import { oidcLoginFlowCommand } from "./oidc-login-flow.command.js";
import { signupAndSessionCommand, SignupAndSessionInputSchema } from "./signup-and-session.command.js";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.loginFlow": loginFlowCommand,
  "identity.oidcLoginFlow": oidcLoginFlowCommand,
  "identity.signupAndCreateSession": signupAndSessionCommand,
} as const;

export * from "./login-flow.command.js";
export * from "./oidc-login-flow.command.js";
export * from "./signup-and-session.command.js";