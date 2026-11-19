// @ts-nocheck
process.env.NODE_ENV = 'test';
(globalThis as any)._forceMockPool = true;

import { describe, it, beforeEach } from "vitest";
import assert from "node:assert";
import { getWorkRepositoryLazy, getMembershipRepositoryLazy, claimWorkAuthorityCommand, getEvidenceByWorkIdCommand } from "../implementation/commands/work.commands.ts";
// Ambil execute function dari command object (sesuai pola di w2c-pressure-test.test.ts)
const claimWorkAuthority = claimWorkAuthorityCommand.execute;
const getEvidenceByWorkId = getEvidenceByWorkIdCommand.execute;
import type { WorkId, TenantId, WorkspaceId, ActorId, SessionId } from "@repo/contracts-core";

// Gunakan dynamic import untuk getSessionRepositoryLazy sesuai pola di revocation-side-effects.test.ts
let _sessionRepo: any = undefined;
async function getSessionRepositoryLazy() {
  if (!_sessionRepo) {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
    const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    
    if (isTestEnvironment && !hasConnectionString) {
      const { SessionRepositoryInMemory } = await import("../../identity/implementation/repositories/index.ts");
      _sessionRepo = SessionRepositoryInMemory;
      console.log("[test] 🔧 Menggunakan IN-MEMORY session repository untuk TEST");
    } else {
      const { getSessionRepositoryPostgres } = await import("../../identity/implementation/repositories/index.ts");
      _sessionRepo = getSessionRepositoryPostgres();
      console.log("[test] 🐘 Menggunakan POSTGRESQL session repository");
    }
  }
  return _sessionRepo;
}

// Test Constants untuk Multi-Hop Handoff (tenantA→tenantB→tenantC)
const TENANT_A = "tenant-a" as TenantId;
const WORKSPACE_A = "workspace-a" as WorkspaceId;
const USER_A = "user-123" as ActorId; // Pemilik awal di Tenant A

const TENANT_B = "tenant-b" as TenantId;
const WORKSPACE_B = "workspace-b" as WorkspaceId;
const USER_B = "user-456" as ActorId; // Penerima pertama di Tenant B

const TENANT_C = "tenant-c" as TenantId;
const WORKSPACE_C = "workspace-c" as WorkspaceId;
const USER_C = "user-789" as ActorId; // Penerima kedua di Tenant C

const SESSION_USER_A = "session-user-a-tenant-a" as SessionId;
const SESSION_USER_B = "session-user-b-tenant-b" as SessionId;
const SESSION_USER_C = "session-user-c-tenant-c" as SessionId;
const TEST_WORK_ID = "work-sig-next-001-w6-001" as WorkId;

