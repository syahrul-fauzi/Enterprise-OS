/**
 * SIMPLE GOLDEN PROOF - No TypeScript branded types, pure JavaScript logic
 * Run with: node simple-golden-proof.ts
 */

// CORE PRIMITIVES - simplified for demo
class AtomicCompositionService {
  async composeTeamFromRequirements(request) {
    const { workId, requirements, availableActors } = request;
    const assignments = [];
    const resolvedActorIds = [];
    const unresolvedRequirements = [];

    console.log("\nProcessing each requirement...");
    
    for (const requirement of requirements) {
      const matchingActors = availableActors.filter(actor => 
        actor.capabilities.includes(requirement.capabilityId) &&
        actor.availability &&
        !resolvedActorIds.includes(actor.actorId)
      );

      if (matchingActors.length > 0) {
        const selectedActor = matchingActors[0];
        const assignment = {
          assignmentId: `assignment-${Date.now()}-${Math.random()}`,
          actorId: selectedActor.actorId,
          workId: workId,
          capabilityId: requirement.capabilityId,
          requirementId: requirement.requirementId,
          role: this.getRoleForCapability(requirement.capabilityId),
          status: "pending",
          assignedAt: new Date().toISOString(),
        };
        assignments.push(assignment);
        resolvedActorIds.push(selectedActor.actorId);
        requirement.resolved = true;
        console.log(`   ✓ Assigned ${selectedActor.displayName} to ${requirement.capabilityId}`);
      } else {
        unresolvedRequirements.push(requirement);
        console.log(`   ✗ Unresolved: ${requirement.capabilityId}`);
      }
    }

    const team = {
      teamId: `team-${workId}-${Date.now()}`,
      workId: workId,
      name: `Team for Work ${workId.substring(0, 8)}`,
      assignments: assignments.map(a => a.assignmentId),
      actors: resolvedActorIds,
      isEphemeral: true,
      composedAt: new Date().toISOString(),
      status: assignments.length > 0 ? "active" : "forming",
    };

    return {
      success: unresolvedRequirements.length === 0,
      assignments,
      team,
      unresolvedRequirements,
      resolutionTimestamp: new Date().toISOString(),
    };
  }

  getRoleForCapability(capabilityId) {
    const map = {
      "cap-frontend-development": "Frontend Developer",
      "cap-backend-development": "Backend Developer", 
      "cap-ux-design": "UI/UX Designer",
      "cap-quality-assurance": "QA Engineer",
    };
    return map[capabilityId] || "Team Member";
  }
}

// RUN THE GOLDEN PROOF
async function main() {
  console.log("=".repeat(80));
  console.log("EOS ATOMIC WORK COMPOSITION - GOLDEN PROOF");
  console.log("Work: Create and launch a website for Client X");
  console.log("=".repeat(80));

  // 1. Capabilities that exist in the system
  const capabilities = [
    { capabilityId: "cap-frontend-development", name: "Frontend Development" },
    { capabilityId: "cap-backend-development", name: "Backend Development" },
    { capabilityId: "cap-ux-design", name: "UI/UX Design" },
    { capabilityId: "cap-quality-assurance", name: "Quality Assurance" },
  ];
  console.log("\n✅ System Capabilities:");
  capabilities.forEach(c => console.log(`   - ${c.name}`));

  // 2. Create the Work
  const workId = "work-client-x-website-2026-001";
  console.log("\n✅ Work Created: 'Launch Client X Website'");

  // 3. Define Requirements for this work
  const requirements = [
    { requirementId: "req-fe", workId, capabilityId: "cap-frontend-development" },
    { requirementId: "req-be", workId, capabilityId: "cap-backend-development" },
    { requirementId: "req-design", workId, capabilityId: "cap-ux-design" },
    { requirementId: "req-qa", workId, capabilityId: "cap-quality-assurance" },
  ];
  console.log("\n✅ Work Requirements:");
  requirements.forEach(r => console.log(`   - Need: ${r.capabilityId}`));

  // 4. Actors available in the system
  const actors = [
    { actorId: "human-jane", displayName: "Jane Smith", capabilities: ["cap-frontend-development"], availability: true },
    { actorId: "human-bob", displayName: "Bob Johnson", capabilities: ["cap-backend-development"], availability: true },
    { actorId: "human-alice", displayName: "Alice Wong", capabilities: ["cap-ux-design"], availability: true },
    { actorId: "human-charlie", displayName: "Charlie Davis", capabilities: ["cap-quality-assurance"], availability: true },
  ];
  console.log("\n✅ Available Actors:");
  actors.forEach(a => console.log(`   - ${a.displayName}`));

  // 5. Run Composition!
  console.log("\n⚙️  Running Atomic Composition...");
  const service = new AtomicCompositionService();
  const result = await service.composeTeamFromRequirements({
    workId,
    requirements,
    availableActors: actors
  });

  // 6. Show results
  console.log("\n📊 RESULTS:");
  console.log(`   Team created: ${result.team.name}`);
  console.log(`   Team ID: ${result.team.teamId}`);
  console.log(`   Actors assigned: ${result.team.actors.length}/4`);
  console.log(`   Assignments: ${result.assignments.length}`);
  console.log(`   Success: ${result.success}`);

  console.log("\n📋 Final Team Roster:");
  result.assignments.forEach((assignment, i) => {
    const actor = actors.find(a => a.actorId === assignment.actorId);
    console.log(`   ${i+1}. ${actor?.displayName} - ${assignment.role}`);
  });

  console.log("\n");
  console.log("=".repeat(80));
  console.log("🎉 GOLDEN PROOF COMPLETE!");
  console.log("=".repeat(80));
  console.log("\nFlow executed: NEED → WORK → REQUIREMENTS → CAPABILITIES → ACTORS → COMPOSITION → TEAM");
  console.log("\nTeam emerged automatically! No manual team creation.");
}

main().catch(console.error);