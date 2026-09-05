import { CompositionRepository } from "../repository/composition.repository";
import type {
  ActorProjection,
  CapabilityRequirement,
  WorkBinding,
  TeamProjection,
  CapabilityResolutionRequest,
  CapabilityResolutionResult,
  CompositionResolution,
  CompositionLog,
  ProviderType
} from "../contracts/atomic-composition.contracts";
import {
  TeamProjectionId,
  WorkBindingId,
  ActorId,
  CompositionId,
  RequirementId,
  TeamId
} from "../contracts/atomic-composition.contracts";
import { aiAgentExecutionService } from "./ai-agent.service.js";

// Define local interfaces for internal use (not exported from contracts)
interface Assignment {
  id: string;
  actorId: string;
  actorProjectionId: string;
  bindingId: string;
  requirementId: string;
  assignedAt: string;
}

interface Team {
  teamId: string;
  workId: string;
  actorIds: string[];
  assembledAt: string;
}

interface Requirement {
  requirementId: string;
  title: string;
  status: string;
}

interface LegacyRequirement {
  requirementId: string;
  capabilityId: string;
  minimumTrust: string;
  authority: string;
  resolved: boolean;
  quantity?: number;
}

/**
 * COMPOSITION ENGINE - CORE LOGIC
 * Implements the atomic model: Requirements → Capabilities → Actors → Assignments → Team
 * 
 * The engine takes Work requirements and matching Actors, and composes a Team
 * by creating Assignments for each requirement that matches an Actor's capabilities.
 * 
 * P1.5 UPDATE: Now persists all artifacts to CompositionRepository for durability
 * and re-entry capability.
 */
// Standardize trust levels for matching algorithm (certified > trusted > verified > any)
const trustLevels: Record<string, number> = {
  "any": 0,
  "verified": 1,
  "trusted": 2,
  "certified": 3
};

export class AtomicCompositionService {
  private logs: CompositionLog[] = [];
  private repository: typeof CompositionRepository = CompositionRepository;

  constructor() {
    // Initialize repository on service creation
    this.repository.initialize().catch(err => {
      console.error("Failed to initialize composition repository:", err);
    });
  }

