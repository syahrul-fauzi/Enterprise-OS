import { WorkRepositoryPostgres } from './capabilities/work-core/implementation/repository/work-postgres.repository.js';
import { createTenantId, createWorkspaceId, createActorId, createWorkId, createSessionId } from './capabilities/work-core/contracts/ids.js';

async function main() {
  console.log("🧪 Starting Gate D D-002 Concurrent Replay Test...");
  
  // Setup test repository
  const repo = new WorkRepositoryPostgres();
  await repo.initialize();

  // Create test entities
  const tenantId = createTenantId("test-tenant-002");
  const workspaceId = createWorkspaceId("test-workspace-002");
  const actorId = createActorId("test-actor-002");
  const workId = createWorkId("test-work-d002-001");
  const eventId = "test-event-d002-concurrent-001"; // Event ID yang SAMA untuk kedua claim

  // Create initial test work
  const initialWork = await repo.save({
    id: workId,
    tenantId,
    workspaceId,
    actorId: null,
    title: "Test Work for Concurrent Replay",
    description: "Test work to verify D-002 requirement: same event ID sent concurrently doesn't create duplicate claims",
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

  // Test: Kirim dua atomicClaim SECARA BERSAMAAN dengan eventId yang SAMA
  console.log("\n🧪 Test: Send two concurrent claims with the SAME event ID...");
  const sessionId1 = createSessionId("test-session-d002-001");
  const sessionId2 = createSessionId("test-session-d002-002");

  try {
    // Jalankan kedua claim secara paralel (concurrent)
    const results = await Promise.allSettled([
      repo.atomicClaim(
        workId,
        actorId,
        sessionId1,
        1, // expectedVersion
        ["pending"], // expectedStatuses
        eventId,
        true, // allowReclaim
        3600000
      ),
      repo.atomicClaim(
        workId,
        actorId,
        sessionId2,
        1, // expectedVersion (sama, karena dikirim bersamaan)
        ["pending"], // expectedStatuses
        eventId, // EVENT ID SAMA!
        true, // allowReclaim
        3600000
      )
    ]);

    // Hitung berapa yang berhasil dan gagal
    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results.filter(r => r.status === 'rejected').length;

    console.log(`   Concurrent claims results: ${fulfilled} succeeded, ${rejected} rejected`);

    // HANYA SATU yang boleh berhasil! Karena SELECT FOR UPDATE akan mencegah race condition
    if (fulfilled !== 1) {
      console.error(`❌ Test Failed: Expected only 1 successful claim, got ${fulfilled}`);
      process.exit(1);
    }

    if (rejected !== 1) {
      console.error(`❌ Test Failed: Expected 1 rejected claim, got ${rejected}`);
      process.exit(1);
    }

    console.log(`✅ Test Passed: Only one concurrent claim succeeded - no duplicate claims!`);

    // Verify processed_event_ids hanya berisi eventId sekali
    const finalWork = await repo.byId(workId);
    const processedEvents = finalWork?.processedEventIds || [];
    const eventOccurrences = processedEvents.filter((id: string) => id === eventId).length;
    
    if (eventOccurrences > 1) {
      console.error(`❌ Test Failed: Duplicate event detected - event ${eventId} added ${eventOccurrences} times`);
      process.exit(1);
    }

    console.log(`✅ Event deduplication verified: event ${eventId} only added once to processed_event_ids`);
    console.log(`   Total processed events: ${processedEvents.length}`);

  } catch (error) {
    console.error(`❌ Test Failed with unexpected error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Cleanup
  await repo.delete(workId);
  console.log("\n🎉 ALL GATE D D-002 TESTS PASSED! Concurrent replay verified.");
  console.log("   ✅ Same event ID sent concurrently only creates one claim");
  console.log("   ✅ PostgreSQL SELECT FOR UPDATE prevents race conditions");
  console.log("   ✅ No duplicate side effects from concurrent replay");
}

main().catch(err => {
  console.error("💥 Test suite failed:", err);
  process.exit(1);
});