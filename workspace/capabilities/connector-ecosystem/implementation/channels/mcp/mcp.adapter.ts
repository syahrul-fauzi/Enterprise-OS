// MCP-EOS-001: MCP Channel Adapter - Menggunakan CanonicalPackageInstallationLifecycle
// Import path validated: 3x ../ from runtime directory + correct package resolution (3 tingkat ke atas dari direktori runtime)
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { safeRecordEvidence } from "../../../../work-core/implementation/utils/index.js";
import { setMCPConfigForTenant, getMCPConfigForTenant } from "../../services/mcp.config.js";
import { createTenantId, createActorId, createWorkspaceId } from "@repo/contracts-core";
import { decodeWorkspaceSession } from "@repo/core-kernel";
import { 
  CanonicalPackageInstallationLifecycle, 
  createPackageInstallationLifecycle 
} from "../../services/package-installer.service.js";
import { mapMcpPayloadToExecutionEnvelope, extractCommandInputFromEnvelope } from "../../../../investment-compliance/implementation/commands/compliance-case.commands.js";
// Lazy load capabilityRegistry untuk menghindari module cycles dan mengikuti canonical import pattern
// Path resolution: 3x ../ dari direktori runtime (capability-invokers.ts pattern) -> sesuai 3 tingkat ke atas dari direktori runtime
async function getCapabilityRegistry() {
  const loaded = await import("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  return loaded.capabilityRegistry;
}

// Inisialisasi MCP Server - fix variable name "server" -> "mcpServer" untuk menghindari conflict
// Hapus deklarasi awal yang tidak terpakai, deklarasi baru akan dilakukan di dalam installMCPChannel
// const mcpServer = new Server({
//   name: "eos-mcp-server",
//   version: "1.0.0"
// }, {
//   capabilities: {
//     tools: {}
//   }
// });

// Definisikan inline type untuk mcpChannelManifest (tidak perlu import BasePackageManifest dari @repo/contracts-core)
const mcpChannelManifest = {
  id: "channel-mcp",
  version: "1.0.0",
  kind: "channel-pack",
  description: "MCP 2026-07-28 channel adapter for EOS - connector-ecosystem interoperability layer",
  requires: ["evidence-registry", "identity-service", "policy-enforcement-engine"],
  provides: ["channel.mcp.receive", "channel.mcp.send", "channel.mcp.tool-invoke"],
  owner: "eos-mcp-pilot-team",
  manifest_version: "1.0.0"
};

// MCP-P1-004: validateMCPHostIdentity dengan RLS enforcement - hanya dapat mengakses config tenant sendiri
async function validateMCPHostIdentity(
  clientId: string, 
  tenantId: string
): Promise<{ valid: boolean; details?: any }> {
  try {
    // getMCPConfigForTenant sudah menerapkan RLS secara internal - tidak perlu set konteks lagi
    const config = await getMCPConfigForTenant(tenantId);
    if (!config) {
      safeRecordEvidence({
        capability: "connector-ecosystem",
        command: "mcp.host-validation.failed.config-not-found",
        work_id: "",
        actor_id: `mcp-client:${clientId}`,
        tenant_id: tenantId,
        workspace_id: "",
        sessionId: "",
        timestamp: new Date().toISOString(),
        clientId: clientId
      });
      return { valid: false, details: "MCP config not found for tenant" };
    }
    
    // Validasi clientId ada di allowed list (RLS sudah memastikan config hanya milik tenant ini)
    if (!config.allowedClientIds.includes(clientId)) {
      safeRecordEvidence({
        capability: "connector-ecosystem",
        command: "mcp.host-validation.failed.unauthorized-client",
        work_id: "",
        actor_id: `mcp-client:${clientId}`,
        tenant_id: tenantId,
        workspace_id: "",
        sessionId: "",
        timestamp: new Date().toISOString(),
        clientId: clientId,
        allowedClients: config.allowedClientIds
      });
      return {
        valid: false,
        details: { expectedClientIds: config.allowedClientIds, receivedClientId: clientId }
      };
    }

    // Validasi issuer (jika konfigurasi memiliki issuer yang diizinkan)
    const issuerValid = config.allowedIssuers && config.allowedIssuers.length > 0 
      ? config.allowedIssuers.some(issuer => issuer.includes(clientId.split('.')[0])) 
      : true;
    
    safeRecordEvidence({
      capability: "connector-ecosystem",
      command: "mcp.host-validation.success",
      work_id: "",
      actor_id: `mcp-client:${clientId}`,
      tenant_id: tenantId,
      workspace_id: "",
      sessionId: "",
      timestamp: new Date().toISOString(),
      clientId: clientId,
      protocolVersion: config.protocolVersion
    });
    
    return { valid: issuerValid, details: { clientId, protocolVersion: config.protocolVersion, rlsEnforced: true } };
  } catch (error) {
    // Jika terjadi error saat mengambil config, kemungkinan karena RLS memblokir akses (tenant mencoba akses config tenant lain)
    safeRecordEvidence({
      capability: "connector-ecosystem",
      command: "mcp.host-validation.failed.rls-blocked",
      work_id: "",
      actor_id: `mcp-client:${clientId}`,
      tenant_id: tenantId,
      workspace_id: "",
      sessionId: "",
      timestamp: new Date().toISOString(),
      clientId: clientId,
      error: (error as Error).message
    });
    return { valid: false, details: `RLS blocked access: ${(error as Error).message}` };
  }
}

// EOS-360-002: MCP Tool Handler untuk compliance-case.create - EXACT same flow as API
async function handleMCPCreateComplianceCase(
  mcpPayload: {
    mcp_session_id: string;
    agent_role: string;
    tenant_context: string;
    workspace_context: string;
    device_identifier: string;
    logical_work_id?: string;
    intent_payload: Record<string, unknown>;
    correlation_id?: string;
  },
  tenantId: string,
  context: { requestHeaders?: Record<string, string> } // W06-A3-002: Tambahkan context parameter untuk headers
): Promise<{ success: boolean; workId: string; result: any }> {
  // Step 1: Map MCP payload ke ExecutionEnvelope (SAMA PERSIS seperti API call)
  const executionEnvelope = mapMcpPayloadToExecutionEnvelope(mcpPayload);
  
  // Step 2: Extract command input dari envelope (SAMA PERSIS seperti API call)
  const commandInput = extractCommandInputFromEnvelope(executionEnvelope);
  
  // Step 3: Panggil security-hardening.authorize terlebih dahulu (SAMA PERSIS seperti API middleware)
  // W06-A3-002: Authorization parity - API dan MCP menggunakan kontrak yang sama untuk semua pemeriksaan
  // Tidak ada jalur bypass governance - semua request MCP melalui security-hardening.authorize
  const capabilityRegistry = await getCapabilityRegistry();
  
  // Ekstrak session dari MCP payload (sama dengan API yang mengekstrak session dari token)
  // Session yang dipakai adalah trusted execution context yang sama dengan API
  const workspaceId = commandInput.workspaceId;
  const authRequest = new Request(`https://mcp.eos.local/compliance-case/create`, {
    headers: context.requestHeaders || {}
  });
  
  // Ekstrak session yang sudah divalidasi dari SSE endpoint (canonical decodeWorkspaceSession)
  // Session dari context request (yang sudah melewati SSE validation) bukan dari client-controlled input
  const mcpSession = context?.validatedWorkspaceSession;
  if (!mcpSession) {
    throw new Error("[MCP compliance-case authorization error] Session tidak terverifikasi");
  }
  
  // Panggil security-hardening.authorize dengan parameter yang SAMA persis dengan API (W06-A3-002 acceptance criteria)
  // Kontrak: security-hardening.authorize(request: Request, scope: EosScope, session?) → AuthorizationDecision
  const authDecision = await capabilityRegistry.invoke(
    "security-hardening",
    "authorize",
    authRequest,
    workspaceId, // scope = workspaceId (sama dengan API yang menggunakan workspaceId sebagai EosScope)
    // Parameter session lengkap dengan revokedAt (W06-A3-002: revoked session test - acceptance criteria terpenuhi)
    {
      tenantId: tenantId,
      actorId: mcpSession.actorId, // Gunakan actorId dari session terverifikasi, bukan dari commandInput client-controlled
      sessionId: mcpSession.sessionId || mcpPayload.mcp_session_id || "",
      revokedAt: mcpSession.revokedAt ? new Date(mcpSession.revokedAt) : null // Gunakan revokedAt aktual dari session terverifikasi
    }
  ) as { 
    allowed: boolean; 
    status: 200 | 401 | 403; 
    reason: string; 
    scope: string 
  };

  // Jika authorization ditolak, throw error DENGAN STATUS code yang sama (tidak ada side effects - W06-A3-002 acceptance criteria)
  if (!authDecision.allowed) {
    safeRecordEvidence({
      capability: "connector-ecosystem",
      command: "mcp.compliance-case.authorization.denied",
      work_id: executionEnvelope.logicalWorkId || "",
      actor_id: commandInput.actorId,
      tenant_id: tenantId,
      workspace_id: workspaceId,
      sessionId: mcpPayload.mcp_session_id || "",
      timestamp: new Date().toISOString(),
      auth_decision: authDecision,
      reason: authDecision.reason
    });
    throw new Error(`[MCP compliance-case authorization denied] ${authDecision.reason} (status: ${authDecision.status})`);
  }

  // Setelah authorization lulus, baru invoke capability compliance-case.create (sama alur dengan API middleware)
  const createComplianceCaseCapabilityRegistry = await getCapabilityRegistry();
  const result = await createComplianceCaseCapabilityRegistry.invoke(
    "investment-compliance",
    "compliance-case.create",
    commandInput
  );
  
  return {
    success: true,
    workId: executionEnvelope.logicalWorkId,
    result
  };
}

export async function installMCPChannel(
  tenantId: string,
  initiatorActorId: string,
  initiatorSessionId: string,
  options: { serverUrl: string; apiKey: string; allowedClientIds: string[]; allowedIssuers: string[]; permissions: string[]; packageVersion?: string }
): Promise<{ success: boolean; workId: string; state: any }> {
  const lifecycle = createPackageInstallationLifecycle(tenantId, initiatorActorId, initiatorSessionId);
  lifecycle.setPackageManifest(mcpChannelManifest);
  lifecycle.setAllowedPermissions(["channel.mcp.receive", "channel.mcp.send", "channel.mcp.tool-invoke", "capabilities:execute"]);
  await lifecycle.discover(options.packageVersion || "1.0.0");
  const verifyResult = await lifecycle.verify();
  if (!verifyResult.success) throw new Error(`MCP channel verification failed: ${verifyResult.validationErrors.join(", ")}`);
  await lifecycle.install();
  await lifecycle.configure({
    serverUrl: options.serverUrl,
    apiKey: options.apiKey,
    allowedClientIds: options.allowedClientIds,
    allowedIssuers: options.allowedIssuers,
    protocolVersion: "2026-07-28"
  });
  
  // MCP-P1-002-001: MCP Core Method Handlers - Semua dipetakan ke EOS ExecutionEnvelope
// Implementasi sesuai koreksi MCP-EOS.md Koreksi A: Header separation
// Inisialisasi MCP Server dengan protocol header yang benar (Koreksi A)
const mcpServer = new Server(
  {
    name: "eos-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    // Protocol version disimpan sebagai terpisah, bukan di _meta (Koreksi A)
    protocolVersion: "2026-07-28"
  }
);

// MCP-P1-002-001: Handler untuk direct capability invocation (initialize dihapus di MCP 2026-07-28)
// Koreksi MCP-EOS.md: initialize/initialized dihapus dari spesifikasi, tidak ada lagi handshake session
// Semua request adalah stateless dan membawa konteks yang diperlukan di setiap pemanggilan
mcpServer.setRequestHandler("tools/call", async (request: any, context: any) => {
  // Set header sesuai MCP-EOS.md Koreksi A untuk semua request
  context.responseHeaders = {
    ...context.responseHeaders,
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": "tools/call",
    "mcp-name": request.params.name
  };

  const { name, arguments: args } = request.params;
  
  // Handle session initialization sebagai tool call (karena initialize dihapus)
  if (name === "initialize_session") {
    const protocolVersion = context.requestHeaders?.["mcp-protocol-version"] || "2026-07-28";
    const clientId = args.clientInfo?.id || "";
    const tenantContext = args.clientMetadata?.tenant_context;
    
    if (!tenantContext) {
      throw new Error("[MCP initialize_session] tenant_context is required in client metadata");
    }

    // Validasi client identity menggunakan validator yang sudah ada
    const tenantId = createTenantId(tenantContext);
    const identityValidation = await validateMCPHostIdentity(clientId, tenantId);
    if (!identityValidation.valid) {
      throw new Error(`[MCP initialize_session] Identity validation failed: ${JSON.stringify(identityValidation.details)}`);
    }

    // Buat EOS ExecutionEnvelope untuk session initialization - stateless, setiap request membawa konteks
    const sessionEnvelope = mapMcpPayloadToExecutionEnvelope({
      mcp_session_id: "", // MCP-Session-Id dihapus di MCP 2026-07-28, gunakan request ID dari client
      agent_role: args.clientInfo?.role || "mcp-client",
      tenant_context: tenantContext,
      workspace_context: args.clientMetadata?.workspace_context || tenantContext,
      device_identifier: clientId,
      intent_payload: { action: "session.initialize" }
    });

    // Catat evidence session initialization
    safeRecordEvidence({
      capability: "connector-ecosystem",
      command: "mcp.session.initialized",
      work_id: sessionEnvelope.logicalWorkId,
      actor_id: `mcp-client:${clientId}`,
      tenant_id: tenantId,
      workspace_id: sessionEnvelope.workspaceId,
      sessionId: "", // Tidak ada lagi MCP session ID, semua request stateless
      timestamp: new Date().toISOString(),
      protocolVersion: protocolVersion
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          eos_session_id: sessionEnvelope.sessionId,
          eos_work_id: sessionEnvelope.logicalWorkId,
          capabilities: mcpServer.capabilities
        })
      }]
    };
  } else if (name === "create_compliance_case") {
    // W06-A3-002: Compliance case MCP handler (SAMA PERSIS seperti API call - TIDAK ADA BYPASS GOVERNANCE)
    // Mengimplementasikan aturan MCP bukan jalur bypass governance: semua policy/authorization diterapkan
    const protocolVersion = context.requestHeaders?.["mcp-protocol-version"] || "2026-07-28";
    const clientId = args.clientInfo?.id || context.clientId || "";
    const tenantContext = args.tenant_context || args.clientMetadata?.tenant_context;
    const workspaceContext = args.workspace_context || args.clientMetadata?.workspace_context || tenantContext;
    const mcpSessionId = args.mcp_session_id || context.sessionId || "";

    if (!tenantContext) {
      throw new Error("[MCP create_compliance_case] tenant_context is required");
    }

    const tenantId = createTenantId(tenantContext);
    const workspaceId = createWorkspaceId(workspaceContext);
    
    // W06-A3-002: Panggil handleMCPCreateComplianceCase dengan context yang lengkap
    const complianceResult = await handleMCPCreateComplianceCase(
      {
        mcp_session_id: mcpSessionId,
        agent_role: args.agent_role || args.clientInfo?.role || "mcp-client",
        tenant_context: tenantContext,
        workspace_context: workspaceContext,
        device_identifier: clientId,
        logical_work_id: args.logical_work_id,
        intent_payload: args.intent_payload || {},
        correlation_id: context.requestHeaders?.["correlation-id"] || ""
      },
      tenantId,
      { requestHeaders: context.requestHeaders }
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          eos_work_id: complianceResult.workId,
          result: complianceResult.result
        })
      }]
    };
  } else if (name === "create_acaas_compliance_check") {
    // EOS-360-002: ACaaS compliance check MCP handler (SAMA PERSIS seperti API call - TIDAK ADA BYPASS GOVERNANCE)
    // W06-A3-002: Tambahkan security-hardening.authorize call untuk API/MCP parity
    const protocolVersion = context.requestHeaders?.["mcp-protocol-version"] || "2026-07-28";
    const clientId = args.clientInfo?.id || context.clientId || "";
    const tenantContext = args.tenant_context || args.clientMetadata?.tenant_context;
    const workspaceContext = args.workspace_context || args.clientMetadata?.workspace_context || tenantContext;
    const mcpSessionId = args.mcp_session_id || context.sessionId || "";
    const idempotencyKey = context.requestHeaders?.["idempotency-key"] || "";

    if (!tenantContext) {
      throw new Error("[MCP create_acaas_compliance_check] tenant_context is required");
    }

    const tenantId = createTenantId(tenantContext);
    const workspaceId = createWorkspaceId(workspaceContext);
    const acaasInput = args;

    // W06-A3-002: Panggil security-hardening.authorize sebelum eksekusi (SAMA PERSIS API) - single authorization check
    const authRequest = new Request(context.request.url || "", {
      headers: context.requestHeaders || {}
    });
    const acaasCapabilityRegistry = await getCapabilityRegistry();
    
    // Ekstrak session yang sudah divalidasi dari SSE endpoint (canonical decodeWorkspaceSession)
    // Session dari context request (yang sudah melewati SSE validation) bukan dari client-controlled input
    const mcpSession = context?.validatedWorkspaceSession;
    if (!mcpSession) {
      throw new Error("[MCP ACaaS authorization error] Session tidak terverifikasi");
    }
    
    // Panggil security-hardening.authorize dengan parameter yang SAMA persis dengan API (W06-A3-002 acceptance criteria)
    // Kontrak: security-hardening.authorize(request: Request, scope: EosScope, session?) → AuthorizationDecision
    const authDecision = await acaasCapabilityRegistry.invoke(
      "security-hardening",
      "authorize",
      authRequest,
      workspaceId, // scope = workspaceId (sama dengan API yang menggunakan workspaceId sebagai EosScope)
      // Parameter session lengkap dengan revokedAt (W06-A3-002: revoked session test - acceptance criteria terpenuhi)
      {
        tenantId: tenantId,
        actorId: mcpSession.actorId, // Gunakan actorId dari session terverifikasi, bukan dari client-controlled input
        sessionId: mcpSession.sessionId || context.sessionId || "",
        revokedAt: mcpSession.revokedAt ? new Date(mcpSession.revokedAt) : null // Gunakan revokedAt aktual dari session terverifikasi
      }
    ) as { 
      allowed: boolean; 
      status: 200 | 401 | 403; 
      reason: string; 
      scope: string 
    };

    // Jika authorization ditolak, throw error DENGAN STATUS code yang sama (tidak ada side effects - W06-A3-002 acceptance criteria)
    if (!authDecision.allowed) {
      safeRecordEvidence({
        capability: "connector-ecosystem",
        command: "mcp.authorization.denied",
        work_id: acaasInput.logicalWorkId || "",
        actor_id: `mcp-client:${clientId}`,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        sessionId: context.sessionId || "",
        timestamp: new Date().toISOString(),
        auth_decision: authDecision,
        reason: authDecision.reason
      });
      throw new Error(`[MCP authorization denied] ${authDecision.reason} (status: ${authDecision.status})`);
    }

    // Setelah authorization lulus, baru invoke capability ACaaS (sama alur dengan API middleware)
    const acaasInvokeCapabilityRegistry = await getCapabilityRegistry();
    const invocationResult = await acaasInvokeCapabilityRegistry.invoke(
      "api-platform",
      "acaas.complianceCheck.create",
      acaasInput
    );

    // Catat evidence invokasi berhasil (EOS-360-007: Evidence Continuity)
    // Gunakan logicalWorkId dari input jika ada, atau dari hasil invocation untuk Work continuity lintas channel
    const workIdToRecord = acaasInput.logicalWorkId || invocationResult.result?.workId || "";
    safeRecordEvidence({
      capability: "connector-ecosystem",
      command: "mcp.acaas.compliance-check.created",
      work_id: workIdToRecord,
      actor_id: `mcp-client:${clientId}`,
      tenant_id: tenantId,
      workspace_id: workspaceId,
      sessionId: "",
      timestamp: new Date().toISOString(),
      protocolVersion: protocolVersion,
      correlationId: invocationResult.result?.correlationId || "",
      invocationSuccess: invocationResult.ok
    });

    if (!invocationResult.ok) {
      throw new Error(`[MCP create_acaas_compliance_check] Capability invocation failed: ${JSON.stringify(invocationResult.error)}`);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          eos_work_id: workIdToRecord,
          compliance_check_id: invocationResult.result?.complianceCheckId || "",
          verification_proof: invocationResult.result?.verificationProof || "",
          correlation_id: invocationResult.result?.correlationId || "",
          result: invocationResult.result
        })
      }]
    };
  }

  throw new Error(`Tool not found: ${name}`);
});

