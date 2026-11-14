// @ts-nocheck
/**
 * Capability Invokers for Digital Operations
 * Reusable wrappers to invoke core EOS capabilities without modifying frozen EOS Core
 * Follows the same lazy import pattern from retail-inventory capability to avoid module cycles
 * Implements EOS-360 pattern: MCP adapter support, work continuity, governance parity
 */

// Import canonical EOS primitives untuk MCP mapping dan evidence recording (100% reuse)
import {
  createWorkId,
  createSessionId,
  createDeviceId,
  createTenantId,
  createWorkspaceId,
  safeRecordEvidence
} from "../../../capabilities/work-core/implementation/utils/index.js";
import {
  type ExecutionEnvelope,
  ExecutionEnvelopeSchema
} from "../../../capabilities/connector-ecosystem/implementation/contracts/connector-ecosystem.contracts.js";
// Reuse investment-compliance capability (ACaaS) - EOS-360-003 Capability Reusability
import { complianceCaseCommands } from "../../../capabilities/investment-compliance/implementation/commands/compliance-case.commands.js";
// Import capability registry untuk registrasi capability yang direuse
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

// Daftarkan investment-compliance capability ke Digital Operations product context
// Tanpa duplikasi kode, 100% reuse dari capability yang sudah ada
// Sesuai signature capabilityRegistry.register() yang hanya menerima satu CapabilityCommand per panggilan
Object.values(complianceCaseCommands).forEach(command => {
  capabilityRegistry.register(command);
});

/**
 * EOS-360-002: MCP Payload ke ExecutionEnvelope Context Mapping Function (Digital Operations)
 * Mengkonversi raw MCP payload (dari AI agent/tool call) ke EOS ExecutionEnvelope yang valid
 * Menjaga semua field yang diperlukan untuk governance, tenant isolation, dan traceability
 * TIDAK ADA BYPASS: semua validasi yang sama dengan API call tetap berlaku (EOS-360-004 authorization parity)
 */
export function mapMcpPayloadToExecutionEnvelope(mcpPayload: {
  mcp_session_id: string;
  agent_role: string;
  tenant_context: string;
  workspace_context: string;
  device_identifier: string;
  logical_work_id?: string;
  intent_payload: Record<string, unknown>;
  correlation_id?: string;
}): ExecutionEnvelope {
  // Generate UUID v4 untuk eventId dan correlationId jika tidak disediakan
  const generateUuid = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Buat canonical EOS identifiers dari MCP context (ikuti factory pattern dari work-core)
  const tenantId = createTenantId(mcpPayload.tenant_context);
  const workspaceId = createWorkspaceId(mcpPayload.workspace_context);
  const deviceId = createDeviceId(mcpPayload.device_identifier);
  const sessionId = createSessionId(mcpPayload.mcp_session_id);
  
  // Gunakan logical_work_id jika ada (untuk Work continuity) atau buat baru jika belum ada
  // EOS-360-005: Work continuity - logical Work ID bertahan lintas channel, actor, provider
  const logicalWorkId = mcpPayload.logical_work_id 
    ? createWorkId(mcpPayload.logical_work_id) 
    : createWorkId(generateUuid());

  // Konstruksi ExecutionEnvelope yang sesuai schema canonical
  const executionEnvelope: ExecutionEnvelope = {
    schemaVersion: "1.0.0",
    eventId: generateUuid(),
    logicalWorkId: logicalWorkId,
    deviceId: deviceId,
    tenantId: tenantId,
    workspaceId: workspaceId,
    sessionId: sessionId,
    intent: {
      type: "digital-operations.operate", // Dipetakan langsung ke capability command yang terdaftar
      payload: mcpPayload.intent_payload
    },
    correlationId: mcpPayload.correlation_id || generateUuid(),
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expire dalam 24 jam
  };

  // Validasi schema sebelum return - tidak boleh mengirim envelope yang tidak valid
  const validated = ExecutionEnvelopeSchema.safeParse(executionEnvelope);
  if (!validated.success) {
    throw new Error(`[digital-operations.mapMcpPayload] MCP payload validation failed: ${validated.error.issues.map(i => i.message).join(", ")}`);
  }

  // Catat evidence bahwa mapping berhasil (audit trail) - EOS-360-007 evidence continuity
  safeRecordEvidence({
    capability: "digital-operations",
    command: "mcp-payload-mapped",
    work_id: logicalWorkId,
    actor_id: `mcp-agent:${mcpPayload.agent_role}`,
    tenant_id: tenantId,
    workspace_id: workspaceId,
    sessionId: sessionId,
    timestamp: new Date().toISOString(),
    mcpEventId: executionEnvelope.eventId,
    mcpCorrelationId: executionEnvelope.correlationId
  });

  return executionEnvelope;
}

