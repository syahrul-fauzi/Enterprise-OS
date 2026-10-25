import type { CapabilityCommand } from "@repo/core-kernel";
// For NodeNext module resolution: use .js extensions in source files
import { loginFlowCommand } from "./login-flow.command.js";
import { oidcLoginFlowCommand } from "./oidc-login-flow.command.js";
import { signupAndSessionCommand, SignupAndSessionInputSchema } from "./signup-and-session.command.js";
import { ssoSignupFlowCommand, SsoSignupFlowInputSchema } from "./sso-signup-flow.command.js";
// Kembalikan ke .js untuk NodeNext module resolution ESM (wajib untuk TypeScript compile)
import { getSessionByIdCommand, GetSessionByIdInputSchema } from "./get-session-by-id.command.js";

export const identityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "identity.loginFlow": loginFlowCommand,
  "identity.oidcLoginFlow": oidcLoginFlowCommand,
  "identity.signupAndCreateSession": signupAndSessionCommand,
  "identity.ssoSignupFlow": ssoSignupFlowCommand,
  "identity.getSessionById": getSessionByIdCommand, // WAJIB DIDaftarkan agar masuk ke identityCommands!
} as const;

export { loginFlowCommand, LoginFlowInputSchema } from "./login-flow.command.js";
export { oidcLoginFlowCommand } from "./oidc-login-flow.command.js";
export { signupAndSessionCommand, SignupAndSessionInputSchema } from "./signup-and-session.command.js";
export { ssoSignupFlowCommand, SsoSignupFlowInputSchema } from "./sso-signup-flow.command.js";
export { getSessionByIdCommand, GetSessionByIdInputSchema } from "./get-session-by-id.command.js";

// Lazy import capability registry menggunakan path relatif yang konsisten
// Semua import menggunakan path yang sama untuk memastikan instance capabilityRegistry yang SAMA
async function getCapabilityRegistry() {
  const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  return capabilityRegistry;
}

// Register identity-core commands dengan capability registry (async untuk menghindari module cycle)
export async function registerIdentityCoreCapability() {
  console.log("[Identity-Core] AUDIT-001-005: Identity-Core capability registration dimulai");
  console.log("[Identity-Core] identityCommands keys saat registrasi:", Object.keys(identityCommands));
  console.log("[Identity-Core] getSessionByIdCommand exists:", !!getSessionByIdCommand);
  
  const capabilityRegistry = await getCapabilityRegistry();
  Object.values(identityCommands).forEach((command) => {
    console.log("[Identity-Core] Mendaftarkan command:", command.name);
    capabilityRegistry.register(command);
  });
  
  // Tambahkan await karena listCommandKeys() adalah async di runtime
  const registeredCommands = await capabilityRegistry.listCommandKeys();
  console.log("[Identity-Core] Command yang terdaftar setelah registrasi:", registeredCommands);
  console.log("[Identity-Core] Type of registeredCommands:", typeof registeredCommands, "Is array?", Array.isArray(registeredCommands));
  console.log("[Identity-Core] AUDIT-001-005: Identity-Core capability registered successfully");
}

// Panggil registrasi segera setelah modul diimpor (sesuai pola semua capability lain)
registerIdentityCoreCapability();