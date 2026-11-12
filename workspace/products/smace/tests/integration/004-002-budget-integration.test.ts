// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert";
import { executeCreativeProductionWorkflow } from "../../runtime/execution-workflow.js";
import { registerBudgetCoreCapability } from "../../../../capabilities/budget-engine/implementation/commands/index.js";
import { SessionRepositoryInMemory } from "../../../../capabilities/identity/implementation/repositories/session.inmemory.js";
import type { CreativeBrief } from "../../contracts/creative-brief.contract.js";
import { SessionId, UserId, ActorId, TenantId, WorkspaceId } from "../../../../packages/contracts-core/src/index.js";

// Aktifkan test environment flag
process.env.NODE_ENV = 'test';
(globalThis as any)._forceMockPool = true;

// Register budget-engine dan inisialisasi mock session sebelum test (node:test tidak mendukung beforeAll di ESM, jadi buat di level file)
await registerBudgetCoreCapability();

// Buat session dengan tipe yang sesuai seperti di session.inmemory.ts
await SessionRepositoryInMemory.create({
  id: SessionId("valid-active-session-001"),
  userId: UserId("user-smace-test"),
  actorId: ActorId("test.actor@smace.ai"),
  tenantId: TenantId("tenant-smace-test"),
  workspaceId: WorkspaceId("workspace-smace-test"),
  productId: "smace",
  actorLabel: "SMACE Test Actor",
  isAgent: false,
  issuedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day from now
  revokedAt: null,
  createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
});

// Debug: cek apakah session berhasil dibuat
const createdSession = await SessionRepositoryInMemory.byId("valid-active-session-001");
console.log("[TEST DEBUG] Session yang dibuat:", JSON.stringify(createdSession, null, 2));
console.log("[TEST DEBUG] isRevoked:", await SessionRepositoryInMemory.isRevoked("valid-active-session-001"));

// Tambahkan session yang sudah direvoke (invalid)
await SessionRepositoryInMemory.create({
  id: SessionId("revoked-inactive-session-999"),
  userId: UserId("user-smace-test"),
  actorId: ActorId("test.actor@smace.ai"),
  tenantId: TenantId("tenant-smace-test"),
  workspaceId: WorkspaceId("workspace-smace-test"),
  productId: "smace",
  actorLabel: "Revoked SMACE Test Actor",
  isAgent: false,
  issuedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
  revokedAt: new Date(Date.now() - 72000000).toISOString(), // Revoked 20 hours ago
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 72000000).toISOString()
});

test("SMACE-ARCH-004-002: executeCreativeProductionWorkflow memanggil budget-engine.deduct dengan benar dengan session valid", async () => {
  // Test brief sesuai spesifikasi SMACE-ARCH-004, gunakan session yang terdaftar di EOS
  const testBrief: CreativeBrief = {
    id: "test-brief-004-002",
    tenantId: "tenant-smace-test",
    workspaceId: "workspace-smace-test",
    sessionId: "valid-active-session-001", // Session mock yang sudah tervalidasi oleh budget-engine
    actorId: "test.actor@smace.ai",
    customerId: "customer-acme-test",
    productType: "fashion-apparel",
    brandGuidelinesUrl: "https://acme-test.com/brand.pdf",
    brandGuidelines: {
      colorPalette: ["#FF0000", "#000000", "#FFFFFF"],
      logoUsage: "Logo harus ditempatkan di pojok kanan atas dengan ukuran 10% dari total canvas",
      typography: "Gunakan font Roboto untuk semua teks pada asset"
    },
    targetMarketplace: "tokopedia",
    numberOfAssets: 5,
    assetCount: 5,
    requiresAdobeFirefly: false,
    createdAt: new Date().toISOString(),
    createdBy: "test.customer@acme.com",
    status: "submitted"
  };

  // Jalankan workflow yang sudah diimplementasikan dengan session valid
  const result = await executeCreativeProductionWorkflow(testBrief, testBrief.actorId, testBrief.sessionId);
  
  // Verifikasi hasil sesuai acceptance criteria SMACE-ARCH-004-002
  assert.ok(result.specification, "Creative specification berhasil dihasilkan");
  assert.ok(result.specification.requirements.variations.length > 0, "Specification memiliki variasi aset");
  assert.equal(typeof result.budgetDeducted, "boolean", "Budget deduction status boolean");
  assert.ok(result.deductionResult, "Deduction result tercatat");
  assert.ok(result.deductionResult.remainingBudget >= 0, "Remaining budget tidak negatif");
  
  console.log(`✅ SMACE-ARCH-004-002: Budget deduction berhasil: ${result.budgetDeducted}`);
  console.log(`✅ Total deducted: IDR ${result.deductionResult.amount}`);
  console.log(`✅ Remaining budget: IDR ${result.deductionResult.remainingBudget}`);
});

test("SMACE-ARCH-004-002: Budget deduction gagal jika session tidak valid", async () => {
  // Brief dengan session yang sudah direvoke (tidak valid untuk budget-engine)
  const invalidSessionBrief: any = {
    id: "test-brief-004-002-invalid-session",
    tenantId: "tenant-smace-test",
    workspaceId: "workspace-smace-test",
    sessionId: "revoked-inactive-session-999", // Session yang sudah tidak aktif
    actorId: "test.actor@smace.ai",
    customerId: "customer-acme-test",
    targetMarketplace: "tokopedia",
    assetCount: 3
  };

  // Pastikan workflow melempar error jika session tidak valid (sesuai keamanan EOS)
  await assert.rejects(async () => {
    await executeCreativeProductionWorkflow(invalidSessionBrief, invalidSessionBrief.actorId, invalidSessionBrief.sessionId);
  }, (err: Error) => {
    assert.ok(err.message.includes("[budget-engine.deduct] Invalid or revoked session"), "Error message mencakup autentikasi violation");
    return true;
  }, "Work terblokir jika session EOS tidak valid atau sudah direvoke");
});

test("SMACE-ARCH-004-002: Budget deduction gagal jika context tidak valid", async () => {
  // Brief tanpa tenantId (invalid context untuk EOS)
  const invalidBrief: any = {
    id: "test-brief-004-002-invalid",
    workspaceId: "workspace-smace-test",
    sessionId: "test-session-invalid",
    actorId: "test.actor@smace.ai",
    targetMarketplace: "tokopedia",
    assetCount: 3
  };

  // Pastikan workflow melempar error jika context tidak valid (governed execution)
  await assert.rejects(async () => {
    await executeCreativeProductionWorkflow(invalidBrief, invalidBrief.actorId, invalidBrief.sessionId);
  }, (err: Error) => {
    assert.ok(err.message.includes("EOS context validation failed: brief test-brief-004-002-invalid missing required tenantId or workspaceId"), "Error message mencakup validasi context yang gagal");
    return true;
  }, "Work terblokir jika context EOS tidak valid");
});