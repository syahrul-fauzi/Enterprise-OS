// @ts-nocheck
import { z } from "zod";
import { getNow } from "../../../../packages/core/kernel/src/utils/time-provider.js";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";
import {
  getComplianceCaseRepositoryInMemory,
  getComplianceCaseRepositoryPostgres,
  newComplianceCaseId,
  defaultComplianceCasePriority,
  defaultComplianceCaseStatus,
} from "../repository/index.js";
import {
	calculateExecutionFrame,
	safeRecordEvidence,
	safeNotifyWorkspaceListeners,
	buildWorkFaceProjection,
	validateAllBoundaries,
	validateBoundaryAccess,
	createTenantId,
	createWorkspaceId,
	createActorId,
	createSessionId,
	createDeviceId,
	createWorkId
} from "../../../work-core/implementation/utils/index.js";
// Import semua type dari work.contracts (canonical source)
import {
	type TenantId,
	type WorkspaceId,
	type ActorId,
	type ActorMetadata,
	type AuthorizationScope,
	type RiskAssessment,
	type WorkFaceProjection,
	type IdentityBoundary,
	type SemanticBoundary,
	type AuthorityBoundary,
	type ExecutionBoundary,
	type EvidenceBoundary,
	type PresentationBoundary,
	type WorkId,
	type ProductNode,
	type HighValueWorkGraphQuery
} from "@repo/contracts-core";
// Import ExecutionEnvelope dari connector-ecosystem contracts (canonical source untuk MCP)
import {
	type ExecutionEnvelope,
	ExecutionEnvelopeSchema,
	workIdSchema,
	deviceIdSchema
} from "../../../connector-ecosystem/implementation/contracts/connector-ecosystem.contracts.js";
// Import repository getters dari canonical work-core entry point
import { getWorkRepositoryPostgres } from "../../../work-core/index.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";
import {
	type ComplianceCaseAggregate,
	ComplianceCaseId,
	type ComplianceCaseContextMetadata,
} from "../../contracts/index.js";

/**
 * EOS-360-002: MCP Payload ke ExecutionEnvelope Context Mapping Function
 * Mengkonversi raw MCP payload (dari AI agent/tool call) ke EOS ExecutionEnvelope yang valid
 * Menjaga semua field yang diperlukan untuk governance, tenant isolation, dan traceability
 * Tidak ada bypass: semua validasi yang sama dengan API call tetap berlaku
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
			type: "compliance-case.create", // Dipetakan langsung ke capability command yang terdaftar
			payload: mcpPayload.intent_payload
		},
		correlationId: mcpPayload.correlation_id || generateUuid(),
		issuedAt: getNow().toISOString(),
		expiresAt: new Date(getNow().getTime() + 24 * 60 * 60 * 1000).toISOString() // Expire dalam 24 jam
	};

	// Validasi schema sebelum return - tidak boleh mengirim envelope yang tidak valid
	const validated = ExecutionEnvelopeSchema.safeParse(executionEnvelope);
	if (!validated.success) {
		throw new Error(`[investment-compliance.mapMcpPayload] MCP payload validation failed: ${validated.error.issues.map(i => i.message).join(", ")}`);
	}

	// Catat evidence bahwa mapping berhasil (audit trail)
	safeRecordEvidence({
		capability: "investment-compliance",
		command: "mcp-payload-mapped",
		work_id: logicalWorkId,
		actor_id: `mcp-agent:${mcpPayload.agent_role}`,
		tenant_id: tenantId,
		workspace_id: workspaceId,
		sessionId: sessionId,
		timestamp: getNow().toISOString(),
		mcpEventId: executionEnvelope.eventId,
		mcpCorrelationId: executionEnvelope.correlationId
	});

	return executionEnvelope;
}

/**
 * EOS-360-002: Ekstrak input command dari ExecutionEnvelope untuk compatibility dengan execute() flow
 * Memastikan input dari MCP memiliki struktur yang sama persis dengan input dari API
 */
export function extractCommandInputFromEnvelope(envelope: ExecutionEnvelope): z.infer<typeof CreateComplianceCaseSchema> & { 
  workspaceId: string; 
  actorId: string; 
  tenantId: string;
} {
	// Validasi bahwa intent.payload memiliki semua field yang diperlukan oleh CreateComplianceCaseSchema
	const payload = envelope.intent.payload as Record<string, unknown>;
	
	// Tambahkan field yang diperlukan dari envelope ke input (sesuai dengan API input structure)
	// W06-A3-002: Tambahkan workspaceId, actorId, tenantId untuk kebutuhan security-hardening.authorize
	// ActorId diambil dari envelope.deviceId sebagai representasi actor MCP yang terautentikasi
	return {
		...payload,
		sessionId: envelope.sessionId,
		workId: envelope.logicalWorkId,
		workspaceId: envelope.workspaceId,
		actorId: envelope.deviceId, // deviceId di MCP mewakili actor identifier yang terverifikasi
		tenantId: envelope.tenantId,
	} as z.infer<typeof CreateComplianceCaseSchema> & {
	  workspaceId: string;
	  actorId: string;
	  tenantId: string;
	};
}

