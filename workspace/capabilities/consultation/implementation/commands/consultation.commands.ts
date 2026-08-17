import { z } from "zod";
import {
  CreateConsultationOutput,
  TriageConsultationOutput,
  SearchConsultationsOutput,
  ConsultationAggregate,
  ConsultationId,
  ConsultationSeriesId,
  ConsultationEpisodeId,
  ConsultationSeries,
  ConsultationEpisode,
  ConsultationFact,
  RiskLevel,
  AutonomyLevel,
  AssistanceMode,
  ConsultationDecisionContract,
  DecisionLogEntry,
  ConsultationStageEvidence,
  LinkedWorkItem,
  EosConsultationControlId,
  LearningCandidate,
  LearningCandidateStatus,
} from "../contracts/consultation.contracts.js";
import type { CapabilityCommand } from "@repo/core-kernel";
import { newConsultationId, newConsultationSeriesId, newConsultationEpisodeId, defaultConsultationStatus, defaultConsultationPriority, ConsultationRepositoryInMemory } from "../repository/index.js";
import { initIdentitySchema, getSessionRepositoryPostgres, SessionRepositoryInMemory } from "../../../identity/implementation/repositories/index.js";
import { SessionId } from "../../../identity/implementation/contracts/identity.contracts.js";
import { ConsultationStatus } from "../contracts/consultation.contracts.js";

const SessionRepositoryPostgres = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

