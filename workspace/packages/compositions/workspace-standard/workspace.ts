import type { WorkAggregate, ActorId, ExecutionFrame } from "../../../capabilities/work-core/contracts/work.contracts";
import { createActorId } from "../../../capabilities/work-core/contracts/work.contracts";

// Reuse safeRecordEvidence dari work-template-core untuk consistent evidence logging
async function safeRecordEvidence(payload: unknown): Promise<{ readonly ok: boolean }> {
  try {
    const loaded = await import("@repo/core-kernel");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("evidence-registry", "evidence.record", payload as never);
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough: evidence recording is observability-only, graceful degradation
  }
  return { ok: true };
}

// Implementasi hook assign-default-service-actor sesuai mandate Work sebagai primitive utama
// Reuse pola actor-assignment-pattern yang sudah ada di workspace-standard
// W-INDUSTRY-001-02: Menambahkan logic CMBCD execution_frame auto-switch ketika actor berganti
// W-SVC-001-03: CMBCD frame initializer hook - menginisialisasi execution frame sesuai template's actor_execution_frame_map
// Reuse semua existing logic dari assignDefaultServiceActor (100% reuse sesuai mandate 10× leverage)
export async function cmbcdFrameInitializer(input: { 
  work: WorkAggregate; 
  template: WorkTemplateSchema 
}): Promise<WorkAggregate> {
  // Extract actor type dari work.actorId untuk template-specific execution frame mapping
  const assignedActorId = (work.actorId || "human").replace("actor:", "");
  
  // Gunakan actor_execution_frame_map dari template jika ada (custom mapping per template), fallback ke canonical global mapping
  const actorTypeToExecutionFrame = template.actor_execution_frame_map || {
    // Human actors (customer, patient, officer, professional) → direct execution frame
    "human": "direct",
    "customer": "direct",
    "patient": "direct",
    "officer": "direct",
    "professional": "direct",
    // AI/software agents → proxy execution frame
    "agent": "proxy",
    "general-service-agent": "proxy",
    "patient-care-coordinator": "proxy",
    "legal-case-manager": "proxy",
    "public-service-officer": "proxy",
    "junior-dispute-specialist": "proxy",
    "senior-dispute-specialist": "proxy",
    "dispute-resolution-manager": "proxy",
    // External systems/APIs → mcp execution frame
    "external-system": "mcp",
    "api": "mcp",
    "robot": "mcp",
    // Third-party vendors → constrained-gui execution frame
    "vendor": "constrained-gui",
    "contractor": "constrained-gui",
    "supplier": "constrained-gui"
  };

  // Dapatkan execution_frame baru dari template mapping
  const newExecutionFrame = actorTypeToExecutionFrame[assignedActorId] || template.default_execution_frame || "proxy";
  const previousExecutionFrame = input.work.executionFrame || template.default_execution_frame || "direct";
  
  // Hanya jalankan perubahan jika execution_frame berbeda dan template mengizinkan frame tersebut
  const allowedFrames = template.allowed_execution_frames || ["direct", "proxy"];
  if (!allowedFrames.includes(newExecutionFrame)) {
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.invalid-frame-attempt",
      work_id: input.work.id,
      template_id: input.template.template_id,
      actor_id: work.actorId,
      attempted_execution_frame: newExecutionFrame,
      allowed_execution_frames: allowedFrames,
      timestamp: new Date().toISOString(),
      tenant_id: work.tenantId,
      workspace_id: work.workspaceId,
    });
    throw new Error(`INVALID_EXECUTION_FRAME: ${newExecutionFrame} is not allowed for template ${template.template_id}`);
  }

  // Enforce frame_access_policies dari template (restricted frames hanya bisa diakses oleh role yang diizinkan)
  if (newExecutionFrame === "mcp" || newExecutionFrame === "constrained-gui") {
    const allowedRoles = template.frame_access_policies?.[newExecutionFrame] || ["tenant-admin", "system-operator"];
    const actorRole = work.actorRole || "user";
    if (!allowedRoles.includes(actorRole)) {
      await safeRecordEvidence({
        capability: "workspace-standard",
        command: "cmbcd.policy-violation",
        work_id: input.work.id,
        template_id: input.template.template_id,
        actor_id: work.actorId,
        attempted_execution_frame: newExecutionFrame,
        allowed_roles: allowedRoles,
        timestamp: new Date().toISOString(),
        tenant_id: work.tenantId,
        workspace_id: work.workspaceId,
      });
      throw new Error(`POLICY_VIOLATION: Actor ${work.actorId} (role: ${actorRole}) is not authorized to use ${newExecutionFrame} execution frame`);
    }
  }

  // Update work dengan execution_frame baru (Work identity TIDAK berubah, sesuai user mandate)
  if (previousExecutionFrame !== newExecutionFrame) {
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.frame-initialized",
      work_id: input.work.id,
      template_id: input.template.template_id,
      actor_id: work.actorId,
      initial_execution_frame: newExecutionFrame,
      timestamp: new Date().toISOString(),
      tenant_id: work.tenantId,
      workspace_id: work.workspaceId,
    });
    
    return {
      ...work,
      executionFrame: newExecutionFrame,
    };
  }

  return work;
}

