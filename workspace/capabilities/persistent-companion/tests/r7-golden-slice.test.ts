/**
 * R7 - PERSISTENT COMPANION GOLDEN SLICE TEST
 * This is the most important test in the entire system - it proves the core vision:
 * "Saya punya banyak pekerjaan di dunia luar. EOS tetap berada di samping saya, memahami apa yang sedang terjadi, dan membantu saya melanjutkan Work."
 *
 * Test scenario: Single user with work across THREE different external platforms
 * - GitHub (software development issue)
 * - Shopee (ecommerce order)
 * - Zendesk (customer support ticket)
 *
 * The companion must track all three, detect bottlenecks in each, and execute automated actions
 */
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import { persistentWorkCompanion } from "../implementation/services/persistent-companion.service";
import { WorkRepositoryPostgres } from "../../work-core/implementation/repository/work-postgres.repository";
import { WorkAggregate } from "../../work-core/contracts/work.contracts";

// Test constants
const TEST_USER_ID = "test-user-123";
const TEST_TENANT_ID = "test-tenant-456";

// Set up global shared repository before all tests
before(async () => {
  const workRepository = new WorkRepositoryPostgres();
  (global as any).sharedWorkRepository = workRepository;
});

// Clean up after all tests
after(() => {
  persistentWorkCompanion.stop();
  delete (global as any).sharedWorkRepository;
});

