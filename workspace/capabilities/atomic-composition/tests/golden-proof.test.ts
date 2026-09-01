import { atomicCompositionService } from "../implementation/services/composition.service.js";
import type {
  Actor,
  Requirement,
  Capability,
  CapabilityResolutionRequest
} from "../implementation/contracts/atomic-composition.contracts.js";
import {
  RequirementId,
  ActorId,
  WorkId
} from "../implementation/contracts/atomic-composition.contracts.js";
import { WorkId as createWorkId } from "@capabilities/work-core/contracts/work.contracts.js";

/**
 * GOLDEN PROOF: Micro-Business Work - Launch Client X Website
 * 
 * This test validates the entire atomic composition flow:
 * Need -> Work -> Requirements -> Capabilities -> Actors -> Composition -> Team -> Execution
 * 
 * WORK: "Create and launch a website service for Client X"
 * REQUIREMENTS: Website needs frontend dev, backend dev, designer, QA
 * AVAILABLE ACTORS: Jane (FE), Bob (BE), Alice (Design), Charlie (QA)
 * COMPOSITION: Team is formed automatically from these actors
 */
describe("Golden Proof: Client X Website Launch", () => {
  test("complete atomic composition flow executes successfully", async () => {
    console.log("=".repeat(80));
    console.log("GOLDEN PROOF: Starting Client X Website Launch composition");
    console.log("=".repeat(80));

    // -------------------------------------------------------------------------
    // Step 1: Define all capabilities that exist in the system (from capability-registry)
    // -------------------------------------------------------------------------
    const capabilities: string[] = [
      "cap-frontend-development",
      "cap-backend-development",
      "cap-ux-design", 
      "cap-quality-assurance"
    ];

    console.log("\n✅ Core capabilities loaded from registry:", capabilities);

    // -------------------------------------------------------------------------
    // Step 2: Create the WORK (this is the real user work we need to execute)
    // -------------------------------------------------------------------------
    const clientXWebsiteWorkId = createWorkId("work-client-x-website-2026-001");
    console.log("\n✅ Work created:", "Launch Client X Website", `(id: ${clientXWebsiteWorkId})`);

    // -------------------------------------------------------------------------
    // Step 3: Define REQUIREMENTS for this work (what capabilities do we need?)
    // -------------------------------------------------------------------------
    const requirements: Requirement[] = [
      {
        id: "req-fe-1",
        requirementId: RequirementId("req-fe-website-clientx"),
        workId: clientXWebsiteWorkId,
        capabilityId: capabilities[0], // frontend dev (core capability registry ID)
        quantity: 1,
        minimumTrust: "trusted",
        authority: "execute",
        resolved: false,
        createdAt: "2026-08-28T10:00:00Z",
      },
      {
        id: "req-be-1",
        requirementId: RequirementId("req-be-website-clientx"),
        workId: clientXWebsiteWorkId,
        capabilityId: capabilities[1], // backend dev (core capability registry ID)
        quantity: 1,
        minimumTrust: "verified",
        authority: "execute",
        resolved: false,
        createdAt: "2026-08-28T10:00:00Z",
      },
      {
        id: "req-design-1",
        requirementId: RequirementId("req-design-website-clientx"),
        workId: clientXWebsiteWorkId,
        capabilityId: capabilities[2], // UX designer (core capability registry ID)
        quantity: 1,
        minimumTrust: "verified",
        authority: "approve",
        resolved: false,
        createdAt: "2026-08-28T10:00:00Z",
      },
      {
        id: "req-qa-1",
        requirementId: RequirementId("req-qa-website-clientx"),
        workId: clientXWebsiteWorkId,
        capabilityId: capabilities[3], // QA (core capability registry ID)
        quantity: 1,
        minimumTrust: "verified",
        authority: "approve",
        resolved: false,
        createdAt: "2026-08-28T10:00:00Z",
      },
    ];

    console.log("\n✅ Requirements created (", requirements.length, "total):");
    requirements.forEach(r => console.log(`   - ${r.capabilityId}`));

    // -------------------------------------------------------------------------
    // Step 4: Define ACTORS available in the system (who has these capabilities?)
    // -------------------------------------------------------------------------
    const availableActors: Actor[] = [
      {
        id: "actor-jane",
        actorId: ActorId("human-jane-2026"),
        type: "human",
        displayName: "Jane Smith",
        capabilities: [capabilities[0]], // Frontend capability (core ID)
        trust: "trusted",
        availability: true,
        email: "jane@example.com",
        createdAt: "2025-01-15T00:00:00Z",
        lastActiveAt: "2026-08-27T14:30:00Z",
      },
      {
        id: "actor-bob",
        actorId: ActorId("human-bob-2026"),
        type: "human",
        displayName: "Bob Johnson",
        capabilities: [capabilities[1]], // Backend capability (core ID)
        trust: "verified",
        availability: true,
        email: "bob@example.com",
        createdAt: "2024-11-20T00:00:00Z",
        lastActiveAt: "2026-08-28T09:15:00Z",
      },
      {
        id: "actor-alice",
        actorId: ActorId("human-alice-2026"),
        type: "human",
        displayName: "Alice Wong",
        capabilities: [capabilities[2]], // Design capability (core ID)
        trust: "trusted",
        availability: true,
        email: "alice@example.com",
        createdAt: "2025-03-10T00:00:00Z",
        lastActiveAt: "2026-08-27T16:45:00Z",
      },
      {
        id: "actor-charlie",
        actorId: ActorId("human-charlie-2026"),
        type: "human",
        displayName: "Charlie Davis",
        capabilities: [capabilities[3]], // QA capability (core ID)
        trust: "verified",
        availability: true,
        email: "charlie@example.com",
        createdAt: "2025-02-05T00:00:00Z",
        lastActiveAt: "2026-08-26T11:20:00Z",
      },
    ];

    console.log("\n✅ Actors available (", availableActors.length, "total):");
    availableActors.forEach(a => console.log(`   - ${a.displayName} (${a.actorId})`));

    // -------------------------------------------------------------------------
    // Step 5: RUN COMPOSITION - the magic happens!
    // Team emerges from the requirements and available actors
    // -------------------------------------------------------------------------
    console.log("\n⚙️  Running atomic composition engine...");
    
    const request: CapabilityResolutionRequest = {
      workId: clientXWebsiteWorkId,
      work: { workId: clientXWebsiteWorkId, title: "Launch Client X Website" }, // Pass core work aggregate
      requirements,
      availableActors,
      availableCapabilities: capabilities,
    };

    const result = await atomicCompositionService.composeTeamFromRequirements(request);

    // -------------------------------------------------------------------------
    // Step 6: VERIFY the result - did the team compose correctly?
    // -------------------------------------------------------------------------
    console.log("\n📊 Composition Result:");
    console.log(`   Success: ${result.success}`);
    console.log(`   Composition ID: ${result.compositionId} (canonical link)`);
    console.log(`   Team created: ${result.team.name} (${result.team.projectionId}) - EPHEMERAL projection`);
    console.log(`   Actors assigned: ${result.team.actors.length}`);
    console.log(`   Assignments created: ${result.assignments.length}`);
    console.log(`   Unresolved requirements: ${result.unresolvedRequirements.length}`);

    // Verify all assignments
    result.assignments.forEach((assignment, idx) => {
      const actor = availableActors.find(a => a.actorId === assignment.actorId);
      console.log(`\n   Assignment ${idx + 1}:`);
      console.log(`     Actor: ${actor?.displayName}`);
      console.log(`     Capability: ${assignment.capabilityId}`);
      console.log(`     Authority: ${assignment.authority}`);
      console.log(`     Status: ${assignment.status}`);
    });

    // Final assertions
    expect(result.success).toBe(true);
    expect(result.team.actors.length).toBe(4); // All actors assigned
    expect(result.assignments.length).toBe(4); // All requirements fulfilled
    expect(result.unresolvedRequirements.length).toBe(0); // No unresolved needs
    expect(result.team.status).toBe("active"); // Team is active
    expect(result.team.isEphemeral).toBe(true); // Team is ephemeral (as expected)

    console.log("\n");
    console.log("=".repeat(80));
    console.log("🎉 GOLDEN PROOF VERIFIED: Team composed successfully!");
    console.log("=".repeat(80));
    console.log("\nAtomic flow completed:");
    console.log("Need → Work → Requirements → Capabilities → Actors → Composition → Team");
    console.log("\nTeam is now active and can execute the work to launch Client X's website.");
    console.log("\nThe team emerged from the work's requirements - no manual team creation needed.");
  });
});