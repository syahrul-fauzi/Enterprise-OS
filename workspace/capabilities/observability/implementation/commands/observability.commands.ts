import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  newIncidentId,
  defaultIncidentStatus,
  defaultIncidentPriority,
  IncidentRepositoryInMemory,
} from "../repository/index.js";
import { getIncidentRepositoryPostgres, IncidentRepositoryPostgres } from "../repository/incident-postgres.repository.js";
// Import SEMUA canonical types dan factories dari SINGLE-SOURCE work-core (anti-drift - TENANT-ISOLATION-001)
// Sesuai dengan aturan: Semua capability harus import dari @repo/capabilities-work-core, bukan langsung dari identity
import { 
  type SessionId, 
  type TenantId,
  type WorkspaceId,
  type ActorId,
  createSessionId,
  createTenantId,
  createWorkspaceId,
  createActorId,
  initIdentitySchema, 
  getSessionRepositoryPostgres 
} from "../../../work-core/index.js";
import {
  CreateIncidentInput,
  CreateIncidentOutput,
  IncidentAggregate,
  IncidentId,
} from "../contracts/observability.contracts.js";

const _sessionRepo = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : null;
function getSessionRepository() {
  if (_sessionRepo === null) {
    throw new Error("[observability] POSTGRES_CONNECTION_STRING or DATABASE_URL required for session authentication in Postgres mode");
  }
  return _sessionRepo;
}
const _incidentRepo = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
  ? getIncidentRepositoryPostgres()
  : IncidentRepositoryInMemory;
function getIncidentRepository() {
  return _incidentRepo as typeof IncidentRepositoryInMemory | InstanceType<typeof IncidentRepositoryPostgres>;
}

const CreateIncidentWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.enum(["Infrastructure", "Application", "Database", "Network", "Security", "Payment"]).optional(),
  // Required context for tenant isolation
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

type CreateIncidentWithContextInput = z.infer<typeof CreateIncidentWithContextSchema>;
type CreateIncidentCommand = CapabilityCommand<CreateIncidentWithContextInput, Promise<CreateIncidentOutput>>;

export const createIncident: CreateIncidentCommand = {
  kind: "command",
  name: "incident.create",
  version: "2.0.0",
  async execute(input) {
    if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) await initIdentitySchema();

    const parsed = CreateIncidentWithContextSchema.parse(input);
    const { title, description, priority, category, tenantId, workspaceId, sessionId, actorId } = parsed;

    if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) {
      const SessionRepo = getSessionRepository();
      const session = await SessionRepo.byId(createSessionId(sessionId));
      if (!session || session.revokedAt !== null) {
        throw new Error("[incident.create] Invalid or revoked session - authentication violation");
      }
      if (session.actorId !== createActorId(actorId)) {
        throw new Error("[incident.create] Session actor mismatch - authentication violation");
      }
      if (session.tenantId !== createTenantId(tenantId)) {
        throw new Error("[incident.create] Cross-tenant access attempt blocked - security violation");
      }
      if (session.workspaceId !== createWorkspaceId(workspaceId)) {
        throw new Error("[incident.create] Cross-workspace access attempt blocked - security violation");
      }
    }

    const entity: IncidentAggregate = {
      id: newIncidentId(),
      title: title.trim(),
      ...(description !== undefined && description !== ""
        ? { description: description }
        : {}),
      category: category || "Infrastructure",
      status: defaultIncidentStatus,
      priority: priority ?? defaultIncidentPriority,
      tenantId: createTenantId(tenantId),
      workspaceId: createWorkspaceId(workspaceId),
      actorId: createActorId(actorId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const IncidentRepo = getIncidentRepository();
    await IncidentRepo.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

const AcknowledgeIncidentSchema = z.object({ incidentId: z.string(), sessionId: z.string(), tenantId: z.string(), workspaceId: z.string(), actorId: z.string() });
type AcknowledgeIncidentCommand = CapabilityCommand<z.infer<typeof AcknowledgeIncidentSchema>, Promise<{id: string, status: string}>>;
export const acknowledgeIncident: AcknowledgeIncidentCommand = {
  kind: "command",
  name: "incident.acknowledge",
  version: "1.0.0",
  async execute(input) {
    const parsed = AcknowledgeIncidentSchema.parse(input);
    const IncidentRepo = getIncidentRepository();
    const incident = await IncidentRepo.byId(parsed.incidentId as IncidentId);
    if (!incident) throw new Error("[incident.acknowledge] Incident not found");
    const updated = { ...incident, status: "in_progress" as const, updatedAt: new Date() };
    await IncidentRepo.save(updated);
    return { id: updated.id, status: updated.status };
  },
};

const ResolveIncidentSchema = z.object({ incidentId: z.string(), sessionId: z.string(), tenantId: z.string(), workspaceId: z.string(), actorId: z.string() });
type ResolveIncidentCommand = CapabilityCommand<z.infer<typeof ResolveIncidentSchema>, Promise<{id: string, status: string}>>;
export const resolveIncident: ResolveIncidentCommand = {
  kind: "command",
  name: "incident.resolve",
  version: "1.0.0",
  async execute(input) {
    const parsed = ResolveIncidentSchema.parse(input);
    const IncidentRepo = getIncidentRepository();
    const incident = await IncidentRepo.byId(parsed.incidentId as IncidentId);
    if (!incident) throw new Error("[incident.resolve] Incident not found");
    const updated = { ...incident, status: "resolved" as const, updatedAt: new Date() };
    await IncidentRepo.save(updated);
    return { id: updated.id, status: updated.status };
  },
};

const CloseIncidentSchema = z.object({ incidentId: z.string(), sessionId: z.string(), tenantId: z.string(), workspaceId: z.string(), actorId: z.string() });
type CloseIncidentCommand = CapabilityCommand<z.infer<typeof CloseIncidentSchema>, Promise<{id: string, status: string}>>;
export const closeIncident: CloseIncidentCommand = {
  kind: "command",
  name: "incident.close",
  version: "1.0.0",
  async execute(input) {
    const parsed = CloseIncidentSchema.parse(input);
    const IncidentRepo = getIncidentRepository();
    const incident = await IncidentRepo.byId(parsed.incidentId as IncidentId);
    if (!incident) throw new Error("[incident.close] Incident not found");
    const updated = { ...incident, status: "closed" as const, updatedAt: new Date() };
    await IncidentRepo.save(updated);
    return { id: updated.id, status: updated.status };
  },
};

export const observabilityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "incident.create": createIncident,
  "incident.acknowledge": acknowledgeIncident,
  "incident.resolve": resolveIncident,
  "incident.close": closeIncident,
} as const;

export function nextIncidentId(): string {
  return newIncidentId();
}