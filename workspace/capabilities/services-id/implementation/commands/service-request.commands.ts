import { z } from "zod";
import {
  CreateServiceRequestOutput,
  ServiceRequestId,
  ServiceRequestAggregate,
  ServiceRequestStatus,
} from "../contracts/service-request.contracts";
import { executionContext } from "@repo/core-runtime";
import type { CapabilityCommand } from "@repo/core-kernel";
import { newServiceRequestId, defaultServiceRequestStatus, defaultServiceRequestPriority, ServiceRequestRepositoryInMemory } from "../repository/index";
// Import SEMUA canonical types dan repositories dari SINGLE-SOURCE work-core (anti-drift - TENANT-ISOLATION-001)
// Sesuai dengan aturan: Semua capability harus import dari @capabilities/work-core, bukan langsung dari identity
import { 
  type SessionId,
  type WorkId,
  type ProductNode, 
  initIdentitySchema, 
  getSessionRepositoryPostgres, 
  getWorkRepositoryPostgres,
  SessionRepositoryInMemory,
  safeRecordEvidence
} from "../../../work-core/index.js";

const SessionRepositoryPostgres = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

let schemaInitialized = false;
async function ensureIdentitySchema() {
  if (!schemaInitialized && (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)) {
    await initIdentitySchema();
    schemaInitialized = true;
  }
}

type ShallowMutable<T> = { -readonly [P in keyof T]: T[P] };
type DeepMutable<T> = T extends readonly (infer U)[] ? DeepMutable<U>[] :
                      T extends Date ? T :
                      T extends string ? T :
                      T extends number ? T :
                      T extends boolean ? T :
                      T extends object ? { -readonly [P in keyof T]: DeepMutable<T[P]> } :
                      T;

// Hapus duplikat safeRecordEvidence - gunakan canonical dari work-core (Gate A requirement: reuse primitive yang sudah ada)
// Import canonical safeRecordEvidence yang menangani SHA-256, fallback storage, dan semua durability policy
import { safeRecordEvidence } from "../../../work-core/implementation/utils/evidence.utils.js";

async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  const loaded = await import("@repo/core-kernel");
  const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<{ output?: Output }> } }).capabilityRegistry;
  if (typeof reg?.invoke !== "function") {
    throw new Error(`[services-id] capabilityRegistry.invoke unavailable for ${capability}.${commandName}`);
  }
  const res = await reg.invoke(capability, commandName, input as never);
  return res.output;
}

// Core createServiceRequest implementation
const CreateServiceRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  userNeed: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().optional(),
  sessionId: z.string(),
  linkedWorkItemId: z.string(),
  // DIGISC-007: Subscription tracking untuk managed service recurring triggers
  subscriptionId: z.string().optional(),
  subscriptionType: z.enum(["monthly-retainer", "yearly-managed", "one-time"]).optional(),
  recurringIntervalDays: z.number().optional(),
  isRecurring: z.boolean().optional(),
});

const STORE = new Map<string, ServiceRequestAggregate>();

const createServiceRequest: CapabilityCommand<
  z.infer<typeof CreateServiceRequestSchema>,
  Promise<CreateServiceRequestOutput>
> = {
  kind: "command",
  name: "service-request.create",
  version: "1.0.0",
  capability: "services-id",
  async execute(input) {
    await ensureIdentitySchema();
    const validated = CreateServiceRequestSchema.parse(input);
    
    const id = newServiceRequestId();
    
    // CORE-001: Validasi coreWorkResult untuk memastikan workId selalu terhubung ke core Work primitive
    if (!validated.linkedWorkItemId) {
      throw new Error("[services-id.create-service-request] Failed to link to core Work primitive - CORE-001 violation: workId cannot be empty");
    }

    // Calculate next billing date if this is a recurring subscription
    const nextBillingDate = validated.isRecurring && validated.recurringIntervalDays 
      ? new Date(Date.now() + validated.recurringIntervalDays * 24 * 60 * 60 * 1000) 
      : undefined;

    const aggregate: ServiceRequestAggregate = {
      id,
      workId: validated.linkedWorkItemId, // WAJIB: Semua boundary metadata hanya ada di core Work primitive (CORE-001)
      title: validated.title,
      description: validated.description,
      status: "draft",
      priority: validated.priority || "medium",
      category: validated.category,
      createdAt: new Date(),
      updatedAt: new Date(),
      // DIGISC-007: Subscription tracking untuk managed service recurring triggers
      subscriptionId: validated.subscriptionId,
      subscriptionType: validated.subscriptionType,
      recurringIntervalDays: validated.recurringIntervalDays,
      isRecurring: validated.isRecurring || false,
      nextBillingDate
    };
    
    STORE.set(id, aggregate);
    await safeRecordEvidence({
      capability: "services-id",
      command: "service-request.create",
      input: validated,
      output: { id },
    });
    
    return {
      id,
      status: "draft",
    };
  },
};

