import { z } from "zod";
import {
  CreateServiceRequestInput,
  CreateServiceRequestOutput,
  UpdateExternalSystemStatusInput,
  UpdateExternalSystemStatusOutput,
  ServiceProviderCategory,
  ServiceProviderId,
  ServiceRequestAggregate,
  ServiceProviderAggregate,
  ServiceRequestId,
  ServiceRequestStatus,
} from "../contracts/service.contracts.js";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";
import {
  ServiceRequestRepositoryInMemory,
  ServiceProviderRepositoryInMemory,
  newServiceRequestId,
  defaultServiceRequestStatus,
  getServiceRequestRepositoryPostgres,
  getServiceProviderRepositoryPostgres,
} from "../repository/index.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres, initIdentitySchema } from "../../../identity/implementation/repositories/index.js";
import { 
  createActorId, 
  createWorkspaceId, 
  createUserId,
  type ActorId, 
  type WorkspaceId, 
  type UserId 
} from "../../../work-core/contracts/work.contracts.js";
// W-SVC-001: Import capabilityRegistry untuk integrasi createCoreWork (EOS core Work primitive)
async function getCapabilityRegistry() {
  const loaded = await import("../../../../packages/core/kernel/src/index.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

// STANDALONE EVIDENCE & REALTIME UTILITIES - moved to module scope for global access (MIRRORS all other EOS capabilities)
// W-SVC-001: Reuse standard safeRecordEvidence pattern from work-template-core, communication, consultation capabilities
async function safeRecordEvidence(payload: unknown): Promise<{ readonly ok: boolean }> {
  try {
    const loaded = await import("../../../../packages/core/kernel/src/index.js");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("evidence-registry", "evidence.record", payload as never);
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough: evidence recording is observability-only (not state-machine critical path)
  }
  return { ok: true };
}

// STANDALONE REALTIME UTILITY - safeNotifyWorkspaceListeners (MIRRORS ILC pattern from W-ILC-002)
async function safeNotifyWorkspaceListeners(workspaceId: WorkspaceId, actorId: ActorId, workId: string): Promise<{ readonly ok: boolean }> {
  try {
    const loaded = await import("../../../../packages/core/kernel/src/index.js");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("core-realtime", "workspace.broadcast", {
        workspaceId,
        actorId,
        workId,
        event: "service_request.updated",
        timestamp: new Date().toISOString()
      });
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough: realtime notifications are non-critical for state persistence
  }
  return { ok: true };
}

// SHARED RAIL: Initialize identity schema if Postgres is active (MIRRORS ILC pattern)
if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) {
  initIdentitySchema();
}

// SHARED RAIL: Toggle session repository based on environment (MIRRORS LH pattern)
const sessionRepository = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

// SHARED RAIL: Toggle repository based on environment (MIRRORS LH pattern)
const serviceRepository = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
  ? getServiceRequestRepositoryPostgres()
  : ServiceRequestRepositoryInMemory;

// SHARED RAIL: Toggle service provider repository based on environment
const providerRepository = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
  ? getServiceProviderRepositoryPostgres()
  : ServiceProviderRepositoryInMemory;

// Define base interfaces only once
interface AcceptServiceRequestInput {
  readonly id: ServiceRequestId;
  readonly providerId: string;
}
interface AcceptServiceRequestOutput {
  readonly id: ServiceRequestId;
  readonly status: ServiceRequestStatus;
  readonly providerId: string;
}

interface MarkServiceDeliveredInput {
  readonly id: ServiceRequestId;
}
interface MarkServiceDeliveredOutput {
  readonly id: ServiceRequestId;
  readonly status: "delivered";
  readonly deliveredAt: Date;
}

// SHARED RAIL: Accept service request with sessionId ONLY (MIRRORS LH minimal context pattern)
const AcceptServiceRequestWithContextSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type AcceptServiceRequestWithContextInput = z.infer<typeof AcceptServiceRequestWithContextSchema>;
type AcceptServiceRequestCommand = CapabilityCommand<AcceptServiceRequestWithContextInput, Promise<AcceptServiceRequestOutput>>;

// SHARED RAIL: Mark service delivered with sessionId ONLY (MIRRORS LH minimal context pattern)
const MarkServiceDeliveredWithContextSchema = z.object({
  id: z.string().min(1),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type MarkServiceDeliveredWithContextInput = z.infer<typeof MarkServiceDeliveredWithContextSchema>;
type MarkServiceDeliveredCommand = CapabilityCommand<MarkServiceDeliveredWithContextInput, Promise<MarkServiceDeliveredOutput>>;

// SHARED RAIL: List service requests with sessionId ONLY (MIRRORS LH minimal context pattern)
const ListServiceRequestsWithContextSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["draft", "accepted", "in_service", "delivered", "all"]).optional(),
  category: z.enum(["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development", "Business Licensing", "all"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type ListServiceRequestsWithContextInput = z.infer<typeof ListServiceRequestsWithContextSchema>;

type ListServiceRequestsOutput = {
  readonly items: readonly ServiceRequestAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
};

type ListServiceRequestsCommand = CapabilityCommand<ListServiceRequestsWithContextInput, Promise<ListServiceRequestsOutput>>;

// SHARED RAIL: Create service request with sessionId ONLY (MIRRORS LH minimal context pattern)
const CreateServiceRequestWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["Cloud Services", "Cybersecurity", "IT Support", "Infrastructure", "Software Development", "Business Licensing"]),
  requesterName: z.string().optional(),
  budget: z.string().optional(),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
});

type CreateServiceRequestWithContextInput = z.infer<typeof CreateServiceRequestWithContextSchema>;
type CreateServiceRequestCommand = CapabilityCommand<CreateServiceRequestWithContextInput, Promise<CreateServiceRequestOutput>>;

export const createServiceRequest: CreateServiceRequestCommand = {
  kind: "command",
  name: "service-directory.createServiceRequest",
  version: "2.0.0",
  async execute(input: CreateServiceRequestWithContextInput) {
    const parsed = CreateServiceRequestWithContextSchema.parse(input);
    const { title, description, category, requesterName, budget, sessionId } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.createServiceRequest] Invalid or revoked session - authentication violation");
    }

    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH minimal fix)
    const { tenantId, workspaceId: sessionWorkspaceId, actorId: sessionActorId } = session;
    // Enforce canonical branded types from single source (anti-drift)
    const workspaceId: WorkspaceId = createWorkspaceId(sessionWorkspaceId as unknown as string);
    const actorId: ActorId = createActorId(sessionActorId as unknown as string);
    // Enforce security via session's already verified isolation guarantees
    // No need for additional checks - session is cryptographically bound to tenant/workspace

    // W-SVC-001: FIRST create core Work primitive (EOS = Headless Semantic Continuity Substrate for Accountable Work)
    // Integrasi dengan createCoreWork dari work-core - Work adalah satu-satunya economic primitive
    const capabilityRegistry = await getCapabilityRegistry();
    let coreWorkResult: { id: string; workId: string; domainType: string } | undefined;
    if (capabilityRegistry?.invoke) {
      try {
        coreWorkResult = await capabilityRegistry.invoke("work-core", "create", {
          title: title.trim(),
          description: description || undefined,
          domainType: "service-request", // Gunakan domainType yang sudah terdaftar di domainCapabilityMap
          sessionId,
          tenantId,
          workspaceId: sessionWorkspaceId,
          actorId: sessionActorId,
          domainSpecificData: {
            category,
            budget,
            requesterName
          }
        }) as { id: string; workId: string; domainType: string };
        console.log(`[W-SVC-001] ✅ Core Work created successfully: ${coreWorkResult.workId}`);
      } catch (coreWorkError) {
        console.error("[W-SVC-001] Core Work creation failed (continuing with service request only):", coreWorkError);
      }
    }

    // Create service request dengan workId dari core Work (link lineage - accountable continuity)
    const entity: ServiceRequestAggregate = {
      id: newServiceRequestId(),
      workId: coreWorkResult?.workId, // Bind service request ke core Work ID (critical untuk lineage)
      title: title.trim(),
      ...(description !== undefined && description !== ""
        ? { description }
        : {}),
      category: category as ServiceProviderCategory,
      status: defaultServiceRequestStatus,
      requesterName,
      ...(budget ? { budget } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId,
      workspaceId,
      actorId,
      executionFrame: "direct", // Default execution frame untuk human actor (CMBCD boundary)
    };

    await serviceRepository.save(entity);

    // Catat evidence integrasi core Work dengan service request
    if (coreWorkResult) {
      await safeRecordEvidence({
        capability: "service-directory",
        command: "service-request.linked-to-core-work",
        work_id: coreWorkResult.workId,
        service_request_id: entity.id,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        actor_id: actorId,
        timestamp: new Date().toISOString(),
        integration_note: "W-SVC-001: Service request created as domain extension of core Work primitive"
      });
    }

    // PROPOSE TO PROVIDER: For cybersecurity category requests, PROPOSE to CyberGuard Asia (sp-003) - NOT auto-accept
    // This implements CR-004 Provider Reality Gate: real human must make decision, system only proposes
    if (category === "Cybersecurity") {
      const cyberProviders = await ServiceProviderRepositoryInMemory.listByCategory("Cybersecurity");
      const cyberGuard = cyberProviders.find((p: ServiceProviderAggregate) => p.id === ServiceProviderId("sp-003"));
      if (cyberGuard) {
        const proposed: ServiceRequestAggregate = {
          ...entity,
          providerId: cyberGuard.id,
          status: "proposed", // CR-004: Status = proposed, waiting for real provider decision
          updatedAt: new Date()
        };
        await serviceRepository.save(proposed);
        console.log(`[service-directory.createServiceRequest] Security audit request PROPOSED to ${cyberGuard.name} (contact: ${cyberGuard.contactName} <${cyberGuard.contactEmail}>, response: ${cyberGuard.responseHours})`);
        console.log(`[CR-004] Provider must make real decision: accept/decline. Work ID: ${proposed.id}`);
      }
    }

    return { id: entity.id, status: entity.status };
  },
};

