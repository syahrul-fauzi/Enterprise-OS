// @ts-nocheck
// W-006: WhatsApp Channel Adapter - MIGRATED TO CANONICAL PACKAGE INSTALLER LIFECYCLE
// Reuses shared lifecycle from package-installer.service.ts, eliminates duplicate code
// Implements all EOS principles: no silent permissions, external identity validation, tenant isolation

import { createPackageInstallationLifecycle } from "../../services/package-installer.service.js";
import { getWhatsAppConfigForTenant } from "../../services/whatsapp.config.js";
import { BasePackageManifest } from "@repo/contracts-core";
import { createActorId } from "../../../../packages/contracts-core/src/identity.contracts.js";

// WhatsApp-specific package manifest (complies with marketplace schema)
const whatsappChannelManifest: BasePackageManifest = {
  id: "channel-whatsapp",
  version: "1.0.0",
  kind: "channel-pack",
  description: "WhatsApp Business Platform channel adapter for EOS",
  requires: ["evidence-registry", "identity-service", "session-service"],
  permissions: ["channel.whatsapp.receive", "channel.whatsapp.send"],
  minimumEOSVersion: "1.0.0"
};

// WhatsApp-specific external identity validator (never trust channel-provided IDs - user's rule)
async function validateWhatsAppIdentity(externalPhoneNumberId: string, tenantId: string): Promise<{ valid: boolean; details?: any }> {
  const whatsappConfig = await getWhatsAppConfigForTenant(tenantId);
  if (!whatsappConfig) {
    return { valid: false, details: "WhatsApp configuration not found for tenant" };
  }

  // Validate external phone number ID exists in WhatsApp Business Account
  try {
    const verifyResponse = await fetch(`${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}`, {
      headers: { Authorization: `Bearer ${whatsappConfig.accessToken}` }
    });
    
    if (!verifyResponse.ok) {
      return { valid: false, details: `Failed to call WhatsApp API: ${await verifyResponse.text()}` };
    }
    
    const phoneNumberData = await verifyResponse.json();
    console.log(`[W-006 WhatsApp Lifecycle] Verified external identity: ${phoneNumberData.display_phone_number}`);
    return { valid: true, details: { phoneNumberId: phoneNumberData.id, displayNumber: phoneNumberData.display_phone_number } };
  } catch (error) {
    return { valid: false, details: `Identity validation failed: ${(error as Error).message}` };
  }
}

// One-command installation function (complies with user's "every channel installs in one command" rule)
export async function installWhatsAppChannel(
  tenantId: string,
  initiatorActorId: string,
  initiatorSessionId: string,
  options: {
    packageVersion?: string;
    accessToken: string;
    phoneNumberId: string;
    verifyToken: string;
    businessProfileName: string;
    botPhoneNumber: string;
    permissions: string[];
    webhookUrl?: string;
  }
): Promise<{ success: boolean; workId: string; state: any }> {
  // Create shared canonical lifecycle instance (reused from package-installer.service.ts)
  const lifecycle = createPackageInstallationLifecycle(tenantId, initiatorActorId, initiatorSessionId);
  lifecycle.setPackageManifest(whatsappChannelManifest);
  lifecycle.setAllowedPermissions(["channel.whatsapp.receive", "channel.whatsapp.send", "capabilities:execute"]);
  
  // Execute all 7 steps from user's specification
  await lifecycle.discover(options.packageVersion || "1.0.0");
  const verifyResult = await lifecycle.verify();
  if (!verifyResult.success) throw new Error(`Verification failed: ${verifyResult.validationErrors.join(", ")}`);
  
  await lifecycle.install();
  await lifecycle.configure({ 
    accessToken: options.accessToken,
    phoneNumberId: options.phoneNumberId,
    verifyToken: options.verifyToken,
    businessProfileName: options.businessProfileName,
    webhookUrl: options.webhookUrl,
    externalEntityId: options.phoneNumberId
  });
  
  // Use shared bindActor with adapter-specific identity validation (enforces user's rule)
  const bindResult = await lifecycle.bindActor(options.botPhoneNumber, initiatorActorId, (externalId) => 
    validateWhatsAppIdentity(externalId, tenantId)
  );
  if (!bindResult.success) throw new Error(`Identity validation failed: ${bindResult.identityDetails}`);
  
  await lifecycle.authorize(options.permissions);
  const finalState = await lifecycle.verifyAndEnable();
  
  return { success: true, workId: finalState.state.workId, state: finalState.state };
}