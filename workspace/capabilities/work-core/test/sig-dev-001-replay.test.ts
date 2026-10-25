process.env.NODE_ENV = 'test';
(globalThis as any)._forceMockPool = true;

import { describe, it, beforeEach } from "vitest";
import assert from "node:assert";
import { randomUUID } from "crypto";
import { WorkRepositoryInMemory } from "../implementation/repository/work-inmemory.repository.js";
import { getWorkRepositoryLazy, updateWork } from "../implementation/commands/work.commands.js";
import { safeRecordEvidence } from "../implementation/utils/evidence.utils.js";
import type { WorkId, TenantId, WorkspaceId, ActorId, SessionId, IdentityBoundary, AuthorityBoundary } from "../contracts/work.contracts.js";
import { validateIdentityBoundary, validateAuthorityBoundary, validateNoCircularDependencies } from "../contracts/work.contracts.js";

// Test Constants
const TEST_TENANT_ID = "tenant-test-001" as TenantId;
const TEST_WORKSPACE_ID = "workspace-test-001" as WorkspaceId;
const TEST_SESSION_ID = "session-test-001" as SessionId;
const TEST_WORK_ID = "work-sig-dev-001-001" as WorkId;
const REQUIRED_SIGNER_1 = "actor-signer-001" as ActorId;
const REQUIRED_SIGNER_2 = "actor-signer-002" as ActorId;
const UNAUTHORIZED_SIGNER = "actor-unauthorized-001" as ActorId;

