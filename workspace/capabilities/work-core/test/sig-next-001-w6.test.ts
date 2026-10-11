process.env.NODE_ENV = 'test';
(globalThis as any)._forceMockPool = true;

import { describe, it, beforeEach } from "vitest";
import assert from "node:assert";
import { getWorkRepositoryLazy, getMembershipRepositoryLazy, claimWorkAuthorityCommand, getEvidenceByWorkIdCommand } from "../implementation/commands/work.commands.js";
// Ambil execute function dari command object (sesuai pola di w2c-pressure-test.test.ts)
const claimWorkAuthority = claimWorkAuthorityCommand.execute;
const getEvidenceByWorkId = getEvidenceByWorkIdCommand.execute;
import type { WorkId, TenantId, WorkspaceId, ActorId, SessionId } from "../contracts/work.contracts.js";

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

const TEST_SESSION_ID = "session-sig-next-001-w6" as SessionId;
const TEST_WORK_ID = "work-sig-next-001-w6-001" as WorkId;

describe("SIG-NEXT-001-W6: Multi-Hop Work Handoff (tenantA→tenantB→tenantC)", () => {
  let workRepo: Awaited<ReturnType<typeof getWorkRepositoryLazy>>;
  let membershipRepo: Awaited<ReturnType<typeof getMembershipRepositoryLazy>>;
  let initialVersion: number;

  beforeEach(async () => {
    // Inisialisasi repository yang sama dengan logic utama (tidak buat instance baru)
    workRepo = await getWorkRepositoryLazy();
    membershipRepo = await getMembershipRepositoryLazy();
    
    // Reset data di repository sebelum tiap test
    (workRepo as any).mockWorks = new Map();
    (workRepo as any).evidence = new Map();
    // Reset membership data di in-memory repository
    if ((membershipRepo as any).mockMemberships) {
      (membershipRepo as any).mockMemberships = new Map();
    }
    
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
    // Eksekusi transfer pertama dari Tenant A ke Tenant B
    const transferResult1 = await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A, // Source workspace (Tenant A)
      tenantId: TENANT_A, // Source tenant
      newWorkspaceId: WORKSPACE_B, // Target workspace (Tenant B)
      newTenantId: TENANT_B, // Target tenant
      sessionId: TEST_SESSION_ID,
      actorId: USER_A, // Requester adalah User A (owner di Tenant A)
      expectedVersion: initialVersion // Version awal sebelum transfer
    });

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
    const transferResult1 = await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: TEST_SESSION_ID,
      actorId: USER_A,
      expectedVersion: 1
    });
    console.log("[Test Case 2] Setelah transfer pertama, version:", transferResult1.version); // Debug version

    // Cek version dari work repo
    const workAfterFirstTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    console.log("[Test Case 2] from workRepo, version:", workAfterFirstTransfer.version);

    // Eksekusi transfer kedua dari Tenant B ke Tenant C (User B sebagai requester)
    const transferResult2 = await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_C,
      permissions: ["edit"],
      workspaceId: WORKSPACE_B, // Source workspace sekarang Tenant B
      tenantId: TENANT_B, // Source tenant sekarang Tenant B
      newWorkspaceId: WORKSPACE_C, // Target workspace Tenant C
      newTenantId: TENANT_C, // Target tenant Tenant C
      sessionId: TEST_SESSION_ID,
      actorId: USER_B, // Requester adalah User B (owner sekarang di Tenant B)
      expectedVersion: 2 // Version setelah transfer pertama adalah 2
    });

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
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: TEST_SESSION_ID,
      actorId: USER_A,
      expectedVersion: 1
    });

    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_C,
      permissions: ["edit"],
      workspaceId: WORKSPACE_B,
      tenantId: TENANT_B,
      newWorkspaceId: WORKSPACE_C,
      newTenantId: TENANT_C,
      sessionId: TEST_SESSION_ID,
      actorId: USER_B,
      expectedVersion: 2
    });

    // Ambil semua evidence dan lokasi history yang direkonstruksi via getEvidenceByWorkId
    const fullEvidence = await getEvidenceByWorkId({
      workId: TEST_WORK_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TENANT_C,
      workspaceId: WORKSPACE_C,
      actorId: USER_C
    });
    
    // Cari entry location.history.reconstructed yang berisi timeline
    const locationHistoryEntry = fullEvidence.find(e => e.command === "location.history.reconstructed");
    assert.ok(locationHistoryEntry, "Entry location.history.reconstructed harus ada di evidence chain");
    const locationTimeline = locationHistoryEntry.meta_locationTimeline;
    
    // Verifikasi timeline memiliki 3 entry: initial (TenantA) + 2 transfer (TenantB, TenantC)
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
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: TEST_SESSION_ID,
      actorId: USER_A,
      expectedVersion: 1
    });

    const workAfterFirstTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(workAfterFirstTransfer.workId, TEST_WORK_ID, "Work ID setelah transfer pertama harus tetap sama");

    // Lakukan transfer kedua
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_C,
      permissions: ["edit"],
      workspaceId: WORKSPACE_B,
      tenantId: TENANT_B,
      newWorkspaceId: WORKSPACE_C,
      newTenantId: TENANT_C,
      sessionId: TEST_SESSION_ID,
      actorId: USER_B,
      expectedVersion: 2
    });

    const workAfterSecondTransfer = await workRepo.byWorkId(TEST_WORK_ID);
    assert.strictEqual(workAfterSecondTransfer.workId, TEST_WORK_ID, "Work ID setelah transfer kedua harus tetap sama");
  });

  it("5. Transfer yang menggunakan version salah ditolak (concurrency control tetap bekerja untuk multi-hop)", async () => {
    // Lakukan transfer pertama yang berhasil (version berubah dari 1→2)
    await claimWorkAuthority({
      workId: TEST_WORK_ID,
      newActorId: USER_B,
      permissions: ["edit", "transfer_authority"],
      workspaceId: WORKSPACE_A,
      tenantId: TENANT_A,
      newWorkspaceId: WORKSPACE_B,
      newTenantId: TENANT_B,
      sessionId: TEST_SESSION_ID,
      actorId: USER_A,
      expectedVersion: 1
    });

    // Coba transfer kedua dengan expectedVersion yang salah (masih pakai 1, padahal version sekarang 2)
    await assert.rejects(
      claimWorkAuthority({
        workId: TEST_WORK_ID,
        newActorId: USER_C,
        permissions: ["edit"],
        workspaceId: WORKSPACE_B,
        tenantId: TENANT_B,
        newWorkspaceId: WORKSPACE_C,
        newTenantId: TENANT_C,
        sessionId: TEST_SESSION_ID,
        actorId: USER_B,
        expectedVersion: 1 // Version salah, harusnya 2
      }),
      /conflict: Work version mismatch, cannot transfer authority/,
      "Transfer dengan version yang salah harus ditolak"
    );
  });
});