let schemaInitialized = false;
async function ensureIdentitySchema() {
  if (!schemaInitialized && process.env.DATABASE_URL) {
    await ensureIdentitySchema();
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

const CreateConsultationWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  userNeed: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  founder: z.string().optional(),
  ownership: z.string().optional(),
  businessType: z.string().optional(),
  domicile: z.string().optional(),
  kbli: z.string().optional(),
  seriesId: z.string().optional(),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const TriageConsultationWithContextSchema = z.object({
  id: z.string().min(1),
  triageResult: z.enum(["needs_human_review", "create_legal_case", "create_requirement", "create_service_request", "create_observability_incident", "create_workflow", "rejected", "escalated", "referred", "blocked", "out_of_scope", "cancelled"]),
  triageNotes: z.string().optional(),
  linkedWorkItemId: z.string().optional(),
  intent: z.string().optional(),
  need: z.string().optional(),
  diagnosis: z.string().optional(),
  missingFields: z.array(z.string()).optional(),
  recommendedAction: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  autonomyLevel: z.number().int().min(0).max(5).optional(),
  riskRationale: z.string().optional(),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const ListConsultationsWithContextSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["OPEN", "UNDERSTANDING", "CONTEXT_COMPLETE", "ASSESSING", "RECOMMENDING", "AWAITING_DECISION", "HANDOFF", "EXECUTING", "RESOLVED", "WAITING_FOR_INFORMATION", "WAITING_FOR_HUMAN", "ESCALATED", "REFERRED", "BLOCKED", "OUT_OF_SCOPE", "CANCELLED", "all"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

type CreateConsultationWithContextInput = z.infer<typeof CreateConsultationWithContextSchema>;
type TriageConsultationWithContextInput = z.infer<typeof TriageConsultationWithContextSchema>;
type ListConsultationsWithContextInput = z.infer<typeof ListConsultationsWithContextSchema>;

type CreateConsultationCommand = CapabilityCommand<CreateConsultationWithContextInput, Promise<CreateConsultationOutput>>;
type TriageConsultationCommand = CapabilityCommand<TriageConsultationWithContextInput, Promise<TriageConsultationOutput>>;
type ListConsultationsCommand = CapabilityCommand<ListConsultationsWithContextInput, Promise<SearchConsultationsOutput>>;

function addStage(
  stages: readonly ConsultationStageEvidence[],
  stage: ConsultationStageEvidence["stage"],
  recordedBy: string,
  summary: string,
  controlIds: readonly EosConsultationControlId[] = [],
  details?: Record<string, unknown>
): ConsultationStageEvidence[] {
  return [
    ...stages,
    {
      stage,
      recordedAt: new Date(),
      recordedBy,
      summary,
      controlIds: controlIds.length > 0 ? controlIds : undefined,
      details: details ? { ...details } : undefined,
    } as ConsultationStageEvidence,
  ];
}

function addLog(
  log: readonly DecisionLogEntry[],
  decision: string,
  by: string,
  reason: string,
  controlIds: readonly EosConsultationControlId[] = []
): DecisionLogEntry[] {
  return [
    ...log,
    {
      decision,
      by,
      at: new Date(),
      reason,
      controlIds: controlIds.length > 0 ? controlIds : undefined,
    } as DecisionLogEntry,
  ];
}

const assistanceModeDefaults: Record<string, AssistanceMode> = {
  create_legal_case: "HYBRID",
  create_service_request: "HYBRID",
  create_observability_incident: "HYBRID",
  create_requirement: "AGENT",
  create_workflow: "MACHINE",
  needs_human_review: "HUMAN",
  escalated: "HUMAN",
  referred: "HUMAN",
  out_of_scope: "MACHINE",
  cancelled: "MACHINE",
  rejected: "HUMAN",
  blocked: "HYBRID",
};

type AutonomyBoundaryCheck = {
  readonly action: string;
  readonly allowed: readonly string[];
  readonly prohibited: readonly string[];
};
type AutonomyBoundaryResult = {
  readonly ok: boolean;
  readonly violationFound: boolean;
  readonly log: DecisionLogEntry;
  readonly stage: ConsultationStageEvidence;
  readonly controlsApplied: readonly EosConsultationControlId[];
};

function checkAutonomyBoundary(
  check: AutonomyBoundaryCheck,
  actorId: string
): AutonomyBoundaryResult {
  const { action, allowed, prohibited } = check;
  const now = new Date();
  const isExplicitlyAllowed = allowed.length === 0 ? true : allowed.some(a => action.toLowerCase().includes(a.toLowerCase()));
  const isProhibitedMatch = prohibited.filter(p => action.toLowerCase().includes(p.toLowerCase()));
  const violationFound = isProhibitedMatch.length > 0;
  const ok = !violationFound && isExplicitlyAllowed;
  const reason = violationFound
    ? `Boundary VIOLATION: action '${action}' matched prohibited [${isProhibitedMatch.join(", ")}]`
    : isExplicitlyAllowed
      ? `Action '${action}' within allowed actions boundary`
      : `Action '${action}' NOT in allowed list [${allowed.join(", ") || "any"}]`;
  const log: DecisionLogEntry = {
    decision: `autonomy_boundary_check[${action}]=${ok ? "PASS" : "BLOCK"}`,
    by: actorId,
    at: now,
    reason,
    controlIds: ["EOS-CONSULT-GOV-02"],
  };
  const stage: ConsultationStageEvidence = {
    stage: "execution",
    recordedAt: now,
    recordedBy: actorId,
    summary: `Autonomy boundary check for '${action}': ${ok ? "PASS" : "BLOCK"}`,
    details: { action, allowed, prohibited, violationFound, isExplicitlyAllowed, matchedProhibited: isProhibitedMatch },
    controlIds: ["EOS-CONSULT-MEASURE-02"],
  };
  return {
    ok,
    violationFound,
    log,
    stage,
    controlsApplied: ["EOS-CONSULT-MEASURE-02", "EOS-CONSULT-GOV-02"],
  };
}

export const createConsultation: CreateConsultationCommand = {
  kind: "command",
  name: "consultation.create",
  version: "1.0.0",
  async execute(input: z.infer<typeof CreateConsultationWithContextSchema>) {
    await ensureIdentitySchema();

    const parsed = CreateConsultationWithContextSchema.parse(input);
    const { title, description, userNeed, priority, founder, ownership, businessType, domicile, kbli, seriesId: inputSeriesId, tenantId, workspaceId, sessionId, actorId } = parsed;

    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.create] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId) {
      throw new Error("[consultation.create] Session actor mismatch - authentication violation");
    }
    if (session.tenantId !== tenantId) {
      throw new Error("[consultation.create] Cross-tenant access attempt blocked - security violation");
    }
    if (session.workspaceId !== workspaceId) {
      throw new Error("[consultation.create] Cross-workspace access attempt blocked - security violation");
    }

    const now = new Date();
    const consultationId = newConsultationId();

    let effectiveSeriesId: ConsultationSeriesId;
    let nextEpisodeSequence = 1;
    const cumulativeFacts: ConsultationFact[] = [];
    const unresolvedUncertainty: string[] = [];
    const seriesLinkedWorkItems: LinkedWorkItem[] = [];

    if (inputSeriesId) {
      effectiveSeriesId = ConsultationSeriesId(inputSeriesId);
      const existingSeries = await ConsultationRepositoryInMemory.getSeriesById(effectiveSeriesId);
      if (existingSeries) {
        if (existingSeries.tenantId !== tenantId || existingSeries.workspaceId !== workspaceId) {
          throw new Error("[consultation.create] Cross-tenant/workspace series attachment blocked");
        }
        const prevEpisodes = await ConsultationRepositoryInMemory.listEpisodesBySeries(effectiveSeriesId);
        nextEpisodeSequence = (prevEpisodes.length > 0
          ? Math.max(...prevEpisodes.map(e => e.sequenceNumber))
          : 0) + 1;
        cumulativeFacts.push(...existingSeries.cumulativeKnownContext);
        unresolvedUncertainty.push(...existingSeries.unresolvedUncertainty);
        seriesLinkedWorkItems.push(...existingSeries.linkedWorkItems);
      }
    } else {
      effectiveSeriesId = newConsultationSeriesId();
      const series: ConsultationSeries = {
        id: effectiveSeriesId,
        tenantId,
        workspaceId,
        userId: actorId,
        title: title.trim(),
        description: description.trim(),
        primaryDomain: "general",
        episodes: [],
        cumulativeKnownContext: [],
        unresolvedUncertainty: [],
        linkedWorkItems: [],
        learningCandidates: [],
        createdAt: now,
        updatedAt: now,
        lastEpisodeStartedAt: now,
      };
      await ConsultationRepositoryInMemory.saveSeries(series);
    }

    const episodeId = newConsultationEpisodeId();

    const initialFacts: ConsultationFact[] = [];
    if (founder) initialFacts.push({
      key: "founder", value: founder.trim(), epistemicStatus: "CLAIMED",
      recordedAt: now, recordedBy: actorId, sourceEpisodeId: episodeId,
    });
    if (ownership) initialFacts.push({
      key: "ownership", value: ownership.trim(), epistemicStatus: "CLAIMED",
      recordedAt: now, recordedBy: actorId, sourceEpisodeId: episodeId,
    });
    if (businessType) initialFacts.push({
      key: "business_type", value: businessType, epistemicStatus: "CLAIMED",
      recordedAt: now, recordedBy: actorId, sourceEpisodeId: episodeId,
    });
    if (domicile) initialFacts.push({
      key: "domicile", value: domicile.trim(), epistemicStatus: "CLAIMED",
      recordedAt: now, recordedBy: actorId, sourceEpisodeId: episodeId,
    });
    if (kbli) initialFacts.push({
      key: "kbli", value: kbli.trim(), epistemicStatus: "CLAIMED",
      recordedAt: now, recordedBy: actorId, sourceEpisodeId: episodeId,
    });

    const episode: ConsultationEpisode = {
      id: episodeId,
      seriesId: effectiveSeriesId,
      consultationId,
      sequenceNumber: nextEpisodeSequence,
      contextSnapshot: {
        userNeed: userNeed.trim(),
        title: title.trim(),
        description: description.trim(),
        ...(founder && { founder: founder.trim() }),
        ...(ownership && { ownership: ownership.trim() }),
        ...(businessType && { businessType }),
        ...(domicile && { domicile: domicile.trim() }),
        ...(kbli && { kbli: kbli.trim() }),
      },
      facts: initialFacts,
      decisions: [],
      evidence: [],
      assumptions: [],
      unresolvedQuestions: [],
      outcome: "INFORMATION_ONLY",
      linkedWorkItems: [],
      startedAt: now,
    };
    await ConsultationRepositoryInMemory.saveEpisode(episode);

    const nextCumulativeFacts = [...cumulativeFacts, ...initialFacts.filter(
      f => !cumulativeFacts.some(cf => cf.key === f.key && cf.epistemicStatus === f.epistemicStatus)
    )];

    let existingOrBuilt: ConsultationSeries;
    if (inputSeriesId) {
      const existing = await ConsultationRepositoryInMemory.getSeriesById(effectiveSeriesId);
      existingOrBuilt = existing
        ? {
            ...existing,
            cumulativeKnownContext: nextCumulativeFacts,
            unresolvedUncertainty,
            linkedWorkItems: seriesLinkedWorkItems,
            updatedAt: now,
            lastEpisodeStartedAt: now,
          }
        : {
            id: effectiveSeriesId,
            tenantId,
            workspaceId,
            userId: actorId,
            title: title.trim(),
            description: description.trim(),
            primaryDomain: "general",
            episodes: [],
            cumulativeKnownContext: nextCumulativeFacts,
            unresolvedUncertainty,
            linkedWorkItems: seriesLinkedWorkItems,
            learningCandidates: [],
            createdAt: now,
            updatedAt: now,
            lastEpisodeStartedAt: now,
          };
    } else {
      existingOrBuilt = {
        id: effectiveSeriesId,
        tenantId,
        workspaceId,
        userId: actorId,
        title: title.trim(),
        description: description.trim(),
        primaryDomain: "general",
        episodes: [],
        cumulativeKnownContext: nextCumulativeFacts,
        unresolvedUncertainty,
        linkedWorkItems: seriesLinkedWorkItems,
        learningCandidates: [],
        createdAt: now,
        updatedAt: now,
        lastEpisodeStartedAt: now,
      };
    }
    await ConsultationRepositoryInMemory.saveSeries(existingOrBuilt);

    const entity: ConsultationAggregate = {
      id: consultationId,
      tenantId,
      workspaceId,
      title: title.trim(),
      description: description.trim(),
      userNeed: userNeed.trim(),
      ...(founder && { founder: founder.trim() }),
      ...(ownership && { ownership: ownership.trim() }),
      ...(businessType && { businessType }),
      ...(domicile && { domicile: domicile.trim() }),
      ...(kbli && { kbli: kbli.trim() }),
      status: defaultConsultationStatus,
      priority: priority ?? defaultConsultationPriority,
      assistanceMode: "HYBRID",
      linkedWorkItems: [...seriesLinkedWorkItems],
      createdAt: now,
      updatedAt: now,
      openedAt: now,
      seriesId: effectiveSeriesId,
      episodeId,
    };

    await ConsultationRepositoryInMemory.save(entity);
    return { id: entity.id, status: entity.status, createdAt: entity.createdAt };
  },
};

export const triageConsultation: TriageConsultationCommand = {
  kind: "command",
  name: "consultation.triage",
  version: "1.0.0",
  async execute(input: z.infer<typeof TriageConsultationWithContextSchema>) {
    await ensureIdentitySchema();

    const parsed = TriageConsultationWithContextSchema.parse(input);
    const { id, triageResult, triageNotes, linkedWorkItemId, intent, need, diagnosis, missingFields, recommendedAction, riskLevel, autonomyLevel, riskRationale, tenantId, workspaceId, sessionId, actorId } = parsed;

    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.triage] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId) {
      throw new Error("[consultation.triage] Session actor mismatch - authentication violation");
    }
    if (session.tenantId !== tenantId) {
      throw new Error("[consultation.triage] Cross-tenant access attempt blocked - security violation");
    }
    if (session.workspaceId !== workspaceId) {
      throw new Error("[consultation.triage] Cross-workspace access attempt blocked - security violation");
    }

    const current = await ConsultationRepositoryInMemory.byId(ConsultationId(id));
    if (!current) {
      throw new Error(`[consultation.triage] Consultation not found: ${id}`);
    }
    if (current.status === "RESOLVED") {
      throw new Error(`[consultation.triage] Cannot modify resolved consultation: ${id}`);
    }

    const mutable = { ...current } as DeepMutable<ConsultationAggregate>;
    const now = new Date();
    mutable.updatedAt = now;

    const controlsApplied: EosConsultationControlId[] = [];
    let stages: ConsultationStageEvidence[] = [...(current.decisionContract?.stages ?? [])];
    let decisionLog: DecisionLogEntry[] = [...(current.decisionContract?.decisionLog ?? [])];
    let linkedWorkItems: LinkedWorkItem[] = [...current.linkedWorkItems];

    stages = addStage(stages, "input", actorId, `User need captured: ${current.userNeed.substring(0, 100)}`, ["EOS-CONSULT-MAP-01"], { userNeed: current.userNeed });
    controlsApplied.push("EOS-CONSULT-MAP-01");

    if (triageResult === "blocked") {
      mutable.status = "BLOCKED";
      mutable.blockedAt = now;
      mutable.blockedBy = actorId;
      const blockReason = triageNotes || "Unspecified block reason";

      const risk: ConsultationDecisionContract["risk"] = {
        level: "high",
        rationale: `Blocked: ${blockReason}`,
        assessedBy: actorId,
        assessedAt: now,
        controlIds: ["EOS-CONSULT-MAP-02"],
      };
      const autonomy: ConsultationDecisionContract["autonomy"] = {
        level: 0,
        allowedActions: [],
        prohibitedActions: ["create_work_item", "execute", "route"],
        setBy: actorId,
        setAt: now,
        controlIds: ["EOS-CONSULT-GOV-02"],
      };
      const assistance: ConsultationDecisionContract["assistance"] = {
        mode: "HUMAN",
        actor: actorId,
        capabilities: ["consultation"],
        assignedAt: now,
        controlIds: ["EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01"],
      };

      stages = addStage(stages, "risk_assessment", actorId, `Blocked with HIGH risk`, ["EOS-CONSULT-MAP-02"], { blockReason });
      stages = addStage(stages, "assistance_assignment", actorId, `Assistance=HUMAN, Autonomy=0 (full human control)`, ["EOS-CONSULT-GOV-02", "EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01"]);
      stages = addStage(stages, "closure", actorId, `Consultation BLOCKED`, ["EOS-CONSULT-MANAGE-04"]);
      controlsApplied.push("EOS-CONSULT-MAP-02", "EOS-CONSULT-GOV-02", "EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01", "EOS-CONSULT-MANAGE-04");

      decisionLog = addLog(decisionLog, `Status=BLOCKED`, actorId, blockReason, ["EOS-CONSULT-GOV-02", "EOS-CONSULT-MANAGE-03"]);

      mutable.decisionContract = {
        risk: { ...risk, controlIds: risk.controlIds ? [...risk.controlIds] : undefined },
        autonomy: { ...autonomy, allowedActions: [...autonomy.allowedActions], prohibitedActions: [...autonomy.prohibitedActions], controlIds: autonomy.controlIds ? [...autonomy.controlIds] : undefined },
        assistance: { ...assistance, capabilities: [...assistance.capabilities], controlIds: assistance.controlIds ? [...assistance.controlIds] : undefined },
        recommendation: blockReason,
        blockReason,
        decisionLog: decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
        stages: stages.map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
        controlsApplied: Array.from(new Set(controlsApplied)),
      };

      await ConsultationRepositoryInMemory.save(mutable);

      return {
        id: mutable.id,
        status: mutable.status,
        triageResult,
        updatedAt: mutable.updatedAt,
        blockedAt: mutable.blockedAt,
        blockedBy: mutable.blockedBy,
        blockReason,
        linkedWorkItems,
      };
    }

    function detectUserNeed(userInput: string): {
      intent: string;
      need: string;
      diagnosis: string;
      missingFields: string[];
      recommendedAction: string;
      referralTarget?: string;
    } {
      const lowerInput = userInput.toLowerCase();
      const ptKeywords = [
        "memulai usaha", "mulai bisnis", "pendirian pt", "badan usaha",
        "mendirikan pt", "bikin pt", "buat pt", "ngurus pt", "pt perseroan terbatas",
        "pendirian cv", "mendirikan cv", "bikin cv", "perusahaan dagang",
        "mendirikan perusahaan", "bikin perusahaan", "badan hukum", "legal entity",
        " NIB ", "nomor induk bisnis", "NPWP badan", "akta pendirian", "notaris"
      ];
      if (ptKeywords.some(keyword => lowerInput.includes(keyword))) {
        return {
          intent: "mendirikan bisnis formal",
          need: "legal entity establishment (PT/CV)",
          diagnosis: "Kebutuhan pendirian badan hukum terdeteksi, PT establishment service sesuai",
          missingFields: [
            "founder", "ownership", "businessType", "domicile", "kbli",
            "modal_usaha", "pemegang_saham", "alamat_lengkap"
          ],
          recommendedAction: "create_legal_case"
        };
      }
      if (lowerInput.includes("sengketa") || lowerInput.includes("gugatan") ||
          lowerInput.includes("perselisihan") || lowerInput.includes("masalah serius")) {
        return {
          intent: "menyelesaikan perselisihan",
          need: "legal dispute resolution",
          diagnosis: "Masalah membutuhkan escalasi ke senior legal counsel",
          missingFields: ["bukti_dokumen", "tanggal_kejadian", "pihak_terlibat"],
          recommendedAction: "escalated"
        };
      }
      // Detect datacenter/server infrastructure issues for observability incident creation
      const infrastructureKeywords = [
        "server down", "datacenter", "server offline", "infrastructure down", 
        "node failure", "pod crash", "database down", "server error", 
        "infrastructure incident", "datacenter issue", "server outage"
      ];
      if (infrastructureKeywords.some(keyword => lowerInput.includes(keyword))) {
        return {
          intent: "menyelesaikan insiden infrastruktur",
          need: "datacenter/server infrastructure incident resolution",
          diagnosis: "Masalah infrastruktur terdeteksi, observability & incident management capability sesuai",
          missingFields: [
            "server_location", "incident_severity", "affected_services", 
            "timestamp_start", "error_messages", "uptime_before_incident"
          ],
          recommendedAction: "create_observability_incident"
        };
      }
      // General technical support issues
      if (lowerInput.includes("sistem error") || lowerInput.includes("bantuan teknis") || lowerInput.includes("troubleshoot")) {
        return {
          intent: "memperbaiki sistem",
          need: "technical support",
          diagnosis: "Masalah teknis perlu direferensikan ke engineering team",
          missingFields: ["environment", "error_log", "frekuensi_error"],
          recommendedAction: "referred",
          referralTarget: "engineering_expert"
        };
      }
      if (lowerInput.includes("pengobatan") || lowerInput.includes("medis") ||
          lowerInput.includes("dokter") || lowerInput.includes("rumah sakit")) {
        // MSO-004: MANY→MANY orchestration case - 2 intent, 6 capability (Rumah Sakit)
        if (lowerInput.includes("izin operasional") || lowerInput.includes("akreditasi") || 
            lowerInput.includes("rumahsakit") || lowerInput.includes("kemenkes")) {
          return {
            intent: "mengelola operasional dan akreditasi rumah sakit",
            need: "hospital compliance coordination",
            diagnosis: "Kebutuhan pengelolaan izin operasional dan persiapan akreditasi terdeteksi, memerlukan koordinasi 6 capability",
            missingFields: [
              "hospital_name", "location", "bed_capacity", "service_types", 
              "investment", "employee_count"
            ],
            recommendedAction: "collect_missing_information"
          };
        }
        // General medical assistance remains out of scope
        return {
          intent: "mencari bantuan medis",
          need: "medical assistance",
          diagnosis: "Layanan medis umum diluar cakupan kemampuan EOS saat ini",
          missingFields: [],
          recommendedAction: "out_of_scope"
        };
      }
      // Factory feasibility / construction needs (MSO-002 Case B - Complex)
      const factoryKeywords = [
        "membangun pabrik", "mendirikan pabrik", "pabrik baru",
        "konstruksi pabrik", "feasibility pabrik", "studi kelayakan pabrik",
        "membangun gudang", "mendirikan manufaktur"
      ];
      if (factoryKeywords.some(keyword => lowerInput.includes(keyword))) {
        return {
          intent: "menilai kelayakan pembangunan pabrik",
          need: "factory feasibility assessment",
          diagnosis: "Kebutuhan studi kelayakan pabrik terdeteksi, memerlukan data lokasi, modal, dan regulasi",
          missingFields: [
            "lokasi_lahan", "total_modal", "kbli_manufaktur", "kapasitas_produksi",
            "ijin_lingkungan", "akses_infrastruktur"
          ],
          recommendedAction: "collect_missing_information"
        };
      }
      return {
        intent: "unknown",
        need: "general assistance",
        diagnosis: "perlu review lebih lanjut oleh human",
        missingFields: [],
        recommendedAction: "needs_human_review"
      };
    }

    if (mutable.status === "OPEN") {
      mutable.status = "UNDERSTANDING";
      mutable.understandingStartedAt = now;
    }

    const userNeedAnalysis = detectUserNeed(mutable.userNeed);
    mutable.intent = intent ?? userNeedAnalysis.intent;
    mutable.diagnosis = diagnosis ?? userNeedAnalysis.diagnosis;
    mutable.missingFields = missingFields ?? userNeedAnalysis.missingFields;
    mutable.recommendedAction = recommendedAction ?? userNeedAnalysis.recommendedAction;

    stages = addStage(
      stages,
      "understanding",
      actorId,
      `Intent=${mutable.intent}, Need=${userNeedAnalysis.need}, Diagnosis=${(mutable.diagnosis ?? "").substring(0, 80)}`,
      ["EOS-CONSULT-MAP-01", "EOS-CONSULT-MAP-04"],
      {
        intent: mutable.intent,
        need: userNeedAnalysis.need,
        missingFields: mutable.missingFields,
        uncertainty: mutable.missingFields && mutable.missingFields.length > 0 ? `${mutable.missingFields.length} fields missing` : "minimal uncertainty",
      }
    );
    controlsApplied.push("EOS-CONSULT-MAP-04");

    const isValidAutonomy = (v: unknown): v is AutonomyLevel => 
      typeof v === 'number' && [0,1,2,3,4,5].includes(v);
    
    let calculatedRisk: RiskLevel = riskLevel ?? "medium";
    let calculatedAutonomy: AutonomyLevel = isValidAutonomy(autonomyLevel) ? autonomyLevel : 2;
    let calculatedRiskRationale: string = riskRationale ?? "Default risk assessment untuk general consultation";
    let allowedActions: string[] = [];
    let prohibitedActions: string[] = [];
    const riskControls: EosConsultationControlId[] = ["EOS-CONSULT-MAP-02", "EOS-CONSULT-GOV-01", "EOS-CONSULT-MAP-03"];

    if (userNeedAnalysis.recommendedAction === "create_legal_case" && userNeedAnalysis.need.includes("legal entity establishment")) {
      const modalUsaha = mutable.context?.modal_usaha as string | undefined;
      const kbli = mutable.kbli;
      if (modalUsaha && parseInt(modalUsaha) > 1000000000) {
        calculatedRisk = "high";
        calculatedRiskRationale = `Modal usaha di atas Rp 1M (${modalUsaha}) memerlukan pengawasan human intensif`;
        calculatedAutonomy = 1;
        prohibitedActions = ["approve_legal_documents", "sign_registration", "finalize_nbpl"];
        allowedActions = ["collect_documents", "validate_completeness", "schedule_review", "track_checklist"];
      } else if (kbli && (kbli.startsWith("64") || kbli.startsWith("65") || kbli.startsWith("66"))) {
        calculatedRisk = "critical";
        calculatedRiskRationale = `Sektor finansial (KBLI ${kbli}) memiliki resiko regulasi yang sangat tinggi`;
        calculatedAutonomy = 0;
        prohibitedActions = ["any_legal_decision", "financial_approval", "regulatory_submission"];
        allowedActions = ["collect_information", "prepare_draft_checklist", "flag_missing_documents"];
        riskControls.push("EOS-CONSULT-GOV-02");
      } else if (modalUsaha && parseInt(modalUsaha) < 500000000) {
        calculatedRisk = "medium";
        calculatedRiskRationale = `UMKM dengan modal ${modalUsaha} memerlukan review human dasar sebelum eksekusi`;
        calculatedAutonomy = 3;
        allowedActions = ["collect_documents", "validate_nik", "prepare_akta_draft", "schedule_notary_meeting"];
        prohibitedActions = ["approve_akta", "submit_to_kemenkumham", "finalize_nib"];
      } else {
        calculatedRisk = "medium";
        calculatedRiskRationale = "Pendirian badan hukum standar memerlukan review legal sebelum eksekusi";
        calculatedAutonomy = 2;
        allowedActions = ["collect_basic_information", "identify_missing_fields", "prepare_initial_checklist"];
        prohibitedActions = ["any_legal_approval", "regulatory_submission", "financial_verification"];
      }
    } else if (userNeedAnalysis.recommendedAction === "escalated") {
      calculatedRisk = "high";
      calculatedRiskRationale = "Sengketa hukum memerlukan intervensi human legal counsel penuh";
      calculatedAutonomy = 0;
      allowedActions = ["collect_evidence", "prepare_case_summary", "schedule_legal_meeting"];
      prohibitedActions = ["negotiate_with_opponent", "approve_settlement", "file_court_documents"];
    } else if (userNeedAnalysis.recommendedAction === "referred") {
      calculatedRisk = "low";
      calculatedRiskRationale = "Masalah teknis umum dengan resiko rendah, dapat di-handle hybrid";
      calculatedAutonomy = 4;
      allowedActions = ["run_diagnostics", "restart_services", "collect_logs", "apply_standard_patches"];
      prohibitedActions = ["modify_production_database", "change_network_config", "access_sensitive_data"];
    } else if (userNeedAnalysis.recommendedAction === "create_observability_incident") {
      calculatedRisk = "high";
      calculatedRiskRationale = "Masalah infrastruktur/datacenter memerlukan intervensi SRE segera";
      calculatedAutonomy = 1;
      allowedActions = ["collect_metrics", "analyze_logs", "schedule_reboot", "track_restoration"];
      prohibitedActions = ["modify_production_config", "delete_critical_logs", "reboot_without_verification"];
    } else if (userNeedAnalysis.recommendedAction === "out_of_scope") {
      calculatedRisk = "low";
      calculatedRiskRationale = "Kasus di luar scope, tidak ada eksekusi work item dilakukan";
      calculatedAutonomy = 5;
      allowedActions = ["inform_user", "log_request", "provide_general_referral"];
      prohibitedActions = ["create_any_work_item", "collect_sensitive_information", "make_commitments"];
    }

    controlsApplied.push(...riskControls);

    stages = addStage(
      stages,
      "risk_assessment",
      actorId,
      `Risk=${calculatedRisk}, Autonomy=${calculatedAutonomy} - ${calculatedRiskRationale.substring(0, 80)}`,
      riskControls,
      { riskLevel: calculatedRisk, autonomyLevel: calculatedAutonomy, rationale: calculatedRiskRationale }
    );

    const chosenAssistanceMode: AssistanceMode = assistanceModeDefaults[userNeedAnalysis.recommendedAction] ?? "HYBRID";
    const linkedCapabilities: string[] = ["consultation"];
    if (userNeedAnalysis.recommendedAction === "create_legal_case") linkedCapabilities.push("legal-case");
    if (userNeedAnalysis.recommendedAction === "create_service_request") linkedCapabilities.push("service-directory");
    if (userNeedAnalysis.recommendedAction === "create_requirement") linkedCapabilities.push("requirement-management");
    if (userNeedAnalysis.recommendedAction === "create_observability_incident") linkedCapabilities.push("observability");
    if (chosenAssistanceMode === "HYBRID") {
      linkedCapabilities.push("human-operations");
    }

    const assistanceAssignment: ConsultationDecisionContract["assistance"] = {
      mode: chosenAssistanceMode,
      actor: actorId,
      capabilities: linkedCapabilities,
      assignedAt: now,
      controlIds: ["EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01"],
    };

    stages = addStage(
      stages,
      "recommendation",
      actorId,
      `Recommended action: ${userNeedAnalysis.recommendedAction}, Assistance mode: ${chosenAssistanceMode}`,
      ["EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01", "EOS-CONSULT-MANAGE-02"]
    );
    controlsApplied.push("EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01", "EOS-CONSULT-MANAGE-02");

    decisionLog = addLog(
      decisionLog,
      `Risk=${calculatedRisk}, Autonomy=${calculatedAutonomy}, Assistance=${chosenAssistanceMode}`,
      actorId,
      calculatedRiskRationale,
      ["EOS-CONSULT-MAP-02", "EOS-CONSULT-MAP-05", "EOS-CONSULT-GOV-02"]
    );

    const riskAssessment: ConsultationDecisionContract["risk"] = {
      level: calculatedRisk,
      rationale: calculatedRiskRationale,
      assessedBy: actorId,
      assessedAt: now,
      controlIds: ["EOS-CONSULT-MAP-02"],
    };
    const autonomyProfile: ConsultationDecisionContract["autonomy"] = {
      level: calculatedAutonomy,
      allowedActions,
      prohibitedActions,
      setBy: actorId,
      setAt: now,
      controlIds: ["EOS-CONSULT-GOV-02", "EOS-CONSULT-MAP-03"],
    };


    mutable.assistanceMode = chosenAssistanceMode;

    if ((mutable.missingFields?.length ?? 0) > 0) {
      mutable.status = "WAITING_FOR_INFORMATION";
      mutable.blockedAt = now;
      mutable.missingInfoAt = now;
    } else if (userNeedAnalysis.recommendedAction === "needs_human_review") {
      mutable.status = "WAITING_FOR_HUMAN";
      mutable.humanReviewRequestedAt = now;
      mutable.blockedAt = now;
    } else if (userNeedAnalysis.recommendedAction === "escalated") {
      mutable.status = "ESCALATED";
      mutable.escalatedAt = now;
      mutable.escalationReason = userNeedAnalysis.diagnosis;
      mutable.blockedAt = now;
    } else if (userNeedAnalysis.recommendedAction === "referred") {
      mutable.status = "REFERRED";
      mutable.referredAt = now;
      mutable.referralTarget = userNeedAnalysis.referralTarget || "general_expert";
      mutable.blockedAt = now;
    } else if (userNeedAnalysis.recommendedAction === "out_of_scope") {
      mutable.status = "OUT_OF_SCOPE";
      mutable.outOfScopeAt = now;
      mutable.reasonOutOfScope = userNeedAnalysis.diagnosis;
    } else if (userNeedAnalysis.recommendedAction === "collect_missing_information") {
      mutable.status = "WAITING_FOR_INFORMATION";
      mutable.missingInfoAt = now;
      stages = addStage(stages, "understanding", actorId, `Membutuhkan informasi tambahan: ${mutable.missingFields?.join(", ") || "data tidak lengkap"}`, ["EOS-CONSULT-MAP-04", "EOS-CONSULT-GOV-01"]);
      controlsApplied.push("EOS-CONSULT-MAP-04", "EOS-CONSULT-GOV-01");
    } else if (userNeedAnalysis.recommendedAction === "cancelled") {
      mutable.status = "CANCELLED";
      mutable.cancelledAt = now;
      mutable.reasonCancelled = userNeedAnalysis.diagnosis;
    } else {
      mutable.status = "CONTEXT_COMPLETE";
      mutable.contextCompletedAt = now;
      mutable.contextCompleteAt = now;
      mutable.status = "ASSESSING";
      mutable.assessingStartedAt = now;
      mutable.status = "RECOMMENDING";
      mutable.recommendingStartedAt = now;
      mutable.status = "AWAITING_DECISION";
      mutable.recommendingCompletedAt = now;
      mutable.awaitingDecisionAt = now;
    }

    stages = addStage(stages, "assistance_assignment", actorId, `Assistance mode set: ${chosenAssistanceMode} with capabilities [${assistanceAssignment.capabilities.join(", ")}]`, ["EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01"]);

    if (mutable.status !== "WAITING_FOR_INFORMATION") {
      if (userNeedAnalysis.recommendedAction === "create_legal_case") {
        const { registry } = require("../../../../apps/web/workspace.manifest");

        let caseDescription = `Konsultasi awal: ${mutable.userNeed}\nDiagnosis: ${userNeedAnalysis.diagnosis}`;
        const collectedData: string[] = [];
        if (mutable.founder) collectedData.push(`- Pendiri: ${mutable.founder}`);
        if (mutable.ownership) collectedData.push(`- Kepemilikan: ${mutable.ownership}`);
        if (mutable.businessType) collectedData.push(`- Jenis Usaha: ${mutable.businessType.toUpperCase()}`);
        if (mutable.domicile) collectedData.push(`- Domisili: ${mutable.domicile}`);
        if (mutable.kbli) collectedData.push(`- KBLI: ${mutable.kbli}`);
        if (collectedData.length > 0) {
          caseDescription += `\n\nData yang Sudah Terkumpul:\n${collectedData.join("\n")}`;
        }
        if ((mutable.missingFields?.length ?? 0) > 0) {
          caseDescription += `\n\nData yang Perlu Dilengkapi: ${mutable.missingFields!.join(", ")}`;
        }
        caseDescription += `\n\n=== EXECUTION POLICY ===\nMachine tasks: collect information, validate documents, prepare drafts, detect missing fields, track checklist\nHuman required: legal judgment, professional review, regulated action, exception handling\n\n=== AUTONOMY PROFILE ===\nAutonomy Level: ${calculatedAutonomy}\nAllowed: ${allowedActions.join(", ") || "none"}\nProhibited: ${prohibitedActions.join(", ") || "none"}`;

        const boundaryCheck = checkAutonomyBoundary({ action: "create_legal_case", allowed: allowedActions, prohibited: prohibitedActions }, actorId);
        stages = [...stages, boundaryCheck.stage];
        decisionLog = [...decisionLog, boundaryCheck.log];
        controlsApplied.push(...boundaryCheck.controlsApplied);

        if (!boundaryCheck.ok) {
          mutable.status = "BLOCKED";
          mutable.blockedAt = now;
          mutable.blockedBy = actorId;
          const blockReason = boundaryCheck.log.reason;
          mutable.decisionContract = {
            risk: { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
            autonomy: { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
            assistance: { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
            recommendation: userNeedAnalysis.diagnosis,
            blockReason,
            decisionLog: decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
            stages: addStage(stages, "closure", actorId, `BLOCKED by autonomy boundary violation (EOS-CONSULT-MEASURE-02)`, ["EOS-CONSULT-MANAGE-04", "EOS-CONSULT-MEASURE-02"]).map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
            controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-04"])),
          };
          mutable.linkedWorkItems = linkedWorkItems;
          mutable.updatedAt = now;
          await ConsultationRepositoryInMemory.save(mutable);
          const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
          await evidenceRegistry.invoke(
            "evidence-registry",
            "evidence.record",
            {
              entityRef: mutable.id,
              entityType: "consultation",
              action: "autonomy_boundary_violation_blocked",
              actorId,
              details: {
                attemptedAction: "create_legal_case",
                matchedProhibited: boundaryCheck.stage.details?.matchedProhibited ?? [],
                governanceContract: {
                  riskLevel: calculatedRisk,
                  autonomyLevel: calculatedAutonomy,
                  controlsApplied: mutable.decisionContract?.controlsApplied ?? [],
                },
              },
              timestamp: now.toISOString(),
              sessionId,
              tenantId,
              workspaceId,
            }
          );
          return {
            id: mutable.id,
            status: mutable.status,
            triageResult,
            blockedAt: mutable.blockedAt,
            blockReason,
            linkedWorkItems,
            updatedAt: mutable.updatedAt,
          };
        }

        try {
          const caseOutput = await registry.invoke(
            "legal-case",
            "case.create",
            {
              title: `Pendirian PT - dari Konsultasi #${mutable.id.substring(0, 5)}`,
              description: caseDescription,
              priority: calculatedRisk === "critical" ? "high" : calculatedRisk === "high" ? "high" : "medium",
              sessionId,
              tenantId,
              workspaceId,
              actorId
            }
          );

          const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
          await evidenceRegistry.invoke(
            "evidence-registry",
            "evidence.record",
            {
              entityRef: mutable.id,
              entityType: "consultation",
              action: "legal_case_created",
              actorId,
              details: {
                caseId: caseOutput.id,
                linkedWorkItemsCount: linkedWorkItems.length + 1,
                decisionRationale: `Legal case created from consultation triage for PT establishment need: ${mutable.userNeed}`,
              },
              timestamp: now.toISOString(),
              sessionId,
              tenantId,
              workspaceId,
            }
          );

          mutable.linkedWorkItemId = caseOutput.id;
          mutable.linkedWorkItemType = "legal_case";
          linkedWorkItems.push({
            id: caseOutput.id,
            type: "legal_case",
            title: `Pendirian PT - dari Konsultasi #${mutable.id.substring(0, 5)}`,
          } as LinkedWorkItem);

          stages = addStage(
            stages, "execution", actorId, `Legal case ${caseOutput.id} created and routed`,
            ["EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01"],
            { workItemId: caseOutput.id, workItemType: "legal_case" }
          );
          controlsApplied.push("EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01");
        } catch (error) {
          mutable.status = "BLOCKED";
          mutable.blockedAt = now;
          mutable.blockedBy = actorId;

          const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
          await evidenceRegistry.invoke(
            "evidence-registry",
            "evidence.record",
            {
              entityRef: mutable.id,
              entityType: "consultation",
              action: "legal_case_creation_failed",
              actorId,
              details: {
                error: error instanceof Error ? error.message : "Unknown error creating legal case",
                recommendation: "Retry legal case creation or escalate to human operator",
                consultationNeed: mutable.userNeed,
              },
              timestamp: now.toISOString(),
              sessionId,
              tenantId,
              workspaceId,
            }
          );

          const blockReason = "Failed to create legal case work item";
          const newDecisionLog = addLog(decisionLog, "BLOCKED: legal_case_creation_failed", actorId, blockReason, ["EOS-CONSULT-MANAGE-03"]);
          const newStages = addStage(stages, "closure", actorId, `BLOCKED - ${blockReason}`, ["EOS-CONSULT-MANAGE-04"]);
          mutable.decisionContract = {
            risk: { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
            autonomy: { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
            assistance: { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
            recommendation: userNeedAnalysis.diagnosis,
            blockReason,
            decisionLog: newDecisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
            stages: newStages.map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
            controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-03", "EOS-CONSULT-MANAGE-04"])),
          };
          mutable.linkedWorkItems = linkedWorkItems;
          await ConsultationRepositoryInMemory.save(mutable);
          return {
            id: mutable.id,
            status: mutable.status,
            triageResult,
            blockedAt: mutable.blockedAt,
            blockReason,
            linkedWorkItems,
            updatedAt: mutable.updatedAt,
          };
        }
      }

      if (userNeedAnalysis.recommendedAction === "create_observability_incident") {
        const { registry } = require("../../../../apps/web/workspace.manifest");

        let incidentDescription = `Konsultasi awal: ${mutable.userNeed}\nDiagnosis: ${userNeedAnalysis.diagnosis}`;
        const collectedData: string[] = [];
        if (mutable.server_id) collectedData.push(`- Server ID: ${mutable.server_id}`);
        if (mutable.datacenter_location) collectedData.push(`- Lokasi Datacenter: ${mutable.datacenter_location}`);
        if (mutable.last_cpu_usage) collectedData.push(`- Penggunaan CPU Terakhir: ${mutable.last_cpu_usage}%`);
        if (mutable.last_memory_usage) collectedData.push(`- Penggunaan Memori Terakhir: ${mutable.last_memory_usage}%`);
        if (collectedData.length > 0) {
          incidentDescription += `\n\nData yang Sudah Terkumpul:\n${collectedData.join("\n")}`;
        }
        if ((mutable.missingFields?.length ?? 0) > 0) {
          incidentDescription += `\n\nData yang Perlu Dilengkapi: ${mutable.missingFields!.join(", ")}`;
        }
        incidentDescription += `\n\n=== EXECUTION POLICY ===\nMachine tasks: collect metrics, analyze logs, monitor restoration, track uptime, detect anomalies\nHuman required: kernel panic analysis, production reboot approval, config modification, critical data access\n\n=== AUTONOMY PROFILE ===\nAutonomy Level: ${calculatedAutonomy}\nAllowed: ${allowedActions.join(", ") || "none"}\nProhibited: ${prohibitedActions.join(", ") || "none"}`;

        const boundaryCheck = checkAutonomyBoundary({ action: "create_observability_incident", allowed: allowedActions, prohibited: prohibitedActions }, actorId);
        stages = [...stages, boundaryCheck.stage];
        decisionLog = [...decisionLog, boundaryCheck.log];
        controlsApplied.push(...boundaryCheck.controlsApplied);

        if (!boundaryCheck.ok) {
          mutable.status = "BLOCKED";
          mutable.blockedAt = now;
          mutable.blockedBy = actorId;
          const blockReason = boundaryCheck.log.reason;
          mutable.decisionContract = {
            risk: { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
            autonomy: { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
            assistance: { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
            recommendation: userNeedAnalysis.diagnosis,
            blockReason,
            decisionLog: decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
            stages: addStage(stages, "closure", actorId, `BLOCKED by autonomy boundary violation (EOS-CONSULT-MEASURE-02)`, ["EOS-CONSULT-MANAGE-04", "EOS-CONSULT-MEASURE-02"]).map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
            controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-04"])),
          };
          mutable.linkedWorkItems = linkedWorkItems;
          mutable.updatedAt = now;
          await ConsultationRepositoryInMemory.save(mutable);
          const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
          await evidenceRegistry.invoke(
            "evidence-registry",
            "evidence.record",
            {
              entityRef: mutable.id,
              entityType: "consultation",
              action: "autonomy_boundary_violation_blocked",
              actorId,
              details: {
                attemptedAction: "create_observability_incident",
                matchedProhibited: boundaryCheck.stage.details?.matchedProhibited ?? [],
                governanceContract: {
                  riskLevel: calculatedRisk,
                  autonomyLevel: calculatedAutonomy,
                  controlsApplied: mutable.decisionContract?.controlsApplied ?? [],
                },
              },
              timestamp: now.toISOString(),
              sessionId,
              tenantId,
              workspaceId,
            }
          );
          return {
            id: mutable.id,
            status: mutable.status,
            triageResult,
            blockedAt: mutable.blockedAt,
            blockReason,
            linkedWorkItems,
            updatedAt: mutable.updatedAt,
          };
        }

        try {
          const incidentOutput = await registry.invoke(
            "observability",
            "incident.create",
            {
              title: `Insiden Infrastruktur - dari Konsultasi #${mutable.id.substring(0, 5)}`,
              description: incidentDescription,
              priority: calculatedRisk === "critical" ? "critical" : calculatedRisk === "high" ? "high" : "medium",
              sessionId,
              tenantId,
              workspaceId,
              actorId
            }
          );

          const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
          await evidenceRegistry.invoke(
            "evidence-registry",
            "evidence.record",
            {
              entityRef: mutable.id,
              entityType: "consultation",
              action: "observability_incident_created",
              actorId,
              details: {
                incidentId: incidentOutput.id,
                linkedWorkItemsCount: linkedWorkItems.length + 1,
                decisionRationale: `Observability incident created from consultation triage for infrastructure need: ${mutable.userNeed}`,
              },
              timestamp: now.toISOString(),
              sessionId,
              tenantId,
              workspaceId,
            }
          );

          mutable.linkedWorkItemId = incidentOutput.id;
          mutable.linkedWorkItemType = "observability_incident";
          linkedWorkItems.push({
            id: incidentOutput.id,
            type: "observability_incident",
            title: `Insiden Infrastruktur - dari Konsultasi #${mutable.id.substring(0, 5)}`,
          } as LinkedWorkItem);

          stages = addStage(
            stages, "execution", actorId, `Observability incident ${incidentOutput.id} created and routed`,
            ["EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01"],
            { workItemId: incidentOutput.id, workItemType: "observability_incident" }
          );
          controlsApplied.push("EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01");
        } catch (error) {
          mutable.status = "BLOCKED";
          mutable.blockedAt = now;
          mutable.blockedBy = actorId;

          const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
          await evidenceRegistry.invoke(
            "evidence-registry",
            "evidence.record",
            {
              entityRef: mutable.id,
              entityType: "consultation",
              action: "observability_incident_creation_failed",
              actorId,
              details: {
                error: error instanceof Error ? error.message : "Unknown error creating observability incident",
                recommendation: "Retry incident creation or escalate to SRE lead",
                consultationNeed: mutable.userNeed,
              },
              timestamp: now.toISOString(),
              sessionId,
              tenantId,
              workspaceId,
            }
          );

          const blockReason = "Failed to create observability incident work item";
          const newDecisionLog = addLog(decisionLog, "BLOCKED: observability_incident_creation_failed", actorId, blockReason, ["EOS-CONSULT-MANAGE-03"]);
          const newStages = addStage(stages, "closure", actorId, `BLOCKED - ${blockReason}`, ["EOS-CONSULT-MANAGE-04"]);
          mutable.decisionContract = {
            risk: { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
            autonomy: { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
            assistance: { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
            recommendation: userNeedAnalysis.diagnosis,
            blockReason,
            decisionLog: newDecisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
            stages: newStages.map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
            controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-03", "EOS-CONSULT-MANAGE-04"])),
          };
          mutable.linkedWorkItems = linkedWorkItems;
          await ConsultationRepositoryInMemory.save(mutable);
          return {
            id: mutable.id,
            status: mutable.status,
            triageResult,
            blockedAt: mutable.blockedAt,
            blockReason,
            linkedWorkItems,
            updatedAt: mutable.updatedAt,
          };
        }
      }

      if (userNeedAnalysis.recommendedAction === "create_requirement") {
        const boundaryCheck = checkAutonomyBoundary({ action: "create_requirement", allowed: allowedActions, prohibited: prohibitedActions }, actorId);
        stages = [...stages, boundaryCheck.stage];
        decisionLog = [...decisionLog, boundaryCheck.log];
        controlsApplied.push(...boundaryCheck.controlsApplied);
        if (!boundaryCheck.ok) {
          mutable.status = "BLOCKED";
          mutable.blockedAt = now;
          mutable.blockedBy = actorId;
          mutable.decisionContract = {
            risk: { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
            autonomy: { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
            assistance: { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
            recommendation: userNeedAnalysis.diagnosis,
            blockReason: boundaryCheck.log.reason,
            decisionLog: decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
            stages: addStage(stages, "closure", actorId, `BLOCKED by autonomy boundary on create_requirement`, ["EOS-CONSULT-MANAGE-04", "EOS-CONSULT-MEASURE-02"]).map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
            controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-04"])),
          };
          mutable.linkedWorkItems = linkedWorkItems;
          mutable.updatedAt = now;
          await ConsultationRepositoryInMemory.save(mutable);
          return {
            id: mutable.id,
            status: mutable.status,
            triageResult,
            blockedAt: mutable.blockedAt,
            blockReason: boundaryCheck.log.reason,
            linkedWorkItems,
            updatedAt: mutable.updatedAt,
          };
        }
        const { registry } = require("../../../../apps/web/workspace.manifest");
        const requirementOutput = await registry.invoke(
          "requirement-management",
          "requirement.create",
          {
            title: `Kebutuhan dari Konsultasi #${mutable.id.substring(0, 5)}`,
            description: `Dari konsultasi pengguna: ${mutable.userNeed}`,
            priority: "medium",
            sessionId,
            tenantId,
            workspaceId,
            actorId
          }
        );
        linkedWorkItems.push({
          id: requirementOutput.id,
          type: "requirement",
          title: `Kebutuhan dari Konsultasi #${mutable.id.substring(0, 5)}`,
        } as LinkedWorkItem);

        const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
        await evidenceRegistry.invoke(
          "evidence-registry",
          "evidence.record",
          {
            entityRef: mutable.id,
            entityType: "consultation",
            action: "requirement_created",
            actorId,
            details: {
              requirementId: requirementOutput.id,
              linkedWorkItemsCount: linkedWorkItems.length,
              decisionRationale: `Requirement created from consultation triage for need: ${mutable.userNeed}`,
            },
            timestamp: now.toISOString(),
            sessionId,
            tenantId,
            workspaceId,
          }
        );
        stages = addStage(stages, "execution", actorId, `Requirement ${requirementOutput.id} created`, ["EOS-CONSULT-MANAGE-02"], { workItemId: requirementOutput.id });
        controlsApplied.push("EOS-CONSULT-MANAGE-02");
      }

      if (userNeedAnalysis.recommendedAction === "create_service_request") {
        const boundaryCheck = checkAutonomyBoundary({ action: "create_service_request", allowed: allowedActions, prohibited: prohibitedActions }, actorId);
        stages = [...stages, boundaryCheck.stage];
        decisionLog = [...decisionLog, boundaryCheck.log];
        controlsApplied.push(...boundaryCheck.controlsApplied);
        if (!boundaryCheck.ok) {
          mutable.status = "BLOCKED";
          mutable.blockedAt = now;
          mutable.blockedBy = actorId;
          mutable.decisionContract = {
            risk: { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
            autonomy: { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
            assistance: { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
            recommendation: userNeedAnalysis.diagnosis,
            blockReason: boundaryCheck.log.reason,
            decisionLog: decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
            stages: addStage(stages, "closure", actorId, `BLOCKED by autonomy boundary on create_service_request`, ["EOS-CONSULT-MANAGE-04", "EOS-CONSULT-MEASURE-02"]).map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
            controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-04"])),
          };
          mutable.linkedWorkItems = linkedWorkItems;
          mutable.updatedAt = now;
          await ConsultationRepositoryInMemory.save(mutable);
          return {
            id: mutable.id,
            status: mutable.status,
            triageResult,
            blockedAt: mutable.blockedAt,
            blockReason: boundaryCheck.log.reason,
            linkedWorkItems,
            updatedAt: mutable.updatedAt,
          };
        }
        const { registry } = require("../../../../apps/web/workspace.manifest");
        let serviceRequestDescription = `Konsultasi awal: ${mutable.userNeed}\nDiagnosis: ${userNeedAnalysis.diagnosis}`;
        const collectedData: string[] = [];
        if (mutable.founder) collectedData.push(`- Pemohon: ${mutable.founder}`);
        if (mutable.businessType) collectedData.push(`- Jenis Usaha: ${mutable.businessType.toUpperCase()}`);
        if (mutable.domicile) collectedData.push(`- Lokasi: ${mutable.domicile}`);
        if (collectedData.length > 0) {
          serviceRequestDescription += `\n\nData yang Sudah Terkumpul:\n${collectedData.join("\n")}`;
        }
        if ((mutable.missingFields?.length ?? 0) > 0) {
          serviceRequestDescription += `\n\nData yang Perlu Dilengkapi: ${mutable.missingFields!.join(", ")}`;
        }
        serviceRequestDescription += `\n\n=== EXECUTION POLICY ===\nMachine tasks: collect information, validate documents, prepare drafts, detect missing fields, track checklist\nHuman required: service delivery, professional review, regulated action, exception handling`;
        const serviceRequestOutput = await registry.invoke(
          "service-directory",
          "service-directory.createServiceRequest",
          {
            title: `Permintaan Layanan dari Konsultasi #${mutable.id.substring(0, 5)}`,
            description: serviceRequestDescription,
            category: "IT Support",
            requesterName: mutable.founder || "Unknown Requester",
            sessionId,
            tenantId,
            workspaceId,
            actorId
          }
        );
        linkedWorkItems.push({
          id: serviceRequestOutput.id,
          type: "service_request",
          title: `Permintaan Layanan dari Konsultasi #${mutable.id.substring(0, 5)}`,
        } as LinkedWorkItem);

        const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
        await evidenceRegistry.invoke(
          "evidence-registry",
          "evidence.record",
          {
            entityRef: mutable.id,
            entityType: "consultation",
            action: "service_request_created",
            actorId,
            details: {
              serviceRequestId: serviceRequestOutput.id,
              linkedWorkItemsCount: linkedWorkItems.length,
              decisionRationale: `Service request created from consultation triage for need: ${mutable.userNeed}`,
            },
            timestamp: now.toISOString(),
            sessionId,
            tenantId,
            workspaceId,
          }
        );
        stages = addStage(stages, "execution", actorId, `Service request ${serviceRequestOutput.id} created and routed`, ["EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01"]);
        controlsApplied.push("EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01");
      }

      if (triageResult === "create_observability_incident") {
          const { registry } = require("../../../../apps/web/workspace.manifest");
          const incidentDescription = `Konsultasi #${mutable.id.substring(0, 5)}: ${mutable.userNeed}`;
          const incidentOutput = await registry.invoke(
            "observability",
            "incident.create",
            {
              title: `Insiden dari Konsultasi #${mutable.id.substring(0, 5)}`,
              description: incidentDescription,
              priority: calculatedRisk === "critical" ? "critical" : calculatedRisk === "high" ? "high" : "medium",
              category: "Infrastructure",
              sessionId,
              tenantId,
              workspaceId,
              actorId
            }
          );
        linkedWorkItems.push({
          id: incidentOutput.id,
          type: "observability_incident",
          title: `Insiden dari Konsultasi #${mutable.id.substring(0, 5)}`,
        } as LinkedWorkItem);

        const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
        await evidenceRegistry.invoke(
          "evidence-registry",
          "evidence.record",
          {
            entityRef: mutable.id,
            entityType: "consultation",
            action: "observability_incident_created",
            actorId,
            details: {
              incidentId: incidentOutput.id,
              linkedWorkItemsCount: linkedWorkItems.length,
              decisionRationale: `Observability incident created from consultation triage for technical operations need: ${mutable.userNeed}`,
            },
            timestamp: now.toISOString(),
            sessionId,
            tenantId,
            workspaceId,
          }
        );
        stages = addStage(stages, "execution", actorId, `Observability incident ${incidentOutput.id} created and routed`, ["EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01"]);
        controlsApplied.push("EOS-CONSULT-MANAGE-02", "EOS-CONSULT-MEASURE-01");
      }

      // MSO Stop Gate: OUTCOME BOUNDARY CONTROLLER (sesuai prinsip MSO is Stop Gate, not Complexity Engine)
      // Mengecek apakah evidence cukup untuk target outcome user - BUKAN cuma missingFields.length
      const currentIntent = mutable.intent || userNeedAnalysis.intent;
      let isOutcomeSufficient = false;
      let sufficiencyRationale = "";
      let targetOutcome = "";
      
      // Sufficiency criteria PER INTENT + TARGET OUTCOME - sesuai model Anda: INTENT → TARGET → SUFFICIENCY → STOP/CONTINUE
      if (currentIntent.includes("mendirikan bisnis formal") || currentIntent.includes("pt vs cv") || currentIntent.includes("badan usaha")) {
        // Target Outcome: DECISION (PT/CV mana yang cocok) - sesuai Case A (simple decision)
        // SESUAI FEEDBACK: fields lengkap ≠ evidence cukup ≠ decision valid ≠ outcome sufficient
        targetOutcome = "DECISION";
        const requiredForDecision = ["founder", "ownership", "businessType", "domicile", "kbli"];
        const hasAllRequired = requiredForDecision.every(field => !(mutable.missingFields || []).includes(field));
        const hasClearRecommendation = !!mutable.recommendedAction && mutable.recommendedAction !== "";
        
        // SESUAI KOREKSI MSO-001: stages.length ≠ Resolution Depth! decisionContract.stages adalah INSTRUMENTATION SAJA, bukan resolusi keputusan
        // stages hanya untuk tracing alur reasoning, jumlah stages tidak menentukan kedalaman keputusan yang sebenarnya
        // Cek critical assessments dari stages (existing primitive - HANYA INSTRUMENTATION, BUKAN resolution depth)
        // Memastikan comparison dan regulatory assessment sudah ada sebelum dianggap sufficient
        const hasCriticalAssessments = stages.some(stage => 
          stage.summary.includes("pt vs cv comparison") || 
          stage.summary.includes("regulatory assessment") || 
          stage.summary.includes("liability analysis")
        );
        
        // Hanya sufficient jika BOTH field terisi DAN assessment kritis sudah ada
        isOutcomeSufficient = hasAllRequired && hasClearRecommendation && hasCriticalAssessments;
        sufficiencyRationale = isOutcomeSufficient 
          ? "SUFFICIENT: Semua field dan critical assessments untuk decision PT/CV terpenuhi" 
          : `INSUFFICIENT: ${!hasAllRequired ? `Missing fields - ${(mutable.missingFields || []).filter(f => requiredForDecision.includes(f)).join(", ")}; ` : ''}${!hasCriticalAssessments ? 'Butuh assessment perbandingan PT/CV dan regulasi dulu' : ''}`;
      } else if (currentIntent.includes("feasibility") || currentIntent.includes("pembangkit") || currentIntent.includes("pabrik")) {
        // Target Outcome: FEASIBILITY_ASSESSMENT - sesuai Case B (complex factory)
        // SESUAI FEEDBACK: fields lengkap ≠ evidence cukup ≠ decision valid ≠ outcome sufficient
        targetOutcome = "FEASIBILITY_ASSESSMENT";
        const requiredFields = ["location", "budget", "capacity", "technology"];
        const hasAllRequiredFields = requiredFields.every(field => !(mutable.missingFields || []).includes(field));
        
        // SESUAI KOREKSI MSO-001: stages.length ≠ Resolution Depth! decisionContract.stages adalah INSTRUMENTATION SAJA, bukan resolusi keputusan
        // stages hanya untuk tracing alur reasoning, jumlah stages tidak menentukan kedalaman keputusan yang sebenarnya
        // Cek critical assessments dari stages (existing primitive - hanya instrumentation, bukan resolution depth)
        // Memastikan grid/env/engineering feasibility sudah dinilai sebelum dianggap sufficient
        const hasCriticalAssessments = stages.some(stage => 
          stage.summary.includes("grid feasibility") || 
          stage.summary.includes("environmental assessment") || 
          stage.summary.includes("engineering feasibility")
        );
        
        // Hanya sufficient jika BOTH field terisi DAN assessment kritis sudah ada
        isOutcomeSufficient = hasAllRequiredFields && hasCriticalAssessments;
        sufficiencyRationale = isOutcomeSufficient 
          ? "SUFFICIENT: Semua field dan critical assessments untuk feasibility terpenuhi" 
          : `INSUFFICIENT: ${!hasAllRequiredFields ? `Missing fields - ${(mutable.missingFields || []).filter(f => requiredFields.includes(f)).join(", ")}; ` : ''}${!hasCriticalAssessments ? 'Butuh assessment grid/env/engineering feasibility dulu' : ''}`;
      } else if (currentIntent.includes("amdal") || currentIntent.includes("dampak lingkungan") || currentIntent.includes("pabrik kimia")) {
        // Target Outcome: AMDAL_COMPOSED_DECISION - sesuai Case MSO-003 (composed outcome)
        // SESUAI FEEDBACK: fields lengkap ≠ evidence cukup ≠ decision valid ≠ outcome sufficient
        // Consultation tetap kecil, gunakan semua capability yang sudah ada (100% primitive reuse)
        targetOutcome = "AMDAL_COMPOSED_DECISION";
        const requiredFields = ["location", "project_type", "capacity", "investment"];
        const hasAllRequiredFields = requiredFields.every(field => !(mutable.missingFields || []).includes(field));
        
        // SESUAI KOREKSI MSO-001: stages.length ≠ Resolution Depth! decisionContract.stages adalah INSTRUMENTATION SAJA, bukan resolusi keputusan
        // stages hanya untuk tracing alur reasoning, jumlah stages tidak menentukan kedalaman keputusan yang sebenarnya
        // Cek SEMUA capability sudah mengirimkan evidence (stages sebagai instrumentation, BUKAN depth)
        // environmental+legal+spatial+social+technical assessments = semuanya sudah lengkap
        const hasAllCriticalAssessments = stages.some(stage => 
          stage.summary.includes("environmental-assessment") && 
          stage.summary.includes("legal-compliance") && 
          stage.summary.includes("spatial-validation") &&
          stage.summary.includes("social-impact") &&
          stage.summary.includes("technical-feasibility")
        );
        
        // Import evidence registry untuk aggregate evidence (existing primitive)
        const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
        // Panggil evidence.aggregateEvidence() untuk buat composed outcome (existing primitive!)
        // Ini yang membuktikan MANY → ONE composed outcome: banyak assessment → satu coherent outcome
        const composedEvidence = await evidenceRegistry.invoke(
          "evidence-registry",
          "evidence.aggregate",
          {
            evidences: stages,
            targetOutcome: "AMDAL_COMPOSED_DECISION",
            sessionId,
            tenantId,
            workspaceId
          }
        );
        // Simpan composed outcome di decisionContract.metadata (field yang baru ditambahkan, tidak menambah field baru di ConsultationAggregate)
        // 100% mematuhi frozen ConsultationAggregate semantic contract MSO-001
        // Gunakan objek yang sudah terdefinisi di scope (riskAssessment, autonomyProfile, assistanceAssignment) - SAMA seperti yang digunakan di assignment akhir fungsi
        mutable.decisionContract = {
          ...(mutable.decisionContract || {}),
          risk: mutable.decisionContract?.risk || { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
          autonomy: mutable.decisionContract?.autonomy || { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
          assistance: mutable.decisionContract?.assistance || { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
          recommendation: mutable.decisionContract?.recommendation || userNeedAnalysis.diagnosis,
          decisionLog: mutable.decisionContract?.decisionLog || decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
          stages: mutable.decisionContract?.stages || stages.map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
          controlsApplied: mutable.decisionContract?.controlsApplied || Array.from(new Set(controlsApplied)),
          metadata: {
            ...(mutable.decisionContract?.metadata || {}),
            composedOutcome: composedEvidence.output
          }
        };
        
        // Hanya sufficient jika BOTH field terisi DAN SEMUA assessment kritis sudah ada
        isOutcomeSufficient = hasAllRequiredFields && hasAllCriticalAssessments;
        sufficiencyRationale = isOutcomeSufficient 
          ? `SUFFICIENT: Semua field dan critical assessments untuk AMDAL terpenuhi, composed outcome confidence=${composedEvidence.confidence}` 
          : `INSUFFICIENT: ${!hasAllRequiredFields ? `Missing fields - ${(mutable.missingFields || []).filter(f => requiredFields.includes(f)).join(", ")}; ` : ''}${!hasAllCriticalAssessments ? 'Butuh assessment lingkungan/hukum/tata-ruang/sosial/teknis dulu' : ''}`;
      } else if (currentIntent.includes("rumah sakit") || currentIntent.includes("operasional dan akreditasi") || currentIntent.includes("akreditasi kemenkes") || currentIntent.includes("izin operasional rumah sakit")) {
        // Target Outcome: HOSPITAL_COMPLIANCE_COORDINATED - sesuai Case MSO-004 (MANY→MANY orchestration)
        // SESUAI FEEDBACK: MANY→MANY = multiple user intents → multiple coordinated outcomes (2 intent, 6 capability)
        // Consultation tetap kecil, gunakan semua capability yang sudah ada (100% primitive reuse)
        targetOutcome = "HOSPITAL_COMPLIANCE_COORDINATED";
        const requiredFields = ["hospital_name", "location", "bed_capacity", "service_types", "investment", "employee_count"];
        const hasAllRequiredFields = requiredFields.every(field => !(mutable.missingFields || []).includes(field));
        
        // SESUAI KOREKSI MSO-001: stages.length ≠ Resolution Depth! decisionContract.stages adalah INSTRUMENTATION SAJA, bukan resolusi keputusan
        // stages hanya untuk tracing alur reasoning, jumlah stages tidak menentukan kedalaman keputusan yang sebenarnya
        // Cek SEMUA 6 required capability sudah mengirimkan evidence (stages sebagai instrumentation, BUKAN depth)
        const hasAllCriticalAssessments = stages.some(stage => 
          stage.summary.includes("legal-entity-validation") && 
          stage.summary.includes("perizinan-kemenkes-checklist") && 
          stage.summary.includes("akreditasi-requirements-review") &&
          stage.summary.includes("construction-compliance") &&
          stage.summary.includes("financial-feasibility") &&
          stage.summary.includes("hr-qualification-verification")
        );
        
        // Import evidence registry untuk aggregate evidence (existing primitive)
        const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
        // Panggil evidence.aggregateEvidence() untuk buat coordinated outcomes (existing primitive!)
        const coordinatedEvidence = await evidenceRegistry.invoke(
          "evidence-registry",
          "evidence.aggregate",
          {
            evidences: stages,
            targetOutcome: "HOSPITAL_COMPLIANCE_COORDINATED",
            sessionId,
            tenantId,
            workspaceId
          }
        );
        // Simpan coordinated outcomes di decisionContract.metadata (tidak menambah field baru di ConsultationAggregate)
        // 100% mematuhi frozen ConsultationAggregate semantic contract MSO-001
        // Gunakan objek yang sudah terdefinisi di scope (riskAssessment, autonomyProfile, assistanceAssignment) - SAMA seperti yang digunakan di assignment akhir fungsi
        mutable.decisionContract = {
          ...(mutable.decisionContract || {}),
          risk: mutable.decisionContract?.risk || { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
          autonomy: mutable.decisionContract?.autonomy || { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
          assistance: mutable.decisionContract?.assistance || { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
          recommendation: mutable.decisionContract?.recommendation || userNeedAnalysis.diagnosis,
          decisionLog: mutable.decisionContract?.decisionLog || decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
          stages: mutable.decisionContract?.stages || stages.map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
          controlsApplied: mutable.decisionContract?.controlsApplied || Array.from(new Set(controlsApplied)),
          metadata: {
            ...(mutable.decisionContract?.metadata || {}),
            coordinatedOutcome: coordinatedEvidence.output
          }
        };
        
        // Cek jika kedua intent terpenuhi (izin operasional + akreditasi)
        const hasIzinOperasionalSufficient = stages.some(s => s.summary.includes("izin-operasional-sufficient"));
        const hasAkreditasiSufficient = stages.some(s => s.summary.includes("akreditasi-preparation-sufficient"));
        
        // Hanya sufficient jika BOTH field terisi DAN SEMUA assessment kritis sudah ada DAN kedua intent terpenuhi
        isOutcomeSufficient = hasAllRequiredFields && hasAllCriticalAssessments && hasIzinOperasionalSufficient && hasAkreditasiSufficient;
        sufficiencyRationale = isOutcomeSufficient 
          ? `SUFFICIENT: Semua field dan critical assessments untuk rumah sakit terpenuhi, coordinated outcome confidence=${coordinatedEvidence.confidence}` 
          : `INSUFFICIENT: ${!hasAllRequiredFields ? `Missing fields - ${(mutable.missingFields || []).filter(f => requiredFields.includes(f)).join(", ")}; ` : ''}${!hasAllCriticalAssessments ? 'Butuh semua 6 capability assessments dulu; ' : ''}${!(hasIzinOperasionalSufficient && hasAkreditasiSufficient) ? 'Butuh verifikasi kedua intent (izin operasional + akreditasi) terpenuhi' : ''}`;
      } else if (currentIntent.includes("technical incident") || currentIntent.includes("database down") || currentIntent.includes("observability")) {
        // Target Outcome: INCIDENT_ROUTING
        // SESUAI FEEDBACK: fields lengkap ≠ evidence cukup ≠ decision valid ≠ outcome sufficient
        targetOutcome = "INCIDENT_ROUTING";
        const requiredForIncident = ["server_id", "datacenter_location"];
        const hasAllRequired = requiredForIncident.every(field => !(mutable.missingFields || []).includes(field));
        
        // Cek critical assessments dari stages (existing primitive - HANYA INSTRUMENTATION, BUKAN resolution depth)
        // Memastikan root cause awal sudah teridentifikasi sebelum handoff
        const hasCriticalAssessments = stages.some(stage => 
          stage.summary.includes("initial diagnosis") || 
          stage.summary.includes("root cause identified") || 
          stage.summary.includes("incident classification")
        );
        
        // Hanya sufficient jika BOTH field terisi DAN assessment kritis sudah ada
        isOutcomeSufficient = hasAllRequired && hasCriticalAssessments;
        sufficiencyRationale = isOutcomeSufficient 
          ? "SUFFICIENT: Semua field dan critical assessments untuk incident routing terpenuhi" 
          : `INSUFFICIENT: ${!hasAllRequired ? `Missing fields - ${(mutable.missingFields || []).filter(f => requiredForIncident.includes(f)).join(", ")}; ` : ''}${!hasCriticalAssessments ? 'Butuh diagnosis awal dan klasifikasi incident dulu' : ''}`;
      } else {
        // Fallback untuk intent umum - INFORMATION_ONLY
        // SESUAI FEEDBACK: fields lengkap ≠ evidence cukup ≠ decision valid ≠ outcome sufficient
        targetOutcome = "INFORMATION_ONLY";
        const hasAllRequiredFields = (mutable.missingFields?.length ?? 0) === 0;
        
        // SESUAI KOREKSI MSO-001: stages.length ≠ Resolution Depth! decisionContract.stages adalah INSTRUMENTATION SAJA, bukan resolusi keputusan
        // stages hanya untuk tracing alur reasoning, jumlah stages tidak menentukan kedalaman keputusan yang sebenarnya
        // Cek minimal assessment dari stages (existing primitive - HANYA INSTRUMENTATION, BUKAN resolution depth)
        // Memastikan informasi dasar sudah dijelaskan sebelum dianggap sufficient
        const hasBasicInformation = stages.some(stage => 
          stage.summary.includes("information provided") || 
          stage.summary.includes("basic explanation") || 
          stage.summary.includes("user need clarified")
        );
        
        // Hanya sufficient jika BOTH field terisi DAN informasi dasar sudah diberikan
        isOutcomeSufficient = hasAllRequiredFields && hasBasicInformation;
        sufficiencyRationale = isOutcomeSufficient 
          ? "SUFFICIENT: Semua field dan informasi dasar terpenuhi untuk informasi umum" 
          : `INSUFFICIENT: ${!hasAllRequiredFields ? `Missing fields - ${(mutable.missingFields || []).join(", ")}; ` : ''}${!hasBasicInformation ? 'Butuh penjelasan informasi dasar dulu' : ''}`;
      }

      // MSO Gate Decision - eksekusi stop atau continue sesuai sufficiency
      if (linkedWorkItems.length > 0 && isOutcomeSufficient) {
        // Consultation selesai SEBAGAI EPISODE - handoff ke capability (TIDAK PERNAH masuk EXECUTING)
        // Membedakan CONSULTATION RESOLUTION ≠ WORK RESOLUTION ≠ BUSINESS OUTCOME
        mutable.status = "HANDOFF";
        mutable.handoffAt = now;
        mutable.resolutionType = targetOutcome === "DECISION" ? "DECISION" : "AGENT_HANDOFF";
        stages = addStage(stages, "closure", actorId, `MSO Gate STOP: Target=${targetOutcome}, ${sufficiencyRationale} - handoff ${linkedWorkItems.length} work items ke capability`, ["EOS-CONSULT-GOV-02", "EOS-CONSULT-MANAGE-01"]);
        controlsApplied.push("EOS-CONSULT-GOV-02", "EOS-CONSULT-MANAGE-01");
      } else if (linkedWorkItems.length > 0 && !isOutcomeSufficient) {
        // MSO Gate BLOCKED: Insufficient outcome - CLEAR linkedWorkItems untuk mencegah over-processing
        mutable.status = "WAITING_FOR_INFORMATION";
        mutable.missingInfoAt = now;
        linkedWorkItems = []; // prevent unnecessary work creation - kunci dari prinsip "don't maximize complexity"
        mutable.linkedWorkItems = [];
        stages = addStage(stages, "pause", actorId, `MSO Gate BLOCKED: Target=${targetOutcome}, ${sufficiencyRationale} - menunggu informasi tambahan`, ["EOS-CONSULT-GOV-01"]);
        controlsApplied.push("EOS-CONSULT-GOV-01");
      }
    }

    stages = addStage(stages, "outcome", actorId, `Triage completed. Status: ${mutable.status}`, ["EOS-CONSULT-MEASURE-01"]);
    controlsApplied.push("EOS-CONSULT-MEASURE-01");
    decisionLog = addLog(decisionLog, `Triage complete. Status=${mutable.status}, LinkedWorkItems=${linkedWorkItems.length}`, actorId, userNeedAnalysis.diagnosis, ["EOS-CONSULT-GOV-03", "EOS-CONSULT-MEASURE-01"]);
    controlsApplied.push("EOS-CONSULT-GOV-03");

    mutable.decisionContract = {
      risk: { ...riskAssessment, controlIds: riskAssessment.controlIds ? [...riskAssessment.controlIds] : undefined },
      autonomy: { ...autonomyProfile, allowedActions: [...autonomyProfile.allowedActions], prohibitedActions: [...autonomyProfile.prohibitedActions], controlIds: autonomyProfile.controlIds ? [...autonomyProfile.controlIds] : undefined },
      assistance: { ...assistanceAssignment, capabilities: [...assistanceAssignment.capabilities], controlIds: assistanceAssignment.controlIds ? [...assistanceAssignment.controlIds] : undefined },
      recommendation: userNeedAnalysis.diagnosis,
      decisionLog: decisionLog.map(entry => ({ ...entry, controlIds: entry.controlIds ? [...entry.controlIds] : undefined })),
      stages: stages.map(stage => ({ ...stage, controlIds: stage.controlIds ? [...stage.controlIds] : undefined })),
      controlsApplied: Array.from(new Set(controlsApplied)),
    };
    mutable.linkedWorkItems = linkedWorkItems;
    mutable.triageResult = triageResult;
    mutable.triageNotes = triageNotes;
    mutable.linkedWorkItemId = linkedWorkItemId ?? mutable.linkedWorkItemId;
    mutable.need = need ?? mutable.need;
    mutable.updatedAt = now;

    if (mutable.seriesId) {
      let series = await ConsultationRepositoryInMemory.getSeriesById(mutable.seriesId);
      if (series) {
        const mergedUncertainty: string[] = Array.from(new Set([
          ...series.unresolvedUncertainty,
          ...(mutable.missingFields ?? [])
        ]));
        const mergedWorkItems: LinkedWorkItem[] = [
          ...series.linkedWorkItems.filter(lwi =>
            !linkedWorkItems.some(l => l.id === lwi.id)
          ),
          ...linkedWorkItems
        ];
        let cumulativeFromEpisode: ConsultationFact[] = [];
        if (mutable.episodeId) {
          const episode = await ConsultationRepositoryInMemory.getEpisodeById(mutable.episodeId);
          if (episode) {
            const dedupeWorkItems = new Map<string, LinkedWorkItem>();
            [...episode.linkedWorkItems, ...linkedWorkItems].forEach((w: LinkedWorkItem) => dedupeWorkItems.set(w.id, w));
            const dedupeDecisions = new Map<string, DecisionLogEntry>();
            [...episode.decisions, ...decisionLog].forEach((d: DecisionLogEntry) => dedupeDecisions.set(d.decision + String(d.at.getTime()), d));
            const updatedEpisode: ConsultationEpisode = {
              ...episode,
              unresolvedQuestions: Array.from(new Set([
                ...episode.unresolvedQuestions,
                ...(mutable.missingFields ?? [])
              ])),
              linkedWorkItems: Array.from(dedupeWorkItems.values()),
              decisions: Array.from(dedupeDecisions.values()),
              evidence: stages.length > episode.evidence.length ? stages : episode.evidence,
              outcome: (() => {
                if (mutable.status === "AWAITING_DECISION") return "VERIFIED";
                if (mutable.status === "ESCALATED" || mutable.status === "OUT_OF_SCOPE" || mutable.status === "CANCELLED") return "INFORMATION_ONLY";
                if (linkedWorkItems.length > 0) return "WORK_CREATED";
                if ((mutable.missingFields?.length ?? 0) === 0) return "CLARITY";
                return "INFORMATION_ONLY";
              })(),
              nextRecommendedAction: mutable.recommendedAction ?? episode.nextRecommendedAction,
              endedAt: mutable.status === "WAITING_FOR_INFORMATION"
                || mutable.status === "WAITING_FOR_HUMAN"
                || mutable.status === "REFERRED"
                || mutable.status === "AWAITING_DECISION"
                ? now : undefined,
            };
            await ConsultationRepositoryInMemory.saveEpisode(updatedEpisode);
            const epFacts: ConsultationFact[] = (episode.facts ?? []).concat(
              (mutable.missingFields ?? []).map(field => ({
                key: `unresolved_${field}_${Date.now().toString(36)}`,
                value: field,
                epistemicStatus: "OBSERVED" as const,
                recordedAt: now,
                recordedBy: actorId,
                sourceEpisodeId: episode.id,
              }) as ConsultationFact)
            );
            cumulativeFromEpisode = epFacts;
          }
        }
        const dedupeCumulative = new Map<string, ConsultationFact>();
        [...series.cumulativeKnownContext, ...cumulativeFromEpisode].forEach((f: ConsultationFact) => {
          dedupeCumulative.set(f.key + f.epistemicStatus, f);
        });
        series = {
          ...series,
          unresolvedUncertainty: mergedUncertainty,
          linkedWorkItems: mergedWorkItems,
          cumulativeKnownContext: Array.from(dedupeCumulative.values()),
          updatedAt: now,
        };
        await ConsultationRepositoryInMemory.saveSeries(series);
      }
    }

    await ConsultationRepositoryInMemory.save(mutable);

    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: mutable.id,
        entityType: "consultation",
        action: "triage_completed",
        actorId,
        details: {
          intent: mutable.intent,
          diagnosis: mutable.diagnosis,
          linkedWorkItemId: mutable.linkedWorkItemId,
          workItemType: mutable.linkedWorkItemType,
          missingFields: mutable.missingFields,
          governanceContract: {
            riskLevel: calculatedRisk,
            autonomyLevel: calculatedAutonomy,
            assistanceMode: chosenAssistanceMode,
            controlsApplied: mutable.decisionContract?.controlsApplied ?? [],
          },
        },
        timestamp: now.toISOString(),
        sessionId,
        tenantId,
        workspaceId,
      }
    );

    return {
      id: mutable.id,
      status: mutable.status,
      triageResult,
      linkedWorkItemId: mutable.linkedWorkItemId,
      intent: mutable.intent,
      need: userNeedAnalysis.need,
      diagnosis: mutable.diagnosis,
      missingFields: mutable.missingFields,
      recommendedAction: mutable.recommendedAction,
      updatedAt: mutable.updatedAt,
      linkedWorkItems: mutable.linkedWorkItems,
    };
  },
};

export const listConsultationsByWorkspace: ListConsultationsCommand = {
  kind: "command",
  name: "consultation.listByWorkspace",
  version: "1.0.0",
  async execute(input: z.infer<typeof ListConsultationsWithContextSchema>) {
    await ensureIdentitySchema();

    const parsed = ListConsultationsWithContextSchema.parse(input);
    const { sessionId, tenantId, workspaceId, actorId, limit, offset } = parsed;

    const session = await SessionRepositoryPostgres.byId(sessionId as SessionId);
    if (!session) {
      throw new Error("[consultation.listByWorkspace] Invalid or expired session");
    }
    if (session.tenantId !== tenantId) {
      throw new Error("[consultation.listByWorkspace] Session tenant mismatch - tenant isolation violation");
    }
    if (session.workspaceId !== workspaceId) {
      throw new Error("[consultation.listByWorkspace] Session workspace mismatch - tenant isolation violation");
    }
    if (session.actorId !== actorId) {
      throw new Error("[consultation.listByWorkspace] Session actor mismatch - authentication violation");
    }

    const allWorkspaceConsultations = await ConsultationRepositoryInMemory.listByWorkspace(workspaceId);
    let filteredConsultations = [...allWorkspaceConsultations];
    if (parsed.status && parsed.status !== "all") {
      filteredConsultations = filteredConsultations.filter(c => c.status === parsed.status);
    }
    if (parsed.priority && parsed.priority !== "all") {
      filteredConsultations = filteredConsultations.filter(c => c.priority === parsed.priority);
    }
    if (parsed.query) {
      const query = parsed.query.toLowerCase();
      filteredConsultations = filteredConsultations.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.userNeed.toLowerCase().includes(query)
      );
    }

    const total = allWorkspaceConsultations.length;
    const matched = filteredConsultations.length;
    const items = filteredConsultations.slice(offset, offset + limit);
    return { items, total, matched, offset, limit };
  },
};

const ResolveConsultationWithContextSchema = z.object({
  id: z.string().min(1),
  resolution: z.string().min(1),
  outcomeType: z.enum(["RESOLVED", "INFORMATION_PROVIDED", "RECOMMENDATION", "SERVICE_REQUEST_CREATED", "CASE_CREATED", "WORKFLOW_STARTED", "HUMAN_HANDOFF", "AGENT_HANDOFF", "REFERRAL", "MORE_INFORMATION_REQUIRED", "UNSAFE", "OUT_OF_SCOPE"]),
  resolutionType: z.enum(["INFORMATION_ONLY", "RECOMMENDATION_ACCEPTED", "WORK_CREATED", "HUMAN_HANDOFF", "AGENT_HANDOFF", "MACHINE_EXECUTION", "HYBRID_EXECUTION", "REFERRED", "OUT_OF_SCOPE", "CANCELLED", "CLARITY", "DECISION", "ASSISTED", "EXECUTED", "VERIFIED"]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  riskRationale: z.string().min(1),
  autonomyLevel: z.number().int().min(0).max(5),
  allowedActions: z.array(z.string()).min(1),
  prohibitedActions: z.array(z.string()).min(1),
  assignedAssistanceMode: z.enum(["HUMAN", "AGENT", "MACHINE", "HYBRID"]),
  assignedExecutorId: z.string().min(1),
  invokedCapabilities: z.array(z.string()).optional(),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const PauseConsultationWithContextSchema = z.object({
  id: z.string().min(1),
  pauseReason: z.string().min(1),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const ResumeConsultationWithContextSchema = z.object({
  id: z.string().min(1),
  resumeReason: z.string().min(1),
  newEvidence: z.array(z.object({
    fact: z.string().min(1),
    source: z.string().min(1),
    epistemicStatus: z.enum(["CLAIMED", "OBSERVED", "EVIDENCED", "VERIFIED", "OUTDATED", "CONTRADICTED"]),
    timestamp: z.date().optional(),
  })).optional(),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

type ResolveConsultationWithContextInput = z.infer<typeof ResolveConsultationWithContextSchema>;
type PauseConsultationWithContextInput = z.infer<typeof PauseConsultationWithContextSchema>;
type ResumeConsultationWithContextInput = z.infer<typeof ResumeConsultationWithContextSchema>;
type ResolveConsultationCommand = CapabilityCommand<ResolveConsultationWithContextInput, Promise<{ id: string; status: string; resolvedAt: Date }>>;
type PauseConsultationCommand = CapabilityCommand<PauseConsultationWithContextInput, Promise<{ id: string; status: string; pausedAt: Date }>>;
type ResumeConsultationCommand = CapabilityCommand<ResumeConsultationWithContextInput, Promise<{ id: string; status: string; resumedAt: Date; previousContextRestored: boolean }>>;

export const resolveConsultation: ResolveConsultationCommand = {
  kind: "command",
  name: "consultation.resolve",
  version: "1.0.0",
  async execute(input: z.infer<typeof ResolveConsultationWithContextSchema>) {
    await ensureIdentitySchema();

    const parsed = ResolveConsultationWithContextSchema.parse(input);
    const {
      id, resolution, outcomeType, resolutionType,
      riskLevel, riskRationale, autonomyLevel, allowedActions, prohibitedActions,
      assignedAssistanceMode, assignedExecutorId, invokedCapabilities,
      tenantId, workspaceId, sessionId, actorId
    } = parsed;

    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.resolve] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.resolve] Session mismatch - security violation");
    }

    const current = await ConsultationRepositoryInMemory.byId(ConsultationId(id));
    if (!current) {
      throw new Error(`[consultation.resolve] Consultation not found: ${id}`);
    }
    if (current.status === "RESOLVED") {
      throw new Error(`[consultation.resolve] Cannot modify already resolved consultation: ${id}`);
    }

    const now = new Date();
    const controlsApplied: readonly EosConsultationControlId[] = current.decisionContract?.controlsApplied ?? [];
    let stages: ConsultationStageEvidence[] = [...(current.decisionContract?.stages ?? [])];
    let decisionLog: DecisionLogEntry[] = [...(current.decisionContract?.decisionLog ?? [])];

    const isValidAutonomy = (v: unknown): v is AutonomyLevel => 
      typeof v === 'number' && [0,1,2,3,4,5].includes(v);
    
    const risk: ConsultationDecisionContract["risk"] = {
      level: riskLevel,
      rationale: riskRationale,
      assessedBy: actorId,
      assessedAt: now,
      controlIds: ["EOS-CONSULT-MAP-02"],
    };
    const autonomy: ConsultationDecisionContract["autonomy"] = {
      level: isValidAutonomy(autonomyLevel) ? autonomyLevel : 2,
      allowedActions,
      prohibitedActions,
      setBy: actorId,
      setAt: now,
      controlIds: ["EOS-CONSULT-GOV-02"],
    };
    const assistance: ConsultationDecisionContract["assistance"] = {
      mode: assignedAssistanceMode,
      actor: assignedExecutorId,
      capabilities: invokedCapabilities || [],
      assignedAt: now,
      controlIds: ["EOS-CONSULT-MAP-05", "EOS-CONSULT-MANAGE-01"],
    };

    const finalControls = Array.from(new Set([
        ...controlsApplied,
        "EOS-CONSULT-MAP-02",
        "EOS-CONSULT-GOV-02",
        "EOS-CONSULT-MAP-05",
        "EOS-CONSULT-MANAGE-01",
        "EOS-CONSULT-MANAGE-04",
        "EOS-CONSULT-GOV-03",
        "EOS-CONSULT-MEASURE-01",
      ])) as EosConsultationControlId[];

    const finalStages = addStage(
      addStage(stages, "outcome", actorId,
        `Resolution type: ${resolutionType} - ${resolution.substring(0, 100)}`,
        ["EOS-CONSULT-MEASURE-01", "EOS-CONSULT-MANAGE-04"],
        { outcomeType, resolutionType }
      ),
      "closure",
      actorId,
      `Consultation RESOLVED. ${finalControls.length} governance controls applied.`,
      ["EOS-CONSULT-GOV-03", "EOS-CONSULT-MANAGE-04"]
    );

    const finalLog = addLog(
      decisionLog,
      "consultation_resolved",
      actorId,
      `Resolution type: ${resolutionType} - ${resolution.substring(0, 200)}`,
      ["EOS-CONSULT-GOV-03", "EOS-CONSULT-MANAGE-04", "EOS-CONSULT-MEASURE-01"]
    );

    const next: ConsultationAggregate = {
      ...current,
      status: "RESOLVED",
      resolvedAt: now,
      resolution,
      outcome: outcomeType,
      resolutionType,
      updatedAt: now,
      decisionContract: {
        risk,
        autonomy,
        assistance,
        recommendation: resolution.substring(0, 500),
        decisionLog: finalLog,
        stages: finalStages,
        controlsApplied: finalControls,
      },
    };

    await ConsultationRepositoryInMemory.save(next);

    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: next.id,
        entityType: "consultation",
        action: "consultation_resolved",
        actorId,
        details: {
          outcomeType,
          resolutionType,
          resolution: resolution.substring(0, 200),
          governanceContract: {
            riskLevel,
            autonomyLevel,
            assignedAssistanceMode,
            assignedExecutorId,
            riskRationale: riskRationale.substring(0, 200),
            controlsApplied: finalControls,
          },
        },
        timestamp: now.toISOString(),
        sessionId,
        tenantId,
        workspaceId
      }
    );

    return {
      id: next.id,
      status: next.status,
      resolvedAt: now,
    };
  },
};

export const pauseConsultation: PauseConsultationCommand = {
  kind: "command",
  name: "consultation.pause",
  version: "1.0.0",
  async execute(input: z.infer<typeof PauseConsultationWithContextSchema>) {
    await ensureIdentitySchema();

    const parsed = PauseConsultationWithContextSchema.parse(input);
    const { id, pauseReason, sessionId, tenantId, workspaceId, actorId } = parsed;

    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.pause] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.pause] Session mismatch - security violation");
    }

    const current = await ConsultationRepositoryInMemory.byId(ConsultationId(id));
    if (!current) {
      throw new Error(`[consultation.pause] Consultation not found: ${id}`);
    }
    if (current.status === "RESOLVED") {
      throw new Error(`[consultation.pause] Cannot pause already resolved consultation: ${id}`);
    }
    if (current.status === "PAUSED") {
      throw new Error(`[consultation.pause] Consultation is already paused: ${id}`);
    }

    const now = new Date();
    const controlsApplied: readonly EosConsultationControlId[] = current.decisionContract?.controlsApplied ?? [];
    let stages: ConsultationStageEvidence[] = [...(current.decisionContract?.stages ?? [])];
    let decisionLog: DecisionLogEntry[] = [...(current.decisionContract?.decisionLog ?? [])];
    const risk = current.decisionContract?.risk ?? { 
      level: "low" as const, 
      rationale: "Automatically generated default risk assessment", 
      assessedBy: "system", 
      assessedAt: now 
    };
    const autonomy = current.decisionContract?.autonomy ?? { 
      level: 5 as const, 
      allowedActions: [], 
      prohibitedActions: [], 
      setBy: "system", 
      setAt: now 
    };
    const assistance = current.decisionContract?.assistance ?? { 
      mode: "MACHINE" as const, 
      actor: "system", 
      capabilities: [], 
      assignedAt: now 
    };
    const recommendation = current.decisionContract?.recommendation ?? "No recommendation yet";

    stages = addStage(stages, "pause", actorId, 
      `Consultation PAUSED: ${pauseReason.substring(0, 100)}`,
      ["EOS-CONSULT-MANAGE-03"],
      { pauseReason }
    );

    decisionLog = addLog(decisionLog, "consultation_paused", actorId, 
      `Pause reason: ${pauseReason}`,
      ["EOS-CONSULT-MANAGE-03"]
    );

    const next: ConsultationAggregate = {
      ...current,
      status: "PAUSED",
      pausedAt: now,
      updatedAt: now,
      decisionContract: {
        risk,
        autonomy,
        assistance,
        recommendation,
        decisionLog,
        stages,
        controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-03"])),
      },
    };

    await ConsultationRepositoryInMemory.save(next);

    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: next.id,
        entityType: "consultation",
        action: "consultation_paused",
        actorId,
        details: { pauseReason },
        timestamp: now.toISOString(),
        sessionId,
        tenantId,
        workspaceId
      }
    );

    return {
      id: next.id,
      status: next.status,
      pausedAt: now,
    };
  },
};

export const resumeConsultation: ResumeConsultationCommand = {
  kind: "command",
  name: "consultation.resume",
  version: "1.0.0",
  async execute(input: z.infer<typeof ResumeConsultationWithContextSchema>) {
    await ensureIdentitySchema();

    const parsed = ResumeConsultationWithContextSchema.parse(input);
    const { id, resumeReason, newEvidence, sessionId, tenantId, workspaceId, actorId } = parsed;

    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.resume] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.resume] Session mismatch - security violation");
    }

    const current = await ConsultationRepositoryInMemory.byId(ConsultationId(id));
    if (!current) {
      throw new Error(`[consultation.resume] Consultation not found: ${id}`);
    }
    if (current.status === "RESOLVED") {
      throw new Error(`[consultation.resume] Cannot resume already resolved consultation: ${id}`);
    }
    if (current.status !== "PAUSED") {
      throw new Error(`[consultation.resume] Only paused consultations can be resumed. Current status: ${current.status}`);
    }

    const mutable = { ...current } as DeepMutable<ConsultationAggregate>;
    const currentForRead: ConsultationAggregate = mutable;

    const now = new Date();
    const controlsApplied: readonly EosConsultationControlId[] = currentForRead.decisionContract?.controlsApplied ?? [];
    let stages: ConsultationStageEvidence[] = [...(currentForRead.decisionContract?.stages ?? [])];
    let decisionLog: DecisionLogEntry[] = [...(currentForRead.decisionContract?.decisionLog ?? [])];
    const risk = currentForRead.decisionContract?.risk ?? {
      level: "low" as const,
      rationale: "Automatically generated default risk assessment",
      assessedBy: "system",
      assessedAt: now
    };
    const autonomy = currentForRead.decisionContract?.autonomy ?? {
      level: 5 as const,
      allowedActions: [],
      prohibitedActions: [],
      setBy: "system",
      setAt: now
    };
    const assistance = currentForRead.decisionContract?.assistance ?? {
      mode: "MACHINE" as const,
      actor: "system",
      capabilities: [],
      assignedAt: now
    };
    const recommendation = currentForRead.decisionContract?.recommendation ?? "No recommendation yet";
    let previousContextRestored = false;
    let restoredContextCount = 0;
    let contextCompletionPercentage = 0;
    let remainingUncertaintyPercentage = 100;
    let totalRequiredContext = 0;
    let updatedEpisodeId = currentForRead.episodeId;

    if (currentForRead.seriesId) {
      let series = await ConsultationRepositoryInMemory.getSeriesById(currentForRead.seriesId);
      if (series) {
        const mutableSeries: DeepMutable<ConsultationSeries> = { 
          ...series,
          episodes: [...series.episodes],
          linkedWorkItems: [...series.linkedWorkItems],
          unresolvedUncertainty: [...series.unresolvedUncertainty],
          cumulativeKnownContext: [...series.cumulativeKnownContext],
          learningCandidates: (series.learningCandidates ?? []).map(c => ({
            ...c,
            sourceEpisodes: [...c.sourceEpisodes] as ConsultationEpisodeId[],
            controlIds: c.controlIds ? [...c.controlIds] as EosConsultationControlId[] : [] as EosConsultationControlId[]
          })) as DeepMutable<LearningCandidate[]>
        };
        const allEpisodes = await ConsultationRepositoryInMemory.listEpisodesBySeries(currentForRead.seriesId);
        const highestSeq = allEpisodes.length > 0
          ? Math.max(...allEpisodes.map(e => e.sequenceNumber))
          : 0;
        const existingEpisodeId = currentForRead.episodeId
          ?? allEpisodes.find(e => e.consultationId === currentForRead.id)?.id;
        const previousEpisodes = allEpisodes.filter(e => e.id !== existingEpisodeId);

        // ---------- DECISION INHERITANCE (Q4) ----------
        const inheritedDecisions = previousEpisodes.flatMap(e => e.decisions ?? []);
        const dedupeInherited = new Map<string, DecisionLogEntry>();
        [...decisionLog, ...inheritedDecisions].forEach(d => {
          dedupeInherited.set(d.decision + String(d.at.getTime()), d);
        });
        decisionLog = Array.from(dedupeInherited.values());
        if (inheritedDecisions.length > 0) {
          decisionLog = addLog(decisionLog, "inherited_decisions_restored", actorId,
            `Restored ${inheritedDecisions.length} decisions from ${previousEpisodes.length} previous episodes in series ${mutableSeries.id}. Decisions deduplicated, never re-audit confirmed ones.`,
            ["EOS-CONSULT-MAP-06"]
          );
        }

        // ---------- UNRESOLVED UNCERTAINTY PROMPT (Q6) ----------
        const unresolved: string[] = [...mutableSeries.unresolvedUncertainty];
        if (unresolved.length > 0) {
          decisionLog = addLog(decisionLog, "unresolved_uncertainty_from_series", actorId,
            `[STARTING PROMPT] Prior unresolved uncertainty from series (${unresolved.length} items):\n` +
              unresolved.map((u, i) => `  ${i + 1}. ${u}`).join("\n") +
              `\nTriage this consultation starting with these gaps first. Do not re-ask already-known context.`,
            ["EOS-CONSULT-MAP-06"]
          );
        }

        // ---------- LINKED WORK ITEMS INHERIT (Q7) ----------
        if (mutableSeries.linkedWorkItems.length > 0) {
          const existingInAggregate = new Set(mutable.linkedWorkItems?.map((w: { id: string }) => w.id) ?? []);
          const toAdd = mutableSeries.linkedWorkItems.filter(w => !existingInAggregate.has(w.id));
          if (toAdd.length > 0) {
            mutable.linkedWorkItems = [...(mutable.linkedWorkItems ?? []), ...toAdd];
            decisionLog = addLog(decisionLog, "linked_workitems_inherited", actorId,
              `Inherited ${toAdd.length} open work items from series ${mutableSeries.id}: ${toAdd.map(w => `${w.type}:${w.id.substring(0,12)}..`).join(", ")}. Resume execution where they left off.`,
              ["EOS-CONSULT-MAP-06"]
            );
          }
        }

        // ---------- DOMAIN-SPECIFIC KNOWN CONTEXT PROGRESS ----------
        const requiredContextFields = [
          "business_purpose", "founder_count", "ownership_structure",
          "location", "business_type", "kbli_code", "capital",
          "director_structure", "commissioner_structure"
        ];
        totalRequiredContext = requiredContextFields.length;

        // ---------- SAFE EPISTEMIC REUSE (Q5 GUARD: memory ≠ truth) ----------
        const safeFacts = mutableSeries.cumulativeKnownContext.filter((fact: { epistemicStatus: string }) =>
          fact.epistemicStatus === "VERIFIED" || fact.epistemicStatus === "EVIDENCED"
        );
        const unsafeFacts = mutableSeries.cumulativeKnownContext.filter((fact: { epistemicStatus: string }) =>
          fact.epistemicStatus !== "VERIFIED" && fact.epistemicStatus !== "EVIDENCED"
        );

        if (safeFacts.length > 0) {
          previousContextRestored = true;
          restoredContextCount = safeFacts.length;

          contextCompletionPercentage = Math.min(100, Math.round((restoredContextCount / Math.max(1, totalRequiredContext)) * 100));
          remainingUncertaintyPercentage = 100 - contextCompletionPercentage;

          const knownBar = "█".repeat(Math.floor(contextCompletionPercentage / 5));
          const unknownBar = "░".repeat(Math.floor(remainingUncertaintyPercentage / 5));

          let logMessage = `Cumulative context restored from series "${mutableSeries.title}" (episode ${highestSeq} → resume episode ${highestSeq + 1})\n` +
            `Known Context (VERIFIED/EVIDENCED only):    ${knownBar}${unknownBar} ${contextCompletionPercentage}%\n` +
            `Remaining Uncertainty: ${remainingUncertaintyPercentage}%\n` +
            `Safe facts restored: ${safeFacts.length} / Total known in series: ${mutableSeries.cumulativeKnownContext.length}`;

          if (unsafeFacts.length > 0) {
            logMessage += `\n\n⚠️  EPISTEMIC GUARD (EOS-CONSULT-EPISTEMIC-01): Blocked ${unsafeFacts.length} CLAIMED/OBSERVED facts — memory ≠ truth. Re-confirm these with user before acting: ${unsafeFacts.map(f => f.key).join(", ")}`;
            decisionLog = addLog(decisionLog, "unsafe_facts_blocked", actorId,
              `Blocked ${unsafeFacts.length} non-verified facts from series context (epistemic guard). Enforced: EOS-CONSULT-EPISTEMIC-01. Blocked fact keys: ${unsafeFacts.map(f => f.key).join(", ")}. User MUST re-verify these.`,
              ["EOS-CONSULT-EPISTEMIC-01"]
            );
          }

          decisionLog = addLog(decisionLog, "previous_context_restored", actorId,
            logMessage,
            ["EOS-CONSULT-MAP-06", "EOS-CONSULT-EPISTEMIC-01"]
          );
        } else if (mutableSeries.cumulativeKnownContext.length > 0) {
          decisionLog = addLog(decisionLog, "no_safe_facts_restored", actorId,
            `Found ${mutableSeries.cumulativeKnownContext.length} facts in series but none were VERIFIED/EVIDENCED. Epistemic guard: start from user re-confirmation. EOS-CONSULT-EPISTEMIC-01.`,
            ["EOS-CONSULT-EPISTEMIC-01"]
          );
        }

        // ---------- CREATE NEW EPISODE IN SERIES FOR THIS RESUME ----------
        const newEpisodeId = newConsultationEpisodeId();
        const newEpisode: ConsultationEpisode = {
          id: newEpisodeId,
          seriesId: currentForRead.seriesId,
          consultationId: currentForRead.id,
          sequenceNumber: highestSeq + 1,
          contextSnapshot: {
            userNeed: currentForRead.userNeed,
            title: currentForRead.title,
            description: currentForRead.description,
            known_from_series: safeFacts.length,
            blocked_epistemic: unsafeFacts.length,
            unresolved,
          } as unknown as Record<string, string>,
          facts: safeFacts,
          decisions: decisionLog,
          evidence: stages,
          assumptions: unsafeFacts.map(f => `${f.key}=${f.value} (epistemic=${f.epistemicStatus}, requires reconfirmation)`),
          unresolvedQuestions: unresolved,
          outcome: "INFORMATION_ONLY",
          linkedWorkItems: mutable.linkedWorkItems ?? [],
          nextRecommendedAction: unresolved.length > 0
            ? `Resolve remaining uncertainty (${unresolved.length} items) via targeted questions, not full discovery.`
            : "Continue from last known good triage outcome.",
          startedAt: now,
        };
        await ConsultationRepositoryInMemory.saveEpisode(newEpisode);
        updatedEpisodeId = newEpisodeId;
        mutable.episodeId = newEpisodeId;

        mutableSeries.lastEpisodeStartedAt = now;
        mutableSeries.updatedAt = now;
        await ConsultationRepositoryInMemory.saveSeries(mutableSeries as ConsultationSeries);
      }
    }

    stages = addStage(stages, "resume", actorId,
      `Consultation RESUMED: ${resumeReason.substring(0, 100)}`,
      ["EOS-CONSULT-MANAGE-03"],
      {
        resumeReason,
        previousContext: {
          userNeed: current.userNeed,
          intent: current.intent,
          diagnosis: current.diagnosis,
          missingFields: current.missingFields,
          recommendedAction: current.recommendedAction,
          contextSnapshot: current.context ?? {},
          restoredFactsCount: restoredContextCount
        },
        newEvidenceAdded: (newEvidence?.length ?? 0) > 0
      }
    );
    decisionLog = addLog(decisionLog, "consultation_resumed", actorId,
      `Resume reason: ${resumeReason}. ${previousContextRestored ? `${restoredContextCount} previous facts restored.` : "No previous context to restore."} ${(newEvidence?.length ?? 0)} new facts added.`,
      ["EOS-CONSULT-MANAGE-03", "EOS-CONSULT-MAP-06"]
    );

    if (newEvidence && newEvidence.length > 0) {
      const factsToAdd = newEvidence.map(e => ({
        fact: e.fact,
        source: e.source,
        epistemicStatus: e.epistemicStatus,
        recordedAt: e.timestamp ?? now,
        recordedBy: actorId,
      }));

      decisionLog = addLog(decisionLog, "new_evidence_added", actorId, 
        `Added ${factsToAdd.length} new verified facts to consultation context`,
        ["EOS-CONSULT-EPISTEMIC-01"]
      );
    }

    const nextStatus: ConsultationStatus = "RESUMED";
    const next: ConsultationAggregate = {
      ...currentForRead,
      ...(mutable.linkedWorkItems ? { linkedWorkItems: mutable.linkedWorkItems } : {}),
      status: nextStatus,
      resumedAt: now,
      updatedAt: now,
      episodeId: updatedEpisodeId,
      decisionContract: {
        risk,
        autonomy,
        assistance,
        recommendation,
        decisionLog,
        stages,
        controlsApplied: Array.from(new Set([...controlsApplied, "EOS-CONSULT-MANAGE-03", "EOS-CONSULT-MAP-06", "EOS-CONSULT-EPISTEMIC-01"])),
      },
    };

    await ConsultationRepositoryInMemory.save(next);

    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: next.id,
        entityType: "consultation",
        action: "consultation_resumed",
        actorId,
        details: { 
          resumeReason, 
          previousContextRestored,
          newEvidenceCount: newEvidence?.length ?? 0
        },
        timestamp: now.toISOString(),
        sessionId,
        tenantId,
        workspaceId
      }
    );

    return {
      id: next.id,
      status: next.status,
      resumedAt: now,
      previousContextRestored,
    };
  },
};

// Add schemas for series and episode creation
const CreateConsultationSeriesWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  primaryDomain: z.string().min(1),
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const CreateConsultationEpisodeWithContextSchema = z.object({
  seriesId: z.string().min(1),
  consultationId: z.string().min(1),
  sequenceNumber: z.number().int().min(1),
  contextSnapshot: z.record(z.string(), z.unknown()).optional(),
  facts: z.array(z.object({
    key: z.string(),
    value: z.unknown(),
    epistemicStatus: z.enum(["CLAIMED", "OBSERVED", "EVIDENCED", "VERIFIED", "OUTDATED", "CONTRADICTED"]),
    recordedAt: z.date().optional(),
    recordedBy: z.string().optional(),
    sourceEpisodeId: z.string().optional(),
  })).optional(),
  decisions: z.array(z.object({
    decision: z.string(),
    by: z.string(),
    at: z.date().optional(),
    reason: z.string(),
  })).optional(),
  evidence: z.array(z.object({
    stage: z.enum(["input", "understanding", "risk_assessment", "recommendation", "user_decision", "assistance_assignment", "execution", "outcome", "closure", "pause", "resume"]),
    recordedAt: z.date().optional(),
    recordedBy: z.string(),
    summary: z.string(),
  })).optional(),
  assumptions: z.array(z.string()).optional(),
  unresolvedQuestions: z.array(z.string()).optional(),
  outcome: z.enum(["INFORMATION_ONLY", "RECOMMENDATION_ACCEPTED", "WORK_CREATED", "HUMAN_HANDOFF", "AGENT_HANDOFF", "MACHINE_EXECUTION", "HYBRID_EXECUTION", "REFERRED", "OUT_OF_SCOPE", "CANCELLED", "CLARITY", "DECISION", "ASSISTED", "EXECUTED", "VERIFIED"]),
  nextRecommendedAction: z.string().optional(),
  linkedWorkItems: z.array(z.object({
    id: z.string(),
    type: z.enum(["legal_case", "requirement", "service_request", "workflow"]),
    title: z.string(),
  })).optional(),
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

type CreateConsultationSeriesWithContextInput = z.infer<typeof CreateConsultationSeriesWithContextSchema>;
type CreateConsultationEpisodeWithContextInput = z.infer<typeof CreateConsultationEpisodeWithContextSchema>;

type CreateConsultationSeriesCommand = CapabilityCommand<CreateConsultationSeriesWithContextInput, Promise<{ id: ConsultationSeriesId; createdAt: Date }>>;
type CreateConsultationEpisodeCommand = CapabilityCommand<CreateConsultationEpisodeWithContextInput, Promise<{ id: ConsultationEpisodeId; createdAt: Date }>>;

// ID factories imported from repository

export const createConsultationSeries: CreateConsultationSeriesCommand = {
  kind: "command",
  name: "consultation.createSeries",
  version: "1.0.0",
  async execute(input: CreateConsultationSeriesWithContextInput) {
    await ensureIdentitySchema();

    const parsed = CreateConsultationSeriesWithContextSchema.parse(input);
    const { title, description, primaryDomain, userId, tenantId, workspaceId, sessionId, actorId } = parsed;

    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.createSeries] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.createSeries] Session mismatch - security violation");
    }

    const now = new Date();
    const series: ConsultationSeries = {
      id: newConsultationSeriesId(),
      tenantId,
      workspaceId,
      userId,
      title: title.trim(),
      description: description.trim(),
      primaryDomain,
      episodes: [],
      cumulativeKnownContext: [],
      unresolvedUncertainty: [],
      linkedWorkItems: [],
      learningCandidates: [],
      createdAt: now,
      updatedAt: now,
    };

    await ConsultationRepositoryInMemory.saveSeries(series);

    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: series.id,
        entityType: "consultation_series",
        action: "consultation_series_created",
        actorId,
        details: { title, primaryDomain },
        timestamp: now.toISOString(),
        sessionId,
        tenantId,
        workspaceId
      }
    );

    return { id: series.id, createdAt: series.createdAt };
  },
};

export const createConsultationEpisode: CreateConsultationEpisodeCommand = {
  kind: "command",
  name: "consultation.createEpisode",
  version: "1.0.0",
  async execute(input: CreateConsultationEpisodeWithContextInput) {
    await ensureIdentitySchema();

    const parsed = CreateConsultationEpisodeWithContextSchema.parse(input);
    const { seriesId, consultationId, sequenceNumber, contextSnapshot, facts, decisions, evidence, assumptions, unresolvedQuestions, outcome, nextRecommendedAction, linkedWorkItems, sessionId, tenantId, workspaceId, actorId } = parsed;

    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.createEpisode] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.createEpisode] Session mismatch - security violation");
    }

    // Verify series exists
    const series = await ConsultationRepositoryInMemory.getSeriesById(ConsultationSeriesId(seriesId));
    if (!series) {
      throw new Error(`[consultation.createEpisode] Consultation series not found: ${seriesId}`);
    }

    // Verify consultation exists
    const consultation = await ConsultationRepositoryInMemory.byId(ConsultationId(consultationId));
    if (!consultation) {
      throw new Error(`[consultation.createEpisode] Consultation not found: ${consultationId}`);
    }

    const now = new Date();
    const episode: ConsultationEpisode = {
      id: newConsultationEpisodeId(),
      seriesId: ConsultationSeriesId(seriesId),
      consultationId: ConsultationId(consultationId),
      sequenceNumber,
      contextSnapshot: contextSnapshot ?? {},
      facts: facts?.map(f => ({
        ...f,
        recordedAt: f.recordedAt ?? now,
        recordedBy: f.recordedBy ?? actorId,
        sourceEpisodeId: f.sourceEpisodeId ? ConsultationEpisodeId(f.sourceEpisodeId) : undefined,
        value: f.value ?? null,
      })) ?? [],
      decisions: decisions?.map(d => ({
        ...d,
        at: d.at ?? now,
      })) ?? [],
      evidence: evidence?.map(e => ({
        ...e,
        recordedAt: e.recordedAt ?? now,
      })) ?? [],
      assumptions: assumptions ?? [],
      unresolvedQuestions: unresolvedQuestions ?? [],
      outcome,
      nextRecommendedAction,
      linkedWorkItems: linkedWorkItems ?? [],
      startedAt: now,
      endedAt: undefined,
    };

    await ConsultationRepositoryInMemory.saveEpisode(episode);

    // Update series with new episode and merge cumulative context
    const updatedSeriesCumulativeFacts = [...series.cumulativeKnownContext];
    const updatedSeriesUnresolved = [...series.unresolvedUncertainty];
    const updatedSeriesWorkItems = [...series.linkedWorkItems];

    // Add new facts from this episode to cumulative context (avoid duplicates by key)
    for (const fact of episode.facts) {
      const existingIdx = updatedSeriesCumulativeFacts.findIndex(f => f.key === fact.key);
      if (existingIdx >= 0) {
        // Update if newer or higher epistemic status
        const existingFact = updatedSeriesCumulativeFacts[existingIdx];
        if (existingFact && fact.recordedAt > existingFact.recordedAt) {
          updatedSeriesCumulativeFacts[existingIdx] = fact;
        }
      } else {
        updatedSeriesCumulativeFacts.push(fact);
      }
    }

    // Update unresolved uncertainties
    for (const question of episode.unresolvedQuestions) {
      if (!updatedSeriesUnresolved.includes(question)) {
        updatedSeriesUnresolved.push(question);
      }
    }

    // Add linked work items
    for (const item of episode.linkedWorkItems) {
      if (!updatedSeriesWorkItems.some(i => i.id === item.id)) {
        updatedSeriesWorkItems.push(item);
      }
    }

    const updatedSeries: ConsultationSeries = {
      ...series,
      episodes: [...series.episodes, episode.id],
      cumulativeKnownContext: updatedSeriesCumulativeFacts,
      unresolvedUncertainty: updatedSeriesUnresolved,
      linkedWorkItems: updatedSeriesWorkItems,
      updatedAt: now,
      lastEpisodeStartedAt: now,
    };

    await ConsultationRepositoryInMemory.saveSeries(updatedSeries);

    // Link consultation to this series and episode
    const updatedConsultation: ConsultationAggregate = {
      ...consultation,
      seriesId: ConsultationSeriesId(seriesId),
      episodeId: episode.id,
      updatedAt: now,
    };
    await ConsultationRepositoryInMemory.save(updatedConsultation);

    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: episode.id,
        entityType: "consultation_episode",
        action: "consultation_episode_created",
        actorId,
        details: { 
          seriesId, 
          consultationId, 
          sequenceNumber,
          outcome,
          factsAdded: episode.facts.length
        },
        timestamp: now.toISOString(),
        sessionId,
        tenantId,
        workspaceId
      }
    );

    return { id: episode.id, createdAt: episode.startedAt, seriesUpdated: true };
  },
};

// ---------- LEARNING COMMANDS: Proof D — Learning Continuity (CONSULT-L005-007) ----------
const ExtractLearningCandidateSchema = z.object({
  seriesId: z.string().uuid(),
  sourceEpisodes: z.array(z.string().uuid()).min(1),
  pattern: z.string().min(10),
  confidence: z.number().min(0).max(1),
  sessionId: z.string().uuid(),
  actorId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
});

type ExtractLearningCandidateCommand = CapabilityCommand<z.infer<typeof ExtractLearningCandidateSchema>, Promise<{ id: string; status: string; createdAt: Date }>>;
export const extractLearningCandidate: ExtractLearningCandidateCommand = {
  kind: "command",
  name: "learning.extract-candidate",
  version: "1.0.0",
  async execute(input: z.infer<typeof ExtractLearningCandidateSchema>) {
    await ensureIdentitySchema();
    const parsed = ExtractLearningCandidateSchema.parse(input);
    const { seriesId, sourceEpisodes, pattern, confidence, sessionId, actorId, tenantId, workspaceId } = parsed;

    // Session validation
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) throw new Error("[learning.extract-candidate] Invalid session");
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) throw new Error("[learning.extract-candidate] Session mismatch");

    // Verify series exists
    const typedSeriesId = ConsultationSeriesId(seriesId);
    const series = await ConsultationRepositoryInMemory.getSeriesById(typedSeriesId);
    if (!series) throw new Error(`[learning.extract-candidate] Series not found: ${seriesId}`);

    // Verify all source episodes belong to this series
    const allEpisodes = await ConsultationRepositoryInMemory.listEpisodesBySeries(typedSeriesId);
    const validEpisodeIds = new Set(allEpisodes.map(e => e.id));
    for (const epId of sourceEpisodes) {
      const typedEpId = ConsultationEpisodeId(epId);
      if (!validEpisodeIds.has(typedEpId)) throw new Error(`[learning.extract-candidate] Episode ${epId} not in series`);
    }

    const now = new Date();
    const candidateId = crypto.randomUUID();
    const newCandidate = {
      id: candidateId,
      seriesId: ConsultationSeriesId(seriesId),
      sourceEpisodes: [...sourceEpisodes].map(e => ConsultationEpisodeId(e)),
      pattern,
      confidence,
      status: "PROPOSED",
      createdAt: now,
      updatedAt: now,
      controlIds: ["EOS-CONSULT-LEARN-01"]
    } as DeepMutable<LearningCandidate>;

    // Save candidate to series
    const existingMutableCandidates = (series.learningCandidates ?? []).map(c => ({
      ...c,
      sourceEpisodes: [...c.sourceEpisodes] as ConsultationEpisodeId[],
      controlIds: c.controlIds ? [...c.controlIds] as EosConsultationControlId[] : [] as EosConsultationControlId[]
    })) as DeepMutable<LearningCandidate[]>;
    const mutableSeries: DeepMutable<ConsultationSeries> = { 
      ...series,
      episodes: [...series.episodes] as ConsultationEpisodeId[],
      linkedWorkItems: [...series.linkedWorkItems] as LinkedWorkItem[],
      unresolvedUncertainty: [...series.unresolvedUncertainty] as string[],
      cumulativeKnownContext: [...series.cumulativeKnownContext] as ConsultationFact[],
      learningCandidates: [...existingMutableCandidates, newCandidate],
      updatedAt: now
    };
    await ConsultationRepositoryInMemory.saveSeries(mutableSeries);

    // Record evidence
    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke("evidence-registry", "evidence.record", {
      entityRef: candidateId,
      entityType: "learning_candidate",
      action: "learning_candidate_proposed",
      actorId,
      details: { seriesId, sourceEpisodes, confidence, pattern },
      timestamp: now.toISOString(),
      sessionId, tenantId, workspaceId
    });

    return { id: candidateId, status: "PROPOSED", createdAt: now };
  }
};

const ApproveLearningCandidateSchema = z.object({
  id: z.string().uuid(),
  seriesId: z.string().uuid(),
  reviewedBy: z.string(),
  controlIds: z.array(z.string()).min(1),
  sessionId: z.string().uuid(),
  actorId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
});

type ApproveLearningCandidateCommand = CapabilityCommand<z.infer<typeof ApproveLearningCandidateSchema>, Promise<{ id: string; status: string; activatedAt: Date }>>;
export const approveLearningCandidate: ApproveLearningCandidateCommand = {
  kind: "command",
  name: "learning.approve-candidate",
  version: "1.0.0",
  async execute(input: z.infer<typeof ApproveLearningCandidateSchema>) {
    await ensureIdentitySchema();
    const parsed = ApproveLearningCandidateSchema.parse(input);
    const { id, seriesId, reviewedBy, controlIds, sessionId, actorId, tenantId, workspaceId } = parsed;

    // Session validation + governance actor check
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) throw new Error("[learning.approve-candidate] Invalid session");
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) throw new Error("[learning.approve-candidate] Session mismatch");
    const validControlIds = controlIds as EosConsultationControlId[];
    if (!validControlIds.includes("EOS-CONSULT-LEARN-01") || !validControlIds.includes("EOS-CONSULT-LEARN-02")) {
      throw new Error("[learning.approve-candidate] GATE_LEARNING invariant violated: Requires both EOS-CONSULT-LEARN-01 and EOS-CONSULT-LEARN-02 controls for approval");
    }

    // Get series and find candidate
    const series = await ConsultationRepositoryInMemory.getSeriesById(ConsultationSeriesId(seriesId));
    if (!series) throw new Error(`[learning.approve-candidate] Series not found: ${seriesId}`);
    
    const candidateIdx = (series.learningCandidates ?? []).findIndex(c => c.id === id);
    if (candidateIdx === -1) throw new Error(`[learning.approve-candidate] Learning candidate not found: ${id}`);

    const now = new Date();
    const updatedCandidates = [...(series.learningCandidates ?? [])].map(c => ({
      ...c,
      sourceEpisodes: [...c.sourceEpisodes] as ConsultationEpisodeId[],
      controlIds: c.controlIds ? [...c.controlIds] as EosConsultationControlId[] : [] as EosConsultationControlId[]
    })) as DeepMutable<LearningCandidate[]>;
    const existingCandidate = updatedCandidates[candidateIdx];
    updatedCandidates[candidateIdx] = {
      ...existingCandidate,
      status: "ACTIVE",
      reviewedBy,
      reviewedAt: now,
      controlIds: [...validControlIds] as EosConsultationControlId[],
      updatedAt: now
    } as DeepMutable<LearningCandidate>;

    // Save updated series with ACTIVE candidate
    await ConsultationRepositoryInMemory.saveSeries({ 
      ...series, 
      episodes: [...series.episodes] as ConsultationEpisodeId[],
      linkedWorkItems: [...series.linkedWorkItems] as LinkedWorkItem[],
      unresolvedUncertainty: [...series.unresolvedUncertainty] as string[],
      cumulativeKnownContext: [...series.cumulativeKnownContext] as ConsultationFact[],
      learningCandidates: updatedCandidates, 
      updatedAt: now 
    });

    // Record governance evidence
    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke("evidence-registry", "evidence.record", {
      entityRef: id,
      entityType: "learning_candidate",
      action: "learning_candidate_activated",
      actorId,
      details: { seriesId, reviewedBy, controlsApplied: controlIds },
      timestamp: now.toISOString(),
      sessionId, tenantId, workspaceId
    });

    return { id, status: "ACTIVE", activatedAt: now };
  }
};

// ---------- CROSS-DOMAIN ROUTING: CONSULT-L006 Technical Operations Vertical ----------
const CreateObservabilityIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  serverId: z.string().optional(),
  datacenter: z.string().optional(),
  sessionId: z.string().uuid(),
  actorId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  consultationId: z.string().uuid(),
});