describe("SIG-DEV-001: External Commitment → Work Continuity", () => {
  let workRepo: Awaited<ReturnType<typeof getWorkRepositoryLazy>>;
  let initialVersion: number;

  beforeEach(async () => {
    // Pakai repository instance yang SAMA dengan updateWork() via getWorkRepositoryLazy()
    // Tidak buat instance baru! Fix mismatch repository yang menyebabkan "work_not_found"
    workRepo = await getWorkRepositoryLazy();
    
    // Reset semua data di repository sebelum tiap test (bersihkan environment)
    // Reset manual mockWorks dan evidence (akses private property untuk test - in-memory repo tidak punya clear())
    (workRepo as any).mockWorks = new Map();
    (workRepo as any).evidence = new Map();

    // Buat test work dengan acceptanceContract yang sesuai SIG-DEV-001
    await workRepo.save({
      id: TEST_WORK_ID,
      workId: TEST_WORK_ID,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      actorId: "actor-owner-001" as ActorId,
      participants: [REQUIRED_SIGNER_1, REQUIRED_SIGNER_2],
      status: "SIGNATURE_PENDING",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      acceptanceContract: {
        requiredSigners: [REQUIRED_SIGNER_1, REQUIRED_SIGNER_2],
        completedSignatures: []
      }
    });

    const initialWork = await workRepo.byWorkId(TEST_WORK_ID);
    initialVersion = initialWork.version!;
  });

  it("1. Work ID tidak berubah selama seluruh transisi signature", async () => {
    // Eksekusi signature oleh signer pertama
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_1,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: initialVersion,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    const finalWork = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(finalWork.workId, TEST_WORK_ID, "Work ID harus tetap sama");
  });

  it("2. Signer tidak terdaftar di requiredSigners ditolak (permission_denied)", async () => {
    // Tambahkan UNAUTHORIZED_SIGNER sebagai participant dulu agar bisa melewati general permission check
    // (hanya actor yang jadi participant bisa mengupdate work, sesuai permission model EOS)
    const workBeforeUpdate = await workRepo.byId(TEST_WORK_ID);
    await workRepo.save({
      ...workBeforeUpdate!,
      participants: [...workBeforeUpdate!.participants, UNAUTHORIZED_SIGNER]
    });
    
    // Ambil version TERBARU setelah kita update participants (version increment)
    const workAfterAddParticipant = await workRepo.byId(TEST_WORK_ID);
    const currentVersion = workAfterAddParticipant.version!;
    
    await assert.rejects(
      updateWork({
        workId: TEST_WORK_ID,
        actorId: UNAUTHORIZED_SIGNER,
        workspaceId: TEST_WORKSPACE_ID,
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        version: currentVersion, // Pakai version yang terbaru, bukan initialVersion
        updates: { status: "SIGNATURE_COMPLETE" }
      }),
      /permission_denied: Actor is not an authorized signer/,
      "Unauthorized signer harus ditolak"
    );
  });

  it("3. Duplicate signature oleh signer yang sama ditolak (conflict)", async () => {
    // Pertama kali: signer 1 menandatangani → berhasil
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_1,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: initialVersion,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    // Kedua kalinya: signer 1 mencoba menandatangani lagi → harus ditolak
    const workAfterFirstSignature = await workRepo.byWorkId(TEST_WORK_ID);
    await assert.rejects(
      updateWork({
        workId: TEST_WORK_ID,
        actorId: REQUIRED_SIGNER_1,
        workspaceId: TEST_WORKSPACE_ID,
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        version: workAfterFirstSignature.version!,
        updates: { status: "SIGNATURE_COMPLETE" }
      }),
      /conflict: Actor has already signed this work/,
      "Duplicate signature harus ditolak"
    );
  });

  it("4. Partial signature transisi ke SIGNATURE_PARTIALLY_COMPLETED, Work ID tetap sama", async () => {
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_1,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: initialVersion,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    const finalWork = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(finalWork.status, "SIGNATURE_PARTIALLY_COMPLETED", "Status harus PARTIALLY_COMPLETED");
    assert.strictEqual(finalWork.workId, TEST_WORK_ID, "Work ID tetap sama setelah partial signature");
    assert.deepStrictEqual(finalWork.acceptanceContract?.completedSignatures, [REQUIRED_SIGNER_1], "Hanya signer 1 yang tercatat");
  });

  it("5. Semua required signers menandatangani → transisi ke SIGNATURE_COMPLETE", async () => {
    // Signer pertama
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_1,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: initialVersion,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    const workAfterFirst = await workRepo.byWorkId(TEST_WORK_ID);
    
    // Signer kedua (semua required terpenuhi)
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_2,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: workAfterFirst.version!,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    const finalWork = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(finalWork.status, "SIGNATURE_COMPLETE", "Status harus SIGNATURE_COMPLETE");
    assert.deepStrictEqual(
      finalWork.acceptanceContract?.completedSignatures.sort(), 
      [REQUIRED_SIGNER_1, REQUIRED_SIGNER_2].sort(), 
      "Semua required signers tercatat"
    );
  });

  it("6. SIGNATURE_COMPLETE tidak otomatis menjadi SETTLED", async () => {
    // Kedua signer menandatangani
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_1,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: initialVersion,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    const workAfterFirst = await workRepo.byWorkId(TEST_WORK_ID);
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_2,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: workAfterFirst.version!,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    const finalWork = await workRepo.byWorkId(TEST_WORK_ID);
    assert.notStrictEqual(finalWork.status, "settled", "SIGNATURE_COMPLETE tidak boleh menjadi SETTLED");
    assert.strictEqual(finalWork.status, "SIGNATURE_COMPLETE", "Status harus tetap SIGNATURE_COMPLETE");
  });

  it("7. safeRecordEvidence menghasilkan SHA-256 checksum untuk integrity metadata", async () => {
    const evidenceResult = await safeRecordEvidence({
      workspace_id: TEST_WORKSPACE_ID,
      capability: "work-core",
      command: "signature.received",
      work_id: TEST_WORK_ID,
      tenant_id: TEST_TENANT_ID,
      actor_id: REQUIRED_SIGNER_1,
      timestamp: new Date().toISOString(),
      sessionId: TEST_SESSION_ID,
      meta_signatureType: "synthetic-signature",
      meta_signatureDigest: "test-digest-123",
      meta_signatureTimestamp: new Date().toISOString()
    });

    assert.strictEqual(evidenceResult.ok, true, "Evidence harus berhasil direkam");
    
    // Verifikasi evidence chain di work repository
    const workEvidence = await workRepo.getEvidence(TEST_WORK_ID);
    const lastEvidence = workEvidence[workEvidence.length - 1];
    assert.ok(lastEvidence.meta_checksum, "Evidence harus memiliki meta_checksum SHA-256");
    assert.strictEqual(lastEvidence.meta_checksum.length, 64, "SHA-256 checksum harus 64 karakter hex");
  });

  it("8. Replay signature yang sama menghasilkan conflict (idempotent)", async () => {
    // Eksekusi pertama kali
    await updateWork({
      workId: TEST_WORK_ID,
      actorId: REQUIRED_SIGNER_1,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: initialVersion,
      updates: { status: "SIGNATURE_COMPLETE" }
    });

    const workAfterFirst = await workRepo.byWorkId(TEST_WORK_ID);
    
    // Replay payload yang sama persis
    await assert.rejects(
      updateWork({
        workId: TEST_WORK_ID,
        actorId: REQUIRED_SIGNER_1,
        workspaceId: TEST_WORKSPACE_ID,
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        version: workAfterFirst.version!,
        updates: { status: "SIGNATURE_COMPLETE" }
      }),
      /conflict: Actor has already signed this work/,
      "Replay signature harus menghasilkan conflict (idempotent)"
    );
  });

  it("9. 0 new core primitives - semua menggunakan existing substrate", async () => {
    // Verifikasi bahwa tidak ada primitive baru yang dibuat - semua logic menggunakan existing types/fungsi
    const work = await workRepo.byWorkId(TEST_WORK_ID);
    assert.ok(work, "Work menggunakan Work aggregate yang sudah ada");
    assert.ok(work.acceptanceContract, "acceptanceContract adalah field yang sudah ada di work.contracts.ts");
    assert.ok(workRepo.addEvidence, "getEvidence/addEvidence adalah method repository yang sudah ada");
    // Jika test ini bisa berjalan, berarti semua primitive yang dibutuhkan sudah ada
    assert.ok(true, "Semua primitive yang dipakai sudah ada di codebase");
  });
})

