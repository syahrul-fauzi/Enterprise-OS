import { z } from "zod";
import {
  CreateServiceRequestOutput,
  ServiceRequestId,
  ServiceRequestAggregate,
} from "../contracts/service-request.contracts";
import { executionContext } from "@repo/core-runtime";
import type { CapabilityCommand } from "@repo/core-kernel";
import { newServiceRequestId, defaultServiceRequestStatus, defaultServiceRequestPriority, ServiceRequestRepositoryInMemory } from "../repository/index";
import { initIdentitySchema, getSessionRepositoryPostgres, SessionRepositoryInMemory } from "../../../../identity/implementation/repositories/index.js";
import { SessionId } from "../../../../identity/implementation/contracts/identity.contracts.js";

const SessionRepositoryPostgres = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

let schemaInitialized = false;
async function ensureIdentitySchema() {
  if (!schemaInitialized && process.env.DATABASE_URL) {
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

async function safeRecordEvidence(payload: unknown): Promise<{ readonly ok: boolean }> {
  try {
    const loaded = await import("@repo/core-kernel");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("evidence-registry", "evidence.record", payload as never);
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough: evidence recording is observability-only
  }
  return { ok: true };
}

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
  tenantId: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
  linkedWorkItemId: z.string().optional(),
});

const STORE = new Map<string, ServiceRequestAggregate>();

const createServiceRequest: CapabilityCommand<
  z.infer<typeof CreateServiceRequestSchema>,
  Promise<CreateServiceRequestOutput>
> = {
  kind: "command",
  name: "service-request.create",
  version: "1.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    const validated = CreateServiceRequestSchema.parse(input);
    
    const id = newServiceRequestId();
    const aggregate: ServiceRequestAggregate = {
      id,
      workId: validated.linkedWorkItemId,
      title: validated.title,
      description: validated.description,
      status: "draft",
      priority: validated.priority || "medium",
      category: validated.category,
      tenantId: validated.tenantId,
      workspaceId: validated.workspaceId,
      actorId: validated.actorId,
      createdAt: new Date(),
      updatedAt: new Date(),
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

// THE CRITICAL R4 COMMAND: createServiceRequestFromWork - follows the exact createFromWork pattern
const createServiceRequestFromWork: CapabilityCommand<{
  workId: string;
  coreWork: any;
  domainSpecificData?: any;
}, Promise<{ id: string; workId: string; domainType: string }>> = {
  kind: "command",
  name: "service-request.createFromWork",
  version: "1.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    // Reuse existing service-request.create logic but pass through the core Work's context
    const result = await createServiceRequest.execute({
      title: input.coreWork.title,
      description: input.coreWork.description || "",
      userNeed: input.domainSpecificData?.userNeed || input.coreWork.title,
      priority: input.coreWork.priority,
      category: input.domainSpecificData?.category || "technical-support",
      sessionId: input.coreWork.sessionId,
      tenantId: input.coreWork.tenantId,
      workspaceId: input.coreWork.workspaceId,
      actorId: input.coreWork.actorId,
      linkedWorkItemId: input.workId, // Bind service request to the core Work's ID (CRITICAL FOR R4 LINEAGE)
      // Pass through any domain-specific data from the original request
      ...(input.domainSpecificData || {}),
    });
    
    return {
      id: result.id,
      workId: input.workId,
      domainType: "service-request",
    };
  },
};

export const serviceRequestCommands: Readonly<Record<string, CapabilityCommand>> = {
  "service-request.create": createServiceRequest,
  "service-request.createFromWork": createServiceRequestFromWork,
} as const;