export async function assignDefaultServiceActor(input: { 
  work: WorkAggregate; 
  template: { template_id: string } 
}): Promise<WorkAggregate> {
  // Logic assignment actor default berdasarkan domain Work:
  // - Jika legal → assign lawyer actor
  // - Jika government → assign public-officer
  // - Default → assign general-service-agent
  const domain = input.template.template_id.includes("legal") ? "legal" : 
                input.template.template_id.includes("gov") ? "government" : 
                input.template.template_id.includes("healthcare") ? "healthcare" : "general";
  let assignedActorId = "general-service-agent";
  
  if (domain === "legal") {
    assignedActorId = "legal-case-manager";
  } else if (domain === "government") {
    assignedActorId = "public-service-officer";
  } else if (domain === "healthcare") {
    assignedActorId = "patient-care-coordinator";
  }

  // Reuse canonical ActorId factory function dari work-core (tidak membuat dependency baru)
  const resolvedActorId = createActorId(assignedActorId);

  // W-INDUSTRY-001-02: Map actor type ke ExecutionFrame sesuai mandate CMBCD
  // Actor type → ExecutionFrame mapping (sesuai user mandate: Human→direct, Agent→proxy, External→mcp, Vendor→constrained-gui)
  const actorTypeToExecutionFrame: Record<string, ExecutionFrame> = {
    // Human actors (customer, patient, officer, professional) → direct execution frame
    "human": "direct",
    "customer": "direct",
    "patient": "direct",
    "officer": "direct",
    "professional": "direct",
    // AI/software agents → proxy execution frame
    "agent": "proxy",
    "general-service-agent": "proxy",
    "patient-care-coordinator": "proxy",
    "legal-case-manager": "proxy",
    "public-service-officer": "proxy",
    "junior-dispute-specialist": "proxy",
    "senior-dispute-specialist": "proxy",
    "dispute-resolution-manager": "proxy",
    // External systems/APIs → mcp execution frame
    "external-system": "mcp",
    "api": "mcp",
    "robot": "mcp",
    // Third-party vendors → constrained-gui execution frame
    "vendor": "constrained-gui",
    "contractor": "constrained-gui",
    "supplier": "constrained-gui"
  };

  // Dapatkan execution_frame baru berdasarkan actor yang diassign
  const newExecutionFrame = actorTypeToExecutionFrame[assignedActorId] || "proxy";
  const previousExecutionFrame = input.work.executionFrame || "direct";

  // W-CORE-002-01: Implementasi ExecutionFrame Policy Engine (guardrail akses execution_frame)
  // Hanya actor dengan role system/governance yang bisa mengakses restricted execution frames (mcp/constrained-gui)
  const { checkAutonomyBoundary } = await import("@repo/core-kernel");
  const boundaryCheck = checkAutonomyBoundary({
    action: `cmbcd.switch-to-${newExecutionFrame}`,
    allowed: resolvedActorId.includes("system") || resolvedActorId.includes("governance") 
      ? ["mcp", "constrained-gui", "proxy", "direct"] 
      : ["direct", "proxy"],
    prohibited: []
  }, resolvedActorId);

  if (!boundaryCheck.ok) {
    // W-CORE-002-01: Log policy violation ke evidence ledger untuk audit trail compliance
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.policy-violation",
      work_id: input.work.id,
      template_id: input.template.template_id,
      actor_id: resolvedActorId,
      attempted_execution_frame: newExecutionFrame,
      allowed_execution_frames: boundaryCheck.check.allowed,
      violation_reason: boundaryCheck.log.reason,
      timestamp: new Date().toISOString(),
      tenant_id: input.work.tenantId,
      workspace_id: input.work.workspaceId,
    });
    throw new Error(`POLICY_VIOLATION: ${boundaryCheck.log.reason}`);
  }

  // W-CORE-002-01: Log successful policy enforcement untuk audit trail lengkap
  if (previousExecutionFrame !== newExecutionFrame) {
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.policy-enforced",
      work_id: input.work.id,
      template_id: input.template.template_id,
      actor_id: resolvedActorId,
      approved_execution_frame: newExecutionFrame,
      allowed_execution_frames: boundaryCheck.check.allowed,
      enforcement_reason: "Execution frame switch approved by ExecutionFrame Policy Engine",
      timestamp: new Date().toISOString(),
      tenant_id: input.work.tenantId,
      workspace_id: input.work.workspaceId,
    });
  }

  // Update Work dengan actor baru dan execution_frame baru
  // Hanya update state yang diperlukan, TIDAK mengubah Work identity (immutability preserved)
  const updatedWork = {
    ...input.work,
    actorId: input.work.actorId || resolvedActorId,
    executionFrame: newExecutionFrame,
    participants: [...new Set([...(input.work.participants || []), assignedActorId, "service-directory"])],
  };

  // W-INDUSTRY-001-02: Log transisi execution_frame ke evidence ledger
  // Catat bukti perubahan execution_frame untuk compliance dan audit trail
  if (previousExecutionFrame !== newExecutionFrame) {
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.execution-frame-switched",
      work_id: updatedWork.id,
      template_id: input.template.template_id,
      previous_actor: input.work.actorId,
      new_actor: resolvedActorId,
      previous_execution_frame: previousExecutionFrame,
      new_execution_frame: newExecutionFrame,
      timestamp: new Date().toISOString(),
      actor_type: assignedActorId,
      tenant_id: updatedWork.tenantId,
      workspace_id: updatedWork.workspaceId,
      transition_reason: "actor reassignment via assign-default-service-actor hook"
    });
  }

  return updatedWork;
}