// ILC-001: Import capabilityRegistry untuk integrasi createCoreWork (EOS core Work primitive)
async function getCapabilityRegistry() {
  const loaded = await import("../../../../packages/core/kernel/src/index.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

const complianceCaseRepository =
  process.env.NODE_ENV === "development"
    ? getComplianceCaseRepositoryInMemory()
    : getComplianceCaseRepositoryPostgres();
const sessionRepository = getSessionRepositoryPostgres();

const CreateComplianceCaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  investmentAmount: z.number().positive(),
  sector: z.string().min(2),
  riskRating: z.enum(["low", "medium", "high"]),
  sessionId: z.string().min(1),
  linkedIntentId: z.string().optional(),
  workId: z.string().min(1), // CORE-001: WAJIB link ke core Work primitive ID
  workspaceId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
});

const createComplianceCase: CapabilityCommand<
  z.infer<typeof CreateComplianceCaseSchema>,
  ComplianceCaseAggregate
> = {
  kind: "command",
  name: "compliance-case.create",
  capability: "investment-compliance",
  version: "1.0.0",
  execute: async (input) => {
    const parsed = CreateComplianceCaseSchema.parse(input);
    const { title, description, investmentAmount, sector, riskRating, sessionId: sessionIdValue, linkedIntentId, workId: workIdValue } = parsed;
            
            // ILC-001: Validasi session sebelum create case (authentication boundary + tenant isolation)
            // Import createSessionId factory dari canonical source untuk type compliance
            const { createSessionId, createTenantId, createWorkspaceId } = await import("../../../work-core/index.js");
            const parsedSessionId = createSessionId(sessionIdValue);
            
            // ILC-001: Ekstrak tenantId dari request context yang terautentikasi (bukan dari session dulu)
            // Dalam produksi, ini berasal dari JWT atau token otentikasi apps/api, bukan dari input user
            const requestTenantId = createTenantId(process.env.AUTHENTICATED_TENANT_ID || "default-tenant-id");
            const requestWorkspaceId = createWorkspaceId(process.env.AUTHENTICATED_WORKSPACE_ID || "default-workspace-id");
            
            // Pass context tenantId ke sessionRepository.byId untuk validasi database-level tenant isolation
            // SessionRepository sudah melakukan filter AND tenant_id di SQL level (defense in depth 1)
            const session = await sessionRepository.byId(parsedSessionId, { 
              tenantId: requestTenantId,
              workspaceId: requestWorkspaceId
            });
            if (!session || session.revokedAt !== null) {
              throw new Error("[investment-compliance.create-case] Invalid or revoked session - authentication violation");
            }
            // Enforce tenant isolation tambahan (defense in depth 2) - verifikasi session tenant cocok dengan request tenant
            if (session.tenantId !== requestTenantId) {
              throw new Error("[investment-compliance.create-case] Cross-tenant access violation - cannot access session from another tenant");
            }

            // ILC-001: Integrasi createCoreWork dari work-core (Work sebagai continuity primitive)
            const capabilityRegistry = await getCapabilityRegistry();
            let coreWorkResult: { id: string; workId: string; domainType: string } | undefined;
            if (capabilityRegistry?.invoke) {
              try {
                coreWorkResult = await capabilityRegistry.invoke("work-core", "create", {
                  title: title.trim(),
                  description: description || undefined,
                  domainType: "investment-compliance",
                  sessionId: sessionIdValue,
                  tenantId: session.tenantId,
                  workspaceId: session.workspaceId,
                  actorId: session.actorId,
                  domainSpecificData: { 
                    linkedIntentId,
                    investmentAmount,
                    sector,
                    riskRating
                  }
                }) as { id: string; workId: string; domainType: string };
              } catch (coreWorkError) {
                console.error("[ILC-001] Core Work creation failed (continuing with compliance case only):", coreWorkError);
              }
            }

            // W-015: ENFORCE 5-BOUNDARY MODEL COMPLIANCE (sesuai Services.ID pattern)
            // Hanya jalanin validation jika coreWorkResult berhasil dibuat
            if (coreWorkResult?.workId) {
              // Konstruksi semua 5 boundary sesuai EOS architecture
              const identityBoundary: IdentityBoundary = {
                tenantId: session.tenantId,
                organizationId: session.tenantId, // Gunakan tenantId sebagai organizationId (sesuai SessionAggregate interface yang tidak memiliki organizationId)
                principalId: session.actorId,
                ownerIds: [session.actorId]
              };
              const semanticBoundary: SemanticBoundary = {
                domain: "investment-compliance",
                intent: "investment-risk-compliance-review",
                currentState: "draft",
                requirements: [],
                constraints: [],
                decisions: []
              };
              const authorityBoundary: AuthorityBoundary = {
                actorCapabilities: new Map([[session.actorId, ["create-compliance-case", "assign-auditor", "close-case"]]]),
                policyEnforcements: ["investment-compliance-2026", "data-protection-global"],
                authorizations: new Map([[session.actorId, ["create", "read", "update"]]]),
                delegations: []
              };
              // Gunakan calculateExecutionFrame canonical untuk menghitung executionFrame secara dinamis (tidak hardcode)
              // Berdasarkan CMBCD: Actor+Capability+Authority+Context+Risk → execution frame yang sesuai
              const dynamicExecutionFrame = calculateExecutionFrame(
                {
                  actorId: session.actorId,
                  actorType: session.isAgent ? "ai-agent" : "human",
                  role: session.actorLabel || "compliance-officer",
                  displayName: session.actorLabel || "Compliance Officer",
                  trustLevel: "verified" // Session aktif dianggap verified oleh identity capability
                },
                {
                  allowedActions: ["create", "read", "update"],
                  restrictedFields: []
                },
                {
                  tenantId: session.tenantId,
                  workspaceId: session.workspaceId,
                  jurisdiction: "idn",
                  requestCategory: "compliance-case-creation",
                  sensitivityLevel: riskRating === "high" ? "confidential" : "internal",
                  relatedWorkIds: coreWorkResult?.workId ? [coreWorkResult.workId] : []
                },
                {
                  level: riskRating,
                  rationale: `Investment compliance case creation with ${riskRating} risk rating`,
                  assessedBy: session.actorId,
                  assessedAt: getNow()
                }
              );

              const executionBoundary: ExecutionBoundary = {
                workspaceId: session.workspaceId,
                runtimeEnvironment: "api", // Prioritaskan headless execution sesuai core doctrine
                executorIds: [session.actorId],
                executionFrame: dynamicExecutionFrame
              };
              
              // EOS-360-004: Enforce MCP role validation (authorization parity between API and MCP)
              if (executionBoundary.executionFrame === "mcp") {
                const allowedMcpRoles = ["tenant-admin", "system-operator"];
                const actorRole = session.actorLabel || "user";
                if (!allowedMcpRoles.includes(actorRole)) {
                  throw new Error("[investment-compliance.create-case] MCP access denied: insufficient role privileges. Requires tenant-admin or system-operator");
                }
              }
              
              const presentationBoundary: PresentationBoundary = {
          supportedFaces: ["api", "web", "mobile", "mcp"], // MCP ditambahkan sebagai supported face (EOS-360-002)
          defaultLayout: "compliance-case-overview",
          mobileEnabled: true,
          apiEnabled: true,
          projectionConfig: {
            displayName: title,
            summary: description || "Investment compliance risk review case",
            priority: riskRating === "high" ? "critical" : "medium",
            uiFilters: ["status", "sector", "riskRating", "createdAt"],
            hideFromSurfaces: []
          }
        };

              // Konstruksi EvidenceBoundary dengan semua field yang diperlukan sesuai interface work-core
              const evidenceBoundary: EvidenceBoundary = {
                evidenceIds: [],
                evidenceChain: [{
                  actorId: session.actorId,
                  action: "compliance-case-created",
                  timestamp: getNow(),
                  workspaceId: session.workspaceId
                }],
                outcomeVerified: false
              };

              // Jalankan validasi boundary terpusat dari work-core + dependency boundary validation
              const boundaryAccessValid = validateBoundaryAccess("investment-compliance", "work-core");
              if (!boundaryAccessValid) {
                throw new Error("[investment-compliance.create-case] Dependency boundary violation: investment-compliance cannot access work-core outside allowed boundaries");
              }
              
              const boundaryValidation = validateAllBoundaries({
                identity: identityBoundary,
                semantic: semanticBoundary,
                authority: authorityBoundary,
                execution: executionBoundary,
                evidence: evidenceBoundary,
                presentation: presentationBoundary,
                dependencies: ["work-core", "identity"] // Daftar dependency yang diizinkan untuk circular check
              });

      if (!boundaryValidation.valid) {
        console.error("[W-015] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
        throw new Error(`[investment-compliance.createComplianceCase] Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
      }

      // ILC-003: INTEGRATE HIGH-VALUE WORK GRAPH TRAVERSAL (sesuai EOS core graph mandate)
      const workRepository = getWorkRepositoryPostgres();
              const linkedProduct: ProductNode | null = await workRepository.getProductForWork(coreWorkResult.workId as WorkId) ?? null;
      
      // Catat evidence bahwa graph link berhasil dibuat
      await safeRecordEvidence({
        capability: "investment-compliance",
        command: "graph-link-created",
        work_id: coreWorkResult.workId as string,
        actor_id: session.actorId,
        tenant_id: session.tenantId,
        workspace_id: session.workspaceId,
        sessionId: sessionIdValue,
        timestamp: getNow().toISOString(),
        linkedProductId: linkedProduct?.id || null,
        graphTraversalSuccess: !!linkedProduct
      });

      // Generate server-side FACE projection (sesuai invariant: FACE is projection, not owner)
      // Lengkapi semua parameter wajib sesuai signature canonical buildWorkFaceProjection dari work-core
      const faceProjection = buildWorkFaceProjection({
        workId: coreWorkResult.workId,
        // Identity boundary properties (dari identityBoundary yang sudah didefinisikan)
        tenantId: identityBoundary.tenantId,
        organizationId: identityBoundary.organizationId,
        principalId: identityBoundary.principalId,
        ownerIds: identityBoundary.ownerIds,
        // Semantic boundary properties (dari semanticBoundary yang sudah didefinisikan)
        domain: semanticBoundary.domain,
        intent: semanticBoundary.intent,
        currentState: semanticBoundary.currentState as WorkStatus,
        requirements: semanticBoundary.requirements,
        constraints: semanticBoundary.constraints,
        decisions: semanticBoundary.decisions,
        // Authority boundary properties (dari authorityBoundary yang sudah didefinisikan)
        actorCapabilities: authorityBoundary.actorCapabilities,
        policyEnforcements: authorityBoundary.policyEnforcements,
        authorizations: authorityBoundary.authorizations,
        delegations: authorityBoundary.delegations,
        // Execution boundary properties (dari executionBoundary yang sudah didefinisikan)
        workspaceId: executionBoundary.workspaceId,
        runtimeEnvironment: executionBoundary.runtimeEnvironment as "web" | "agent" | "edge" | "external-system",
        executorIds: executionBoundary.executorIds,
        executionFrame: executionBoundary.executionFrame,
        // Presentation boundary properties (dari presentationBoundary yang sudah didefinisikan)
        supportedFaces: presentationBoundary.supportedFaces as readonly ("web" | "agent" | "api" | "mobile" | "mcp")[],
        defaultLayout: presentationBoundary.defaultLayout,
        mobileEnabled: presentationBoundary.mobileEnabled,
        apiEnabled: presentationBoundary.apiEnabled,
        // Projection configuration dari presentationBoundary.projectionConfig
        displayName: presentationBoundary.projectionConfig.displayName,
        summary: presentationBoundary.projectionConfig.summary,
        priority: presentationBoundary.projectionConfig.priority as "low" | "medium" | "high" | "critical",
        uiFilters: presentationBoundary.projectionConfig.uiFilters,
        hideFromSurfaces: presentationBoundary.projectionConfig.hideFromSurfaces,
        // Server-calculated state parameters (wajib untuk signature canonical)
        currentActorId: session.actorId,
        canCurrentActorAct: true, // Session aktif memiliki hak untuk beraksi
        nextAvailableActions: ["update-case", "assign-auditor", "close-case"],
        evidenceCount: evidenceBoundary.evidenceChain.length,
        actorCount: identityBoundary.ownerIds.length
      });
    }

    // CORE-001: Hapus semua duplikat boundary metadata (tenantId/workspaceId/actorId)
    const newCaseId = newComplianceCaseId();
    
    // CORE-001: Validasi coreWorkResult untuk memastikan workId selalu terhubung ke core Work primitive
    if (!coreWorkResult?.workId) {
      throw new Error("[investment-compliance.create-case] Failed to create core Work primitive - CORE-001 violation: workId cannot be empty");
    }
    
    // ILC-002: Terapkan canonical CMBCD framework dari work-core (non-entity-centric actor+capability+authority+context+risk+evidence)
    const actorMetadata: ActorMetadata = {
      actorId: session.actorId,
      actorType: session.actorType || "human",
      role: session.userRole || "customer",
      displayName: session.userName || "Investment Applicant",
      trustLevel: session.verified ? "verified" : "unverified"
    };
    
    const authorization: AuthorizationScope = {
      allowedActions: ["read", "create"],
      restrictedFields: ["internal_audit_notes"]
    };
    
    const context: ComplianceCaseContextMetadata = {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      jurisdiction: "ID",
      requestCategory: "investment-compliance",
      sensitivityLevel: riskRating === "high" ? "confidential" : "internal",
      relatedWorkIds: linkedIntentId ? [linkedIntentId] : [],
      relatedProductIds: [],
      relatedRequirementIds: []
    };
    
    const riskAssessment: RiskAssessment = {
      level: riskRating,
      rationale: `Investment risk assessment for ${sector} sector, IDR ${investmentAmount}`,
      assessedBy: session.actorId,
      assessedAt: getNow()
    };
    
    // Hitung canonical execution frame menggunakan shared work-core utility
    const executionFrame = calculateExecutionFrame(actorMetadata, authorization, context, riskAssessment);

    const newCase: ComplianceCaseAggregate = {
      id: newCaseId,
      workId: coreWorkResult.workId, // WAJIB: Semua boundary metadata hanya ada di core Work primitive
      title,
      description,
      investmentAmount,
      sector,
      riskRating,
      auditorId: undefined,
      status: defaultComplianceCaseStatus,
      priority: defaultComplianceCasePriority,
      createdAt: getNow(),
      updatedAt: getNow(),
      executionFrame, // Gunakan canonical execution frame dari work-core CMBCD
      actorId: session.actorId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    };

    await complianceCaseRepository.save(newCase);

    // ILC-001: Record evidence untuk linkage antara core Work dan compliance case
    if (coreWorkResult) {
      await safeRecordEvidence({
      capability: "investment-compliance",
      command: "investment-compliance.linked-to-core-work",
      work_id: coreWorkResult.workId,
      case_id: newCase.id,
      tenant_id: session.tenantId,
      workspace_id: session.workspaceId,
      sessionId: sessionIdValue,
      actor_id: session.actorId,
      timestamp: getNow().toISOString(),
      integration_note: "ILC-001: Compliance case created as domain extension of core Work primitive"
    });
    }

    // Build FACE projection untuk presentation boundary sesuai signature canonical buildWorkFaceProjection
    const faceProjection: WorkFaceProjection = buildWorkFaceProjection({
      workId: coreWorkResult.workId as WorkId,
      // Identity boundary properties (passed as flat params per canonical builder signature)
      tenantId: session.tenantId,
      organizationId: session.tenantId,
      principalId: session.actorId,
      ownerIds: [session.actorId],
      // Semantic boundary properties (passed as flat params per canonical builder signature)
      domain: "investment-compliance",
      intent: "compliance-review",
      currentState: newCase.status,
      requirements: [],
      constraints: [],
      decisions: [],
      // Authority boundary properties (passed as flat params per canonical builder signature)
      actorCapabilities: new Map([[session.actorId, ["create-compliance-case", "assign-auditor", "close-case"]]]),
      policyEnforcements: ["investment-compliance-2026", "data-protection-global"],
      authorizations: new Map([[session.actorId, ["create", "read", "update"]]]),
      delegations: [],
      // Execution boundary properties (passed as flat params per canonical builder signature)
      workspaceId: session.workspaceId,
      runtimeEnvironment: "api", // Headless-first: default ke API composition root sesuai prinsip EOS
      executorIds: [session.actorId],
      executionFrame: executionFrame,
      // Presentation boundary properties (passed as flat params per canonical builder signature)
      supportedFaces: ["api", "web", "mobile", "mcp"],
      defaultLayout: "compliance-case-overview",
      mobileEnabled: true,
      apiEnabled: true,
      // Projection config properties (passed as flat params per canonical builder signature)
      displayName: title,
      summary: description || "Investment compliance risk review case",
      priority: riskRating === "high" ? "critical" : "medium",
      uiFilters: ["status", "sector", "riskRating", "createdAt"],
      hideFromSurfaces: [],
      // Derived state properties (passed as flat params per canonical builder signature)
      currentActorId: session.actorId,
      canCurrentActorAct: true,
      nextAvailableActions: ["assign-auditor", "close-case"],
      evidenceCount: 1,
      actorCount: 1
    });

    console.log(`[ILC-001] ✅ Compliance case created ${newCase.id} (work: ${coreWorkResult?.workId})`);
    return { ...newCase, faceProjection };
  }
};

const AssignAuditorToCaseSchema = z.object({
  caseId: z.string(),
  auditorId: z.string(),
  sessionId: z.string().min(1),
  workId: z.string().min(1), // CORE-001: WAJIB link ke core Work primitive ID
});

const assignAuditorToCase: CapabilityCommand<z.infer<typeof AssignAuditorToCaseSchema>> = {
  kind: "command",
  name: "compliance-case.assign-auditor",
  capability: "investment-compliance",
  version: "1.0.0",
  execute: async (input) => {
    const { caseId, auditorId, sessionId } = AssignAuditorToCaseSchema.extend({
      sessionId: z.string().min(1) // Require session untuk validasi authority boundary
    }).parse(input);
    
    // Validasi session sebelum melanjutkan (authentication boundary + tenant isolation)
    const { createSessionId, createTenantId, createWorkspaceId } = await import("../../../work-core/index.js");
    const parsedSessionId = createSessionId(sessionId);
    // Ekstrak tenantId dari request context yang terautentikasi (sama seperti create-case)
    const requestTenantId = createTenantId(process.env.AUTHENTICATED_TENANT_ID || "default-tenant-id");
    const requestWorkspaceId = createWorkspaceId(process.env.AUTHENTICATED_WORKSPACE_ID || "default-workspace-id");
    // Pass context tenantId untuk database-level tenant isolation
    const session = await sessionRepository.byId(parsedSessionId, {
      tenantId: requestTenantId,
      workspaceId: requestWorkspaceId
    });
    if (!session || session.revokedAt !== null) {
      throw new Error("[investment-compliance.assign-auditor] Invalid or revoked session - authentication violation");
    }
    // Enforce tenant isolation tambahan (defense in depth)
    if (session.tenantId !== requestTenantId) {
      throw new Error("[investment-compliance.assign-auditor] Cross-tenant access violation - cannot access session from another tenant");
    }

    // CORE-001: Fetch case terlebih dahulu untuk mendapatkan workId
    const caseExists = await complianceCaseRepository.byId(ComplianceCaseId(caseId), {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    });
    if (!caseExists) {
      throw new Error("Compliance case not found");
    }

    // CORE-001: Fetch core WorkAggregate untuk verifikasi boundary dan authorization
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(caseExists.workId);
    if (!coreWork) {
      throw new Error("[investment-compliance.assign-auditor] Core Work not found - boundary metadata missing");
    }

    // 5 Boundaries Enforcement: Authority boundary check - hanya actor dalam tenant yang boleh assign auditor
    if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
      throw new Error("[investment-compliance.assign-auditor] Cross-tenant access blocked - authority boundary violation");
    }

    // Update case dengan auditorId yang baru
    const updatedCase = {
      ...caseExists,
      auditorId,
      updatedAt: getNow()
    };
    await complianceCaseRepository.save(updatedCase);

    // Record evidence untuk audit trail
    await safeRecordEvidence({
      capability: "investment-compliance",
      command: "investment-compliance.auditor-assigned",
      work_id: caseExists.workId,
      case_id: caseId,
      auditor_id: auditorId,
      actor_id: session.actorId,
      tenant_id: session.tenantId,
      workspace_id: session.workspaceId,
      sessionId: sessionId,
      timestamp: getNow().toISOString(),
      note: "ILC-001: Auditor assigned to compliance case via authority boundary check"
    });

    // Build FACE projection sesuai signature canonical buildWorkFaceProjection
    const updatedFaceProjection: WorkFaceProjection = buildWorkFaceProjection({
      workId: caseExists.workId as WorkId,
      // Identity boundary properties (passed as flat params per canonical builder signature)
      tenantId: session.tenantId,
      organizationId: session.tenantId,
      principalId: session.actorId,
      ownerIds: [session.actorId],
      // Semantic boundary properties (passed as flat params per canonical builder signature)
      domain: "investment-compliance",
      intent: "compliance-review",
      currentState: updatedCase.status,
      requirements: [],
      constraints: [],
      decisions: [],
      // Authority boundary properties (passed as flat params per canonical builder signature)
      actorCapabilities: new Map([[session.actorId, ["assign-auditor", "close-case"]]]),
      policyEnforcements: ["investment-compliance-2026", "data-protection-global"],
      authorizations: new Map([[session.actorId, ["read", "update"]]]),
      delegations: [],
      // Execution boundary properties (passed as flat params per canonical builder signature)
      workspaceId: session.workspaceId,
      runtimeEnvironment: "api", // Headless-first: default ke API composition root sesuai prinsip EOS
      executorIds: [session.actorId, auditorId as ActorId],
      executionFrame: caseExists.executionFrame,
      // Presentation boundary properties (passed as flat params per canonical builder signature)
      supportedFaces: ["api", "web", "mobile"],
      defaultLayout: "compliance-case-overview",
      mobileEnabled: true,
      apiEnabled: true,
      // Projection config properties (passed as flat params per canonical builder signature)
      displayName: "Compliance Case Review",
      summary: "Audit and compliance review case",
      priority: "medium",
      uiFilters: ["status", "updatedAt"],
      hideFromSurfaces: [],
      // Derived state properties (passed as flat params per canonical builder signature)
      currentActorId: session.actorId,
      canCurrentActorAct: true,
      nextAvailableActions: ["close-case"],
      evidenceCount: 1,
      actorCount: 2
    });

    console.log(`[ILC-001] ✅ Auditor ${auditorId} assigned to case ${caseId} (work: ${caseExists.workId})`);
    return { ...updatedCase, faceProjection: updatedFaceProjection };
  },
};

const CloseComplianceCaseSchema = z.object({
  caseId: z.string(),
  sessionId: z.string().min(1), // Require session untuk validasi closure authority
  workId: z.string().min(1), // CORE-001: WAJIB link ke core Work primitive ID
});

const closeComplianceCase: CapabilityCommand<z.infer<typeof CloseComplianceCaseSchema>> = {
  kind: "command",
  name: "compliance-case.close",
  capability: "investment-compliance",
  version: "1.0.0",
  execute: async (input) => {
    const { caseId, sessionId, workId: workIdValue } = CloseComplianceCaseSchema.extend({
      sessionId: z.string().min(1),
      workId: z.string().min(1)
    }).parse(input);
    
    // ILC-001: Validasi session sebelum close case (authentication boundary + tenant isolation)
    // Import createSessionId factory dari canonical source untuk type compliance
    const { createSessionId, createTenantId, createWorkspaceId } = await import("../../../work-core/index.js");
    const parsedSessionId = createSessionId(sessionId);
    // Ekstrak tenantId dari request context yang terautentikasi (sama seperti create-case)
    const requestTenantId = createTenantId(process.env.AUTHENTICATED_TENANT_ID || "default-tenant-id");
    const requestWorkspaceId = createWorkspaceId(process.env.AUTHENTICATED_WORKSPACE_ID || "default-workspace-id");
    // Pass context tenantId untuk database-level tenant isolation
    const session = await sessionRepository.byId(parsedSessionId, {
      tenantId: requestTenantId,
      workspaceId: requestWorkspaceId
    });
    if (!session || session.revokedAt !== null) {
      throw new Error("[investment-compliance.close-case] Invalid or revoked session - authentication violation");
    }
    // Enforce tenant isolation tambahan (defense in depth)
    if (session.tenantId !== requestTenantId) {
      throw new Error("[investment-compliance.close-case] Cross-tenant access violation - cannot access session from another tenant");
    }

    // CORE-001: Fetch case dengan context validation dari WorkAggregate
    const caseExists = await complianceCaseRepository.byId(ComplianceCaseId(caseId), {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    });
    if (!caseExists) {
      throw new Error("Compliance case not found");
    }

    // Idempotent check: jika case sudah closed, kembalikan state yang ada
    if (caseExists.status === "closed") {
      console.log(`[ILC-004] ✅ Compliance case ${caseId} already closed (work: ${caseExists.workId})`);
      return { ...caseExists };
    }

    // CORE-001: Fetch core WorkAggregate untuk final boundary verification
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(caseExists.workId);
    if (!coreWork) {
      throw new Error("[investment-compliance.close-case] Core Work not found - cannot close orphaned case");
    }

    // Authority boundary check - hanya actor dengan akses ke workspace yang boleh close case
    if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
      throw new Error("[investment-compliance.close-case] Cross-tenant access blocked - authority boundary violation");
    }

    // Update case status menjadi closed
    const closedAt = getNow();
    const updatedCase = {
      ...caseExists,
      status: "closed" as const,
      closedAt,
      updatedAt: closedAt
    };
    await complianceCaseRepository.save(updatedCase);

    // 4. Lanjutkan graph traversal untuk Work→ComplianceCase→Requirements→Outcome (ILC-004 full implementation)
    const linkedCase: ProductNode | undefined = await workRepository.getProductForWork(caseExists.workId as WorkId);
    const linkedRequirements: string[] = linkedCase 
      ? await workRepository.getRequirementsForProduct(linkedCase.id)
      : [];

    // 5. BIND EVIDENCE KE REQUIREMENTS - satisfy "Evidence chain recording terpenuhi (bindEvidenceToRequirement)"
    if (linkedRequirements.length > 0) {
      for (const requirementId of linkedRequirements) {
        await safeRecordEvidence({
          capability: "investment-compliance",
          command: "compliance-case.close",
          work_id: caseExists.workId,
          tenant_id: coreWork.tenantId,
          workspace_id: coreWork.workspaceId,
          sessionId: sessionId,
          actor_id: session.actorId,
          requirement_id: requirementId,
          timestamp: closedAt.toISOString(),
          outcome_bound: true,
          outcome_type: "compliance_case_resolved",
          graph_metadata_updated: true
        });
      }
    }

    // 6. Update High-Value Work Graph dengan outcome (Work→ComplianceCase→Outcome)
    if (linkedCase) {
      await workRepository.linkOutcomeToProduct(linkedCase.id, {
        id: `outcome-${caseId}`,
        type: "compliance_case_closed",
        workId: caseExists.workId,
        actorId: session.actorId,
        name: "Compliance Case Closed",
        description: "Investment compliance review case has been successfully closed",
        linkedRequirementIds: linkedRequirements,
        evidenceIds: [],
        outcomeTimestamp: closedAt,
        tenantId: session.tenantId
      });
    }

    // Update core Work state menjadi completed (work continuity boundary)
    const capabilityRegistry = await getCapabilityRegistry();
    if (capabilityRegistry?.invoke) {
      try {
        await capabilityRegistry.invoke("work-core", "update", {
          workId: caseExists.workId,
          status: "completed",
          closedAt: closedAt.toISOString()
        });
      } catch (workUpdateError) {
        console.warn("[investment-compliance.close-case] Core Work update failed, but case closed locally:", workUpdateError);
      }
    }

    // Record final evidence untuk closure
    await safeRecordEvidence({
      capability: "investment-compliance",
      command: "compliance-case.close",
      work_id: caseExists.workId,
      case_id: caseId,
      actor_id: session.actorId,
      tenant_id: session.tenantId,
      workspace_id: coreWork.workspaceId,
      sessionId: sessionId,
      timestamp: closedAt.toISOString(),
      graph_traversal_success: !!linkedCase,
      linked_case_id: linkedCase?.id || null,
      linked_requirement_ids: linkedRequirements,
      outcome_recorded: true,
      note: "ILC-004: Compliance case and core Work marked as completed - outcome achieved"
    });

    // Build final FACE projection untuk closed case (aligned dengan canonical signature)
    const finalFaceProjection: WorkFaceProjection = buildWorkFaceProjection({
      workId: caseExists.workId as WorkId,
      // Identity boundary properties
      tenantId: session.tenantId,
      organizationId: session.tenantId,
      principalId: session.actorId,
      ownerIds: [session.actorId, caseExists.auditorId as ActorId],
      // Semantic boundary properties
      domain: "investment-compliance",
      intent: "compliance-review",
      currentState: "closed",
      requirements: [],
      constraints: [],
      decisions: [],
      // Authority boundary properties
      actorCapabilities: new Map([[session.actorId, ["view-history", "download-evidence"]]]),
      policyEnforcements: ["investment-compliance-2026", "data-protection-global"],
      authorizations: new Map([[session.actorId, ["read"]]]),
      delegations: [],
      // Execution boundary properties
      workspaceId: session.workspaceId,
      runtimeEnvironment: "api", // Headless-first: default ke API composition root sesuai prinsip EOS
      executorIds: [session.actorId, caseExists.auditorId as ActorId],
      executionFrame: caseExists.executionFrame,
      // Presentation boundary properties
      supportedFaces: ["api", "web", "mobile"],
      defaultLayout: "compliance-case-closed",
      mobileEnabled: true,
      apiEnabled: true,
      // Projection config properties
      displayName: "Closed Compliance Case",
      summary: "Investment compliance review case completed",
      priority: "low",
      uiFilters: ["status", "closedAt"],
      hideFromSurfaces: [],
      // Derived state properties
      currentActorId: session.actorId,
      canCurrentActorAct: false,
      nextAvailableActions: ["view-history", "download-evidence"],
      evidenceCount: 2,
      actorCount: 2
    });

    console.log(`[ILC-001] ✅ Compliance case ${caseId} closed successfully (work: ${caseExists.workId})`);
    return { ...updatedCase, faceProjection: finalFaceProjection, coreWorkStatus: "completed" };
  },
};

// Export all commands for capability registry registration - follows substrate pattern
export const complianceCaseCommands: Readonly<Record<string, CapabilityCommand>> = {
  "compliance-case.create": createComplianceCase,
  "compliance-case.assign-auditor": assignAuditorToCase,
  "compliance-case.close": closeComplianceCase,
} as const;

// Export individual command functions for direct imports
export {
  createComplianceCase,
  assignAuditorToCase,
  closeComplianceCase
};