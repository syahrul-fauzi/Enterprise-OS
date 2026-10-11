import type { CapabilityCommand } from "../../../../packages/core/kernel/src/index.js";
// For NodeNext module resolution: use .js extensions in source files
import { loginFlowCommand } from "./login-flow.command.js";
import { oidcLoginFlowCommand } from "./oidc-login-flow.command.js";
import { signupAndSessionCommand, SignupAndSessionInputSchema } from "./signup-and-session.command.js";
import { ssoSignupFlowCommand, SsoSignupFlowInputSchema } from "./sso-signup-flow.command.js";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.loginFlow": loginFlowCommand,
  "identity.oidcLoginFlow": oidcLoginFlowCommand,
  "identity.signupAndCreateSession": signupAndSessionCommand,
  "identity.ssoSignupFlow": ssoSignupFlowCommand,
} as const;

export { loginFlowCommand, LoginFlowInputSchema } from "./login-flow.command.js";
export { oidcLoginFlowCommand } from "./oidc-login-flow.command.js";
export { signupAndSessionCommand, SignupAndSessionInputSchema } from "./signup-and-session.command.js";
export { ssoSignupFlowCommand, SsoSignupFlowInputSchema } from "./sso-signup-flow.command.js";