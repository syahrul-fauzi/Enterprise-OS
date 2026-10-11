/**
 * W2-A Pressure Test: Interrupted Work
 * Scenario: Actor A claims work → crashes → Actor B reclaims work
 * Invariant: "Authority is replaceable. Work is continuous."
 * Reuse semua primitive yang sudah ada (atomicClaim, markStaleClaims, safeRecordEvidence)
 * Tidak ada primitive core baru yang dibuat (0 new core primitives)
 * Dual repository support: in-memory (test) + Postgres (production) via runtime flag --postgres
 */
import { WorkRepositoryInMemory } from "./implementation/repository/work-inmemory.repository.ts";
import { getWorkRepositoryPostgres } from "./implementation/repository/work-postgres.repository.ts";
import type { WorkAggregate } from "./contracts/work.contracts.ts";
import { claimWork } from "./implementation/commands/work.commands.ts";
import { getEvidenceByWorkId } from "./implementation/commands/work.commands.ts";
import { safeRecordEvidence } from "./implementation/utils/evidence.utils.ts";

// Import branded type factories dari work.contracts (canonical source)
import { createActorId, createWorkspaceId, createTenantId, SessionId } from "./contracts/work.contracts.ts";

// Test Constants - Gunakan factory functions yang sudah ada untuk compliance dengan branded types
// Untuk SessionId di test environment: gunakan type assertion yang sama dengan test lain (w2b/w2c)
const TEST_TENANT_ID = createTenantId("test-tenant-001");
const TEST_WORKSPACE_ID = createWorkspaceId("test-workspace-001");
const ACTOR_A_ID = createActorId("human-actor-a-001");
const ACTOR_B_ID = createActorId("human-actor-b-002");
const SESSION_ID_A = "session-a-001" as unknown as SessionId;
const SESSION_ID_B = "session-b-002" as unknown as SessionId;