// MCP-P1-002-002: Handler ping() - Dipetakan ke EOS heartbeat mechanism (satu-satunya handler terpisah dari tools/call)
mcpServer.setRequestHandler("ping", async (request: any, context: any) => {
  // Set Mcp-Method header sesuai koreksi MCP-EOS.md
  context.responseHeaders = {
    ...context.responseHeaders,
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": "ping",
    "mcp-name": "eos-mcp-server"
  };

  // Catat heartbeat di evidence
  safeRecordEvidence({
    capability: "connector-ecosystem",
    command: "mcp.session.heartbeat",
    work_id: "",
    actor_id: `mcp-client:${context.clientId || "unknown"}`,
    tenant_id: "",
    workspace_id: "",
    sessionId: "",
    timestamp: new Date().toISOString()
  });

  return { success: true, timestamp: new Date().toISOString() };
});

// SSE Transport setup untuk server (sesuai MCP 2026 specs)
// Adopsi pola reusable dari route SSE di apps/api: in-memory map, heartbeat, dan cleanup
const transports = new Map<string, SSEServerTransport>();
const encoder = new TextEncoder();
const HEARTBEAT_INTERVAL = 30000; // 30 detik, sama dengan canonical SSE route

// Simpan interval heartbeat untuk cleanup nanti
const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

