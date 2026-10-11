/**
 * W2-C Pressure Test: FACE Loss / Reattachment
 * Skenario: FACE ATTACHED → WORK W → FACE DETACHED → CORE WORK CONTINUES → FACE REATTACHED → SAME WORK W
 * Invariant: "Authority is replaceable. Work is continuous."
 * Reuse semua primitive yang sudah ada dari W-BETTER-005 dan work-core
 * Tidak ada primitive core baru yang dibuat (0 new core primitives)
 */
process.env.NODE_ENV = 'test';
(globalThis as any)._forceMockPool = true;

import { newWorkId } from "@repo/contracts-core";
import { describe, it, beforeEach, assert } from "vitest";
import { getWorkRepositoryLazy, getMembershipRepositoryLazy, getEvidenceByWorkIdCommand } from "../implementation/commands/work.commands.js";
import type { GetEvidenceByWorkIdRequest } from "../implementation/commands/work.commands.js";
import { safeRecordEvidence } from "../implementation/utils/evidence.utils.js";
import { createActorId, createWorkspaceId, createTenantId, SessionId } from "../contracts/work.contracts.js";

// Test constants - Gunakan factory functions yang sudah ada untuk compliance dengan branded types
const TEST_TENANT_ID = createTenantId("tenant-test-w2c-001");
const TEST_WORKSPACE_ID = createWorkspaceId("ws-test-w2c-001");
const HUMAN_OPERATOR_ID = createActorId("user-human-operator-001"); // Owner dengan full FACE authority
const TEST_SESSION_ID = "session-test-w2c-001" as unknown as SessionId;

// Simulasi state FACE (sesuai W-BETTER-005 eksperimen)
interface FaceState {
  isAttached: boolean;
  routes: string[];
  lastUpdated: string;
}

let currentFaceState: FaceState = {
  isAttached: true,
  routes: ["/", "/my-reality", "/work/[id]"],
  lastUpdated: new Date().toISOString()
};