// THE CRITICAL R4 COMMAND: createServiceRequestFromWork - SID-003: High-Value Work Graph Integration
// Follows EXACT same pattern as ILC-003 (ILC) dan LH-003 (LawyersHub) untuk Rule of Two compliance
const createServiceRequestFromWork: CapabilityCommand<{
  workId: string;
  coreWork: any;
  domainSpecificData?: any;
}, Promise<{ id: string; workId: string; domainType: string; graphMetadata: { productId: string; productName: string } | null }>> = {
  kind: "command",
  name: "service-request.createFromWork",
  version: "1.0.0",
  capability: "services-id",
  async execute(input) {
    await ensureIdentitySchema();
    
    // HIGH-VALUE WORK GRAPH TRAVERSAL (SID-003) - Dapatkan Product node yang terhubung ke Work ini
    const workRepository = getWorkRepositoryPostgres();
    const linkedProduct: ProductNode | undefined = input.workId 
      ? await workRepository.getProductForWork(input.workId as WorkId)
      : undefined;
    
    // Reuse existing service-request.create logic but pass through the core Work's context
    // DIGISC-007: Ambil subscription data dari core Work jika ada, dan override dengan domainSpecificData jika ada
    const subscriptionData = input.coreWork.subscriptionId ? {
      subscriptionId: input.coreWork.subscriptionId,
      subscriptionType: input.coreWork.subscriptionType,
      recurringIntervalDays: input.coreWork.recurringIntervalDays,
      isRecurring: input.coreWork.isRecurring,
    } : {};

    const result = await createServiceRequest.execute({
      title: input.coreWork.title,
      description: input.coreWork.description || "",
      userNeed: input.domainSpecificData?.userNeed || input.coreWork.title,
      priority: input.coreWork.priority,
      category: input.domainSpecificData?.category || "technical-support",
      sessionId: input.coreWork.sessionId,
      linkedWorkItemId: input.workId, // Bind service request to the core Work's ID (CRITICAL FOR R4 LINEAGE)
      // Pass through subscription data dari core Work, lalu override dengan domainSpecificData jika ada
      ...subscriptionData,
      // Pass through any domain-specific data from the original request
      ...(input.domainSpecificData || {}),
    });

    // CANONICAL EVIDENCE RECORDING (sesuai work-core schema) - SID-003 compliance
    await safeRecordEvidence({
      work_id: input.workId,
      tenant_id: input.coreWork.tenantId,
      actor_id: input.coreWork.actorId,
      capability: "services-id",
      command: "service-request.createFromWork",
      workspace_id: input.coreWork.execution?.workspaceId || null,
      timestamp: new Date().toISOString(),
      graph_link_created: true,
      linked_product_id: linkedProduct?.id || null,
      graph_traversal_success: !!linkedProduct
    });
    
    // ACaaS-COMMERCIAL-001: Jika ini adalah ACaaS compliance check, panggil command acaas.complianceCheck.create
    if (input.domainSpecificData?.documentType && input.domainSpecificData?.documentData && input.domainSpecificData?.compliancePolicies) {
      try {
        await invokeCapability(
          "api-platform",
          "acaas.complianceCheck.create",
          {
            tenantId: input.coreWork.tenantId,
            workspaceId: input.coreWork.execution?.workspaceId,
            actorId: input.coreWork.actorId,
            sessionId: input.coreWork.sessionId,
            documentType: input.domainSpecificData.documentType,
            documentData: input.domainSpecificData.documentData,
            compliancePolicies: input.domainSpecificData.compliancePolicies
          }
        );
        console.log(`[ACAAS-INIT] ✅ ACaaS compliance check initiated successfully for workId: ${input.workId}`);
      } catch (acaasError) {
        console.error(`[ACAAS-INIT] ❌ Failed to initiate ACaaS compliance check: ${acaasError}`);
        // Jangan gagalkan seluruh proses jika ACaaS gagal - ini adalah downstream dependency
      }
    }

    // FACE PROJECTION: Server-derived graphMetadata (tidak state-owned) - compliance dengan "FACE adalah projection, bukan owner"
    return {
      id: result.id,
      workId: input.workId,
      domainType: "service-request",
      graphMetadata: linkedProduct ? {
        productId: linkedProduct.id,
        productName: linkedProduct.name
      } : null
    };
  },
};