async function runW2ATest(): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];
  // Cek flag --postgres untuk menggunakan repository Postgres (complies with runtime flag requirement)
  const usePostgres = process.argv.includes("--postgres");
  const workRepo = usePostgres ? getWorkRepositoryPostgres() : new WorkRepositoryInMemory();
  
  // Initialize Postgres repository jika perlu (sesuai pattern di work-postgres.repository.ts)
  if (usePostgres && 'initialize' in workRepo && typeof (workRepo as any).initialize === 'function') {
    await (workRepo as any).initialize();
    console.log("\n🐘 Using POSTGRESQL repository for W2-A test");
  } else {
    console.log("\n🔧 Using IN-MEMORY repository for W2-A test");
  }

  console.log("\n=== W2-A PRESSURE TEST: Interrupted Work ===");
  console.log("Scenario: Actor A claims work → crash → Actor B reclaims\n");

  try {
    // Step 1: Buat work awal (sesuai pattern createWork yang sudah ada)
    const initialWork: WorkAggregate = {
      id: "work-w2a-001",
      workId: "work-w2a-001",
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      actorId: ACTOR_A_ID,
      sessionId: SESSION_ID_A,
      title: "W2-A Test: Interrupted Work",
      description: "Test work continuity when actor crashes mid-execution",
      status: "pending",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [ACTOR_A_ID, ACTOR_B_ID],
      authorizations: new Map(),
      // Set lease_until ke 1 jam yang lalu (simulasikan expired)
      claim_status: "UNCLAIMED",
      lease_until: new Date(Date.now() - 3600000).toISOString(),
      previous_execution_ids: [],
      active_execution_id: null
    };
    
    await workRepo.save(initialWork);
    console.log("✅ Step 1: Initial work created");
    console.log(`   Work ID: ${initialWork.id}`);
    console.log(`   Initial actor: ${ACTOR_A_ID}`);

    // Debug: List semua work di repository (gunakan list() untuk Postgres, search() untuk in-memory)
    const allWorks = 'search' in workRepo ? await workRepo.search() : await (workRepo as any).list();
    console.log("   All works in repo:", allWorks.map(w => w.id));

    // Step 2: Actor A melakukan atomicClaim (reuse primitive atomicClaim yang sudah ada)
    const workBeforeClaim = await workRepo.byId(initialWork.id);
    if (!workBeforeClaim) throw new Error("Work not found before claim");
    
    // Reuse atomicClaim logic dari work-postgres.repository.ts
    const claimedWork = await workRepo.atomicClaim(
      initialWork.id as any,
      ACTOR_A_ID,
      SESSION_ID_A,
      workBeforeClaim.version!,
      ["pending"],
      false
    );
    console.log("\n✅ Step 2: Actor A successfully claimed work");
    console.log(`   Claim status: ${(claimedWork as any).claim_status}`);
    console.log(`   Active execution ID: ${claimedWork.active_execution_id}`);

    // Step 3: Simulasikan crash dengan set lease_until ke waktu lampau
    const workAfterClaim = await workRepo.byId(initialWork.id);
    if (!workAfterClaim) throw new Error("Work not found after claim");
    
    (workAfterClaim as any).lease_until = new Date(Date.now() - 60000).toISOString(); // 1 menit yang lalu
    await workRepo.save(workAfterClaim);
    console.log("\n✅ Step 3: Simulated Actor A crash (lease expired)");
    console.log(`   Lease until: ${(workAfterClaim as any).lease_until}`);

    // Step 4: System jalankan markStaleClaims (reuse primitive yang baru ditambahkan ke in-memory repo)
    const staleCount = await workRepo.markStaleClaims();
    if (staleCount !== 1) {
      errors.push(`Expected 1 stale claim, found ${staleCount}`);
    }
    const workAfterStale = await workRepo.byId(initialWork.id);
    if (!workAfterStale) throw new Error("Work not found after stale marking");
    
    console.log("\n✅ Step 4: System marked stale claims");
    console.log(`   Stale claims found: ${staleCount}`);
    console.log(`   Work claim status: ${(workAfterStale as any).claim_status}`);
    if ((workAfterStale as any).claim_status !== "STALE") {
      errors.push(`Expected claim_status to be STALE, got ${(workAfterStale as any).claim_status}`);
    }

    // Step 5: Actor B reclaim work dengan allowReclaim=true (reuse atomicClaim)
    const workBeforeReclaim = await workRepo.byId(initialWork.id);
    if (!workBeforeReclaim) throw new Error("Work not found before reclaim");
    
    const reclaimedWork = await workRepo.atomicClaim(
      initialWork.id as any,
      ACTOR_B_ID,
      SESSION_ID_B,
      workBeforeReclaim.version!,
      ["executing", "pending"],
      true // allowReclaim=true
    );
    console.log("\n✅ Step 5: Actor B successfully reclaimed work");
    console.log(`   New actor: ${ACTOR_B_ID}`);
    console.log(`   New active execution ID: ${reclaimedWork.active_execution_id}`);
    console.log(`   Previous execution IDs length: ${(reclaimedWork as any).previous_execution_ids?.length}`);

    // Step 6: Verify invariant: Work identity tetap sama (continuous)
    if (reclaimedWork.id !== initialWork.id) {
      errors.push(`Work ID changed! Original: ${initialWork.id}, New: ${reclaimedWork.id}`);
    }
    console.log("\n✅ Step 6: Verified Work identity continuity");
    console.log(`   Work ID preserved: ${reclaimedWork.id}`);

    // Step 7: Verify execution lineage preserved
    const expectedPreviousExecutions = [SESSION_ID_A];
    const actualPreviousExecutions = (reclaimedWork as any).previous_execution_ids || [];
    if (actualPreviousExecutions.length !== expectedPreviousExecutions.length || 
        !actualPreviousExecutions.every((id: string) => expectedPreviousExecutions.includes(id))) {
      errors.push(`Execution lineage mismatch! Expected: ${JSON.stringify(expectedPreviousExecutions)}, Got: ${JSON.stringify(actualPreviousExecutions)}`);
    }
    console.log("\n✅ Step 7: Verified execution lineage preservation");
    console.log(`   Previous executions: ${JSON.stringify(actualPreviousExecutions)}`);

    // Step 8: Verify evidence chain complete (sesuai format evidence in-memory: type="work_claim_stale" dan "work_claimed")
    const evidence = await workRepo.getEvidence(initialWork.id);
    const staleEvents = evidence.filter((e: any) => e.type === "work_claim_stale");
    const claimEvents = evidence.filter((e: any) => e.type === "work_claimed");
    
    if (staleEvents.length !== 1) {
      errors.push(`Expected 1 stale event, found ${staleEvents.length}`);
    }
    if (claimEvents.length < 2) {
      errors.push(`Expected at least 2 claim events (A and B), found ${claimEvents.length}`);
    }
    console.log("\n✅ Step 8: Verified evidence chain integrity");
    console.log(`   Total evidence entries: ${evidence.length}`);
    console.log(`   Stale events: ${staleEvents.length}`);
    console.log(`   Claim events: ${claimEvents.length}`);

    // Final verdict
    const passed = errors.length === 0;
    console.log("\n=====================================");
    if (passed) {
      console.log("🎉 W2-A PRESSURE TEST: ALL PASS");
      console.log('   Invariant maintained: "Authority is replaceable. Work is continuous."');
    } else {
      console.log("❌ W2-A PRESSURE TEST: FAILED");
      console.log("   Errors:", errors);
    }
    console.log("=====================================\n");

    return { passed, errors };

  } catch (error) {
    console.error("\n❌ W2-A TEST CRASHED:", error);
    errors.push((error as Error).message);
    return { passed: false, errors };
  }
}

// Run test jika dieksekusi langsung
if (import.meta.url === `file://${process.argv[1]}`) {
  runW2ATest().then((result) => {
    process.exit(result.passed ? 0 : 1);
  });
}

export { runW2ATest };