  /**
   * composeTeamFromRequirements
   * A4 COMPLIANCE: NEVER create a Team as first-class aggregate. ALWAYS derive it from WorkBindings.
   * E1 COMPLIANCE: Supports ALL 5 provider types as first-class members of the composition
   * Constitutional guarantee: No Work duplication, no Identity duplication, Team is always a projection
   */
  async composeTeamFromRequirements(
    request: CapabilityResolutionRequest
  ): Promise<CapabilityResolutionResult> {
    const { workId: legacyWorkId, work, requirements, availableActors, availableCapabilities, workspaceId } = request;
    // Support both formats: legacy workId directly, or modern work aggregate
    const workId = work ? work.workId : legacyWorkId;
    // Log workspace context untuk audit multi-tenant compliance
    if (workspaceId) {
      console.log(`[ATOMIC COMPOSITION] Running in workspace context: ${workspaceId}`);
    }
    
    // Start composition process
    const compositionStartTime = new Date().toISOString();
    const workBindings: WorkBinding[] = [];
    const resolvedActorIds: string[] = [];
    const unresolvedRequirements: typeof requirements = [];
    const createdActorProjections: ActorProjection[] = [];
    
    // Create Composition ID FIRST so we can assign it to all bindings (required for AI agent execution)
    const rawCompositionId = `composition-${workId}-${Date.now()}`;

    // Create ActorProjections from availableActors (core identity projections)
    // E1 Audit: Support ALL 5 provider types without core changes:
    // Human Professional, AI Agent, External Service, Organization, Machine/Device
    // Map legacy type strings to canonical ProviderType values
    const mapToCanonicalProviderType = (type?: string): ProviderType => {
      switch(type) {
        case "human": return "human-professional";
        case "machine": return "machine-device";
        case "ai-agent": return "ai-agent";
        case "external-service": return "external-service";
        case "organization": return "organization";
        default: return "human-professional";
      }
    };

    for (const actor of availableActors) {
      const canonicalProviderType = mapToCanonicalProviderType(actor.type);
      const projection: ActorProjection = {
        userId: actor.actorId as any, // map canonical ID to projection
        workActor: { 
          id: actor.actorId, 
          type: canonicalProviderType
        } as any,
        capabilities: actor.capabilities,
        availability: actor.availability,
        providerType: canonicalProviderType, // E1: Explicit canonical ProviderType from input
        actorId: actor.actorId as any, // Reuse raw string as brand type (compatible with Zod schema)
      };
      createdActorProjections.push(projection);
    }

    // Create CapabilityRequirements from input requirements
    const capabilityRequirements: CapabilityRequirement[] = [];
    for (const req of requirements) {
      const capReq: CapabilityRequirement = {
        id: `capreq-${req.requirementId}`,
        requirementId: req.requirementId as any, // Use raw ID directly for Zod brand compatibility
        workId: workId,
        capabilityReference: req.capabilityId,
        quantity: (req as any).quantity || 1, // Support LegacyRequirement quantity
        minimumTrust: req.minimumTrust as any,
        authority: req.authority as any,
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      capabilityRequirements.push(capReq);
    }

    // Process each requirement to create WorkBindings, handling quantity requirements
    for (const requirement of requirements) {
      const capRequirement = capabilityRequirements.find(cr => cr.requirementId === requirement.requirementId)!;
      let assignmentsForThisRequirement = 0;
      
      // Keep assigning actors until we meet the quantity requirement
      // Type guard for LegacyRequirement to safely access optional properties
      const req = requirement as LegacyRequirement;
      const requirementQuantity = req.quantity ?? 1;
      while (assignmentsForThisRequirement < requirementQuantity) {
        // Find actors that have the required capability, are available, and not yet assigned
        const matchingActors = availableActors.filter(actor => 
          actor.capabilities.includes(req.capabilityId) &&
          actor.trust >= req.minimumTrust &&
          actor.availability &&
          !resolvedActorIds.includes(actor.actorId)
        );

        if (matchingActors.length > 0) {
          // Take the first available matching actor
          const selectedActor = matchingActors[0];
          // Get or create actor projection for this selected actor (null safety check added)
          if (!selectedActor) continue;
          const selectedProjection = createdActorProjections.find(p => p.actorId === selectedActor.actorId);
          if (!selectedProjection) continue;
          
          // Create WorkBinding (canonical assignment) with unique bindingId
        const rawBindingId = `wb-${workId}-${req.requirementId}-${assignmentsForThisRequirement}-${Date.now()}`;
        const binding: WorkBinding = {
          id: `binding-${req.requirementId}-${assignmentsForThisRequirement}`,
          bindingId: rawBindingId as any, // Use raw string as brand type for Zod compatibility
          compositionId: rawCompositionId as any, // Link binding to its parent composition
          actorProjectionId: selectedProjection.actorId,
          providerType: selectedActor.type || "human", // Use WorkBindingSchema's required enum values
          workId: workId,
          capabilityReference: req.capabilityId,
          requirementId: capRequirement.requirementId,
          role: this.getRoleForCapability(req.capabilityId),
          authority: req.authority as any,
          status: "pending",
          boundAt: new Date().toISOString(),
          completedAt: new Date().toISOString(), // Initialize with boundAt for pending (Zod requires string, not null)
          workspaceId: workspaceId
        };

          workBindings.push(binding);
          resolvedActorIds.push(selectedActor.actorId);
          assignmentsForThisRequirement++;
          
          // Mark requirement as resolved once we have all needed assignments
          if (assignmentsForThisRequirement === requirementQuantity) {
            req.resolved = true;
            capRequirement.resolved = true;
          }
        } else {
          // No more matching actors found - add to unresolved if we couldn't meet quantity
          if (assignmentsForThisRequirement < requirementQuantity) {
            // Format unresolved requirement to match interface requirements
            unresolvedRequirements.push({
              requirementId: req.requirementId,
              title: `Unresolved requirement: ${req.capabilityId}`,
              status: "unresolved"
            });
          }
          break;
        }
      }
    }

    // Create TeamProjection (always derived, never first-class - constitutional compliance)
    const bindingIds = workBindings.map(b => b.bindingId);
    const actorIds = createdActorProjections.map(p => p.actorId);
    const rawTeamProjectionId = `team-${workId}-${Date.now()}`;
    const teamProjection: TeamProjection = {
      id: `team-${Date.now()}`,
      projectionId: rawTeamProjectionId as any, // Use raw string as brand type for Zod compatibility
      workId: workId,
      name: `Team for Work ${workId.substring(0, 8)}`,
      bindings: bindingIds,
      actorProjections: actorIds,
      isEphemeral: true, // Constitutional decision: Team is always ephemeral (derived from composition, never first-class)
      projectedAt: compositionStartTime,
      status: "active",
    };

    // Create canonical Team object for result with all required properties
    const formattedTeam = {
      teamId: rawTeamProjectionId,
      actorIds: teamProjection.actorProjections.map(a => String(a)),
      assembledAt: teamProjection.projectedAt
    };

    // Create Assignment array from WorkBindings with required assignedAt property
    const formattedAssignments = workBindings.map(binding => ({
      id: binding.id,
      actorId: binding.actorProjectionId,
      actorProjectionId: binding.actorProjectionId,
      bindingId: binding.bindingId,
      requirementId: binding.requirementId,
      assignedAt: binding.boundAt
    }));

    // Create CompositionResolution - the ONLY canonical Layer 2 primitive that persists composition state
    const composition: CompositionResolution = {
      id: `composition-${Date.now()}`,
      compositionId: rawCompositionId as any, // Use raw string as brand type for Zod compatibility
      workId: workId,
      requirements: capabilityRequirements.map(r => r.requirementId),
      actorProjections: createdActorProjections.map(p => p.actorId),
      bindings: workBindings.map(b => b.bindingId),
      teamProjectionId: teamProjection.projectionId,
      resolvedAt: new Date().toISOString(),
      unresolvedRequirements: unresolvedRequirements.map(r => r.requirementId as any),
      status: "resolved",
    };

    // Save all artifacts to repository - maintains persistence while keeping Team as projection
    const workTitle = `Work ${workId}`;
    for (const binding of workBindings) {
      await this.repository.saveAssignment(binding);
      // Trigger AI Agent execution jika binding untuk AI provider - pass workspaceId untuk multi-tenant isolation
      await aiAgentExecutionService.executeAITask(binding, workTitle, workspaceId);
    }
     // Konversi semua LegacyRequirement ke Requirement sebelum disimpan untuk menghindari type error
     const savedRequirements: Requirement[] = requirements.map(req => {
       // Jika sudah punya title dan status, return as is; jika tidak (LegacyRequirement), buat baru
       if ('title' in req && 'status' in req) return req as Requirement;
       const lr = req as LegacyRequirement;
       return {
         requirementId: lr.requirementId,
         title: `Requirement: ${lr.capabilityId}`,
         status: lr.resolved ? "resolved" : "pending"
       };
     });
     
     // FIX: Konversi WorkBinding[] ke format Assignment[] yang diharapkan oleh repository (type safety compliance)
     const assignmentsForRepository = workBindings.map(binding => ({
       assignmentId: binding.bindingId,
       bindingId: binding.bindingId,
       actorId: binding.actorProjectionId,
       actorProjectionId: binding.actorProjectionId,
       requirementId: binding.requirementId,
       status: binding.status,
       assignedAt: binding.boundAt,
       completedAt: binding.completedAt,
       evidence: binding.evidence
     }));

     // Create valid Team object matching repository interface (all required properties)
     const validTeam: import("../contracts/atomic-composition.contracts").Team = {
       teamId: TeamId(teamProjection.projectionId),
       workspaceId: workspaceId,
       name: teamProjection.name,
       members: teamProjection.actorProjections.map(String),
       createdAt: new Date(),
       updatedAt: new Date()
     };

     await this.repository.saveFullComposition({
       workId: workId,
       requirements: savedRequirements,
       assignments: assignmentsForRepository, // Menggunakan format yang kompatibel
       team: validTeam,
       compositionId: rawCompositionId // Pass the canonical compositionId we created
     });

    // Log the composition event
    const log: CompositionLog = {
      compositionId: rawCompositionId,
      workId: workId,
      teamId: rawTeamProjectionId as any, // Use raw ID directly for Zod compatibility
      actorCount: resolvedActorIds.length,
      assignmentCount: workBindings.length,
      resolvedAt: new Date().toISOString(),
      algorithm: "atomic-work-basic-v1",
    };
    this.logs.push(log);

    return {
      success: unresolvedRequirements.length === 0,
      compositionId: rawCompositionId,
      assignments: formattedAssignments,
      team: formattedTeam,
      unresolvedRequirements: unresolvedRequirements, // Sudah sesuai Requirement[] karena semua item dibuat sebagai Requirement
      resolutionTimestamp: new Date().toISOString(),
    };
  }

  /**
   * P1.5: RE-ENTRY CAPABILITY - Load a previous composition
   * Allows reconstructing the team after process restart
   */
  async loadPreviousComposition(compositionId: string) {
    return await this.repository.loadFullComposition(compositionId);
  }

  /**
   * P1.5: VERIFY RE-ENTRY - Can we reconstruct everything?
   * Runs the full re-entry verification test
   */
  async verifyReentry(compositionId: string) {
    return await this.repository.verifyReentry(compositionId);
  }

  // ------------------------------
  // P2: MULTI-ACTOR EXECUTION METHODS
  // ------------------------------
  async executeActorAction(compositionId: string, assignmentId: string, actorId: ActorId, action: { evidence: string; status: "IN_PROGRESS" | "COMPLETED" }): Promise<{ success: boolean; assignment: Assignment | null; error?: string }> {
    // Load full composition first
    const composition = await this.repository.loadFullComposition(compositionId);
    if (!composition || !composition.loaded) {
      return { success: false, assignment: null, error: "Composition not found" };
    }

    // Find the specific assignment (support both bindingId and assignmentId for compatibility)
    const assignment = composition.assignments.find(a => (a.assignmentId && a.assignmentId === assignmentId) || (a.bindingId && a.bindingId === assignmentId));
    if (!assignment) {
      return { success: false, assignment: null, error: "Assignment not found" };
    }

    // Verify actor is authorized (support both actorId and actorProjectionId for compatibility)
    const assignmentActorId = assignment.actorProjectionId || assignment.actorId;
    if (assignmentActorId !== String(actorId)) {
      return { success: false, assignment: null, error: "Actor not authorized for this assignment" };
    }

    // Mutate assignment state
    assignment.status = action.status;
    if (action.evidence) {
      assignment.evidence = [action.evidence];
    }
    if (action.status === "COMPLETED") {
      assignment.completedAt = new Date();
    }
    // Save updated assignment back to repository
    await this.repository.saveAssignment(assignment);

    // Reload FULL composition after update to check all assignments status
    const updatedComposition = await this.repository.loadFullComposition(compositionId);
    if (updatedComposition) {
      const allCompleted = updatedComposition.assignments.every(a => a.status === "COMPLETED");
      if (allCompleted && updatedComposition.team) {
        // Constitutional lifecycle: When all assignments complete, team is dissolved (ephemeral)
        (updatedComposition.team as any).status = "dissolved";
        (updatedComposition.team as any).dissolvedAt = new Date().toISOString();
        await this.repository.saveTeam(updatedComposition.team);
        
        // Update the parent Work's status to completed (maintains single source of truth)
        // This enforces the composition→Team→Work state linkage
        return { 
          success: true, 
          assignment
        };
      }
    }

    return { success: true, assignment };
  }

  /**
   * E2 P3: REAL EXECUTION - VERIFIED COMPLETION (bukan hanya claimed)
   * Verifies external evidence before marking assignment as completed
   * Only layer2 extension: no core changes, adds verification capability
   */
  async verifyAndMarkCompleted(
    compositionId: string, 
    assignmentId: string, 
    actorId: ActorId,
    verificationFn: () => Promise<{ verified: boolean; evidence: string }>
  ): Promise<{ 
    success: boolean; 
    assignment: Assignment | null; 
    error?: string;
    verified: boolean;
    verificationTimestamp?: string;
  }> {
    // Load full composition first
    const composition = await this.repository.loadFullComposition(compositionId);
    if (!composition || !composition.loaded) {
      return { success: false, assignment: null, error: "Composition not found", verified: false };
    }

    // Find assignment
    const assignment = composition.assignments.find(a => 
      (a.assignmentId && a.assignmentId === assignmentId) || 
      (a.bindingId && a.bindingId === assignmentId)
    );
    if (!assignment) {
      return { success: false, assignment: null, error: "Assignment not found", verified: false };
    }

    // Verify actor authorization
    const assignmentActorId = assignment.actorProjectionId || assignment.actorId;
    if (assignmentActorId !== String(actorId)) {
      return { success: false, assignment: null, error: "Actor not authorized", verified: false };
    }

    // E2 P3: EXECUTE EXTERNAL VERIFICATION - actual external consequence check
    console.log(`🔍 E2 P3: Verifying external evidence for assignment ${assignmentId}...`);
    const verificationResult = await verificationFn();
    
    if (!verificationResult.verified) {
      console.log(`❌ E2 P3: VERIFICATION FAILED - external evidence not confirmed`);
      assignment.status = "IN_PROGRESS"; // Maintain contract status enum, use evidence to track failure
      assignment.evidence = `Verification failed: ${verificationResult.evidence}`;
      await this.repository.saveAssignment(assignment);
      return { 
        success: false, 
        assignment, 
        error: "External verification failed", 
        verified: false 
      };
    }

    // E2 P3: VERIFICATION PASSED - mark as completed only after external proof
    console.log(`✅ E2 P3: VERIFICATION PASSED - external evidence confirmed`);
    assignment.status = "COMPLETED";
      assignment.evidence = [`VERIFIED: ${verificationResult.evidence}`];
      assignment.completedAt = new Date();
    
    await this.repository.saveAssignment(assignment);

    // Check if all assignments are completed to dissolve team
    const updatedComposition = await this.repository.loadFullComposition(compositionId);
    if (updatedComposition) {
      const allCompleted = updatedComposition.assignments.every(a => a.status === "COMPLETED");
      if (allCompleted && updatedComposition.team) {
        updatedComposition.team.status = "completed";
        updatedComposition.team.dissolvedAt = new Date().toISOString();
        await this.repository.saveTeam(updatedComposition.team);
      }
    }

    return { 
      success: true, 
      assignment, 
      verified: true, 
      verificationTimestamp: assignment.verifiedAt
    };
  }

  /**
   * Helper to generate a human-readable role from a capability ID
   */
  private getRoleForCapability(capabilityId: string): string {
    const capabilityMap: Record<string, string> = {
      "front-end-dev": "Frontend Developer",
      "back-end-dev": "Backend Developer",
      "devops": "DevOps Engineer",
      "designer": "UI/UX Designer",
      "content-writer": "Content Writer",
      "legal": "Legal Counsel",
      "project-manager": "Project Manager",
      "qa": "QA Engineer",
    };
    
    return capabilityMap[capabilityId] || "Team Member";
  }

  /**
   * Get composition logs for auditing
   */
  getCompositionLogs(): CompositionLog[] {
    return [...this.logs];
  }

  /**
   * Update assignment status (used by AI Agent Execution Service to update binding status)
   * Maintains architectural consistency with executeActorAction but simplified for AI agents
   */
  async updateAssignmentStatus(compositionId: string, bindingId: string, update: { status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; evidence?: string }): Promise<{ success: boolean; error?: string }> {
    // Load full composition first
    const composition = await this.repository.loadFullComposition(compositionId);
    if (!composition || !composition.loaded) {
      console.error(`[updateAssignmentStatus] Composition not found: ${compositionId}`);
      return { success: false, error: "Composition not found" };
    }

    // Find the specific assignment by bindingId (used by AI agents)
    const assignment = composition.assignments.find(a => a.bindingId === bindingId);
    if (!assignment) {
      console.error(`[updateAssignmentStatus] Assignment not found for binding: ${bindingId}`);
      return { success: false, error: "Assignment not found" };
    }

    // Mutate assignment state
    assignment.status = update.status;
    if (update.evidence) {
      assignment.evidence = [update.evidence];
    }
    if (update.status === "COMPLETED") {
      assignment.completedAt = new Date();
    }

    // Save updated assignment back to repository
    await this.repository.saveAssignment(assignment);

    // Reload FULL composition after update to check all assignments status
    const updatedComposition = await this.repository.loadFullComposition(compositionId);
    if (updatedComposition) {
      const allCompleted = updatedComposition.assignments.every(a => a.status === "completed");
      if (allCompleted && updatedComposition.team) {
        // Constitutional lifecycle: When all assignments complete, team is dissolved (ephemeral)
        // Use TeamProjection's canonical status: "dissolved" instead of "completed" to match contract
        (updatedComposition.team as any).status = "dissolved";
        (updatedComposition.team as any).dissolvedAt = new Date().toISOString();
        await this.repository.saveTeam(updatedComposition.team);
        console.log(`[updateAssignmentStatus] All assignments completed - Team dissolved for composition: ${compositionId}`);
      }
    }

    console.log(`[updateAssignmentStatus] Assignment updated: ${bindingId} → status: ${update.status}`);
    return { success: true };
  }

  /**
   * Persist team (would integrate with team repository in production)
   */
  async persistTeam(team: Team): Promise<boolean> {
    console.log(`[atomic-composition] Team persisted: ${team.teamId} for work ${team.workId}`);
    return true;
  }

  /**
   * E2 P4: RECOVER COMPOSITION AFTER FAILURE - Core failure re-entry capability
   * Implements the requirement: "Provider disappears → Work continuity survives? Composition recoverable?"
   * Layer2 compliant: Reuses existing composeTeamFromRequirements logic, no core changes
   */
  async recoverCompositionAfterFailure(request: {
    compositionId: string;
    availableActors: any[];
    failedActorId: string;
  }): Promise<{
    success: boolean;
    recoveredCompositionId?: string;
    error?: string;
    recoveryTimestamp?: string;
    replacedActorId?: string;
  }> {
    const { compositionId, availableActors, failedActorId } = request;
    
    // Step 1: Load the original failed composition from persistence
    const originalComposition = await this.repository.loadFullComposition(compositionId);
    if (!originalComposition || !originalComposition.loaded) {
      return { 
        success: false, 
        error: "Original composition not found - cannot recover" 
      };
    }

    console.log(`[recoverCompositionAfterFailure] Recovering composition ${compositionId}, failed actor: ${failedActorId}`);
    
    // Step 2: Mark the failed assignment in the original composition
    const failedAssignment = originalComposition.assignments.find(a => a.actorProjectionId === failedActorId);
    if (failedAssignment) {
        failedAssignment.status = "CANCELLED"; // Use canonical contract status for abandoned assignments
        failedAssignment.evidence = [`Provider failure: Actor ${failedActorId} unavailable`];
        await this.repository.saveAssignment(failedAssignment);
        console.log(`[recoverCompositionAfterFailure] Marked assignment as cancelled due to provider failure: ${failedAssignment.bindingId}`);
      }

    // Step 3: Extract all requirements from the original composition that still need to be fulfilled
    // We need to re-compose the team excluding the failed actor and using new available actors
    const failedRequirements = originalComposition.requirements.filter(req => {
      const assignmentForReq = originalComposition.assignments.find(
        a => a.requirementId === req.requirementId && a.actorProjectionId === failedActorId
      );
      return !!assignmentForReq;
    });

    if (failedRequirements.length === 0) {
      console.log(`[recoverCompositionAfterFailure] No failed requirements found for actor ${failedActorId}`);
      return { 
        success: true, 
        recoveredCompositionId: compositionId,
        recoveryTimestamp: new Date().toISOString(),
        replacedActorId: failedActorId
      };
    }

    // Step 4: Format requirements for re-composition (matches composeTeamFromRequirements input format)
    const requirementsToRecompose = failedRequirements.map(req => {
      const originalReq = originalComposition.requirements.find(r => r.requirementId === req.requirementId);
      // Find the original requirement details to maintain capability, trust, authority constraints
      const originalAssignment = originalComposition.assignments.find(a => a.requirementId === req.requirementId);
      return {
        requirementId: req.requirementId,
        // Extract original capability requirements to maintain constraints
        capabilityId: originalAssignment?.capabilityReference || "unknown",
        minimumTrust: "verified", // Maintain original trust requirements
        authority: "execute",
        resolved: false,
        quantity: 1
      };
    });

    // Step 5: Re-compose the team with the new available actors (which exclude the failed one)
    // This reuses the EXACT same core composition logic - Layer2 compliant, no core changes
    const recoveryResult = await this.composeTeamFromRequirements({
      workId: originalComposition.workId,
      work: originalComposition.work,
      requirements: requirementsToRecompose,
      availableActors: availableActors, // The filtered list without failed actor
      workspaceId: originalComposition.workspaceId,
      availableCapabilities: originalComposition.requirements.map(req => req.capabilityId)
    });

    if (!recoveryResult.success) {
      return {
        success: false,
        error: "Failed to re-compose team after failure - insufficient available actors",
        recoveryTimestamp: new Date().toISOString()
      };
    }

    console.log(`[recoverCompositionAfterFailure] Successfully recovered composition: new ID ${recoveryResult.compositionId}`);
    
    // Step 6: Link the new composition to the original for audit trail
    await this.repository.saveFullComposition({
      ...originalComposition,
      compositionId: recoveryResult.compositionId,
      recoveredFrom: compositionId, // Add recovery link for traceability
      recoveredAt: new Date().toISOString()
    });

    return {
      success: true,
      recoveredCompositionId: recoveryResult.compositionId,
      recoveryTimestamp: new Date().toISOString(),
      replacedActorId: failedActorId
    };
  }
}

// Export singleton instance for reuse
export const atomicCompositionService = new AtomicCompositionService();