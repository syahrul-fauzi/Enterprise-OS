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

// SHARED RAIL: Initialize identity schema if Postgres is active (MIRRORS ILC pattern)
if (process.env.DATABASE_URL) {
  initIdentitySchema();
}

// SHARED RAIL: Toggle session repository based on environment (MIRRORS LH pattern)
const sessionRepository = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

// SHARED RAIL: Toggle repository based on environment (MIRRORS LH pattern)
const serviceRepository = process.env.DATABASE_URL
  ? getServiceRequestRepositoryPostgres()
  : ServiceRequestRepositoryInMemory;

// SHARED RAIL: Toggle service provider repository based on environment
const providerRepository = process.env.DATABASE_URL
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
    const { tenantId, workspaceId, actorId } = session;
    // Enforce security via session's already verified isolation guarantees
    // No need for additional checks - session is cryptographically bound to tenant/workspace

    const entity: ServiceRequestAggregate = {
      id: newServiceRequestId(),
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
    };

    await serviceRepository.save(entity);

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
    const { id, providerId, decision, providerNote, sessionId } = parsed;

    // 1. Validate session exists and is active (SHARED RAIL — MIRRORS LH)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[service-directory.providerDecisionServiceRequest] Invalid or revoked session - authentication violation");
    }
    // 2. Auto-populate isolation context from trusted session (SHARED RAIL — MIRRORS LH)
    const { tenantId, workspaceId, actorId } = session;

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
    return { id: result.id, status: result.status as ServiceRequestStatus, providerId: result.providerId };
  },
};

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
    const deliveredAt = new Date();
    const next: ServiceRequestAggregate = {
      ...current,
      status: "delivered",
      deliveredAt,
      actorId,
      updatedAt: new Date()
    };
    await serviceRepository.save(next);
    return { id: next.id, status: "delivered", deliveredAt };
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
  "service-directory.updateExternalSystemStatus",
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
      actorId,
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

export const serviceDirectoryCommands: Readonly<Record<string, CapabilityCommand>> = {
  "service-directory.createServiceRequest": createServiceRequest,
  "service-directory.providerDecisionServiceRequest": providerDecisionServiceRequest,
  "service-directory.customerAcceptPriceServiceRequest": customerAcceptPriceServiceRequest,
  "service-directory.acceptServiceRequest": acceptServiceRequest,
  "service-directory.markServiceDelivered": markServiceDelivered,
  "service-directory.listByWorkspace": listServiceRequestsByWorkspace,
  "service-directory.getById": getServiceRequestByIdCommand,
  "service-directory.updateExternalSystemStatus": updateExternalSystemStatus,
  "service-directory.updatePaymentStatusServiceRequest": updatePaymentStatusServiceRequest, // CR-006: Payment Reality command
} as const;

export type {
  CreateServiceRequestCommand,
  AcceptServiceRequestCommand,
  MarkServiceDeliveredCommand,
};