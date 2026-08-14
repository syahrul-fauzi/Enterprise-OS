import {
  ConsultationAggregate,
  ConsultationId,
  ConsultationSeries,
  ConsultationEpisode,
  ConsultationSeriesId,
  ConsultationEpisodeId,
  type ConsultationRepository,
  ConsultationStatus,
  ConsultationPriority,
  AssistanceMode,
} from "../contracts/consultation.contracts.js";

const seed = (): ConsultationAggregate[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const twoHoursAgo = new Date(now.getTime() - 1000 * 60 * 60 * 2);

  return [
    {
      id: ConsultationId("consultation-001"),
      tenantId: "tenant-seed-001",
      workspaceId: "workspace-seed-001",
      title: "PT Establishment Inquiry",
      description: "User wants to establish a new PT (Perseroan Terbatas) in Indonesia",
      userNeed: "Need help starting a new company",
      status: "AWAITING_DECISION",
      priority: "high",
      triageResult: "create_legal_case",
      linkedWorkItemId: "case-004",
      linkedWorkItemType: "legal_case",
      triageNotes: "PT establishment is a standard legal case, routed to legal-case capability",
      assistanceMode: "HYBRID",
      linkedWorkItems: [
        {
          id: "case-004",
          type: "legal_case",
          title: "Pendirian PT - dari Konsultasi #consu",
        },
      ],
      intent: "mendirikan bisnis formal",
      need: "legal entity establishment (PT/CV)",
      diagnosis: "Kebutuhan pendirian badan hukum terdeteksi, PT establishment service sesuai",
      missingFields: ["founder", "ownership", "businessType", "domicile", "kbli"],
      recommendedAction: "create_legal_case",
      createdAt: yesterday,
      openedAt: yesterday,
      understandingStartedAt: twoHoursAgo,
      understandingCompletedAt: twoHoursAgo,
      contextCompletedAt: twoHoursAgo,
      contextCompleteAt: twoHoursAgo,
      assessingStartedAt: twoHoursAgo,
      recommendingStartedAt: twoHoursAgo,
      recommendingCompletedAt: twoHoursAgo,
      awaitingDecisionAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    },
  ];
};

type ConsultationStore = Map<string, ConsultationAggregate>;
type SeriesStore = Map<string, ConsultationSeries>;
type EpisodeStore = Map<string, ConsultationEpisode>;

function hydrate(): { consultations: ConsultationStore; series: SeriesStore; episodes: EpisodeStore } {
  const consultations = new Map<string, ConsultationAggregate>();
  const series = new Map<string, ConsultationSeries>();
  const episodes = new Map<string, ConsultationEpisode>();
  
  for (const c of seed()) {
    consultations.set(c.id, c);
  }
  
  return { consultations, series, episodes };
}

const { consultations: CONSULTATION_STORE, series: SERIES_STORE, episodes: EPISODE_STORE } = hydrate();

export const newConsultationId = (): ConsultationId => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return ConsultationId(`consultation-${timestamp}-${random}`);
};

export const newConsultationSeriesId = (): ConsultationSeriesId => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return ConsultationSeriesId(`series-${timestamp}-${random}`);
};

export const newConsultationEpisodeId = (): ConsultationEpisodeId => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return ConsultationEpisodeId(`episode-${timestamp}-${random}`);
};

export const defaultConsultationStatus: ConsultationStatus = "OPEN";
export const defaultConsultationPriority: ConsultationPriority = "medium";

export function isValidStatusTransition(from: ConsultationStatus, to: ConsultationStatus): boolean {
  const exceptions: ConsultationStatus[] = [
    "WAITING_FOR_INFORMATION", "WAITING_FOR_HUMAN", "ESCALATED",
    "REFERRED", "BLOCKED", "OUT_OF_SCOPE", "CANCELLED", "RESOLVED", "PAUSED"
  ];
  if (to === "RESOLVED" && from !== "RESOLVED") return true;
  if (exceptions.includes(to) && from !== "RESOLVED") return true;
  if (exceptions.includes(from) && to === "UNDERSTANDING") return true;
  // Khusus untuk PAUSED → RESUMED: allowed
  if (from === "PAUSED" && to === "RESUMED") return true;
  // RESUMED bisa lanjut ke lifecycle normal
  if (from === "RESUMED") return true;

  const lifecycle: ConsultationStatus[] = [
    "OPEN",
    "UNDERSTANDING",
    "CONTEXT_COMPLETE",
    "ASSESSING",
    "RECOMMENDING",
    "AWAITING_DECISION",
    "HANDOFF",
    "EXECUTING",
    "RESOLVED"
  ];
  const fromIdx = lifecycle.indexOf(from);
  const toIdx = lifecycle.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx >= fromIdx;
}

// Extended repository interface to support series and episode operations
export interface ConsultationRepositoryExtended extends ConsultationRepository {
  getSeriesById(id: ConsultationSeriesId): Promise<ConsultationSeries | undefined>;
  listSeriesByWorkspace(workspaceId: string): Promise<readonly ConsultationSeries[]>;
  saveSeries(entity: ConsultationSeries): Promise<ConsultationSeries>;
  getEpisodeById(id: ConsultationEpisodeId): Promise<ConsultationEpisode | undefined>;
  listEpisodesBySeries(seriesId: ConsultationSeriesId): Promise<readonly ConsultationEpisode[]>;
  saveEpisode(entity: ConsultationEpisode): Promise<ConsultationEpisode>;
}

export const ConsultationRepositoryInMemory: ConsultationRepositoryExtended = {
  entityName: "Consultation",
  kind: "repository",
  async byId(id: ConsultationId): Promise<ConsultationAggregate | undefined> {
    return CONSULTATION_STORE.get(id);
  },
  async list(): Promise<readonly ConsultationAggregate[]> {
    return Array.from(CONSULTATION_STORE.values());
  },
  async listByTenant(tenantId: string): Promise<readonly ConsultationAggregate[]> {
    return Array.from(CONSULTATION_STORE.values()).filter(item => item.tenantId === tenantId);
  },
  async listByWorkspace(workspaceId: string): Promise<readonly ConsultationAggregate[]> {
    return Array.from(CONSULTATION_STORE.values()).filter(item => item.workspaceId === workspaceId);
  },
  async save(entity: ConsultationAggregate): Promise<ConsultationAggregate> {
    CONSULTATION_STORE.set(entity.id, entity);
    return entity;
  },
  async remove(id: ConsultationId): Promise<boolean> {
    return CONSULTATION_STORE.delete(id);
  },
  
  // Series management
  async getSeriesById(id: ConsultationSeriesId): Promise<ConsultationSeries | undefined> {
    return SERIES_STORE.get(id);
  },
  async listSeriesByWorkspace(workspaceId: string): Promise<readonly ConsultationSeries[]> {
    return Array.from(SERIES_STORE.values()).filter(item => item.workspaceId === workspaceId);
  },
  async saveSeries(entity: ConsultationSeries): Promise<ConsultationSeries> {
    SERIES_STORE.set(entity.id, entity);
    return entity;
  },
  
  // Episode management
  async getEpisodeById(id: ConsultationEpisodeId): Promise<ConsultationEpisode | undefined> {
    return EPISODE_STORE.get(id);
  },
  async listEpisodesBySeries(seriesId: ConsultationSeriesId): Promise<readonly ConsultationEpisode[]> {
    return Array.from(EPISODE_STORE.values()).filter(item => item.seriesId === seriesId);
  },
  async saveEpisode(entity: ConsultationEpisode): Promise<ConsultationEpisode> {
    EPISODE_STORE.set(entity.id, entity);
    return entity;
  },
};