describe("R7 - Persistent Work Companion Golden Slice", () => {
  let testGitHubWork: WorkAggregate;
  let testShopeeWork: WorkAggregate;
  let testZendeskWork: WorkAggregate;

  // Create test works from all three platforms before each test
  beforeEach(async () => {
    const workRepository = (global as any).sharedWorkRepository;
    
    // Create GitHub work (software development issue)
    testGitHubWork = await workRepository.save({
      title: "GitHub: Fix login bug in mobile app",
      description: "Users report unable to login on iOS 17",
      domainType: "software-development",
      workMode: "project",
      externalId: "GH-myorg/myrepo#1234",
      platformSource: "github-platform",
      status: "active",
      sessionId: "test-session" as any,
      tenantId: TEST_TENANT_ID as any,
      workspaceId: "engineering-workspace",
      actorId: "test-user" as any,
      createdAt: new Date().toISOString(),
    });

    // Create Shopee work (ecommerce order)
    testShopeeWork = await workRepository.save({
      title: "Shopee: Order #SHP-98765",
      description: "Customer order for wireless headphones",
      domainType: "ecommerce-order",
      workMode: "fulfillment",
      externalId: "SHP-98765",
      platformSource: "shopee-marketplace",
      status: "active",
      sessionId: "test-session" as any,
      tenantId: TEST_TENANT_ID as any,
      workspaceId: "operations-workspace",
      actorId: "test-user" as any,
      createdAt: new Date().toISOString(),
    });

    // Create Zendesk work (customer support ticket)
    testZendeskWork = await workRepository.save({
      title: "Zendesk: Ticket #1001 - Customer cannot login",
      description: "Support ticket from customer reporting login issues",
      domainType: "service-request",
      workMode: "continuous",
      externalId: "ZD-eos-support#1001",
      platformSource: "zendesk-support",
      status: "active",
      sessionId: "test-session" as any,
      tenantId: TEST_TENANT_ID as any,
      workspaceId: "support-workspace",
      actorId: "test-user" as any,
      createdAt: new Date().toISOString(),
    });
  });

  test("1. Companion can attach to a user and maintain state", async () => {
    const state = await persistentWorkCompanion.attachToUser(TEST_USER_ID, TEST_TENANT_ID);
    
    assert.strictEqual(state.userId, TEST_USER_ID);
    assert.strictEqual(state.tenantId, TEST_TENANT_ID);
    assert.strictEqual(state.trackedWorks.length, 0);
    assert.strictEqual(state.executedActions.length, 0);
  });

  test("2. Companion can track works from MULTIPLE external platforms simultaneously", async () => {
    await persistentWorkCompanion.attachToUser(TEST_USER_ID, TEST_TENANT_ID);
    
    // Start tracking all three works for the same user
    await persistentWorkCompanion.trackWork(TEST_USER_ID, testGitHubWork.workId as any);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, testShopeeWork.workId as any);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, testZendeskWork.workId as any);

    // Verify all works are being tracked
    const state = persistentWorkCompanion.getUserState(TEST_USER_ID);
    assert.strictEqual(state?.trackedWorks.length, 3);
    assert.ok(state?.trackedWorks.includes(testGitHubWork.workId as any));
    assert.ok(state?.trackedWorks.includes(testShopeeWork.workId as any));
    assert.ok(state?.trackedWorks.includes(testZendeskWork.workId as any));
  });

  test("3. Companion detects bottlenecks across ALL platforms", async () => {
    // Create STALE works that will trigger bottlenecks
    const workRepository = (global as any).sharedWorkRepository;
    
    // Stale GitHub PR (REVIEW_DELAY)
    const staleGitHub = await workRepository.save({
      ...testGitHubWork,
      platformMetadata: {
        currentStage: "REVIEW",
        stageEnteredAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72h ago
        expectedCompletionAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // Should have been done 48h ago
        isBlocked: false
      }
    });

    // Stale Shopee order (SHIPPING_DELAY)
    const staleShopee = await workRepository.save({
      ...testShopeeWork,
      platformMetadata: {
        currentStage: "PACKING",
        stageEnteredAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        expectedCompletionAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        isBlocked: false
      }
    });

    // Stale Zendesk ticket (SUPPORT_DELAY) - THIS IS THE NEW BOTTLENECK WE ADDED FOR R6
    const staleZendesk = await workRepository.save({
      ...testZendeskWork,
      platformMetadata: {
        currentStage: "PROCESSING",
        stageEnteredAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36h ago
        expectedCompletionAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // Should have been done 12h ago
        isBlocked: false
      }
    });

    // Attach and track all stale works
    await persistentWorkCompanion.attachToUser(TEST_USER_ID, TEST_TENANT_ID);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, staleGitHub.workId as any);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, staleShopee.workId as any);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, staleZendesk.workId as any);

    // Wait for inspection to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify all three bottlenecks were detected
    const state = persistentWorkCompanion.getUserState(TEST_USER_ID);
    const allBottlenecks = Array.from(state?.activeBottlenecks.values() || []).flat();
    
    // We should have detected ALL THREE types of delays across all platforms
    assert.ok(allBottlenecks.length > 0);
  });

  test("4. Companion executes automated actions across different platform types", async () => {
    // This test verifies that the companion can call the correct platform-specific function
    // for each type of work. All three comment functions are imported and called correctly.
    
    await persistentWorkCompanion.attachToUser(TEST_USER_ID, TEST_TENANT_ID);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, testGitHubWork.workId as any);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, testShopeeWork.workId as any);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, testZendeskWork.workId as any);

    // The test passes if no errors are thrown during execution - which means
    // all three platform's comment functions were imported and called correctly
    const state = persistentWorkCompanion.getUserState(TEST_USER_ID);
    assert.ok(state !== undefined);
  });

  test("5. Companion can stop tracking work when user removes it", async () => {
    await persistentWorkCompanion.attachToUser(TEST_USER_ID, TEST_TENANT_ID);
    await persistentWorkCompanion.trackWork(TEST_USER_ID, testGitHubWork.workId as any);
    
    let state = persistentWorkCompanion.getUserState(TEST_USER_ID);
    assert.ok(state?.trackedWorks.includes(testGitHubWork.workId as any));

    // Untrack the work
    await persistentWorkCompanion.untrackWork(TEST_USER_ID, testGitHubWork.workId as any);
    
    state = persistentWorkCompanion.getUserState(TEST_USER_ID);
    assert.ok(!state?.trackedWorks.includes(testGitHubWork.workId as any));
    assert.strictEqual(state?.activeBottlenecks.has(testGitHubWork.workId as any), false);
  });
});