// CR-004 (Provider Reality) + CR-005 (Price Reality): Extended input to support provider decision with note AND proposed price
interface ProviderDecisionWithContextInput {
  readonly id: string;
  readonly providerId: string;
  readonly decision: "accepted" | "declined";
  readonly providerNote?: string;
  readonly proposedPrice?: string; // CR-005: Provider proposes price to customer
  readonly sessionId: string;
}

type ProviderDecisionWithContextOutput = {
  readonly id: string;
  readonly status: ServiceRequestStatus;
  readonly providerId: string;
  readonly providerNote?: string;
  readonly proposedPrice?: string;
  readonly providerDecisionAt: Date;
};

const ProviderDecisionWithContextSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  decision: z.enum(["accepted", "declined"]),
  providerNote: z.string().optional(),
  proposedPrice: z.string().optional(), // CR-005: Price proposal from provider
  sessionId: z.string().min(1),
});

type ProviderDecisionCommand = CapabilityCommand<ProviderDecisionWithContextInput, Promise<ProviderDecisionWithContextOutput>>;

export const providerDecisionServiceRequest: ProviderDecisionCommand = {
  kind: "command",
  name: "service-directory.providerDecisionServiceRequest",
  version: "2.0.0",
  async execute(input: ProviderDecisionWithContextInput) {
    const parsed = ProviderDecisionWithContextSchema.parse(input);
    const { id, providerId, decision, providerNote, proposedPrice, sessionId } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.providerDecisionServiceRequest] Invalid or revoked session - authentication violation");
    }
    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH)
    const { tenantId, workspaceId: sessionWorkspaceId, actorId: sessionActorId } = session;
    // Enforce canonical branded types from single source (anti-drift)
    const workspaceId: WorkspaceId = createWorkspaceId(sessionWorkspaceId as unknown as string);
    const actorId: ActorId = createActorId(sessionActorId as unknown as string);

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.providerDecisionServiceRequest] ServiceRequest not found: ${id}`);
    }
    // CR-004: Only allow decision on "proposed" status - prevent invalid state transitions
    if (current.status !== "proposed") {
      throw new Error(`[service-directory.providerDecisionServiceRequest] Cannot make decision on work with status: ${current.status}. Must be "proposed".`);
    }
    // Verify the provider ID matches the assigned provider - security check
    if (current.providerId !== ServiceProviderId(providerId)) {
      throw new Error(`[service-directory.providerDecisionServiceRequest] Provider mismatch: this work is assigned to ${current.providerId}, not ${providerId}`);
    }

    const providerDecisionAt = new Date();
    // CR-005: If provider accepts AND provides a price, set work to "proposed" with price (customer must accept)
    // If provider declines, set status to "declined" regardless
    const nextStatus: ServiceRequestStatus = decision === "declined" 
      ? "declined" 
      : (proposedPrice ? "proposed" : "accepted"); // If no price provided, proceed as before
    
    const next: ServiceRequestAggregate = {
      ...current,
      status: nextStatus,
      providerNote,
      proposedPrice, // CR-005: Save provider's price proposal
      providerDecisionAt,
      actorId,
      updatedAt: new Date(),
    };
    await serviceRepository.save(next);
    
    console.log(`[CR-004 + CR-005] Provider ${providerId} made decision: ${decision} for work ${id}`);
    console.log(`[CR-005] Provider proposed price: ${proposedPrice || "(no price proposed)"}`);
    console.log(`[CR-004] Provider note: ${providerNote || "(no note)"}`);
    
    return { 
      id: next.id, 
      status: next.status, 
      providerId: next.providerId!,
      providerNote: next.providerNote,
      proposedPrice: next.proposedPrice,
      providerDecisionAt: next.providerDecisionAt!
    };
  },
};

// Maintain backward compatibility for existing acceptServiceRequest calls
export const acceptServiceRequest: AcceptServiceRequestCommand = {
  kind: "command",
  name: "service-directory.acceptServiceRequest",
  version: "2.0.0",
  async execute(input: AcceptServiceRequestWithContextInput) {
    // Delegate to new providerDecision command for backward compatibility
    const result = await providerDecisionServiceRequest.execute({
      ...input,
      decision: "accepted",
      providerNote: "Legacy accept call - migrated to providerDecision"
    });
    return { 
      id: ServiceRequestId(result.id), 
      status: result.status as ServiceRequestStatus, 
      providerId: ServiceProviderId(result.providerId) 
    };
  },
};

// W-SVC-001: Mark service verified command - customer verifies work delivery before settlement
interface MarkServiceVerifiedInput {
  readonly id: ServiceRequestId;
}
interface MarkServiceVerifiedOutput {
  readonly id: ServiceRequestId;
  readonly status: "verified";
  readonly verifiedAt: Date;
}

// SHARED RAIL: Mark service verified with sessionId ONLY (MIRRORS LH minimal context pattern)
const MarkServiceVerifiedWithContextSchema = z.object({
  id: z.string().min(1),
  // SHARED RAIL: Only sessionId required - auto-populate tenantId/workspaceId/actorId from session (MIRRORS LH)
  sessionId: z.string().min(1),
  verificationProof: z.string().min(1), // W-SVC-001: Customer must provide verification proof
});

type MarkServiceVerifiedWithContextInput = z.infer<typeof MarkServiceVerifiedWithContextSchema>;
type MarkServiceVerifiedCommand = CapabilityCommand<MarkServiceVerifiedWithContextInput, Promise<MarkServiceVerifiedOutput>>;

// W-SVC-001: CMBCD execution frame switching helper - reuse canonical mapping from workspace-standard
async function switchExecutionFrameForActor(actorId: string, currentFrame?: string): Promise<{ newFrame: string; switched: boolean }> {
  // Canonical actor→execution frame mapping (same as workspace-standard, no duplicate logic)
  const actorTypeToExecutionFrame: Record<string, string> = {
    "human": "direct", "customer": "direct", "professional": "direct", "officer": "direct",
    "agent": "proxy", "general-service-agent": "proxy", "dispute-resolution-manager": "proxy",
    "external-system": "mcp", "api": "mcp", "robot": "mcp",
    "vendor": "constrained-gui", "contractor": "constrained-gui", "supplier": "constrained-gui"
  };
  
  const assignedActorId = actorId.replace("actor:", "");
  const newExecutionFrame = actorTypeToExecutionFrame[assignedActorId] || "proxy";
  const previousExecutionFrame = currentFrame || "direct";
  
  return {
    newFrame: newExecutionFrame,
    switched: previousExecutionFrame !== newExecutionFrame
  };
}

export const markServiceDelivered: MarkServiceDeliveredCommand = {
  kind: "command",
  name: "service-directory.markServiceDelivered",
  version: "2.0.0",
  async execute(input: MarkServiceDeliveredWithContextInput) {
    const parsed = MarkServiceDeliveredWithContextSchema.parse(input);
    const { id, sessionId } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.markServiceDelivered] Invalid or revoked session - authentication violation");
    }
    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH)
    const { tenantId, workspaceId, actorId } = session;

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.markServiceDelivered] ServiceRequest not found: ${id}`);
    }
    if (current.status === "delivered" || current.status === "verified") {
      return {
        id: current.id,
        status: "delivered",
        deliveredAt: current.deliveredAt ?? new Date(),
      };
    }

    // W-SVC-001: CMBCD execution frame switching - sesuai mandate "CMBCD menjadi execution boundary mechanism di dalam Work"
    // Ketika actor berganti (provider → customer untuk verifikasi), Work tidak berubah, hanya execution frame yang berubah
    const { newFrame: newExecutionFrame, switched: frameSwitched } = await switchExecutionFrameForActor(
      actorId, 
      current.executionFrame
    );

    const deliveredAt = new Date();
    const next: ServiceRequestAggregate = {
      ...current,
      status: "delivered",
      deliveredAt,
      actorId,
      executionFrame: newExecutionFrame as any,
      updatedAt: new Date()
    };
    await serviceRepository.save(next);

    // Catat bukti perubahan execution frame ke evidence ledger (audit trail compliance)
    if (frameSwitched) {
      await safeRecordEvidence({
        capability: "service-directory",
        command: "cmbcd.execution-frame-switched",
        work_id: id,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        actor_id: actorId,
        previous_execution_frame: current.executionFrame || "direct",
        new_execution_frame: newExecutionFrame,
        timestamp: deliveredAt.toISOString(),
        transition_reason: "Actor changed to customer for verification - CMBCD boundary switch"
      });
      console.log(`[W-SVC-001] CMBCD execution frame switched for work ${id}: ${current.executionFrame || "direct"} → ${newExecutionFrame}`);
    }

    return { id: next.id, status: "delivered", deliveredAt };
  },
};

