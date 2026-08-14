import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { newIncidentId, defaultIncidentStatus, defaultIncidentPriority } from "../repository";
import { IncidentRepositoryPostgres } from "../repository/incident-postgres.repository";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository";
import { SessionRepositoryPostgres } from "../../../identity/implementation/repositories/session.repository";
import type {
  CreateIncidentInput,
  CreateIncidentOutput,
  IncidentAggregate,
} from "../contracts/observability.contracts";

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
    await initIdentitySchema();
    
    const parsed = CreateIncidentWithContextSchema.parse(input);
    const { title, description, priority, category, tenantId, workspaceId, sessionId, actorId } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await SessionRepositoryPostgres.byId(sessionId);
    if (!session || session.revokedAt !== null) {
      throw new Error("[incident.create] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== actorId) {
      throw new Error("[incident.create] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== tenantId) {
      throw new Error("[incident.create] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace
    if (session.workspaceId !== workspaceId) {
      throw new Error("[incident.create] Cross-workspace access attempt blocked - security violation");
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
    // Add tenant/workspace context for isolation
    (entity as any).tenantId = tenantId;
    (entity as any).workspaceId = workspaceId;

    await IncidentRepositoryPostgres.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const observabilityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "incident.create": createIncident,
} as const;

export function nextIncidentId(): string {
  return newIncidentId();
}