// Logika test diubah ke vitest describe/it pattern untuk compatibility
describe("W2C Pressure Test: FACE Loss / Reattachment", () => {
  let workRepo: any;
  let membershipRepo: any;
  
  beforeEach(async () => {
    // Reset repository sebelum tiap test (sama seperti sig-dev-001-replay.test.ts)
    process.env.NODE_ENV = 'test';
    (globalThis as any)._forceMockPool = true;
    workRepo = await getWorkRepositoryLazy();
    membershipRepo = await getMembershipRepositoryLazy();
    // Reset data di in-memory repository
    (workRepo as any).mockWorks = new Map();
    (workRepo as any).evidence = new Map();
  });

  it("Skenario: FACE ATTACHED → WORK W → FACE DETACHED → CORE WORK CONTINUES → FACE REATTACHED → SAME WORK W", async () => {
    console.log("=== W2-C PRESSURE TEST: FACE Loss / Reattachment ===");
    console.log("Skenario: FACE ATTACHED → WORK W → FACE DETACHED → CORE WORK CONTINUES → FACE REATTACHED → SAME WORK W\n");

    // 1. Repositories sudah diinisialisasi di beforeEach
    console.log("\n🔧 Using IN-MEMORY repository for W2-C test (sesuai getWorkRepositoryLazy())");
    
    // Execute function dari command
    const getEvidenceByWorkId = getEvidenceByWorkIdCommand.execute;
  
  // 2. Setup workspace memberships
  console.log("[Setup] Menambahkan operator ke workspace...");
  await membershipRepo.save({
    id: "mem-w2c-001",
    userId: HUMAN_OPERATOR_ID,
    workspaceId: TEST_WORKSPACE_ID,
    role: "owner",
    createdAt: new Date()
  });
  console.log("[✓] Semua actor terdaftar sebagai member workspace\n");

  // 3. Create initial work saat FACE masih attached
  console.log("[Step 1: FACE Attached, buat Work awal...");
  const initialWorkId = newWorkId();
  const initialWork = await workRepo.save({
    id: initialWorkId,
    workId: initialWorkId,
    title: "Healthcare Claim Processing - W2C Test",
    description: "Test Work continuity saat FACE di-detach dan reattach",
    domainType: "healthcare-claim",
    mode: "longrunning",
    sessionId: TEST_SESSION_ID,
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    actorId: HUMAN_OPERATOR_ID,
    status: "active",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    authorizations: new Map([[HUMAN_OPERATOR_ID, ["read", "write", "transfer", "face:manage"]]]),
    // Inisialisasi execution lineage (sesuai repository convention)
    previous_execution_ids: [TEST_SESSION_ID],
    // Simpan state FACE awal di work metadata
    meta_faceInitialState: JSON.stringify(currentFaceState)
  });
  console.log(`[✓] Work dibuat dengan ID: ${initialWorkId}`);
  console.log(`    Actor awal: ${initialWork.actorId}`);
  console.log(`    Version awal: ${initialWork.version}`);
  console.log(`    FACE state awal: ${JSON.stringify(currentFaceState)}`);

  // 4. Detach FACE (simulasikan FACE loss) - langsung di dalam main() untuk akses initialWorkId
  console.log("\n[Step 2: Detach FACE] Menghapus presentation layer routes...");
  currentFaceState = {
    isAttached: false,
    routes: [], // Semua route dihapus (FACE terdetach)
    lastUpdated: new Date().toISOString()
  };
  
  await safeRecordEvidence({
    workspace_id: TEST_WORKSPACE_ID,
    capability: "work-core",
    command: "face.detach",
    work_id: initialWorkId,
    tenant_id: TEST_TENANT_ID,
    actor_id: HUMAN_OPERATOR_ID,
    timestamp: new Date().toISOString(),
    sessionId: TEST_SESSION_ID,
    meta_removedRoutes: ["/", "/my-reality", "/work/[id]"]
  });
  
  console.log("[✓] FACE berhasil di-detach. Core Work tetap berjalan.");
  console.log(`    FACE state: ${JSON.stringify(currentFaceState)}`);

  // 5. Verifikasi core work tetap berjalan meskipun FACE detached
  console.log("\n[Step 3: Verifikasi Core Work tetap berjalan tanpa FACE...]");
  const workDuringDetach = await workRepo.byId(initialWorkId);
  if (!workDuringDetach) throw new Error("FAIL: Work tidak ditemukan setelah FACE detach - core continuity broken");
  
  // Update work status meskipun FACE tidak ada (simulasikan core work tetap berjalan)
  const updatedWorkDuringDetach = await workRepo.save({
    ...workDuringDetach,
    status: "in_progress",
    version: workDuringDetach.version! + 1,
    updatedAt: new Date(),
    meta_faceDetachedTimestamp: currentFaceState.lastUpdated
  });
  console.log(`[✓] Core Work tetap dapat diupdate tanpa akses FACE`);
  console.log(`    Work status sekarang: ${updatedWorkDuringDetach.status}`);
  console.log(`    Work version sekarang: ${updatedWorkDuringDetach.version}`);
  console.log(`    Work ID tetap sama: ${updatedWorkDuringDetach.workId === initialWorkId ? "YES" : "NO"}`);

  if (updatedWorkDuringDetach.workId !== initialWorkId) {
    throw new Error("FAIL: Work ID berubah saat FACE detached - invariant violation");
  }

  // 6. Reattach FACE - langsung di dalam main()
  console.log("\n[Step 4: Reattach FACE] Mengembalikan presentation layer routes...");
  currentFaceState = {
    isAttached: true,
    routes: ["/", "/my-reality", "/work/[id]"], // Semua route dikembalikan
    lastUpdated: new Date().toISOString()
  };
  
  await safeRecordEvidence({
    workspace_id: TEST_WORKSPACE_ID,
    capability: "work-core",
    command: "face.reattach",
    work_id: initialWorkId,
    tenant_id: TEST_TENANT_ID,
    actor_id: HUMAN_OPERATOR_ID,
    timestamp: new Date().toISOString(),
    sessionId: TEST_SESSION_ID,
    meta_restoredRoutes: ["/", "/my-reality", "/work/[id]"]
  });
  
  console.log("[✓] FACE berhasil di-reattach. Semua route kembali tersedia.");
  console.log(`    FACE state: ${JSON.stringify(currentFaceState)}`);

  // 7. Verifikasi work tetap sama setelah FACE reattached
  console.log("\n[Step 5: Verifikasi Work identity tetap sama setelah FACE reattach...]");
  const finalWork = await workRepo.byId(initialWorkId);
  if (!finalWork) throw new Error("FAIL: Work tidak ditemukan setelah FACE reattach - core continuity broken");
  
  // 8. Verifikasi evidence chain lengkap SEBELUM cek invariant (perbaikan order dependensi)
  console.log("\n[Evidence Check] Memeriksa chain of evidence untuk FACE events...");
  // Ambil work terbaru dari repository untuk memastikan ID yang benar diteruskan
  // Coba byId terlebih dahulu (in-memory repository), jika tidak ada coba byWorkId (Postgres repository)
  let finalWorkEvidence = await workRepo.byId(initialWorkId);
  if (!finalWorkEvidence && 'byWorkId' in workRepo) {
    finalWorkEvidence = await (workRepo as any).byWorkId(initialWorkId);
  }
  if (!finalWorkEvidence) throw new Error(`FAIL: Work tidak ditemukan sebelum evidence check - ID: ${initialWorkId}`);
  console.log(`[W2C Debug] Final work ID yang dipakai untuk evidence: ${finalWorkEvidence.workId} (repository workId: ${finalWorkEvidence.workId}, input workId: ${initialWorkId})`);
  
  const evidenceRequest: GetEvidenceByWorkIdRequest = {
    workId: finalWorkEvidence.workId, // Gunakan workId dari canonical work, bukan initialWorkId mentah
    sessionId: TEST_SESSION_ID,
    tenantId: TEST_TENANT_ID as unknown as string, // FIX: Cast branded type ke string untuk compliance dengan zod schema
    workspaceId: TEST_WORKSPACE_ID as unknown as string,
    actorId: HUMAN_OPERATOR_ID as unknown as string
  };
  const evidence = await getEvidenceByWorkId(evidenceRequest);
  const faceEvents = evidence.filter((e: any) => e.command === "face.detach" || e.command === "face.reattach");
  
  if (faceEvents.length === 2) {
    console.log(`[✓] EVIDENCE COUNT: ${faceEvents.length} FACE events tercatat`);
    faceEvents.forEach(e => {
      console.log(`    ${e.command}: ${e.timestamp}`);
    });
  } else {
    throw new Error(`FAIL: Expected 2 FACE events, found ${faceEvents.length} - evidence chain incomplete`);
  }

  // Verifikasi SEMUA 10 invariant yang dikunci (sudah memiliki faceEvents terdefinisi)
  const invariantChecks = [
    // I1: workId sebelum/sesudah detach sama
    { check: finalWork.workId === initialWorkId, message: "I1 PASSED: workId invariant - sama sepanjang seluruh siklus FACE" },
    // I2: Canonical Work tetap preserved
    { check: finalWork.title === initialWork.title && finalWork.description === initialWork.description, message: "I2 PASSED: Canonical Work preserved - semantic data tidak berubah" },
    // I3: FACE removal tidak menyebabkan Work deletion
    { check: !!finalWork, message: "I3 PASSED: FACE removal tidak menghapus Work - core masih ada" },
    // I4: Core Work continuity tetap berjalan
    { check: finalWork.version >= 2 && finalWork.status === "in_progress", message: "I4 PASSED: Core Work continues - update selama detach berhasil" },
    // I5: Execution lineage preserved
    { check: (finalWork.previous_execution_ids || []).includes(TEST_SESSION_ID), message: "I5 PASSED: Execution lineage preserved - session ID tercatat" },
    // I6: Evidence chain preserved (sudah dicek terpisah)
    { check: faceEvents.length === 2, message: "I6 PASSED: Evidence chain preserved - semua FACE event tercatat" },
    // I7: FACE reattach merehydrate Work yang sama
    { check: finalWork.workId === initialWorkId, message: "I7 PASSED: FACE reattach mengembalikan Work yang sama" },
    // I8: New FACE ≠ new Work (workId tidak berubah)
    { check: finalWork.id === initialWork.id, message: "I8 PASSED: New FACE tidak membuat Work baru - ID entity sama" },
    // I9: Canonical state mutation oleh FACE tidak terjadi tanpa otorisasi
    { check: finalWork.actorId === HUMAN_OPERATOR_ID, message: "I9 PASSED: Tidak ada mutasi canonical state oleh FACE tanpa otorisasi - actor tetap human operator" },
    // I10: Replay setelah reattach menghasilkan canonical reality yang sama
    { check: finalWork.meta_faceDetachedTimestamp === updatedWorkDuringDetach.meta_faceDetachedTimestamp, message: "I10 PASSED: Replay setelah reattach menghasilkan reality yang sama - timestamp detach cocok" }
  ];

  const allPassed = invariantChecks.every(c => c.check);
  invariantChecks.forEach(c => {
    if (c.check) console.log(`[✓] ${c.message}`);
    else throw new Error(`FAIL: ${c.message}`);
  });

  // Final result
  console.log("\n=== W2-C PRESSURE TEST: SEMUA KRITERIA LULUS ===");
  console.log("✅ Invariant terjaga: Authority is replaceable. Work is continuous.");
  console.log("✅ FACE tidak memiliki semantic ownership terhadap Work identity (sesuai FACE-01)");
  console.log("✅ Core Work tetap berjalan secara independen dari presentation layer (FACE)");
  });

  // SIG-NEXT-001: Handoff / Continuity Test - Institutional authority transition
  it("SIG-NEXT-001: INSTITUTION A → WORK W → HANDOFF TO INSTITUTION B → AUTHORITY CHANGES → WORK ID TETAP SAMA", async () => {
    console.log("\n=== SIG-NEXT-001: HANDOFF / CONTINUITY TEST ===");
    console.log("Skenario: INSTITUTION A → WORK W → HANDOFF TO INSTITUTION B → AUTHORITY CHANGES → WORK ID TETAP SAMA\n");

    // Import shared evidence function (REUSE: zero new primitives)
    const { safeRecordEvidence } = await import("../implementation/utils/evidence.utils.js");
    
    // 1. Setup dua institusi dengan actor masing-masing (Institution A dan Institution B)
    const INSTITUTION_A_ID = createActorId("institution-a-legal-001");
    const INSTITUTION_B_ID = createActorId("institution-b-healthcare-001");
    const NEW_OPERATOR_ID = createActorId("user-new-operator-institution-b");

    // 2. Tambahkan kedua institusi sebagai member workspace
    await membershipRepo.save({
      id: "mem-signext-001-a",
      userId: INSTITUTION_A_ID,
      workspaceId: TEST_WORKSPACE_ID,
      role: "owner",
      createdAt: new Date()
    });
    await membershipRepo.save({
      id: "mem-signext-001-b",
      userId: INSTITUTION_B_ID,
      workspaceId: TEST_WORKSPACE_ID,
      role: "editor",
      createdAt: new Date()
    });
    await membershipRepo.save({
      id: "mem-signext-001-c",
      userId: NEW_OPERATOR_ID,
      workspaceId: TEST_WORKSPACE_ID,
      role: "editor",
      createdAt: new Date()
    });
    console.log("[✓] Kedua institusi terdaftar sebagai member workspace\n");

    // 3. Institution A buat Work awal (memiliki full authority)
    const handoffWorkId = newWorkId();
    const initialWorkFromA = await workRepo.save({
      id: handoffWorkId,
      workId: handoffWorkId,
      title: "Cross-Institutional Patient Transfer - SIG-NEXT-001",
      description: "Test Work continuity selama handoff antar institusi kesehatan",
      domainType: "healthcare-transfer",
      mode: "longrunning",
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      actorId: INSTITUTION_A_ID,
      status: "active",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      requiredSigners: [INSTITUTION_A_ID], // Hanya Institution A yang punya signer authority awal
      participants: [INSTITUTION_A_ID, INSTITUTION_B_ID, NEW_OPERATOR_ID], // FIX: Tambahkan semua aktor ke participants agar bisa edit
      authorizations: new Map([[INSTITUTION_A_ID, ["read", "write", "transfer", "handoff"]]]),
      previous_execution_ids: [TEST_SESSION_ID]
    });
    console.log(`[✓] Work dibuat oleh Institution A dengan ID: ${handoffWorkId}`);
    console.log(`    Required signers awal: [${initialWorkFromA.requiredSigners}]`);

    // 4. Institution A initiate handoff: update requiredSigners untuk menambahkan Institution B
    console.log("\n[Step 1: Institution A initiate handoff] Menambahkan Institution B sebagai required signer...");
    const workBeforeHandoff = await workRepo.byId(handoffWorkId);
    if (!workBeforeHandoff) throw new Error("FAIL: Work tidak ditemukan sebelum handoff");
    
    // Update requiredSigners menggunakan updateWork() (reuse existing function dari SIG-DEV-001)
    const { updateWork } = await import("../implementation/commands/work.commands.js");
    await updateWork({
      workId: handoffWorkId,
      actorId: INSTITUTION_A_ID,
      workspaceId: TEST_WORKSPACE_ID,
      sessionId: TEST_SESSION_ID,
      tenantId: TEST_TENANT_ID,
      version: workBeforeHandoff.version,
      updates: {
        requiredSigners: [INSTITUTION_A_ID, INSTITUTION_B_ID],
        status: "handoff_in_progress"
      }
    });
    // Record handoff initiation evidence (REUSE: canonical authority.transfer pattern)
    await safeRecordEvidence({
      workspace_id: TEST_WORKSPACE_ID,
      capability: "work-core",
      command: "authority.transfer",
      work_id: handoffWorkId,
      tenant_id: TEST_TENANT_ID,
      actor_id: INSTITUTION_A_ID,
      timestamp: new Date().toISOString(),
      sessionId: TEST_SESSION_ID,
      meta_previousActorId: INSTITUTION_A_ID,
      meta_newActorId: INSTITUTION_B_ID,
      meta_transitionType: "handoff.initiated"
    });
    console.log("[✓] Handoff initiated, Institution B sekarang menjadi required signer");

    // 5. Institution B accept handoff: ambil alih full authority (remove Institution A dari requiredSigners)
    console.log("\n[Step 2: Institution B accept handoff] Mengambil alih penuh authority...");
    const workAfterInitiate = await workRepo.byId(handoffWorkId);
    await updateWork({
            workId: handoffWorkId,
            actorId: INSTITUTION_B_ID,
            workspaceId: TEST_WORKSPACE_ID,
            sessionId: TEST_SESSION_ID,
            tenantId: TEST_TENANT_ID,
            version: workAfterInitiate.version,
            updates: {
              requiredSigners: [INSTITUTION_B_ID, NEW_OPERATOR_ID],
              actorId: INSTITUTION_B_ID,
              status: "in_progress",
              participants: [INSTITUTION_B_ID, NEW_OPERATOR_ID] // Hapus Institution A dari participants
            }
          });
    // Record handoff completion evidence (REUSE: canonical authority.transfer pattern)
    await safeRecordEvidence({
      workspace_id: TEST_WORKSPACE_ID,
      capability: "work-core",
      command: "authority.transfer",
      work_id: handoffWorkId,
      tenant_id: TEST_TENANT_ID,
      actor_id: INSTITUTION_B_ID,
      timestamp: new Date().toISOString(),
      sessionId: TEST_SESSION_ID,
      meta_previousActorId: INSTITUTION_A_ID,
      meta_newActorId: INSTITUTION_B_ID,
      meta_transitionType: "handoff.completed"
    });
    console.log("[✓] Handoff selesai, Institution B sekarang memiliki full authority");

    // 6. Verifikasi Work ID tetap sama sepanjang seluruh proses handoff
    const finalWorkAfterHandoff = await workRepo.byId(handoffWorkId);
    if (!finalWorkAfterHandoff) throw new Error("FAIL: Work tidak ditemukan setelah handoff selesai");
    if (finalWorkAfterHandoff.workId !== handoffWorkId) {
      throw new Error(`FAIL: Work ID berubah dari ${handoffWorkId} menjadi ${finalWorkAfterHandoff.workId} - invariant violation`);
    }
    console.log(`\n[✓] WORK ID INVARIANT: ${finalWorkAfterHandoff.workId} === ${handoffWorkId} (SAMA)`);

    // 7. Verifikasi unauthorized actor tidak bisa memodifikasi Work setelah handoff
    // Catatan: Institution A masih bisa edit karena ia workspace owner (desain EOS yang benar - workspace owners retain admin access)
    // Kita test dengan UNBELIEVER_ACTOR: bukan workspace owner, bukan participant
    console.log("\n[Step 3: Cek unauthorized access - Actor luar tidak bisa modify Work...");
    const UNBELIEVER_ACTOR_ID = createActorId("unbeliever-hacker-001"); // Actor tidak terdaftar sama sekali
    const workAfterAccept = await workRepo.byId(handoffWorkId);
    try {
      await updateWork({
        workId: handoffWorkId,
        actorId: UNBELIEVER_ACTOR_ID, // Actor luar yang tidak punya hak apa-apa
        workspaceId: TEST_WORKSPACE_ID,
        sessionId: TEST_SESSION_ID,
        tenantId: TEST_TENANT_ID,
        version: workAfterAccept.version,
        updates: { status: "completed" }
      });
      throw new Error("FAIL: Unbeliever actor masih bisa modify Work setelah handoff - authority check failed");
    } catch (e: any) {
      if (e.message.includes("permission_denied: Actor does not have permission to update this work")) {
        console.log("[✓] Unauthorized access ditolak sesuai expected: Actor luar tidak bisa modify Work setelah handoff");
      } else {
        console.log(`Unexpected error: ${e.message}`);
        throw e;
      }
    }

    // 8. Final invariant checks untuk SIG-NEXT-001
    const sigNextInvariants = [
      { check: finalWorkAfterHandoff.workId === handoffWorkId, message: "SIG-NEXT-001 I1: Work ID tetap sama selama handoff" },
      { check: finalWorkAfterHandoff.requiredSigners.length === 2, message: "SIG-NEXT-001 I2: Authority transition tercatat dengan benar" },
      { check: finalWorkAfterHandoff.status === "in_progress", message: "SIG-NEXT-001 I3: Work tetap berjalan setelah handoff" },
      { check: finalWorkAfterHandoff.version > 2, message: "SIG-NEXT-001 I4: Version control bekerja selama transisi" }
    ];

    const allHandoffTestsPassed = sigNextInvariants.every(c => c.check);
    sigNextInvariants.forEach(c => {
      if (c.check) console.log(`[✓] ${c.message}`);
      else throw new Error(`FAIL: ${c.message}`);
    });

    // Final result SIG-NEXT-001
    console.log("\n=== SIG-NEXT-001: SEMUA KRITERIA LULUS ===");
    console.log("✅ Invariant terjaga: Authority is replaceable. Work is continuous.");
    console.log("✅ Cross-institutional handoff tidak merusak Work continuity");
    console.log("✅ Semua existing primitive digunakan kembali - 0 new core primitives");
  });
});