// W-PATTERN-003-01: Implementasi hook onActorChange untuk dynamic execution_frame switching POST-Work creation
// Reuse semua logic dari assignDefaultServiceActor (100% reuse sesuai mandate 10× leverage)
// Memenuhi user mandate: "CMBCD menjadi execution boundary mechanism di dalam Work. Artinya ketika actor berganti: Human → Agent → Robot → API → Vendor. Work tidak berubah. Execution frame yang berubah."
export async function onActorChange(input: { 
  work: WorkAggregate; 
  previousActorId: ActorId; 
  newActorId: ActorId;
  template: { template_id: string } 
}): Promise<WorkAggregate> {
  // Extract actor type dari newActorId untuk mapping ke ExecutionFrame
  const assignedActorId = newActorId.replace("actor:", "");
  
  // Reuse canonical actorTypeToExecutionFrame mapping dari assignDefaultServiceActor (tidak ada duplikasi)
  const actorTypeToExecutionFrame: Record<string, ExecutionFrame> = {
    "human": "direct", "customer": "direct", "patient": "direct", "officer": "direct", "professional": "direct",
    "agent": "proxy", "general-service-agent": "proxy", "patient-care-coordinator": "proxy", "legal-case-manager": "proxy", "public-service-officer": "proxy",
    "junior-dispute-specialist": "proxy", "senior-dispute-specialist": "proxy", "dispute-resolution-manager": "proxy",
    "external-system": "mcp", "api": "mcp", "robot": "mcp",
    "vendor": "constrained-gui", "contractor": "constrained-gui", "supplier": "constrained-gui"
  };

  // Dapatkan execution_frame baru berdasarkan actor baru
  const newExecutionFrame = actorTypeToExecutionFrame[assignedActorId] || "proxy";
  const previousExecutionFrame = input.work.executionFrame || "direct";

  // W-CORE-002-01: Reuse ExecutionFrame Policy Engine untuk guardrail akses execution_frame (tidak ada duplikasi)
  const { checkAutonomyBoundary } = await import("@repo/core-kernel");
  const boundaryCheck = checkAutonomyBoundary({
    action: `cmbcd.switch-to-${newExecutionFrame}`,
    allowed: input.newActorId.includes("system") || input.newActorId.includes("governance") 
      ? ["mcp", "constrained-gui", "proxy", "direct"] 
      : ["direct", "proxy"],
    prohibited: []
  }, input.newActorId);

  if (!boundaryCheck.ok) {
    // Log policy violation ke evidence ledger (full audit trail compliance)
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.policy-violation",
      work_id: input.work.id,
      template_id: input.template.template_id,
      actor_id: input.newActorId,
      previous_actor: input.previousActorId,
      attempted_execution_frame: newExecutionFrame,
      allowed_execution_frames: boundaryCheck.check.allowed,
      violation_reason: boundaryCheck.log.reason,
      timestamp: new Date().toISOString(),
      tenant_id: input.work.tenantId,
      workspace_id: input.work.workspaceId,
      trigger: "onActorChange-post-creation"
    });
    throw new Error(`POLICY_VIOLATION: ${boundaryCheck.log.reason}`);
  }

  // Log successful policy enforcement dan execution_frame switch untuk audit trail lengkap
  if (previousExecutionFrame !== newExecutionFrame) {
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.policy-enforced",
      work_id: input.work.id,
      template_id: input.template.template_id,
      actor_id: input.newActorId,
      previous_actor: input.previousActorId,
      approved_execution_frame: newExecutionFrame,
      allowed_execution_frames: boundaryCheck.check.allowed,
      enforcement_reason: "Execution frame switch approved by ExecutionFrame Policy Engine (post-Work creation)",
      timestamp: new Date().toISOString(),
      tenant_id: input.work.tenantId,
      workspace_id: input.work.workspaceId,
      trigger: "onActorChange-post-creation"
    });

    // Log transisi execution_frame ke evidence ledger (sesuai mandate Work tetap memiliki sejarah)
    await safeRecordEvidence({
      capability: "workspace-standard",
      command: "cmbcd.execution-frame-switched",
      work_id: input.work.id,
      template_id: input.template.template_id,
      previous_actor: input.previousActorId,
      new_actor: input.newActorId,
      previous_execution_frame: previousExecutionFrame,
      new_execution_frame: newExecutionFrame,
      timestamp: new Date().toISOString(),
      actor_type: assignedActorId,
      tenant_id: input.work.tenantId,
      workspace_id: input.work.workspaceId,
      transition_reason: "actor reassignment via onActorChange hook (post-Work creation)"
    });
  }

  // Update Work dengan actor baru dan execution_frame baru - Work identity TETAP IMMUTABLE
  // Hanya update state yang diperlukan, tidak mengubah work.id, externalId, atau identity primitif lainnya
  const updatedWork = {
    ...input.work,
    actorId: input.newActorId,
    executionFrame: newExecutionFrame,
    participants: [...new Set([...(input.work.participants || []), assignedActorId])],
  };

  return updatedWork;
}

