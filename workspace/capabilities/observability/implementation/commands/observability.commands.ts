import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  newIncidentId,
  defaultIncidentStatus,
  defaultIncidentPriority,
  IncidentRepositoryInMemory,
} from "../repository/index.js";
import { IncidentRepositoryPostgres } from "../repository/incident-postgres.repository.js";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository.js";
import { getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/session.repository.js";
import type {
  CreateIncidentInput,
  CreateIncidentOutput,
  IncidentAggregate,
} from "../contracts/observability.contracts.js";

const _sessionRepo = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : null;
function getSessionRepository() {
  if (_sessionRepo === null) {
    throw new Error("[observability] DATABASE_URL required for session authentication in Postgres mode");
  }
  return _sessionRepo;
}
const _incidentRepo = process.env.DATABASE_URL
  ? IncidentRepositoryPostgres
  : IncidentRepositoryInMemory;
function getIncidentRepository() {
  return _incidentRepo as typeof IncidentRepositoryInMemory | typeof IncidentRepositoryPostgres;
}

const CreateIncidentWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.enum(["Infrastructure", "Application", "Database", "Network", "Security"]).optional(),
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
    if (process.env.DATABASE_URL) await initIdentitySchema();

    const parsed = CreateIncidentWithContextSchema.parse(input);
    const { title, description, priority, category, tenantId, workspaceId, sessionId, actorId } = parsed;

    if (process.env.DATABASE_URL) {
      const SessionRepo = getSessionRepository();
      const session = await SessionRepo.byId(sessionId);
      if (!session || session.revokedAt !== null) {
        throw new Error("[incident.create] Invalid or revoked session - authentication violation");
      }
      if (session.actorId !== actorId) {
        throw new Error("[incident.create] Session actor mismatch - authentication violation");
      }
      if (session.tenantId !== tenantId) {
        throw new Error("[incident.create] Cross-tenant access attempt blocked - security violation");
      }
      if (session.workspaceId !== workspaceId) {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    (entity as any).tenantId = tenantId;
    (entity as any).workspaceId = workspaceId;

    const IncidentRepo = getIncidentRepository();
    await IncidentRepo.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const observabilityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "incident.create": createIncident,
} as const;

export function nextIncidentId(): string {
  return newIncidentId();
}