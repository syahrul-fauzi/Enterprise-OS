// @ts-nocheck
// W-005: Telegram Channel Adapter - MIGRATED TO CANONICAL PACKAGE INSTALLER LIFECYCLE
// Now uses shared CanonicalPackageInstallationLifecycle from package-installer.service.ts
// Eliminates 100% duplicate lifecycle code, maintains all EOS principles compliance
// Reuses 100% of canonical 7-step lifecycle implementation from W-010-10.2

import { setTelegramConfigForTenant, getTelegramConfigForTenant } from "../../services/telegram.config.js";
// Import canonical identity factories and shared lifecycle from single source of truth
import { createTenantId, createActorId, BasePackageManifest } from "@repo/contracts-core";
import { 
  CanonicalPackageInstallationLifecycle, 
  createPackageInstallationLifecycle 
} from "../../services/package-installer.service.js";

// Telegram-specific channel manifest (complies with BasePackageManifest schema from @repo/contracts-core)
const telegramChannelManifest: BasePackageManifest = {
  id: "channel-telegram",
  version: "1.0.0",
  kind: "channel-pack",
  description: "Telegram channel adapter for EOS",
  requires: ["evidence-registry", "identity-service"],
  provides: ["channel.telegram.receive", "channel.telegram.send"],
  owner: "eos-core-team",
  manifest_version: "1.0.0"
};

// Telegram-specific identity validator (reused from original adapter, passed to canonical lifecycle's bindActor)
async function validateTelegramBotIdentity(
  externalBotUsername: string, 
  tenantId: string
): Promise<{ valid: boolean; details?: any }> {
  // NEVER trust channel-provided IDs - ALWAYS validate external identity first (complies with user's rule)
  const config = await getTelegramConfigForTenant(tenantId);
  if (!config) {
    return { valid: false, details: "Telegram config not found for tenant" };
  }
  
  const botInfoResponse = await fetch(`${config.apiUrl}${config.botToken}/getMe`);
  if (!botInfoResponse.ok) {
    return { valid: false, details: "Failed to call Telegram API to verify bot identity" };
  }
  
  const botInfo = await botInfoResponse.json();
  if (!botInfo.ok || botInfo.result.username !== externalBotUsername) {
    return { 
      valid: false, 
      details: { 
        expectedUsername: externalBotUsername, 
        receivedUsername: botInfo.result?.username 
      } 
    };
  }

  return { valid: true, details: { botId: botInfo.result.id, username: botInfo.result.username } };
}

// Main installation function for CLI usage (preserves 1-command installation requirement)
export async function installTelegramChannel(
  tenantId: string,
  initiatorActorId: string,
  initiatorSessionId: string,
  options: {
    botToken: string;
    webhookSecret: string;
    botUsername: string;
    permissions: string[];
    packageVersion?: string;
  }
): Promise<{ success: boolean; workId: string; state: any }> {
  // Create canonical lifecycle instance (reuses all shared 7-step implementation)
  const lifecycle = createPackageInstallationLifecycle(tenantId, initiatorActorId, initiatorSessionId);
  
  // Set package-specific manifest and allowed permissions (adapter-specific configuration)
  lifecycle.setPackageManifest(telegramChannelManifest);
  lifecycle.setAllowedPermissions([
    "channel.telegram.receive",
    "channel.telegram.send",
    "capabilities:execute"
  ]);
  
  // Execute full 7-step lifecycle automatically (one-command installation preserved)
  await lifecycle.discover(options.packageVersion || "1.0.0");
  const verifyResult = await lifecycle.verify();
  
  if (!verifyResult.success) {
    throw new Error(`Telegram channel verification failed: ${verifyResult.validationErrors.join(", ")}`);
  }
  
  await lifecycle.install();
  
  // Extract external bot ID from token for identity binding
  const externalBotId = options.botToken.split(':')[0];
  await lifecycle.configure({
    botToken: options.botToken,
    webhookSecret: options.webhookSecret,
    externalEntityId: externalBotId
  });

  // Bind actor with adapter-specific identity validator (never trust channel-provided IDs)
  const bindResult = await lifecycle.bindActor(
    options.botUsername, 
    initiatorActorId,
    // Pass Telegram-specific validation function to canonical lifecycle
    (externalId) => validateTelegramBotIdentity(externalId, tenantId)
  );
  
  if (!bindResult.success) {
    throw new Error("Telegram bot identity validation failed during actor binding");
  }

  await lifecycle.authorize(options.permissions);
  const finalState = await lifecycle.verifyAndEnable();

  console.log(`[W-005 Telegram Lifecycle] ✅ CHANNEL SUCCESSFULLY ENABLED! Work ID: ${finalState.state.workId}`);
  return { 
    success: true, 
    workId: finalState.state.workId, 
    state: finalState.state 
  };
}

// Get configuration accessor for other Telegram services
export { getTelegramConfigForTenant, setTelegramConfigForTenant } from "../../services/telegram.config.js";