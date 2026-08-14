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
import { initIdentitySchema, SessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";
import { SessionId } from "../../../identity/implementation/contracts/identity.contracts.js";

type GetConsultationQuery = CapabilityQuery<GetConsultationInput, GetConsultationOutput>;
type SearchConsultationsQuery = CapabilityQuery<SearchConsultationsInput, SearchConsultationsOutput>;
type GetConsultationSeriesQuery = CapabilityQuery<{ id: string; sessionId: string; tenantId: string; workspaceId: string; actorId: string }, ConsultationSeries | undefined>;
type ListConsultationSeriesQuery = CapabilityQuery<{ workspaceId: string; sessionId: string; tenantId: string; actorId: string }, readonly ConsultationSeries[]>;
type GetConsultationEpisodeQuery = CapabilityQuery<{ id: string; sessionId: string; tenantId: string; workspaceId: string; actorId: string }, ConsultationEpisode | undefined>;
type ListConsultationEpisodesQuery = CapabilityQuery<{ seriesId: string; sessionId: string; tenantId: string; workspaceId: string; actorId: string }, readonly ConsultationEpisode[]>;

export const getConsultation: GetConsultationQuery = {
  kind: "query",
  name: "consultation.get",
  version: "0.1.0",
  async execute(input) {
    await initIdentitySchema();
    const { id, sessionId, tenantId, workspaceId, actorId } = input;
    
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.get] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.get] Session mismatch - security violation");
    }

    return await ConsultationRepositoryInMemory.byId(ConsultationId(id));
  },
};

export const searchConsultations: SearchConsultationsQuery = {
  kind: "query",
  name: "consultation.search",
  version: "0.1.0",
  async execute(input) {
    await initIdentitySchema();
    const { sessionId, tenantId, workspaceId, actorId, query, status, priority, limit, offset } = input;
    
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.search] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.search] Session mismatch - security violation");
    }

    const allWorkspaceConsultations = await ConsultationRepositoryInMemory.listByWorkspace(workspaceId);
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
    const { id, sessionId, tenantId, workspaceId, actorId } = input;
    
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.getSeries] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.getSeries] Session mismatch - security violation");
    }

    return await ConsultationRepositoryInMemory.getSeriesById(ConsultationSeriesId(id));
  },
};

export const listConsultationSeriesByWorkspace: ListConsultationSeriesQuery = {
  kind: "query",
  name: "consultation.listSeries",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    const { workspaceId, sessionId, tenantId, actorId } = input;
    
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.listSeries] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.listSeries] Session mismatch - security violation");
    }

    return await ConsultationRepositoryInMemory.listSeriesByWorkspace(workspaceId);
  },
};

export const getConsultationEpisode: GetConsultationEpisodeQuery = {
  kind: "query",
  name: "consultation.getEpisode",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    const { id, sessionId, tenantId, workspaceId, actorId } = input;
    
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.getEpisode] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.getEpisode] Session mismatch - security violation");
    }

    return await ConsultationRepositoryInMemory.getEpisodeById(ConsultationEpisodeId(id));
  },
};

export const listConsultationEpisodesBySeries: ListConsultationEpisodesQuery = {
  kind: "query",
  name: "consultation.listEpisodes",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    const { seriesId, sessionId, tenantId, workspaceId, actorId } = input;
    
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    if (!session || session.revokedAt !== null) {
      throw new Error("[consultation.listEpisodes] Invalid or revoked session - authentication violation");
    }
    if (session.actorId !== actorId || session.tenantId !== tenantId || session.workspaceId !== workspaceId) {
      throw new Error("[consultation.listEpisodes] Session mismatch - security violation");
    }

    return await ConsultationRepositoryInMemory.listEpisodesBySeries(ConsultationSeriesId(seriesId));
  },
};