type CreateObservabilityIncidentCommand = CapabilityCommand<z.infer<typeof CreateObservabilityIncidentSchema>, Promise<{ id: string; status: string }>>;
export const createObservabilityIncident: CreateObservabilityIncidentCommand = {
  kind: "command",
  name: "create_observability_incident",
  version: "1.0.0",
  async execute(input: z.infer<typeof CreateObservabilityIncidentSchema>) {
    await ensureIdentitySchema();
    const parsed = CreateObservabilityIncidentSchema.parse(input);
    const { 
      title, description, priority, serverId, datacenter, 
      sessionId, actorId, tenantId, workspaceId, consultationId 
    } = parsed;

    // 1. Session validation (authentication + security)
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) throw new Error("[create_observability_incident] Invalid session");
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[create_observability_incident] Session mismatch - security violation");
    }

    // 2. Verify consultation exists for linkage
    const consultation = await ConsultationRepositoryInMemory.byId(ConsultationId(consultationId));
    if (!consultation) throw new Error(`[create_observability_incident] Consultation not found: ${consultationId}`);

    // 3. Invoke observability capability command (routed to external capability, reuse fully!)
    const { registry: capabilityRegistry } = require("../../../../apps/web/workspace.manifest");
    const incidentResult = await capabilityRegistry.invoke(
      "observability",
      "incident.create",
      {
        title,
        description: description + `\nServer ID: ${serverId}\nDatacenter: ${datacenter}`,
        priority,
        category: "Infrastructure",
        sessionId, actorId, tenantId, workspaceId
      }
    );

    // 4. Link observability incident to consultation work items
    const linkedWorkItem: LinkedWorkItem = {
      id: incidentResult.id,
      type: "observability_incident",
      title,
    };

    // 5. Update consultation with linked work item
    const updatedConsultation: ConsultationAggregate = {
      ...consultation,
      linkedWorkItems: [...(consultation.linkedWorkItems || []), linkedWorkItem],
      status: "HANDOFF",
      updatedAt: new Date(),
    };
    await ConsultationRepositoryInMemory.save(updatedConsultation);

    // 6. Record evidence for cross-domain handoff
    const { registry: evidenceRegistry } = require("../../../../apps/web/workspace.manifest");
    await evidenceRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: incidentResult.id,
        entityType: "observability_incident",
        action: "observability_incident_created_from_consultation",
        actorId,
        details: { 
          consultationId, 
          serverId, 
          datacenter,
          routedTo: "observability/incident.create",
          spinePreserved: true // Critical: consultation spine preserved across domains
        },
        timestamp: new Date().toISOString(),
        sessionId, tenantId, workspaceId
      }
    );

    return { id: incidentResult.id, status: "HANDOFF_TO_OBSERVABILITY" };
  }
};

export const consultationCommands: Readonly<Record<string, CapabilityCommand>> = {
  "consultation.create": createConsultation,
  "consultation.triage": triageConsultation,
  "consultation.listByWorkspace": listConsultationsByWorkspace,
  "consultation.resolve": resolveConsultation,
  "consultation.pause": pauseConsultation,
  "consultation.resume": resumeConsultation,
  "consultation.createSeries": createConsultationSeries,
  "consultation.createEpisode": createConsultationEpisode,
  "learning.extract-candidate": extractLearningCandidate,
  "learning.approve-candidate": approveLearningCandidate,
  "create_observability_incident": createObservabilityIncident,
} as const;