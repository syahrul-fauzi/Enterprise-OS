// @ts-nocheck
/**
 * SMACE Capability Invokers - EOS-360-002 MCP Adapter & Capability Reuse
 * Mengikuti pola yang sama dengan Digital Operations untuk konsistensi EOS 360
 * Menyediakan:
 * 1. MCP payload ke ExecutionEnvelope mapping function
 * 2. Reuse existing EOS capabilities (tidak ada duplikasi)
 * 3. Lazy capability invocation untuk menghindari module cycles
 * 4. Semua governance rules tetap berlaku untuk MCP access
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

// Daftarkan investment-compliance capability ke SMACE product context
// Tanpa duplikasi kode, 100% reuse dari capability yang sudah ada
// Sesuai signature capabilityRegistry.register() yang hanya menerima satu CapabilityCommand per panggilan
Object.values(complianceCaseCommands).forEach(command => {
  capabilityRegistry.register(command);
});

/**
 * EOS-360-002: MCP Payload ke ExecutionEnvelope Context Mapping Function (SMACE)
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

  // Buat canonical EOS identifiers dari MCP context
  const tenantId = createTenantId(mcpPayload.tenant_context);
  const workspaceId = createWorkspaceId(mcpPayload.workspace_context);
  const deviceId = createDeviceId(mcpPayload.device_identifier);
  const sessionId = createSessionId(mcpPayload.mcp_session_id);
  
  const logicalWorkId = mcpPayload.logical_work_id 
    ? createWorkId(mcpPayload.logical_work_id) 
    : createWorkId(generateUuid());

  const executionEnvelope: ExecutionEnvelope = {
    schemaVersion: "1.0.0",
    eventId: generateUuid(),
    logicalWorkId: logicalWorkId,
    deviceId: deviceId,
    tenantId: tenantId,
    workspaceId: workspaceId,
    sessionId: sessionId,
    intent: {
      type: "smace.ai-product-photography.create",
      payload: mcpPayload.intent_payload
    },
    correlationId: mcpPayload.correlation_id || generateUuid(),
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  const validated = ExecutionEnvelopeSchema.safeParse(executionEnvelope);
  if (!validated.success) {
    throw new Error(`[smace.mapMcpPayload] MCP payload validation failed: ${validated.error.issues.map(i => i.message).join(", ")}`);
  }

  safeRecordEvidence({
    capability: "smace",
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
 * Generic capability invoker untuk SMACE - lazy import untuk menghindari module cycles
 * Mengikuti pattern yang sama dengan Digital Operations untuk konsistensi
 */
async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  const loaded = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
  const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<Output> } }).capabilityRegistry;
  
  if (typeof reg?.invoke !== "function") {
    throw new Error(`[SMACE-001] capabilityRegistry.invoke unavailable for ${capability}.${commandName}`);
  }
  
  const result = await reg.invoke(capability, commandName, input as never);
  return result;
}

/**
 * Helper untuk invoke work-core commands (create, updateWork, dll.)
 */
async function invokeWorkCoreCommand<Output = unknown>(
  commandName: string,
  input: unknown,
): Promise<Output> {
  return invokeCapability<Output>("work-core", commandName, input);
}

// Export public functions untuk digunakan oleh adapter dan experience layers
export {
  invokeCapability,
  invokeWorkCoreCommand
};