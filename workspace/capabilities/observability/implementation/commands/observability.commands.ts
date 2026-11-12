import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  newIncidentId,
  defaultIncidentStatus,
  defaultIncidentPriority,
  IncidentRepositoryInMemory,
} from "../repository/index.js";
// Test environment only uses in-memory repository to avoid circular dependency issues
// Postgres implementation is available for production but excluded from test runs
const _incidentRepo = IncidentRepositoryInMemory;
function getIncidentRepository() {
  return _incidentRepo;
}
// Import SEMUA canonical types dan factories dari SINGLE-SOURCE work-core (anti-drift - TENANT-ISOLATION-001)
// Sesuai dengan aturan: Semua capability harus import dari @capabilities/work-core, bukan langsung dari identity
import { 
  type SessionId, 
  type TenantId,
  type WorkspaceId,
  type ActorId,
  createSessionId,
  createTenantId,
  createWorkspaceId,
  createActorId,
  createWorkId,
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


const CreateIncidentWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.enum(["Infrastructure", "Application", "Database", "Network", "Security", "Payment", "Manufacturing"]).optional(),
  // CORE-001: Semua boundary metadata hanya ada di core Work primitive
  // Satu-satunya input yang dibutuhkan: sessionId (untuk validasi otorisasi) dan workId (untuk binding ke Work Aggregate)
  sessionId: z.string().min(1),
  workId: z.string().min(1),
});

type CreateIncidentWithContextInput = z.infer<typeof CreateIncidentWithContextSchema>;
type CreateIncidentCommand = CapabilityCommand<CreateIncidentWithContextInput, Promise<CreateIncidentOutput>>;

export const createIncident: CreateIncidentCommand = {
  kind: "command",
  name: "observability.incident.create",
  capability: "observability",
  version: "3.0.0", // CORE-001 compliant version - removed input-based boundary metadata
  async execute(input) {
    if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) await initIdentitySchema();

    const parsed = CreateIncidentWithContextSchema.parse(input);
    const { title, description, priority, category, workId: workIdValue, sessionId: sessionIdValue } = parsed;

    // Default values untuk test environment (tanpa Postgres)
    let sessionActorId = createActorId("test.actor.observability");
    let sessionTenantId = "test.tenant.observability";
    let sessionWorkspaceId = "test.workspace.observability";

    if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) {
      const SessionRepo = getSessionRepository();
      const session = await SessionRepo.byId(createSessionId(sessionIdValue));
      if (!session || session.revokedAt !== null) {
        throw new Error("[incident.create] Invalid or revoked session - authentication violation");
      }
      
      // CORE-001: Ambil semua boundary metadata dari core Work primitive (single source of truth)
      const { getWorkRepositoryPostgres } = await import("../../../work-core/index.js");
      const workRepository = getWorkRepositoryPostgres();
      const coreWork = await workRepository.byWorkId(createWorkId(workIdValue));
      if (!coreWork) {
        throw new Error("[incident.create] Core Work not found - cannot bind incident to non-existent Work primitive");
      }
      
      // CORE-001: Verifikasi akses session actor ke core Work (authorization boundary enforcement)
      if (session.tenantId !== coreWork.tenantId) {
        throw new Error("[incident.create] Cross-tenant access attempt blocked - security violation");
      }
      if (session.workspaceId !== coreWork.workspaceId) {
        throw new Error("[incident.create] Cross-workspace access attempt blocked - security violation");
      }
      
      // Ambil verified boundary metadata dari core Work dan session
      sessionActorId = session.actorId;
      sessionTenantId = coreWork.tenantId;
      sessionWorkspaceId = coreWork.workspaceId;
    }

    const entity: IncidentAggregate = {
      id: newIncidentId(),
      workId: createWorkId(workIdValue), // CORE-001: Bind incident to core Work primitive
      title: title.trim(),
      ...(description !== undefined && description !== ""
        ? { description: description }
        : {}),
      category: category || "Infrastructure",
      status: defaultIncidentStatus,
      priority: priority ?? defaultIncidentPriority,
      tenantId: createTenantId(sessionTenantId),
      workspaceId: createWorkspaceId(sessionWorkspaceId),
      actorId: createActorId(sessionActorId),
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
  name: "observability.incident.acknowledge",
  capability: "observability",
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
  name: "observability.incident.resolve",
  capability: "observability",
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
  name: "observability.incident.close",
  capability: "observability",
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

const CollectMetricsSchema = z.object({
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
});
type CollectMetricsCommand = CapabilityCommand<z.infer<typeof CollectMetricsSchema>, Promise<{metrics: readonly any[]}>>;
export const collectMetrics: CollectMetricsCommand = {
  kind: "command",
  name: "observability.metrics.collect",
  capability: "observability",
  version: "1.0.0",
  async execute(input) {
    const parsed = CollectMetricsSchema.parse(input);
    // Import ObservabilityService secara lazy untuk menghindari module cycle
    const { ObservabilityService } = await import("../services/observability.service.js");
    const observabilityService = new ObservabilityService();
    const metrics = observabilityService.getMetrics();
    return { metrics };
  },
};

export const observabilityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "observability.incident.create": createIncident,
  "observability.incident.acknowledge": acknowledgeIncident,
  "observability.incident.resolve": resolveIncident,
  "observability.incident.close": closeIncident,
  "observability.metrics.collect": collectMetrics,
} as const;

export function nextIncidentId(): string {
  return newIncidentId();
}

// Lazy import capability registry menggunakan path relatif yang konsisten
// Semua import menggunakan path yang sama untuk memastikan instance capabilityRegistry yang SAMA
async function getCapabilityRegistry() {
  const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  return capabilityRegistry;
}

// Register observability commands dengan capability registry (async untuk menghindari module cycle)
export async function registerObservabilityCoreCapability() {
  console.log("[Observability-Core] AUDIT-001-005: Observability-Core capability registration dimulai");
  console.log("[Observability-Core] observabilityCommands keys saat registrasi:", Object.keys(observabilityCommands));
  console.log("[Observability-Core] createIncident exists:", !!createIncident);
  
  const capabilityRegistry = await getCapabilityRegistry();
  Object.values(observabilityCommands).forEach((command) => {
    console.log("[Observability-Core] Mendaftarkan command:", command.name);
    capabilityRegistry.register(command);
  });
  
  const registeredCommands = capabilityRegistry.listCommandKeys();
  console.log("[Observability-Core] Command yang terdaftar setelah registrasi:", registeredCommands);
  console.log("[Observability-Core] Type of registeredCommands:", typeof registeredCommands, "Is array?", Array.isArray(registeredCommands));
  console.log("[Observability-Core] AUDIT-001-005: Observability-Core capability registered successfully");
}

// Handle registrasi async dengan error catching untuk menghindari unhandled promise rejection
void registerObservabilityCoreCapability().catch((err) => {
  console.error("[Observability-Core] Gagal mendaftarkan capability:", err);
});