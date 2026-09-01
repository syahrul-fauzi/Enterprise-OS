// Canonical server-side WorkRealityModel builder - aligns with EOS Presentation Architecture
// Runtime owns meaning: Only server may build WorkRealityModel from raw canonical work data
// Eliminates client-side reality reconstruction - presentation layer receives only canonical model
import type { CanonicalWorkRecord } from "@/app/api/work/create/route";
import type { WorkRealityModel } from "@repo/presentation-entities";

export interface SessionContext {
  actorId: string;
  actorLabel?: string;
  workspaceId: string;
  tenantId: string;
}

/**
 * buildWorkRealityModel — SERVER-ONLY canonical model builder
 * Follows MyReality reference implementation pattern: single source of truth for WorkRealityModel creation
 * Runtime owns all semantic interpretation - client/experience layer never derives state
 */
export async function buildWorkRealityModel(
  work: CanonicalWorkRecord,
  communications: unknown[] = [],
  session: SessionContext
): Promise<WorkRealityModel> {
  // Semantic interpretation and state derivation happens EXCLUSIVELY on server
  const getNextStatus = (status: string, workType: string): string => {
    // ILC Community Discussion-specific statuses
    if (workType === 'community-discussion') {
      switch (status) {
        case "draft": return "Menunggu kontributor untuk memulai diskusi";
        case "open": return "Diskusi berjalan, bergabunglah untuk berbagi wawasan";
        case "in_progress": return "Diskusi aktif, menunggu kontribusi selanjutnya";
        case "resolved":
        case "closed": return "Diskusi telah selesai, bacaan tersedia untuk arsip";
        default: return "Lanjutkan kontribusi Anda dalam diskusi ini";
      }
    }
    // Services.ID Service Request-specific statuses
    if (workType === 'service-request') {
      switch (status) {
        case "draft": return "Permintaan layanan menunggu submission";
        case "open": return "Provider sedang meninjau permintaan Anda";
        case "in_progress": return "Layanan sedang dikerjakan oleh provider";
        case "resolved":
        case "closed": return "Layanan telah selesai, tinggalkan ulasan Anda";
        default: return "Lanjutkan proses permintaan layanan";
      }
    }
    // Default statuses for other work types
    switch (status) {
      case "draft": return "Menunggu submission dokumen";
      case "open": return "Proses analisis berjalan";
      case "in_progress": return "Menunggu respon dari pihak terkait";
      case "resolved":
      case "closed": return "Pekerjaan selesai, arsipkan dokumen";
      default: return "Lanjutkan proses sesuai timeline";
    }
  };

  const workId = work.id as string;
  const workType = work.domainType === 'community-discussion' ? 'community-discussion' :
                   workId.startsWith('case-') ? 'case' :
                   workId.startsWith('requirement-') ? 'requirement' :
                   workId.startsWith('request-') ? 'service-request' : 'work';

  // Participant derivation - server-side only
  const participantIds = Array.from(new Set(
    (communications as any[]).flatMap(e => [e.actor_id, ...(e.recipient_ids ?? [])])
  )).filter(Boolean);
  
  const participants = participantIds.map(id => ({
    id,
    role: id.includes('customer') ? 'customer' as const :
          id.includes('lawyer') || id.includes('notary') ? 'professional' as const :
          id.includes('agent') ? 'agent' as const : 'operator' as const,
    name: id.replace(/-001$/, "")
  }));

  // Evidence normalization - server-side only
  const caseEvidence = (work.evidence ?? []).map(e => ({
    label: e.title ?? "Evidence",
    url: e.url ?? "",
    source: e.uploadedBy ?? "system"
  }));

  // Communication evidence extraction - server-side only
  const communicationEvidence = (communications as any[])
    .filter(e => e.metadata?.evidence_file)
    .map(e => ({
      label: e.metadata.evidence_label || "Dokumen Komunikasi",
      url: e.metadata.evidence_file,
      source: e.actor_id
    }));

  // Activity log creation - server-side only
  const activity = (communications as any[]).map(e => ({
    id: e.id || `activity-${Date.now()}`,
    type: "communication",
    actor: { id: e.actor_id, name: e.actor_id.replace(/-001$/, "") },
    title: "Pesan terkirim",
    description: e.content || "",
    timestamp: e.createdAt || new Date().toISOString()
  }));

  // Build and return canonical WorkRealityModel - single source of truth for presentation layer
  return {
    identity: {
      title: work.title,
      description: work.description || "",
      workId: work.workId,
      status: work.status,
      linkedIntentId: work.linkedIntentId,
      specialization: work.specialization
    },
    state: {
      currentState: getNextStatus(work.status, workType),
      nextAction: work.nextAction?.label || "Lanjutkan proses",
      blockers: []
    },
    participants,
    communications: communications as any[],
    inspections: [],
    coordination: [],
    evidence: [...caseEvidence, ...communicationEvidence],
    activity
  };
}