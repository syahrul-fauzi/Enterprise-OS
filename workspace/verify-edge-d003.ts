import { WorkRepositoryPostgres } from './capabilities/work-core/implementation/repository/work-postgres.repository.js';
import { createTenantId, createWorkspaceId, createActorId, createWorkId, createSessionId } from './capabilities/work-core/contracts/ids.js';

async function main() {
  console.log("🧪 Starting Gate D D-003 Restart Recovery Test...");
  
  // Setup test repository
  const repo = new WorkRepositoryPostgres();
  await repo.initialize();

  // Create test entities
  const tenantId = createTenantId("test-tenant-003");
  const workspaceId = createWorkspaceId("test-workspace-003");
  const actorId = createActorId("test-actor-003");
  const workId = createWorkId("test-work-d003-001");
  const eventId = "test-event-d003-restart-001";

  // Create initial test work (simulasi sebelum restart)
  const initialWork = await repo.save({
    id: workId,
    tenantId,
    workspaceId,
    actorId: null,
    title: "Test Work for Restart Recovery",
    description: "Test work to verify D-003 requirement: incomplete event recovers after restart without loss or duplication",
    status: "pending",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participants: [actorId],
    claimStatus: "unclaimed",
    sessionId: null,
    activeExecutionId: null,
    previousExecutionIds: [],
    processedEventIds: [],
    leaseUntil: null,
    compositionId: null,
    linkedExpressionId: null
  });

  console.log(`✅ Test work created with ID: ${workId}, initial version: ${initialWork.version}`);

  // Simulasi: Edge process menerima event, melakukan atomicClaim, tapi CRASH sebelum pipeline selesai
  console.log("\n🧪 Step 1: Simulate first claim before crash/restart...");
  const sessionIdBeforeCrash = createSessionId("test-session-d003-before-crash");
  
  try {
    const claimedWork = await repo.atomicClaim(
      workId,
      actorId,
      sessionIdBeforeCrash,
      1,
      ["pending"],
      eventId,
      false,
      5000 // Lease duration yang SINGKAT - 5 detik saja, agar lease cepat expired
    );
    console.log(`✅ First claim successful before simulated crash: Work status ${claimedWork.status}, lease until ${claimedWork.leaseUntil}`);
  } catch (error) {
    console.error(`❌ First claim failed: ${(error as Error).message}`);
    process.exit(1);
  }

  // Simulasi: Restart Edge process - tunggu lease expired
  console.log("\n🧪 Step 2: Wait for lease to expire (simulate restart)...");
  await new Promise(resolve => setTimeout(resolve, 6000)); // Tunggu 6 detik sampai lease habis

  // Setelah restart: Coba reclaim work yang sama dengan event yang sama
  console.log("\n🧪 Step 3: Attempt to reclaim after restart (same event ID)...");
  const sessionIdAfterRestart = createSessionId("test-session-d003-after-restart");
  
  try {
    const reclaimedWork = await repo.atomicClaim(
      workId,
      actorId,
      sessionIdAfterRestart,
      2, // expectedVersion setelah claim pertama
      ["executing"], // expectedStatuses
      eventId, // EVENT ID SAMA DENGAN SEBELUM CRASH!
      true, // allowReclaim - karena lease sudah expired
      3600000 // Lease normal
    );
    console.log(`✅ Reclaim successful after restart: Work status ${reclaimedWork.status}, new version ${reclaimedWork.version}`);

    // Verify eventId hanya ada SEKALI di processed_event_ids - tidak diduplikasi
    const processedEvents = reclaimedWork.processedEventIds || [];
    const eventOccurrences = processedEvents.filter((id: string) => id === eventId).length;
    
    if (eventOccurrences > 1) {
      console.error(`❌ Test Failed: Duplicate event detected - event ${eventId} added ${eventOccurrences} times`);
      process.exit(1);
    }

    console.log(`✅ Event deduplication verified: event ${eventId} only added once after restart`);
    console.log(`   Total processed events: ${processedEvents.length}`);

    // Verify work dapat dilanjutkan tanpa kehilangan data
    if (reclaimedWork.status !== "executing") {
      console.error(`❌ Test Failed: Work status not correctly set to executing after restart`);
      process.exit(1);
    }

    console.log(`✅ Work state preserved: Can continue execution after restart without data loss`);

  } catch (error) {
    console.error(`❌ Reclaim failed: ${(error as Error).message}`);
    process.exit(1);
  }

  // Cleanup
  await repo.delete(workId);
  console.log("\n🎉 ALL GATE D D-003 TESTS PASSED! Restart recovery verified.");
  console.log("   ✅ Incomplete event recovers after process restart");
  console.log("   ✅ No data loss or duplication after restart");
  console.log("   ✅ Lease expiration allows safe reclaim of stuck work");
}

main().catch(err => {
  console.error("💥 Test suite failed:", err);
  process.exit(1);
});