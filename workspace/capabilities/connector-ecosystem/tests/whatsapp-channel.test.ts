// @ts-nocheck
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { installWhatsAppChannel } from "../implementation/channels/whatsapp/whatsapp.adapter.ts";

// Test constants (complies with EOS tenant isolation requirements)
const testTenantId = "tenant-test-001";
const testInitiatorActorId = "actor-test-001";
const testInitiatorSessionId = "session-test-001";

describe("W-006 WhatsApp Channel Installation Lifecycle (7-step compliance)", () => {
  // Save original implementations to restore after tests
  const originalGetSessionRepo = (global as any).getSessionRepositoryPostgres;
  const originalRecordEvidence = (global as any).recordEvidence;

  beforeEach(() => {
    // Mock production session repository (complies with RecordEvidenceWithContextSchema requirements)
    (global as any).getSessionRepositoryPostgres = () => ({
      byId: async () => ({
        id: testInitiatorSessionId,
        tenantId: testTenantId,
        workspaceId: "workspace-001-test",
        actorId: testInitiatorActorId,
        revokedAt: null
      })
    });

    // Mock recordEvidence.execute() to avoid real database calls in tests
    (global as any).recordEvidence = {
      execute: async () => ({ success: true, id: `evidence-${Date.now()}` })
    };
  });

  afterEach(() => {
    // Restore original implementations to prevent test pollution
    (global as any).getSessionRepositoryPostgres = originalGetSessionRepo;
    (global as any).recordEvidence = originalRecordEvidence;
  });

  it("should complete full 7-step lifecycle with all EOS principles enforced", async () => {
    // Execute 1-command installation (complies with "Every channel installs in one command" mantra)
    const result = await installWhatsAppChannel(testTenantId, testInitiatorActorId, testInitiatorSessionId, {
      accessToken: "test-access-token-123",
      phoneNumberId: "1234567890",
      verifyToken: "test-verify-token-xyz",
      businessProfileName: "EOS Test Business",
      permissions: ["channel.whatsapp.receive", "channel.whatsapp.send"],
      packageVersion: "1.0.0"
    });

    // Verify installation succeeded
    assert.ok(result.success, "Installation should complete successfully");
    assert.ok(result.workId.startsWith("whatsapp-install-"), "Should generate canonical Work ID");
    
    // Verify final state matches ENABLED step (7th step completed)
    assert.strictEqual(result.state.currentStep, "ENABLED", "Should complete all 7 steps");
    assert.ok(result.state.completedAt, "Should have completion timestamp");
    assert.ok(result.state.evidenceIds.length > 0, "Should record evidence for all lifecycle steps");
    
    // Verify identity binding was performed (canonical actor created)
    assert.ok(result.state.canonicalActorId.startsWith("whatsapp-bot-"), "Should create canonical actor ID");
    assert.strictEqual(result.state.externalPhoneNumberId, "1234567890", "Should store external phone number ID");
    
    console.log(`[W-006 Test] ✅ WhatsApp channel installation lifecycle PASSED. Work ID: ${result.workId}`);
  });

  it("should throw error when requesting disallowed permissions (enforces no silent permissions)", async () => {
    try {
      await installWhatsAppChannel(testTenantId, testInitiatorActorId, testInitiatorSessionId, {
        accessToken: "test-access-token-123",
        phoneNumberId: "1234567890",
        verifyToken: "test-verify-token-xyz",
        businessProfileName: "EOS Test Business",
        permissions: ["channel.whatsapp.receive", "full:admin:access"], // Disallowed permission
        packageVersion: "1.0.0"
      });
      assert.fail("Should throw error when requesting disallowed permissions");
    } catch (error: any) {
      assert.strictEqual(error.message, "Attempted to request disallowed permissions", "Should block disallowed permissions");
      console.log("[W-006 Test] ✅ Permission restriction PASSED - disallowed permissions blocked");
    }
  });

  it("should throw error when configuring with invalid credentials (enforces input validation)", async () => {
    try {
      await installWhatsAppChannel(testTenantId, testInitiatorActorId, testInitiatorSessionId, {
        accessToken: "invalid-token",
        phoneNumberId: "not-a-number", // Invalid phone number format
        verifyToken: "test-verify-token-xyz",
        businessProfileName: "EOS Test Business",
        permissions: ["channel.whatsapp.receive", "channel.whatsapp.send"],
        packageVersion: "1.0.0"
      });
      assert.fail("Should throw error when configuring with invalid phone number ID");
    } catch (error: any) {
      assert.strictEqual(error.message, "Invalid WhatsApp phone number ID format", "Should validate phone number format");
      console.log("[W-006 Test] ✅ Credential validation PASSED - invalid format blocked");
    }
  });
});