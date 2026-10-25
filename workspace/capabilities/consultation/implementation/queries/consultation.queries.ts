import {
  ConsultationAggregate,
  ConsultationSeries,
  ConsultationEpisode,
  ConsultationId,
  ConsultationSeriesId,
  ConsultationEpisodeId,
  type GetConsultationInput,
  type GetConsultationOutput,
  type SearchConsultationsInput,
  type SearchConsultationsOutput,
} from "../contracts/consultation.contracts.js";
import type { CapabilityQuery } from "@repo/core-kernel";
import { ConsultationRepositoryInMemory } from "../repository/consultation.repository.js";
import { initIdentitySchema, SessionRepositoryInMemory, getSessionRepositoryPostgres, getWorkRepositoryPostgres } from "../../../work-core/index.js";
import { SessionId } from "../../../packages/contracts-core/src/identity.contracts.js";

type GetConsultationQuery = CapabilityQuery<GetConsultationInput, GetConsultationOutput>;
type SearchConsultationsQuery = CapabilityQuery<SearchConsultationsInput, SearchConsultationsOutput>;
type GetConsultationSeriesQuery = CapabilityQuery<{ id: string; sessionId: SessionId }, ConsultationSeries | undefined>;
type ListConsultationSeriesQuery = CapabilityQuery<{ sessionId: SessionId }, readonly ConsultationSeries[]>;
type GetConsultationEpisodeQuery = CapabilityQuery<{ id: string; sessionId: SessionId }, ConsultationEpisode | undefined>;
type ListConsultationEpisodesQuery = CapabilityQuery<{ seriesId: string; sessionId: SessionId }, readonly ConsultationEpisode[]>;

// CORE-001 Compliant: Import Work repository untuk verifikasi boundary metadata
const workRepository = getWorkRepositoryPostgres();

export const getConsultation: GetConsultationQuery = {
  kind: "query",
  name: "consultation.get",
  version: "0.1.0",
  async execute(input) {
    await initIdentitySchema();
    const { id, sessionId } = input;
    
    const sessionRepository = process.env.NODE_ENV === "production" && (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
      ? getSessionRepositoryPostgres()
      : SessionRepositoryInMemory;
    const session = await sessionRepository.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.get] Invalid or revoked session - authentication violation");
    }

    // CORE-001: Fetch consultation lalu verifikasi core Work exists dan boundary alignment
    const consultation = await ConsultationRepositoryInMemory.byId(ConsultationId(id));
    if (!consultation) {
      throw new Error("[consultation.get] Consultation not found");
    }
    
    // CORE-001: Semua boundary metadata hanya berasal dari core Work primitive
    if (consultation.workId) {
      const coreWork = await workRepository.byWorkId(consultation.workId);
      if (!coreWork) {
        throw new Error("[consultation.get] Core Work not found - cannot retrieve orphaned consultation");
      }
      // Authority boundary check: session's tenant/workspace harus match core Work's boundaries
      if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
        throw new Error("[consultation.get] Cross-tenant access blocked - authority boundary violation");
      }
    }

    return consultation;
  },
};