describe("SIG-NEXT-001-W6: Multi-Hop Work Handoff (tenantA→tenantB→tenantC)", () => {
  let workRepo: Awaited<ReturnType<typeof getWorkRepositoryLazy>>;
  let membershipRepo: Awaited<ReturnType<typeof getMembershipRepositoryLazy>>;
  let sessionRepo: any;
  let initialVersion: number;

  beforeEach(async () => {
    // Inisialisasi repository yang sama dengan logic utama (tidak buat instance baru)
    workRepo = await getWorkRepositoryLazy();
    membershipRepo = await getMembershipRepositoryLazy();
    sessionRepo = await getSessionRepositoryLazy();
    
    // Reset global store sebelum setiap test case
    (globalThis as any).__EOS_WORK_CORE_WORK_STORE__ = new Map();
    (globalThis as any).__EOS_WORK_CORE_EVIDENCE_STORE__ = new Map();
    // Reset membership data di in-memory repository
    if ((membershipRepo as any).mockMemberships) {
      (membershipRepo as any).mockMemberships = new Map();
    }
    // Reset session store sebelum tiap test
    if (typeof (sessionRepo as any).reset === 'function') {
      await (sessionRepo as any).reset();
    }
    
    // Setup session yang valid untuk User A di Tenant A
    await sessionRepo.save({
      id: "session-user-a-tenant-a",
      userId: USER_A,
      actorId: USER_A,
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A,
      productId: 'work-core',
      actorLabel: 'User A',
      isAgent: false,
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Setup session yang valid untuk User B di Tenant B
    await sessionRepo.save({
      id: "session-user-b-tenant-b",
      userId: USER_B,
      actorId: USER_B,
      tenantId: TENANT_B,
      workspaceId: WORKSPACE_B,
      productId: 'work-core',
      actorLabel: 'User B',
      isAgent: false,
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Setup session yang valid untuk User C di Tenant C
    await sessionRepo.save({
      id: "session-user-c-tenant-c",
      userId: USER_C,
      actorId: USER_C,
      tenantId: TENANT_C,
      workspaceId: WORKSPACE_C,
      productId: 'work-core',
      actorLabel: 'User C',
      isAgent: false,
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // === SETUP MEMBERSHIPS (sesuai requirement claimWorkAuthority: requester must be a member of source workspace) ===
    // 1. User A adalah member Tenant A/Workspace A (owner)
    await membershipRepo.save({
      id: "mem-tenant-a-user-a",
      userId: USER_A,
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A,
      role: "owner",
      createdAt: new Date()
    });
    // 2. User B adalah member Tenant B/Workspace B (owner)
    await membershipRepo.save({
      id: "mem-tenant-b-user-b",
      userId: USER_B,
      tenantId: TENANT_B,
      workspaceId: WORKSPACE_B,
      role: "owner",
      createdAt: new Date()
    });
    // 3. User C adalah member Tenant C/Workspace C (owner)
    await membershipRepo.save({
      id: "mem-tenant-c-user-c",
      userId: USER_C,
      tenantId: TENANT_C,
      workspaceId: WORKSPACE_C,
      role: "owner",
      createdAt: new Date()
    });
    // 4. User A juga harus menjadi member target workspace Tenant B/Workspace B (untuk cross-tenant transfer)
    await membershipRepo.save({
      id: "mem-tenant-b-user-a",
      userId: USER_A,
      tenantId: TENANT_B,
      workspaceId: WORKSPACE_B,
      role: "editor",
      createdAt: new Date()
    });
    // 5. User B juga harus menjadi member target workspace Tenant C/Workspace C (untuk transfer kedua)
    await membershipRepo.save({
      id: "mem-tenant-c-user-b",
      userId: USER_B,
      tenantId: TENANT_C,
      workspaceId: WORKSPACE_C,
      role: "editor",
      createdAt: new Date()
    });
    
    // Buat test work awal di Tenant A/Workspace A, owner User A
    await workRepo.save({
      id: TEST_WORK_ID,
      workId: TEST_WORK_ID,
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A,
      actorId: USER_A,
      participants: [USER_A],
      status: "in_progress",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const initialWork = await workRepo.byWorkId(TEST_WORK_ID);
    initialVersion = initialWork.version!;
    console.log("[Setup] Test work created, initial version:", initialVersion);
    console.log("[Setup] All memberships setup untuk Tenant A/B/C, User A/B/C");
  });

  it("1. Transfer pertama tenantA→tenantB: atomic version increment bekerja, lokasi tercatat", async () => {
    // Context untuk trusted boundary
    const contextA = {
      actor_id: USER_A,
      tenant_id: TENANT_A,
      context_trace_id: "trace-test-001"
    };
    // Eksekusi transfer pertama dari Tenant A ke Tenant B
    const transferResult1 = await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A, // Source workspace (Tenant A)
      tenantId: TENANT_A, // Source tenant
      newWorkspaceId: WORKSPACE_B, // Target workspace (Tenant B)
      newTenantId: TENANT_B, // Target tenant
      sessionId: SESSION_USER_A,
      actorId: USER_A, // Requester adalah User A (owner di Tenant A)
      expectedVersion: initialVersion // Version awal sebelum transfer
    }, contextA);

    // Verifikasi transfer pertama berhasil dan version increment (dari 1 → 2)
    assert.strictEqual(transferResult1.success, true, "Transfer pertama harus berhasil");
    assert.strictEqual(transferResult1.version, 2, "Version setelah transfer pertama harus 2 (atomic increment)");

    // Verifikasi Work sekarang ada di Tenant B/Workspace B
    const workAfterFirstTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(workAfterFirstTransfer.tenantId, TENANT_B, "Work harus pindah ke Tenant B");
    assert.strictEqual(workAfterFirstTransfer.workspaceId, WORKSPACE_B, "Work harus pindah ke Workspace B");
    assert.strictEqual(workAfterFirstTransfer.actorId, USER_B, "Owner Work sekarang harus User B");
  });

  it("2. Transfer kedua tenantB→tenantC: atomic version increment bekerja, lokasi tercatat", async () => {
    // Lakukan transfer pertama terlebih dahulu
    const contextA = {
      actor_id: USER_A,
      tenant_id: TENANT_A,
      context_trace_id: "trace-test-001"
    };
    const transferResult1 = await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["read", "edit"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: SESSION_USER_A,
      actorId: USER_A,
      expectedVersion: 1
    }, contextA);
    console.log("[Test Case 2] Setelah transfer pertama, version:", transferResult1.version); // Debug version

    // Cek version dari work repo
    const workAfterFirstTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    console.log("[Test Case 2] from workRepo, version:", workAfterFirstTransfer.version);

    // Eksekusi transfer kedua dari Tenant B ke Tenant C (User B sebagai requester)
    const contextB = {
      actor_id: USER_B,
      tenant_id: TENANT_B,
      context_trace_id: "trace-test-001"
    };
    const transferResult2 = await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_C,
      permissions: ["read", "edit"],
      workspaceId: WORKSPACE_B, // Source workspace sekarang Tenant B
      tenantId: TENANT_B, // Source tenant sekarang Tenant B
      newWorkspaceId: WORKSPACE_C, // Target workspace Tenant C
      newTenantId: TENANT_C, // Target tenant Tenant C
      sessionId: SESSION_USER_B,
      actorId: USER_B, // Requester adalah User B (owner sekarang di Tenant B)
      expectedVersion: 2 // Version setelah transfer pertama adalah 2
    }, contextB);

    // Verifikasi transfer kedua berhasil dan version increment (dari 2 → 3)
    assert.strictEqual(transferResult2.success, true, "Transfer kedua harus berhasil");
    assert.strictEqual(transferResult2.version, 3, "Version setelah transfer kedua harus 3 (atomic increment)");

    // Verifikasi Work sekarang ada di Tenant C/Workspace C
    const workAfterSecondTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(workAfterSecondTransfer.tenantId, TENANT_C, "Work harus pindah ke Tenant C");
    assert.strictEqual(workAfterSecondTransfer.workspaceId, WORKSPACE_C, "Work harus pindah ke Workspace C");
    assert.strictEqual(workAfterSecondTransfer.actorId, USER_C, "Owner Work sekarang harus User C");
  });

  it("3. Timeline lokasi menampilkan 3 entry: initial + 2 transfer (tenantA→tenantB→tenantC)", async () => {
    // Lakukan kedua transfer berurutan
    const contextA = {
      actor_id: USER_A,
      tenant_id: TENANT_A,
      context_trace_id: "trace-test-001"
    };
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["read", "edit", "transfer_authority"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: SESSION_USER_A,
      actorId: USER_A,
      expectedVersion: 1
    }, contextA);

    const contextB = {
      actor_id: USER_B,
      tenant_id: TENANT_B,
      context_trace_id: "trace-test-001"
    };
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_C,
      permissions: ["read", "edit"],
      workspaceId: WORKSPACE_B,
      tenantId: TENANT_B,
      newWorkspaceId: WORKSPACE_C,
      newTenantId: TENANT_C,
      sessionId: SESSION_USER_B,
      actorId: USER_B,
      expectedVersion: 2
    }, contextB);

    // Ambil semua evidence dan lokasi history yang direkonstruksi via getEvidenceByWorkId
    const fullEvidence = await getEvidenceByWorkId({
      workId: TEST_WORK_ID,
      sessionId: SESSION_USER_C,
      tenantId: TENANT_C,
      workspaceId: WORKSPACE_C,
      actorId: USER_C
    });
    
    // Cari entry location.history.reconstructed yang berisi timeline
    const locationHistoryEntry = fullEvidence.find(e => e.action === "location.history.reconstructed");
    assert.ok(locationHistoryEntry, "Entry location.history.reconstructed harus ada di evidence chain");
    const locationTimeline = locationHistoryEntry.meta_locationTimeline;
    
    // Verifikasi timeline memiliki 3 entry: initial (TenantA) + 2 transfer (TenantB, TenantC)
    console.log("🔍 DEBUG: locationTimeline =", JSON.stringify(locationTimeline, null, 2));
    assert.strictEqual(locationTimeline.length, 3, "Timeline lokasi harus memiliki 3 entry (initial + 2 transfer)");
    
    // Verifikasi entry pertama adalah initial location (TenantA/WorkspaceA)
    assert.strictEqual(locationTimeline[0].isInitial, true, "Entry pertama harus initial location");
    assert.strictEqual(locationTimeline[0].current.workspaceId, WORKSPACE_A, "Initial workspace harus WORKSPACE_A");
    assert.strictEqual(locationTimeline[0].current.tenantId, TENANT_A, "Initial tenant harus TENANT_A");
    
    // Verifikasi entry kedua adalah transfer ke TenantB/WorkspaceB
    assert.strictEqual(locationTimeline[1].previous.workspaceId, WORKSPACE_A, "Entry kedua previous workspace harus WORKSPACE_A");
    assert.strictEqual(locationTimeline[1].current.workspaceId, WORKSPACE_B, "Entry kedua current workspace harus WORKSPACE_B");
    assert.strictEqual(locationTimeline[1].previous.tenantId, TENANT_A, "Entry kedua previous tenant harus TENANT_A");
    assert.strictEqual(locationTimeline[1].current.tenantId, TENANT_B, "Entry kedua current tenant harus TENANT_B");
    
    // Verifikasi entry ketiga adalah transfer ke TenantC/WorkspaceC
    assert.strictEqual(locationTimeline[2].previous.workspaceId, WORKSPACE_B, "Entry ketiga previous workspace harus WORKSPACE_B");
    assert.strictEqual(locationTimeline[2].current.workspaceId, WORKSPACE_C, "Entry ketiga current workspace harus WORKSPACE_C");
    assert.strictEqual(locationTimeline[2].previous.tenantId, TENANT_B, "Entry ketiga previous tenant harus TENANT_B");
    assert.strictEqual(locationTimeline[2].current.tenantId, TENANT_C, "Entry ketiga current tenant harus TENANT_C");
    
    console.log("✅ Timeline lokasi verified: 3 entry (initial + 2 transfer)");
  });

  it("4. Work ID invariant tetap terjaga selama seluruh transfer berantai", async () => {
    // Cek Work ID awal
    const workBeforeTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(workBeforeTransfer.workId, TEST_WORK_ID, "Work ID awal harus sesuai");

    // Lakukan transfer pertama
    const contextA = {
      actor_id: USER_A,
      tenant_id: TENANT_A,
      context_trace_id: "trace-test-001"
    };
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: SESSION_USER_A,
      actorId: USER_A,
      expectedVersion: 1
    }, contextA);

    const workAfterFirstTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(workAfterFirstTransfer.workId, TEST_WORK_ID, "Work ID setelah transfer pertama harus tetap sama");

    // Lakukan transfer kedua
    const contextB = {
      actor_id: USER_B,
      tenant_id: TENANT_B,
      context_trace_id: "trace-test-001"
    };
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_C,
      permissions: ["edit"],
      workspaceId: WORKSPACE_B,
      tenantId: TENANT_B,
      newWorkspaceId: WORKSPACE_C,
      newTenantId: TENANT_C,
      sessionId: SESSION_USER_B,
      actorId: USER_B,
      expectedVersion: 2
    }, contextB);

    const workAfterSecondTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(workAfterSecondTransfer.workId, TEST_WORK_ID, "Work ID setelah transfer kedua harus tetap sama");
  });

  it("5. Transfer yang menggunakan version salah ditolak (concurrency control tetap bekerja untuk multi-hop)", async () => {
    // Lakukan transfer pertama yang berhasil (version berubah dari 1→2)
    const contextA = {
      actor_id: USER_A,
      tenant_id: TENANT_A,
      context_trace_id: "trace-test-001"
    };
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: SESSION_USER_A,
      actorId: USER_A,
      expectedVersion: 1
    }, contextA);

    // Coba transfer kedua dengan expectedVersion yang salah (masih pakai 1, padahal version sekarang 2)
    const contextB = {
      actor_id: USER_B,
      tenant_id: TENANT_B,
      context_trace_id: "trace-test-001"
    };
    await assert.rejects(
      claimWorkAuthority({
        workId: TEST_WORK_ID,
        newActorId: USER_C,
        permissions: ["read", "edit"],
        workspaceId: WORKSPACE_B,
        tenantId: TENANT_B,
        newWorkspaceId: WORKSPACE_C,
        newTenantId: TENANT_C,
        sessionId: SESSION_USER_B,
        actorId: USER_B,
        expectedVersion: 1 // Version salah, harusnya 2
      }, contextB),
      /version_mismatch/,
      "Transfer dengan version yang salah harus ditolak"
    );
  });
});