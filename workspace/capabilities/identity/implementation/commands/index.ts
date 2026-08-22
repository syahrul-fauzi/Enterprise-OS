import type { CapabilityCommand } from "@repo/core-kernel";
// REALITY PATH ONLY - Hanya export loginFlowCommand yang dibutuhkan, sembunyikan import lain yang error
import { loginFlowCommand } from "./login-flow.command";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.loginFlow": loginFlowCommand,
} as const;

export * from "./login-flow.command";