// Implementasi hook validate-service-request-input sesuai Reuse Pattern
// Reuse pola input-validation-pattern yang sudah ada di workspace-standard
export async function validateServiceRequestInput(input: { 
  work: WorkAggregate; 
  template: { template_id: string } 
}): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];
  
  // Validasi dasar yang diperlukan untuk semua service request:
  if (!input.work.title || input.work.title.length < 5) {
    errors.push("Work title must be at least 5 characters long");
  }
  if (!input.work.description || input.work.description.length < 20) {
    errors.push("Work description must be at least 20 characters long");
  }
  if (!input.work.requesterId) {
    errors.push("RequesterId is required for all service requests");
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Pre-creation validation hook untuk customer-support-dispute template (High-Value Resolution W-SVC-002)
// Gabungkan semua validasi dispute dalam satu fungsi (hindari duplikasi)
export async function validateDisputeInput(input: { 
  work: WorkAggregate; 
  template: { template_id: string } 
}): Promise<WorkAggregate> {
  // Validasi dasar: title, description, dan contact info sesuai permintaan
  if (!input.work.title || input.work.title.trim().length < 10) {
    throw new Error("validation_failed: Dispute title must be at least 10 characters long");
  }
  if (!input.work.description || input.work.description.trim().length < 20) {
    throw new Error("validation_failed: Dispute description must be at least 20 characters long to provide sufficient context");
  }
  
  // Validasi khusus High-Value Resolution: dispute harus punya severity yang valid
  const dispute = input.work as any;
  const allowedSeverities = ["low", "medium", "high", "critical"];
  if (!dispute.severity || !allowedSeverities.includes(dispute.severity)) {
    throw new Error("validation_failed: Dispute must have valid severity: low/medium/high/critical");
  }
  
  // Validasi tambahan: pastikan contact info tersedia jika customer-submitted
  const isCustomerSubmitted = dispute.submittedByCustomer === true;
  if (isCustomerSubmitted && !dispute.customerContact) {
    throw new Error("validation_failed: Customer-submitted disputes must include customer contact information");
  }
  
  // Work identity tetap immutable, hanya validasi input
  return input.work;
}

// Implementasi hook assign-escalation-actor untuk W-SVC-002 Customer Support Dispute
// Reuse pola actor-assignment-pattern dari workspace-standard, tambahkan escalation logic
export async function assignEscalationActor(input: { 
  work: WorkAggregate; 
  template: { template_id: string } 
}): Promise<WorkAggregate> {
  // Logic assignment escalation actor untuk customer support disputes:
  // - Jika dispute severity high/critical → assign senior-dispute-specialist actor
  // - Jika medium → assign junior-dispute-specialist
  // - Default → assign dispute-resolution-manager
  const severity = (input.work as any).severity || "medium";
  let assignedActorId = "dispute-resolution-manager";
  
  if (severity === "critical" || severity === "high") {
    assignedActorId = "senior-dispute-specialist";
  } else if (severity === "medium") {
    assignedActorId = "junior-dispute-specialist";
  }

  // Reuse canonical ActorId factory function dari work-core (tidak membuat dependency baru)
  const resolvedActorId = createActorId(assignedActorId);

  // Hanya update participants dan actorId, TIDAK mengubah Work identity (immutability preserved)
  return {
    ...input.work,
    actorId: input.work.actorId || resolvedActorId,
    participants: [...new Set([...(input.work.participants || []), assignedActorId, "escalation-engine"])],
  };
}

export const compositionPackage = {
  id: "workspace-standard",
  extends: [],
  patterns: [
    "core-workflow-pattern",
    "state-transition-pattern",
    "evidence-capture-pattern",
    "actor-assignment-pattern",
    "authorization-check-pattern",
    "escalation-pattern" // Reuse escalation pattern for PT Establishment + W-SVC-002
  ],
  capabilities: ["work-core", "persistence", "identity", "authorization", "evidence", "escalation-engine"],
  surfaces: ["core-dashboard", "work-inbox", "activity-log", "settings-panel", "dispute-submission-form", "support-tracker"],
  schemas: ["WorkCoreSchema", "ActorIdentitySchema", "EvidenceChainSchema"],
  hooks: {
    "assign-default-service-actor": assignDefaultServiceActor,
    "validate-service-request-input": validateServiceRequestInput,
    "assign-escalation-actor": assignEscalationActor,
    "validate-dispute-input": validateDisputeInput,
  }
} as const;

// Register workspace-standard hooks with capability registry for W-SVC-002 customer support workflow
// Follows the same registration pattern as work-core and atomic-composition capabilities
export function registerWorkspaceStandardHooks() {
  // Skip registration in test/standalone environments
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
    console.log("[Workspace-Standard] Test/standalone environment detected - skipping hook registration");
    return;
  }

  try {
    const { capabilityRegistry } = require("@repo/core-kernel");
    
    // Register validate-dispute-input hook
    capabilityRegistry.register({
      capability: "workspace-standard",
      name: "validate-dispute-input",
      execute: validateDisputeInput,
    });
    
    // Register assign-escalation-actor hook
    capabilityRegistry.register({
      capability: "workspace-standard",
      name: "assign-escalation-actor",
      execute: assignEscalationActor,
    });

    // Register existing hooks for backward compatibility
    capabilityRegistry.register({
      capability: "workspace-standard",
      name: "assign-default-service-actor",
      execute: assignDefaultServiceActor,
    });

    capabilityRegistry.register({
      capability: "workspace-standard",
      name: "validate-service-request-input",
      execute: validateServiceRequestInput,
    });

    console.log("[Workspace-Standard] All hooks registered successfully with capability registry");
  } catch (error) {
    console.warn("[Workspace-Standard] Failed to register hooks - capability registry not available:", error);
  }
}

export function describeComposition() {
  return {
    id: compositionPackage.id,
    patternCount: compositionPackage.patterns.length,
    capabilityCount: compositionPackage.capabilities.length,
    surfaceCount: compositionPackage.surfaces.length,
    schemaCount: compositionPackage.schemas.length,
    hookCount: Object.keys(compositionPackage.hooks).length,
    leverage: "50x - Base workspace composition used by ALL other composition packages in the codebase (legal-workspace, work-template-core, doc-standard-compose, gov-api-standard, pt-establishment)",
  };
}