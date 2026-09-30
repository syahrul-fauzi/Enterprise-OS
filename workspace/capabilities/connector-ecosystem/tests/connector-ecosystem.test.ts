import assert from "node:assert/strict";
import test from "node:test";
import { connectorEcosystemService, handleWhatsAppWebhookUpdate, syncEOSToWhatsApp } from "../implementation/services/connector-ecosystem.service.js";

test("connector ecosystem lists first connectors", () => {
  const connectors = connectorEcosystemService.listConnectors();
  assert.ok(connectors.length >= 3);
});

test("connector ecosystem exports requirement data", async () => {
  const result = await connectorEcosystemService.sync({ connectorId: "requirements-json-export" });
  assert.equal(result.status, "completed");
  assert.ok(result.exportedCount > 0);
});

test("connector ecosystem syncs evidence data", async () => {
  const result = await connectorEcosystemService.sync({ connectorId: "evidence-registry-sync" });
  assert.equal(result.status, "completed");
  assert.ok(result.exportedCount > 0);
});

// W03 C7 Test: Meta WhatsApp webhook payload → WorkAggregate compliance
test("whatsapp webhook creates valid WorkAggregate", async () => {
  // Meta API v18.0 shaped inbound payload sesuai spesifikasi
  const metaWhatsAppPayload = {
    object: "whatsapp_business_account",
    entry: [{
      id: "123456789",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "6281234567890" },
          contacts: [{ profile: { name: "Test User" }, wa_id: "628987654321" }],
          messages: [{
            from: "628987654321",
            id: "wamid.abc123def456",
            timestamp: "1690000000",
            text: { body: "Test message from WhatsApp" },
            type: "text"
          }]
        },
        field: "messages"
      }]
    }]
  };

  // Mock sharedWorkRepository untuk capture created work
  let savedWork: any = null;
  (global as any).sharedWorkRepository = {
    save: async (work: any) => {
      savedWork = work;
      return { ...work, workId: work.id };
    },
    byId: async () => savedWork
  };

  // Eksekusi handler sesuai W03 flow dengan mock repository
          let result: any;
          try {
            result = await handleWhatsAppWebhookUpdate(metaWhatsAppPayload);
            console.log("[C7 Test] Execution success, result:", JSON.stringify(result, null, 2));
          } catch (error) {
            console.error("[C7 Test] Execution failed with error:", error);
            throw error;
          }
  
  // Restore original mock
  delete (global as any).sharedWorkRepository;

  // Verifikasi basic execution success
  assert.equal(result?.success, true, "Handler did not return success: true");
  assert.ok(result?.workId, "Handler did not return a workId");

  // Verifikasi semua field mandatory WorkAggregate terpenuhi
  assert.ok(savedWork.id);
  assert.ok(savedWork.compositionId);
  assert.ok(savedWork.tenantId);
  assert.ok(savedWork.workspaceId);
  assert.ok(savedWork.actorId);
  assert.ok(savedWork.sessionId);
  assert.ok(savedWork.title);
  assert.ok(savedWork.status);
  assert.ok(savedWork.mode); // Verifikasi field 'mode' (bukan workMode) sesuai kontrak
  assert.ok(["core", "domain", "federation", "oneshot"].includes(savedWork.mode)); // Verifikasi WorkModeEnum compliance
  assert.ok(savedWork.createdAt instanceof Date);
  assert.ok(savedWork.updatedAt instanceof Date);
  assert.ok(savedWork.externalId?.includes("_")); // Verifikasi W03 externalId format {phone}_{message_id}
  assert.equal(savedWork.platformSource, "whatsapp");
  
  console.log("[C7 Test] PASSED: Meta payload → handleWhatsAppWebhookUpdate → WorkAggregate contract compliance verified");
});

// W03 C8 Test: EOS Work → syncEOSToWhatsApp → communication.send → WhatsAppAdapter
test("whatsapp outbound sync uses existing communication capability", async () => {
    // Pertama buat test WorkAggregate yang valid - import dari work-core capability (path absolut sesuai codebase pattern)
    const { getWorkRepositoryPostgres } = await import("../../work-core/implementation/repository/work-postgres.repository.js");
    // Import langsung constructor TenantId dari @repo/capabilities-identity (karena work.contracts.ts hanya export TYPE, bukan value)
    // Gunakan type assertion yang aman untuk menghindari branded type collision
    const workRepository = getWorkRepositoryPostgres();
    const testWork = await workRepository.save({
    id: "test-whatsapp-outbound-001" as any,
    compositionId: "whatsapp-default-composition" as any,
    tenantId: "default-tenant" as any, // Gunakan any untuk bypass type collision sementara, sambil tetap menjaga logic bisnis
    workspaceId: "customer-support-workspace",
    actorId: "JOURNEY_ENGINE_ID" as any,
    sessionId: "test-session-001" as any,
    title: "Test outbound WhatsApp message",
    description: "Test message to verify C8 execution path",
    status: "active",
    mode: "domain",
    externalId: "628987654321_wamid.test123", // Format {phone}_{wamid} sesuai PRJ-002/W03 requirement
    platformSource: "whatsapp",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Spy pada invokeCapability untuk verifikasi communication.send dipanggil
  const originalInvoke = (global as any).invokeCapability;
  let invokedCapability = "";
  let invokedCommand = "";
  let invokedInput: any = null;
  
  (global as any).invokeCapability = async (cap: string, cmd: string, input: any) => {
    invokedCapability = cap;
    invokedCommand = cmd;
    invokedInput = input;
    return { success: true, messageId: "mock-wamid-12345" };
  };

  // Mock sharedWorkRepository untuk test
  (global as any).sharedWorkRepository = {
    list: async () => [testWork]
  };

  try {
    // Debug: log testWork untuk memastikan semua field terisi benar
    console.log("[C8 Test] testWork yang dikirim:", JSON.stringify(testWork, null, 2));
    const works = await (global as any).sharedWorkRepository.list();
    console.log("[C8 Test] sharedWorkRepository.list() mengembalikan:", JSON.stringify(works, null, 2));
    
    // Eksekusi syncEOSToWhatsApp sesuai W03 flow
    const result = await syncEOSToWhatsApp(testWork.id, "completed");
    
    // Restore original functions only if they existed
    if (originalInvoke !== undefined) {
      (global as any).invokeCapability = originalInvoke;
    } else {
      delete (global as any).invokeCapability;
    }
    delete (global as any).sharedWorkRepository;

    // Verifikasi basic execution success
    assert.equal(result.success, true);
    
    // Verifikasi communication capability dipanggil (bukan direct HTTP call)
    assert.equal(invokedCapability, "communication");
    assert.equal(invokedCommand, "send");
    
    // Verifikasi input format sesuai communication.contracts
    assert.equal(invokedInput.work_id, testWork.id);
    assert.equal(invokedInput.tenant_id, "default-tenant");
    assert.equal(invokedInput.adapter_type, "whatsapp");
    assert.ok(invokedInput.recipient_ids.includes("628987654321")); // Correctly extracted phone number from externalId
    assert.ok(invokedInput.content.includes("completed"));
    
    console.log("[C8 Test] PASSED: syncEOSToWhatsApp → communication.send → WhatsAppAdapter path verified");
  } catch (err: any) {
    console.error("[C8 Test] FAILED with error:", err.message);
    console.error("[C8 Test] Error stack:", err.stack);
    // Cleanup globals
    if (originalInvoke !== undefined) {
      (global as any).invokeCapability = originalInvoke;
    } else {
      delete (global as any).invokeCapability;
    }
    delete (global as any).sharedWorkRepository;
    throw err;
  }
});