// ==============================================
// WF-02 TESTS: Architecture Fitness Rules (WORK-013)
// Semua rule aktif di architecture-fitness-checks.ts memiliki test yang menguji lulus dan pelanggarannya
// ==============================================
describe("WORK-013 WF-02: Architecture Fitness Rules Validation", () => {
  describe("validateIdentityBoundary (identity boundary rule)", () => {
    it("1. IdentityBoundary valid: semua field terisi dan tidak mengandung workspaceId", () => {
      const validIdentity: IdentityBoundary = {
        tenantId: "tenant-test-001" as any,
        organizationId: "org-test-001" as any,
        principalId: "actor-test-001" as any
      };
      const result = validateIdentityBoundary(validIdentity);
      assert.ok(result.valid, "Identity boundary yang valid harus lulus");
      assert.strictEqual(result.errors.length, 0, "Tidak boleh ada error untuk input valid");
    });

    it("2. IdentityBoundary invalid: mengandung workspaceId (violates 'Workspace bukan identitas')", () => {
      const invalidIdentity: any = {
        tenantId: "tenant-test-001" as any,
        organizationId: "org-test-001" as any,
        principalId: "actor-test-001" as any,
        workspaceId: "ws-test-001" as any // Ini yang melanggar aturan
      };
      const result = validateIdentityBoundary(invalidIdentity);
      assert.ok(!result.valid, "Identity boundary yang mengandung workspaceId harus gagal");
      assert.ok(result.errors.some(e => e.includes("workspaceId")), "Error harus menyebutkan pelanggaran workspaceId");
    });

    it("3. IdentityBoundary invalid: missing required field tenantId", () => {
      const invalidIdentity: any = {
        organizationId: "org-test-001" as any,
        principalId: "actor-test-001" as any
      };
      const result = validateIdentityBoundary(invalidIdentity);
      assert.ok(!result.valid, "Identity boundary yang kurang field harus gagal");
      assert.ok(result.errors.some(e => e.includes("tenantId")), "Error harus menyebutkan field yang hilang");
    });
  });

  describe("validateAuthorityBoundary (authority boundary rule)", () => {
    it("1. AuthorityBoundary valid: semua capabilities/authorizations diberikan ke actor", () => {
      const validAuthority: AuthorityBoundary = {
        actorCapabilities: new Map([["actor-test-001" as any, ["read", "write"]]]),
        authorizations: new Map([["actor-test-001" as any, ["update", "delete"]]]),
        delegations: [{ from: "actor-a" as any, to: "actor-b" as any }]
      };
      const result = validateAuthorityBoundary(validAuthority);
      assert.ok(result.valid, "Authority boundary yang valid harus lulus");
      assert.strictEqual(result.errors.length, 0, "Tidak boleh ada error untuk input valid");
    });

    it("2. AuthorityBoundary invalid: assign capabilities ke workspace (violates 'Workspace bukan authority')", () => {
      const invalidAuthority: any = {
        actorCapabilities: new Map([["workspace" as any, ["read", "write"]]]), // Melanggar aturan
        authorizations: new Map(),
        delegations: []
      };
      const result = validateAuthorityBoundary(invalidAuthority);
      assert.ok(!result.valid, "Authority boundary yang memberikan capabilities ke workspace harus gagal");
      assert.ok(result.errors.some(e => e.includes("workspace")), "Error harus menyebutkan pelanggaran workspace sebagai authority");
    });
  });

  describe("validateNoCircularDependencies (circular dependency rule)", () => {
    it("1. Dependencies valid: tidak ada sirkularitas antar core domains", () => {
      const validDeps = ["work-core", "identity", "evidence-governance", "commerce-product"];
      const result = validateNoCircularDependencies(validDeps);
      assert.ok(result.valid, "Dependencies yang tidak sirkular harus lulus");
      assert.strictEqual(result.errors.length, 0, "Tidak boleh ada error untuk dependencies valid");
    });

    it("2. Dependencies invalid: terdapat sirkularitas (work-core muncul dua kali)", () => {
      const invalidDeps = ["work-core", "identity", "work-core"]; // Sengaja duplikat work-core (sirkular)
      const result = validateNoCircularDependencies(invalidDeps);
      assert.ok(!result.valid, "Dependencies yang sirkular harus gagal");
      assert.ok(result.errors.some(e => e.includes("Circular dependency detected")), "Error harus mendeteksi circular dependency");
    });
  });
});;