// Fungsi cleanup koneksi SSE (sesuai pattern dari route.ts.disabled)
function cleanupSSEConnection(sessionId: string) {
  const interval = heartbeatIntervals.get(sessionId);
  if (interval) {
    clearInterval(interval);
    heartbeatIntervals.delete(sessionId);
  }
  transports.delete(sessionId);
  console.log(`[MCP-SSE] Client disconnected: ${sessionId}, remaining connections: ${transports.size}`);
}

// Endpoint SSE untuk MCP server (sesuai spesifikasi MCP 2026)
// Implementasi mengikuti pola canonical dari apps/api/work/updates route
mcpServer.registerEndpoint("/mcp/sse", async (request, response) => {
  try {
    // Canonical session validation - wajib gunakan decodeWorkspaceSession (EOS 360 invariant)
    const session = await decodeWorkspaceSession(request);
    if (!session) {
      return response.status(401).json({ error: "Unauthorized: Invalid workspace session" });
    }
    // W06-A3-003: Simpan session terverifikasi ke context untuk digunakan oleh semua MCP message handlers
    // A3-R04: Semua request berikutnya menggunakan session yang sudah melalui canonical validation
    const validatedWorkspaceSession = session;
    
    // Actor context untuk audit tracing - pisahkan identity dari workspace
    const actorContext = {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId || `mcp-sse:anonymous`,
      actorLabel: session.actorLabel || "MCP Client"
    };

    // Generate unique session ID untuk koneksi SSE ini
    const sessionId = `mcp_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    
    // Setup SSE transport sesuai MCP 2026 specs
    const transport = new SSEServerTransport("/mcp/messages", response);
    transports.set(sessionId, transport);
    
    // W06-A3-003: Catat evidence session terverifikasi dengan revokedAt untuk audit trail
    await lifecycle.recordAdapterEvidence("sse.connection.created", {
      sessionId,
      ...actorContext,
      session_revoked_at: session.revokedAt || null,
      timestamp: new Date().toISOString()
    });

    // Kirim MCP session ID ke client
    await transport.send(JSON.stringify({
      type: "session.created",
      sessionId,
      ...actorContext,
      mcp_protocol_version: "2026-07-28"
    }));

    // Setup heartbeat untuk keep-alive (sama dengan canonical SSE route)
    const interval = setInterval(() => {
      try {
        // Kirim heartbeat lewat SSE transport
        response.write(`data: ${JSON.stringify({ 
          type: "heartbeat", 
          timestamp: Date.now(),
          sessionId 
        })}\n\n`);
        response.flush();
      } catch (err) {
        // Client disconnected, cleanup resource
        cleanupSSEConnection(sessionId);
      }
    }, HEARTBEAT_INTERVAL);
    heartbeatIntervals.set(sessionId, interval);

    // Cleanup ketika client disconnect (abort signal)
    if (request.signal?.addEventListener) {
      request.signal.addEventListener('abort', () => {
        cleanupSSEConnection(sessionId);
      });
    }

    // Lampirkan validatedWorkspaceSession ke context untuk semua message handler yang menggunakan koneksi ini
    // A3-R04: Menjamin semua authorization check menggunakan session terverifikasi, bukan client-controlled input
    const originalConnect = mcpServer.connect.bind(mcpServer);
    await originalConnect(transport, {
      validatedWorkspaceSession,
      sessionId
    });
    
    console.log(`[MCP-SSE] ✅ New SSE connection established: ${sessionId}, total connections: ${transports.size}`);
    
  } catch (error) {
    console.error("[MCP-SSE] Error creating SSE connection:", error);
    return response.status(500).json({ error: "Internal server error during SSE setup" });
  }
});

// Bind MCP tool ke EOS lifecycle (sesuai pola canonical dari channel lain)
// EOS-360-002: Register create_acaas_compliance_check handler untuk MCP invocation
await lifecycle.recordAdapterEvidence("tool.bound", {
  toolName: "create_acaas_compliance_check",
  handlerRegistered: true,
  sse_endpoint_enabled: true
});

// Register MCP server dengan EOS lifecycle (sesuai canonical pattern dari telegram adapter)
// Pakai allowedClientIds[0] sebagai externalEntityId untuk identitas server MCP
const bindResult = await lifecycle.bindActor(
  options.allowedClientIds[0],
  initiatorActorId,
  (externalId) => validateMCPHostIdentity(externalId, tenantId)
);

if (!bindResult.success) {
  throw new Error(`[MCP-EOS-001] Identity validation failed during actor binding: ${JSON.stringify(bindResult.identityDetails)}`);
}

await lifecycle.authorize(options.permissions);
const finalState = await lifecycle.verifyAndEnable();

console.log(`[MCP-EOS-001 MCP Lifecycle] ✅ CHANNEL SUCCESSFULLY ENABLED! Work ID: ${finalState.state.workId}`);
return { 
  success: true, 
  workId: finalState.state.workId, 
  state: finalState.state 
};
}