// Add updateServiceRequest command for status transitions - follows minimal change principle
const UpdateServiceRequestSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "open", "in_progress", "closed"]).optional(),
  sessionId: z.string(),
});

const updateServiceRequest: CapabilityCommand<
  z.infer<typeof UpdateServiceRequestSchema>,
  Promise<UpdateServiceRequestOutput>
> = {
  kind: "command",
  name: "service-request.update",
  version: "1.0.0",
  capability: "services-id",
  async execute(input) {
    await ensureIdentitySchema();
    const validated = UpdateServiceRequestSchema.parse(input);
    
    const existing = STORE.get(validated.id);
    if (!existing) throw new Error(`Service request ${validated.id} not found`);

    const updated: ShallowMutable<ServiceRequestAggregate> = { ...existing };
    if (validated.status) {
      updated.status = validated.status;
      updated.updatedAt = new Date();
      if (validated.status === "closed") {
        updated.closedAt = new Date();
      }
    }

    STORE.set(validated.id, updated as ServiceRequestAggregate);
    await safeRecordEvidence({
      capability: "services-id",
      command: "service-request.update",
      input: validated,
      output: { id: validated.id, status: updated.status },
    });

    return {
      id: validated.id,
      status: updated.status,
    };
  }
};

export const serviceRequestCommands: Readonly<Record<string, CapabilityCommand>> = {
  "service-request.create": createServiceRequest,
  "service-request.createFromWork": createServiceRequestFromWork,
  "service-request.update": updateServiceRequest,
} as const;

import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export function registerServicesIdCapability() {
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
    console.log("[Services-ID] Test/standalone environment detected - skipping auto-registration");
    return;
  }

  // Static registration compliance - W06-A1 mandate: no dynamic imports in production
  Object.values(serviceRequestCommands).forEach((command) => {
    capabilityRegistry.register(command);
  });
  
  // Register customer-portal capability
  capabilityRegistry.register({
    key: "services-id.customer-portal",
    name: "Customer Portal Interface",
    capability: "services-id",
    description: "Enables customers to submit disputes, track progress, and view resolution status directly through self-service interface",
    providerTypes: ["system", "human"],
    domainRestrictions: ["services-id", "customer-support", "dispute-resolution"],
    requiredAuthorizations: ["dispute:read", "dispute:submit"],
    riskLevel: "low",
    handler: async () => true,
    isAvailable: async () => true
  });
  
  // Register resolution-center capability
  capabilityRegistry.register({
    key: "services-id.resolution-center",
    name: "Dispute Resolution Center",
    capability: "services-id",
    description: "Centralized dashboard and workflow engine for agents to manage, process, and resolve high-value customer disputes",
    providerTypes: ["human", "ai", "system"],
    domainRestrictions: ["services-id", "customer-support", "dispute-resolution"],
    requiredAuthorizations: ["dispute:manage", "dispute:assign", "workspace-write"],
    riskLevel: "medium",
    handler: async () => true,
    isAvailable: async () => true
  });

  console.log("[Services-ID] AUDIT-001-009: Services-ID capability registered successfully - all commands added to canonical capability registry (static registration compliant)");
}