export const searchConsultations: SearchConsultationsQuery = {
  kind: "query",
  name: "consultation.search",
  version: "0.1.0",
  async execute(input) {
    await initIdentitySchema();
    const { sessionId, query, status, priority, limit, offset } = input;
    
    const sessionRepo = getSessionRepositoryPostgres();
    const session = await sessionRepo.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.search] Invalid or revoked session - authentication violation");
    }

    // CORE-001: Ambil semua consultation yang terikat ke Work dalam session's tenant/workspace
    const allConsultations = await ConsultationRepositoryInMemory.list();
    // Filter hanya consultation yang core Work-nya berada dalam session boundaries (bukan input-derived)
    const validConsultations = await Promise.all(
      allConsultations.filter(async (c) => {
        if (c.workId) {
          const coreWork = await workRepository.byWorkId(c.workId);
          return coreWork && coreWork.tenantId === session.tenantId && coreWork.workspaceId === session.workspaceId;
        }
        // Fallback untuk konsultasi lama tanpa workId (tetap validasi berdasarkan embedded metadata)
        return c.tenantId === session.tenantId && c.workspaceId === session.workspaceId;
      })
    ).then(results => results.filter(Boolean));
    
    let filtered: readonly ConsultationAggregate[] = validConsultations;
    const q = (query ?? "").trim().toLowerCase();
    let filtered: readonly ConsultationAggregate[] = allWorkspaceConsultations;
    if (status !== undefined && status !== "all") {
      filtered = filtered.filter((c) => c.status === status);
    }
    if (priority !== undefined && priority !== "all") {
      filtered = filtered.filter((c) => c.priority === priority);
    }
    if (q.length > 0) {
      filtered = filtered.filter((c) => {
        const hay = `${c.title}\n${c.description ?? ""}\n${c.userNeed}\n${c.id}\n${c.triageNotes ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const total = allWorkspaceConsultations.length;
    const matched = filtered.length;
    const finalLimit = Math.max(1, Math.min(500, limit ?? 50));
    const finalOffset = Math.max(0, offset ?? 0);
    const items = filtered.slice(finalOffset, finalOffset + finalLimit);
    return {
      items,
      total,
      matched,
      offset: finalOffset,
      limit: finalLimit,
    };
  },
};

export const getConsultationSeries: GetConsultationSeriesQuery = {
  kind: "query",
  name: "consultation.getSeries",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    const { id, sessionId } = input;
    
    const sessionRepo = getSessionRepositoryPostgres();
    const session = await sessionRepo.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.getSeries] Invalid or revoked session - authentication violation");
    }

    const series = await ConsultationRepositoryInMemory.getSeriesById(ConsultationSeriesId(id));
    if (!series) {
      throw new Error("[consultation.getSeries] Consultation series not found");
    }
    
    // CORE-001: Validasi boundary melalui core Work jika series terikat ke Work
    if (series.workId) {
      const coreWork = await workRepository.byWorkId(series.workId);
      if (!coreWork) {
        throw new Error("[consultation.getSeries] Core Work not found - cannot retrieve orphaned series");
      }
      if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
        throw new Error("[consultation.getSeries] Cross-tenant access blocked - authority boundary violation");
      }
    }

    return series;
  },
};

export const listConsultationSeriesByWorkspace: ListConsultationSeriesQuery = {
  kind: "query",
  name: "consultation.listSeries",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    const { sessionId } = input;
    
    const sessionRepo = getSessionRepositoryPostgres();
    const session = await sessionRepo.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.listSeries] Invalid or revoked session - authentication violation");
    }

    // CORE-001: Filter series berdasarkan core Work boundaries, bukan input workspaceId
    const allSeries = await ConsultationRepositoryInMemory.listSeriesByWorkspace(session.workspaceId);
    const validSeries = await Promise.all(
      allSeries.filter(async (s) => {
        if (s.workId) {
          const coreWork = await workRepository.byWorkId(s.workId);
          return coreWork && coreWork.tenantId === session.tenantId && coreWork.workspaceId === session.workspaceId;
        }
        return s.tenantId === session.tenantId && s.workspaceId === session.workspaceId;
      })
    ).then(results => results.filter(Boolean));

    return validSeries;
  },
};

export const getConsultationEpisode: GetConsultationEpisodeQuery = {
  kind: "query",
  name: "consultation.getEpisode",
  version: "1.0.0",
  async execute(input) {
    const { id, sessionId } = input;
    
    const sessionRepo = getSessionRepositoryPostgres();
    const session = await sessionRepo.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.getEpisode] Invalid or revoked session - authentication violation");
    }

    const episode = await ConsultationRepositoryInMemory.getEpisodeById(ConsultationEpisodeId(id));
    if (!episode) {
      throw new Error("[consultation.getEpisode] Consultation episode not found");
    }
    
    // CORE-001: Validasi boundary melalui core Work jika episode terikat ke Work
    if (episode.workId) {
      const coreWork = await workRepository.byWorkId(episode.workId);
      if (!coreWork) {
        throw new Error("[consultation.getEpisode] Core Work not found - cannot retrieve orphaned episode");
      }
      if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
        throw new Error("[consultation.getEpisode] Cross-tenant access blocked - authority boundary violation");
      }
    }

    return episode;
  },
};

export const listConsultationEpisodesBySeries: ListConsultationEpisodesQuery = {
  kind: "query",
  name: "consultation.listEpisodes",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    const { seriesId, sessionId } = input;
    
    const sessionRepo = getSessionRepositoryPostgres();
    const session = await sessionRepo.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.listEpisodes] Invalid or revoked session - authentication violation");
    }

    const allEpisodes = await ConsultationRepositoryInMemory.listEpisodesBySeries(ConsultationSeriesId(seriesId));
    const validEpisodes = await Promise.all(
      allEpisodes.filter(async (e) => {
        if (e.workId) {
          const coreWork = await workRepository.byWorkId(e.workId);
          return coreWork && coreWork.tenantId === session.tenantId && coreWork.workspaceId === session.workspaceId;
        }
        return e.tenantId === session.tenantId && e.workspaceId === session.workspaceId;
      })
    ).then(results => results.filter(Boolean));

    return validEpisodes;
  },
};