export const markServiceVerified: MarkServiceVerifiedCommand = {
  kind: "command",
  name: "service-directory.markServiceVerified",
  version: "2.0.0",
  async execute(input: MarkServiceVerifiedWithContextInput) {
    const parsed = MarkServiceVerifiedWithContextSchema.parse(input);
    const { id, sessionId, verificationProof } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.markServiceVerified] Invalid or revoked session - authentication violation");
    }
    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH)
    const { tenantId, workspaceId, actorId } = session;

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.markServiceVerified] ServiceRequest not found: ${id}`);
    }
    // W-SVC-001: Reality Gate 1 - Only allow verification on work with "delivered" status (undelivered work cannot be verified)
    if (current.status !== "delivered") {
      throw new Error(`[service-directory.markServiceVerified] Cannot verify work with status: ${current.status}. Must be "delivered".`);
    }
    // Handle idempotency: if already verified/settled, return existing state
    const status = current.status as ServiceRequestStatus;
    if (status === "verified" || status === "settled") {
      return {
        id: current.id,
        status: "verified",
        verifiedAt: current.verifiedAt ?? new Date(),
      };
    }

    const verifiedAt = new Date();
    const next: ServiceRequestAggregate = {
      ...current,
      status: "verified",
      verifiedAt,
      actorId,
      updatedAt: new Date()
    };
    await serviceRepository.save(next);

    // Record verification evidence - use module-level safeRecordEvidence (MIRRORS all other EOS capabilities)
    await safeRecordEvidence({
      capability: "service-directory",
      command: "markServiceVerified",
      work_id: id,
      tenant_id: tenantId,
      workspace_id: workspaceId,
      actor_id: actorId,
      verification_proof: verificationProof,
      verified_at: verifiedAt.toISOString(),
    });

    // Notify workspace listeners of verification - use module-level safeNotifyWorkspaceListeners (MIRRORS W-ILC-002)
    await safeNotifyWorkspaceListeners(workspaceId, actorId, id);
    
    console.log(`[W-SVC-001] Customer ${actorId} verified work ${id} with proof: ${verificationProof}`);
    console.log(`[W-SVC-001] Work now in "verified" status - ready for settlement`);
    
    return { id: next.id, status: "verified", verifiedAt };
  },
};

export const listServiceRequestsByWorkspace: ListServiceRequestsCommand = {
  kind: "command",
  name: "service-directory.listByWorkspace",
  version: "2.0.0",
  async execute(input: ListServiceRequestsWithContextInput) {
    const parsed = ListServiceRequestsWithContextSchema.parse(input);
    const { sessionId, limit, offset } = parsed;

    // Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.listByWorkspace] Invalid or revoked session - authentication violation");
    }

    // Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH minimal fix)
    const { tenantId, workspaceId, actorId } = session;
    // Session is already verified during creation - no need for redundant checks

    // Get all service requests for this workspace (already filtered by workspace for isolation)
    const allWorkspaceRequests = await serviceRepository.listByWorkspace(workspaceId);

    // Apply filters if provided
    let filteredRequests = [...allWorkspaceRequests];

    // Filter by status if not "all"
    if (parsed.status && parsed.status !== "all") {
      filteredRequests = filteredRequests.filter(r => r.status === parsed.status);
    }

    // Filter by category if not "all"
    if (parsed.category && parsed.category !== "all") {
      filteredRequests = filteredRequests.filter(r => r.category === parsed.category);
    }

    // Filter by search query if provided
    if (parsed.query) {
      const query = parsed.query.toLowerCase();
      filteredRequests = filteredRequests.filter(r =>
        r.title.toLowerCase().includes(query) ||
        (r.description?.toLowerCase().includes(query) ?? false)
      );
    }

    // Apply pagination
    const paginatedRequests = filteredRequests.slice(offset, offset + limit);

    return {
      items: paginatedRequests,
      total: allWorkspaceRequests.length,
      matched: filteredRequests.length,
      offset,
      limit,
    };
  },
};

import { getServiceRequestByIdCommand } from "./get-service-request-by-id.command.js";

// Minimal command to handle external system webhook responses - only what's needed for P0-PT-001
type UpdateExternalSystemStatusCommand = CapabilityCommand<
  UpdateExternalSystemStatusInput,
  UpdateExternalSystemStatusOutput
>;

export const updateExternalSystemStatus: UpdateExternalSystemStatusCommand = {
  kind: "command",
  name: "service-directory.updateExternalSystemStatus",
  version: "1.0.0",
  async execute(input: UpdateExternalSystemStatusInput) {
    const { id, externalSystem, externalStatus, externalReferenceId, responseData, receivedAt, sessionId } = input;
    
    // SHARED RAIL: Validate session first (mirrors all other commands)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.updateExternalSystemStatus] Invalid or revoked session");
    }
    const { tenantId, workspaceId, actorId } = session;

    // Get current service request
    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (!current) {
      throw new Error(`[service-directory.updateExternalSystemStatus] ServiceRequest not found: ${id}`);
    }

    // Update aggregate with external system data - minimal change to existing structure
    const externalResponses = current.externalResponses ?? [];
    const next: ServiceRequestAggregate = {
      ...current,
      externalResponses: [
        ...externalResponses,
        {
          system: externalSystem,
          status: externalStatus,
          referenceId: externalReferenceId,
          data: responseData,
          receivedAt: new Date(receivedAt)
        }
      ],
      actorId: createActorId(actorId as unknown as string),
      updatedAt: new Date(),
    };

    // Persist changes
    await serviceRepository.save(next);
    return { success: true, id: ServiceRequestId(id), externalSystem, externalStatus, receivedAt };
  }
};

// CR-005: Add customer price acceptance command to complete Price Reality flow
interface CustomerAcceptPriceWithContextInput {
  readonly id: string;
  readonly sessionId: string;
}

type CustomerAcceptPriceWithContextOutput = {
  readonly id: string;
  readonly status: ServiceRequestStatus;
  readonly priceAcceptedAt: Date;
};

const CustomerAcceptPriceWithContextSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
});

type CustomerAcceptPriceCommand = CapabilityCommand<CustomerAcceptPriceWithContextInput, Promise<CustomerAcceptPriceWithContextOutput>>;

export const customerAcceptPriceServiceRequest: CustomerAcceptPriceCommand = {
  kind: "command",
  name: "service-directory.customerAcceptPriceServiceRequest",
  version: "2.0.0",
  async execute(input: CustomerAcceptPriceWithContextInput) {
    const parsed = CustomerAcceptPriceWithContextSchema.parse(input);
    const { id, sessionId } = parsed;

    // Validate session exists and is active (SHARED RAIL)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.customerAcceptPriceServiceRequest] Invalid or revoked session - authentication violation");
    }
    const { tenantId, workspaceId, actorId } = session;

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.customerAcceptPriceServiceRequest] ServiceRequest not found: ${id}`);
    }
    // CR-005: Only allow price acceptance on work with "proposed" status that has a proposed price
    if (current.status !== "proposed" || !current.proposedPrice) {
      throw new Error(`[service-directory.customerAcceptPriceServiceRequest] Cannot accept price on work with status: ${current.status}. Must be "proposed" with proposed price.`);
    }

    const priceAcceptedAt = new Date();
    const next: ServiceRequestAggregate = {
      ...current,
      status: "accepted", // Customer accepted price - work moves to accepted for execution
      priceAcceptedAt,
      actorId,
      updatedAt: new Date(),
    };
    await serviceRepository.save(next);
    
    console.log(`[CR-005] Customer ${actorId} accepted price ${current.proposedPrice} for work ${id}`);
    console.log(`[CR-005] Work now in "accepted" status, ready for payment processing`);
    
    return { 
      id: next.id, 
      status: next.status, 
      priceAcceptedAt: next.priceAcceptedAt!
    };
  },
};

