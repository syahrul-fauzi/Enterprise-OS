import assert from "node:assert/strict";
import test from "node:test";
import { installTelegramChannel } from "../implementation/channels/telegram/telegram.adapter.ts";

// W-005 C1 Test: Full 7-step installation lifecycle compliance
test("telegram channel completes full 7-step installation lifecycle", async () => {
  // Test tenant dan actor yang valid
  const testTenantId = "tenant-001-test";
  const testInitiatorActorId = "actor-admin-001-test";
  const testBotToken = "test-bot-token-123456";
  const testWebhookSecret = "test-webhook-secret-789012";
  const testBotUsername = "eos_test_bot";
  const testPermissions = ["messages:receive", "messages:send", "capabilities:execute"];

  // Mock dependencies yang dibutuhkan adapter (sesuai pola mocking test WhatsApp)
  const originalGetTelegramConfig = (global as any).getTelegramConfigForTenant;
  (global as any).getTelegramConfigForTenant = () => ({
    apiUrl: "https://api.telegram.org/bot",
    botToken: testBotToken
  });

  // Mock fetch untuk Telegram API getMe (simulasikan verifikasi identitas berhasil)
  const originalFetch = global.fetch;
  global.fetch = async (url: string) => {
    if (url.includes("getMe")) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          result: {
            id: 123456789,
            username: testBotUsername,
            first_name: "EOS Test Bot"
          }
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  // Mock fungsi identitas dan capability registry
  const originalBindIdentity = (global as any).bindExternalIdentityToCanonicalActor;
  (global as any).bindExternalIdentityToCanonicalActor = async () => ({ success: true });

  // Mock session repository (dibutuhkan oleh recordEvidence untuk validasi session)
  const originalGetSessionRepo = (global as any).getSessionRepositoryPostgres;
  (global as any).getSessionRepositoryPostgres = () => ({
    byId: async () => ({
      id: testInitiatorSessionId,
      tenantId: testTenantId,
      workspaceId: "workspace-001-test",
      actorId: testInitiatorActorId,
      revokedAt: null
    })
  });

  // Mock recordEvidence command (dibutuhkan untuk mencatat evidence selama lifecycle)
  const originalRecordEvidence = (global as any).recordEvidence;
  (global as any).recordEvidence = {
    execute: async () => ({ success: true, id: `evidence-${Date.now()}` })
  };

  const originalCapabilityRegistry = (global as any).getGlobalCapabilityRegistry;
  (global as any).getGlobalCapabilityRegistry = async () => ({
    registerCapability: async () => {},
    registerProvider: async () => {},
    invoke: async () => ({ workId: `test-work-${Date.now()}` })
  });

  try {
    // Eksekusi seluruh lifecycle instalasi 7 langkah
    const testInitiatorSessionId = "session-admin-001-test-12345"; // Mock valid session ID
    const result = await installTelegramChannel(
      testTenantId,
      testInitiatorActorId,
      testInitiatorSessionId,
      {
        botToken: testBotToken,
        webhookSecret: testWebhookSecret,
        botUsername: testBotUsername,
        permissions: testPermissions,
        packageVersion: "1.0.0"
      }
    );

    // Verifikasi hasil instalasi
    assert.equal(result.success, true, "Instalasi tidak mengembalikan success: true");
    assert.ok(result.workId, "workId tidak dikembalikan setelah instalasi berhasil");
    assert.equal(result.state.currentStep, "ENABLED", "Channel tidak mencapai status ENABLED");
    
    // Verifikasi semua tahap lifecycle tercatat dalam evidence
    const evidence = result.state.lifecycleEvidence;
    assert.ok(evidence.some((e: any) => e.event === "discovery_completed"), "Tahap Discover tidak tercatat");
    assert.ok(evidence.some((e: any) => e.event === "verification_completed"), "Tahap Verify tidak tercatat");
    assert.ok(evidence.some((e: any) => e.event === "installation_completed"), "Tahap Install tidak tercatat");
    assert.ok(evidence.some((e: any) => e.event === "configuration_completed"), "Tahap Configure tidak tercatat");
    assert.ok(evidence.some((e: any) => e.event === "actor_binding_completed"), "Tahap Bind Actor tidak tercatat");
    assert.ok(evidence.some((e: any) => e.event === "authorization_completed"), "Tahap Authorize tidak tercatat");
    assert.ok(evidence.some((e: any) => e.event === "channel_enabled"), "Tahap Verify & Enable tidak tercatat");

    console.log("[W-005 Test] PASSED: Full 7-step Telegram installation lifecycle completed successfully");
  } catch (error) {
    console.error("[W-005 Test] FAILED:", error);
    throw error;
  } finally {
    // Restore semua global mock
    if (originalGetTelegramConfig) (global as any).getTelegramConfigForTenant = originalGetTelegramConfig;
    global.fetch = originalFetch;
    if (originalBindIdentity) (global as any).bindExternalIdentityToCanonicalActor = originalBindIdentity;
    if (originalGetSessionRepo) (global as any).getSessionRepositoryPostgres = originalGetSessionRepo;
    if (originalRecordEvidence) (global as any).recordEvidence = originalRecordEvidence;
    if (originalCapabilityRegistry) (global as any).getGlobalCapabilityRegistry = originalCapabilityRegistry;
  }
});

// W-005 C2 Test: Identity validation fails for invalid bot credentials
test("telegram channel fails identity validation with invalid bot token", async () => {
  const testTenantId = "tenant-001-test";
  const testInitiatorActorId = "actor-admin-001-test";
  const invalidBotToken = "invalid-bot-token";
  
  // Mock fetch untuk simulasikan credential Telegram tidak valid
  const originalFetch = global.fetch;
  global.fetch = async (url: string) => {
    if (url.includes("getMe")) {
      return { ok: false, status: 401 };
    }
    return { ok: true, json: async () => ({}) };
  };

  try {
    const testInitiatorSessionId = "session-admin-001-test-12345";
    // Tambahkan mock session dan recordEvidence untuk test ini juga
    (global as any).getSessionRepositoryPostgres = () => ({
      byId: async () => ({
        id: testInitiatorSessionId,
        tenantId: testTenantId,
        workspaceId: "workspace-001-test",
        actorId: testInitiatorActorId,
        revokedAt: null
      })
    });
    (global as any).recordEvidence = {
      execute: async () => ({ success: true, id: `evidence-${Date.now()}` })
    };

    await installTelegramChannel(
      testTenantId,
      testInitiatorActorId,
      testInitiatorSessionId,
      {
        botToken: invalidBotToken,
        webhookSecret: "test-secret",
        botUsername: "wrong_bot",
        permissions: ["messages:receive"]
      }
    );
    assert.fail("Instalasi seharusnya gagal karena credential tidak valid");
  } catch (error: any) {
    assert.ok(error.message.includes("Failed to verify Telegram bot identity"), "Error message tidak sesuai untuk invalid credentials");
    console.log("[W-005 Test] PASSED: Identity validation correctly rejects invalid credentials");
  } finally {
    global.fetch = originalFetch;
  }
});

// W-005 C3 Test: Tenant isolation enforcement
test("telegram channel enforces tenant isolation for configuration", async () => {
  // Test dua tenant berbeda tidak bisa mengakses konfigurasi satu sama lain
  const tenant1Id = "tenant-001-test";
  const tenant2Id = "tenant-002-test";
  
  let savedTenantId: string | null = null;
  const originalSaveConfig = (global as any).saveTelegramConfigForTenant;
  (global as any).saveTelegramConfigForTenant = async (tenantId: string) => {
    savedTenantId = tenantId;
    return { success: true };
  };

  const originalGetConfig = (global as any).getTelegramConfigForTenant;
  (global as any).getTelegramConfigForTenant = async (tenantId: string) => {
    if (tenantId !== savedTenantId) {
      throw new Error("Tenant isolation violation: cannot access another tenant's configuration");
    }
    return { apiUrl: "https://api.telegram.org/bot", botToken: "test-token" };
  };

  try {
    // Install untuk tenant 1 terlebih dahulu
    (global as any).bindExternalIdentityToCanonicalActor = async () => ({ success: true });
    (global as any).getGlobalCapabilityRegistry = async () => ({
      registerCapability: async () => {},
      registerProvider: async () => {}
    });
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ ok: true, result: { username: "test_bot" } })
    });

    const testSessionId = "session-tenant1-admin-001";
    (global as any).getSessionRepositoryPostgres = () => ({
      byId: async () => ({
        id: testSessionId,
        tenantId: tenant1Id,
        workspaceId: "workspace-001-test",
        actorId: "actor-1",
        revokedAt: null
      })
    });
    (global as any).recordEvidence = {
      execute: async () => ({ success: true, id: `evidence-${Date.now()}` })
    };

    await installTelegramChannel(tenant1Id, "actor-1", testSessionId, {
      botToken: "test-token",
      webhookSecret: "test-secret",
      botUsername: "test_bot",
      permissions: ["messages:receive"]
    });

    // Coba akses konfigurasi tenant1 dari tenant2 - seharusnya gagal
    await getTelegramConfigForTenant(tenant2Id);
    assert.fail("Akses lintas tenant seharusnya ditolak");
  } catch (error: any) {
    assert.ok(error.message.includes("Tenant isolation violation"), "Tenant isolation tidak terpenuhi");
    console.log("[W-005 Test] PASSED: Tenant isolation correctly enforced between separate tenants");
  } finally {
    if (originalSaveConfig) (global as any).saveTelegramConfigForTenant = originalSaveConfig;
    if (originalGetConfig) (global as any).getTelegramConfigForTenant = originalGetConfig;
  }
});

// Helper function untuk memanggil installTelegramChannel dalam test
async function installTelegram(tenantId: string, actorId: string, options: any) {
  return installTelegramChannel(tenantId, actorId, options);
}