/**
 * Generic capability invoker following the pattern established in existing capabilities
 * @param capability - The capability ID to invoke (e.g., "work-core", "identity", "evidence-registry")
 * @param commandName - The command name within the capability (e.g., "create", "update")
 * @param input - The input payload for the command
 * @returns The command execution result
 */
async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  const loaded = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
  const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<Output> } }).capabilityRegistry;
  
  if (typeof reg?.invoke !== "function") {
    throw new Error(`[DIGOPS-001] capabilityRegistry.invoke unavailable for ${capability}.${commandName}`);
  }
  
  const result = await reg.invoke(capability, commandName, input as never);
  return result;
}

/**
 * Work Core command invoker - specifically for work-core capability commands
 */
export async function invokeWorkCoreCommand<Output = unknown>(
  commandName: string,
  input: unknown,
): Promise<Output> {
  return invokeCapability<Output>("work-core", commandName, input);
}

/**
 * Identity capability invoker - specifically for identity capability commands
 */
export async function invokeIdentityCommand<Output = unknown>(
  commandName: string,
  input: unknown,
): Promise<Output> {
  return invokeCapability<Output>("identity", commandName, input);
}

/**
 * Evidence Registry invoker - specifically for governance-evidence capability commands
 */
export async function invokeEvidenceRegistryCommand<Output = unknown>(
  commandName: string,
  input: unknown,
): Promise<Output> {
  return invokeCapability<Output>("evidence-registry", commandName, input);
}

/**
 * Test if all core capabilities are available and their commands are registered
 * Verifies Layer 5 invokability requirement from eos-product-slice execution contract
 */
export async function testCoreCapabilitiesInvokability(): Promise<{
  workCoreAvailable: boolean;
  identityAvailable: boolean;
  evidenceRegistryAvailable: boolean;
  registeredWorkCoreCommands: string[];
}> {
  const loaded = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
  const reg = (loaded as { 
    capabilityRegistry?: { 
      hasCapability: (id: string) => boolean; 
      listCommandKeys: () => string[];
    } 
  }).capabilityRegistry;
  
  if (!reg) {
    throw new Error("[DIGOPS-002] capabilityRegistry unavailable for invokability testing");
  }
  
  const workCoreAvailable = reg.hasCapability("work-core");
  const identityAvailable = reg.hasCapability("identity");
  const evidenceRegistryAvailable = reg.hasCapability("evidence-registry");
  
  const allCommands = reg.listCommandKeys();
  const registeredWorkCoreCommands = allCommands.filter(key => key.startsWith("work-core."));
  
  console.log("[DigitalOperations] ✅ Capability invokability test completed:");
  console.log(`- work-core available: ${workCoreAvailable}`);
  console.log(`- identity available: ${identityAvailable}`);
  console.log(`- evidence-registry available: ${evidenceRegistryAvailable}`);
  registeredWorkCoreCommands.forEach(cmd => console.log(`  • ${cmd}`));
  
  return {
    workCoreAvailable,
    identityAvailable,
    evidenceRegistryAvailable,
    registeredWorkCoreCommands
  };
}

/**
 * Create a new Digital Operations Work item using work-core's create command
 * Follows EOS Core Work identity continuity rules (never create custom Work IDs)
 */
export async function createDigitalOperationsWork(input: {
  title: string;
  description: string;
  tenantId: string;
  actorId: string;
  servicePackage: string;
}): Promise<{ workId: string }> {
  return invokeWorkCoreCommand<{ workId: string }>("create", {
    title: `Digital Operations: ${input.servicePackage} - ${input.title}`,
    description: input.description,
    tenantId: input.tenantId,
    actorId: input.actorId,
    metadata: {
      product: "digital-operations",
      servicePackage: input.servicePackage,
      origin: "managed-outcome-loop"
    }
  });
}

/**
 * Close a Digital Operations Work item while preserving continuity for renewal
 * Maintains the non-terminal-cycle workflow from workflow-definition.ts
 */
export async function closeDigitalOperationsWork(input: {
  workId: string;
  actorId: string;
  verifiedOutcome: boolean;
  notes: string;
}): Promise<{ success: boolean }> {
  return invokeWorkCoreCommand<{ success: boolean }>("updateWork", {
    workId: input.workId,
    actorId: input.actorId,
    updates: {
      status: input.verifiedOutcome ? "completed-ready-for-renewal" : "needs-followup",
      metadata: {
        verifiedOutcome: input.verifiedOutcome,
        closureNotes: input.notes,
        lastUpdatedAt: new Date().toISOString()
      }
    }
  });
}