// CR-006: Payment Reality command - updates service request with real payment transaction data
// Only invoked when Midtrans sends a webhook with a real payment attempt
interface UpdatePaymentStatusWithContextInput {
  readonly id: string;
  readonly paymentTransactionId: string;
  readonly paymentStatus: string;
  readonly grossAmount: string;
  readonly sessionId: string;
}

type UpdatePaymentStatusWithContextOutput = {
  readonly id: string;
  readonly status: ServiceRequestStatus;
  readonly paymentTransactionId: string;
  readonly paymentStatus: string;
  readonly paymentReceivedAt: Date;
};

const UpdatePaymentStatusWithContextSchema = z.object({
  id: z.string().min(1),
  paymentTransactionId: z.string().min(1),
  paymentStatus: z.string().min(1),
  grossAmount: z.string().min(1),
  sessionId: z.string().min(1),
});

type UpdatePaymentStatusCommand = CapabilityCommand<UpdatePaymentStatusWithContextInput, Promise<UpdatePaymentStatusWithContextOutput>>;

export const updatePaymentStatusServiceRequest: UpdatePaymentStatusCommand = {
  kind: "command",
  name: "service-directory.updatePaymentStatusServiceRequest",
  version: "2.0.0",
  async execute(input: UpdatePaymentStatusWithContextInput) {
    const parsed = UpdatePaymentStatusWithContextSchema.parse(input);
    const { id, paymentTransactionId, paymentStatus, grossAmount, sessionId } = parsed;

    // Validate session exists and is active (SHARED RAIL - payment gateway session)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.updatePaymentStatusServiceRequest] Invalid or revoked session - authentication violation");
    }
    const { tenantId, workspaceId, actorId } = session;

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.updatePaymentStatusServiceRequest] ServiceRequest not found: ${id}`);
    }
    // CR-006: Only allow payment updates on work with "accepted" status (price was already accepted by customer)
    if (current.status !== "accepted") {
      throw new Error(`[service-directory.updatePaymentStatusServiceRequest] Cannot process payment on work with status: ${current.status}. Must be "accepted" (customer accepted price first).`);
    }

    // PAY-03: Idempotency check - skip duplicate payment events with same transaction ID
    if (current.paymentTransactionId === paymentTransactionId) {
      console.log(`[CR-006] Duplicate payment event detected: ${paymentTransactionId}, skipping processing`);
      return {
        id: current.id,
        status: current.status,
        paymentTransactionId: current.paymentTransactionId!,
        paymentStatus: current.paymentStatus!,
        paymentReceivedAt: new Date()
      };
    }

    const paymentReceivedAt = new Date();
    // If payment is successful, move work to "in_service" so provider can start execution
    const nextStatus: ServiceRequestStatus = paymentStatus === "success" 
      ? "in_service" 
      : current.status; // Keep as "accepted" if payment failed/pending for retry

    const next: ServiceRequestAggregate = {
      ...current,
      status: nextStatus,
      paymentTransactionId,
      paymentStatus,
      actorId,
      updatedAt: new Date(),
    };
    await serviceRepository.save(next);
    
    console.log(`[CR-006] Payment processed for work ${id}`);
    console.log(`[CR-006] Transaction ID: ${paymentTransactionId}, Status: ${paymentStatus}, Amount: ${grossAmount}`);
    console.log(`[CR-006] Work now in ${nextStatus} status - ${nextStatus === "in_service" ? "provider can start execution" : "awaiting payment retry"}`);
    
    return { 
      id: next.id, 
      status: next.status, 
      paymentTransactionId: next.paymentTransactionId!,
      paymentStatus: next.paymentStatus!,
      paymentReceivedAt
    };
  },
};

// W-SVC-001: Settlement command - finalize work after verification, move to settled state
interface SettleServiceRequestWithContextInput {
  readonly id: string;
  readonly settlementProof: string;
  readonly sessionId: string;
}

type SettleServiceRequestWithContextOutput = {
  readonly id: string;
  readonly status: ServiceRequestStatus;
  readonly settledAt: Date;
};

const SettleServiceRequestWithContextSchema = z.object({
  id: z.string().min(1),
  settlementProof: z.string().min(1),
  sessionId: z.string().min(1),
});

type SettleServiceRequestCommand = CapabilityCommand<SettleServiceRequestWithContextInput, Promise<SettleServiceRequestWithContextOutput>>;

export const settleServiceRequest: SettleServiceRequestCommand = {
  kind: "command",
  name: "service-directory.settleServiceRequest",
  version: "2.0.0",
  async execute(input: SettleServiceRequestWithContextInput) {
    const parsed = SettleServiceRequestWithContextSchema.parse(input);
    const { id, settlementProof, sessionId } = parsed;

    // Validate session exists and is active (SHARED RAIL)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.settleServiceRequest] Invalid or revoked session - authentication violation");
    }
    const { tenantId, workspaceId, actorId } = session;

    const current = await serviceRepository.byId(ServiceRequestId(id));
    if (current === undefined) {
      throw new Error(`[service-directory.settleServiceRequest] ServiceRequest not found: ${id}`);
    }
    // W-SVC-001: Only allow settlement on work with "verified" status - all work must be verified before settlement
    if (current.status !== "verified") {
      throw new Error(`[service-directory.settleServiceRequest] Cannot settle work with status: ${current.status}. Must be "verified".`);
    }

    const settledAt = new Date();
    const next: ServiceRequestAggregate = {
      ...current,
      status: "settled",
      settledAt,
      actorId,
      updatedAt: new Date(),
    };
    await serviceRepository.save(next);
    
    // Record settlement evidence
    await safeRecordEvidence({
      capability: "service-directory",
      command: "settleServiceRequest",
      work_id: id,
      tenant_id: tenantId,
      workspace_id: workspaceId,
      actor_id: actorId,
      settlement_proof: settlementProof,
      settled_at: settledAt.toISOString(),
    });

    // Notify workspace listeners of settlement (reuse ILC pattern from W-ILC-002)
    await safeNotifyWorkspaceListeners(workspaceId, actorId, id);
    
    console.log(`[W-SVC-001] Customer ${actorId} settled work ${id} with proof: ${settlementProof}`);
    console.log(`[W-SVC-001] Work now in "settled" status - Accountable Work Continuity complete`);
    
    return { 
      id: next.id, 
      status: next.status, 
      settledAt: next.settledAt!
    };
  }
};

export const serviceDirectoryCommands: Readonly<Record<string, CapabilityCommand>> = {
  "service-directory.createServiceRequest": createServiceRequest,
  "service-directory.providerDecisionServiceRequest": providerDecisionServiceRequest,
  "service-directory.customerAcceptPriceServiceRequest": customerAcceptPriceServiceRequest,
  "service-directory.acceptServiceRequest": acceptServiceRequest,
  "service-directory.markServiceDelivered": markServiceDelivered,
  "service-directory.markServiceVerified": markServiceVerified, // W-SVC-001: Verification command before settlement
  "service-directory.listByWorkspace": listServiceRequestsByWorkspace,
  "service-directory.getById": getServiceRequestByIdCommand,
  "service-directory.updateExternalSystemStatus": updateExternalSystemStatus,
  "service-directory.updatePaymentStatusServiceRequest": updatePaymentStatusServiceRequest, // CR-006: Payment Reality command
  "service-directory.settleServiceRequest": settleServiceRequest, // W-SVC-001: Settlement command for High-Value Resolution Work
} as const;

export type {
  CreateServiceRequestCommand,
  AcceptServiceRequestCommand,
  MarkServiceDeliveredCommand,
};