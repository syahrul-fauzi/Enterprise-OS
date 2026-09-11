// Canonical server-side WorkRealityModel builder - aligns with EOS Presentation Architecture
// Runtime owns meaning: Only server may build WorkRealityModel from raw canonical work data
// Eliminates client-side reality reconstruction - presentation layer receives only canonical model
export interface CanonicalWorkRecord {
  workId: string;
  id: string;
  title: string;
  description: string;
  linkedIntentId?: string;
  domainType: string;
  specialization: string;
  status: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
  priority?: "low" | "medium" | "high" | "critical";
  lawyerId?: string;
  providerId?: string;
  platformSource?: string;
  platformMetadata?: Record<string, unknown>;
  hasBottleneck?: boolean;
  nextAction?: { label: string; actionId: string };
  evidence: Array<{ id?: string; type: string; title: string; content?: string; uploadedAt?: string; metadata?: Record<string, unknown> }>;
  participants?: Array<{ id: string; name: string; role: string; actorType: string; email?: string; notification_sent?: boolean; notification_timestamp?: string; reminder_sent?: boolean; reminder_timestamp?: string; acceptance_pending?: boolean }>;
  linkedInstitutions?: Array<{ id: string; name: string; role: string }>;
  attachedDocuments?: Array<{ id: string; title: string; type: string }>;
  outcomeDescription?: string;
  communications?: unknown[];
}
import type { WorkRealityModel } from "@repo/presentation-entities";

export interface SessionContext {
  actorId: string;
  actorLabel?: string;
  workspaceId: string;
  tenantId: string;
  sessionId?: string;
  userCapabilities?: string[]; // VF-02: Add user capabilities for unified navigation (matches WorkspaceSession)
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
                   work.domainType === 'service-request' ? 'service-request' :
                   workId.startsWith('lh-case-') ? 'legal-case' :
                   workId.startsWith('case-') ? 'case' :
                   workId.startsWith('requirement-') ? 'requirement' :
                   workId.startsWith('request-') ? 'service-request' : 'work';

  // Participant derivation - server-side only, includes canonical work participants
  const participantIds = Array.from(new Set(
    (communications as any[]).flatMap(e => [e.actor_id, ...(e.recipient_ids ?? [])])
  )).filter(Boolean);
  
  // Add participants from canonical work record (Wave 3 requirement: multiple actors linking)
  const canonicalParticipants = (work.participants ?? []).map(p => ({
    id: p.id,
    role: p.role.includes('Pemohon') ? 'customer' as const :
          p.role.includes('Legal') || p.role.includes('Notaris') ? 'professional' as const :
          p.actorType === 'agent' ? 'agent' as const : 'operator' as const,
    name: p.name
  }));
  
  // Merge communication participants with canonical work participants (avoid duplicates)
  // Matches WorkParticipant type from @repo/presentation-entities
  const mergedParticipants = [
    ...participantIds.map(id => ({
      id,
      role: id.includes('customer') ? 'customer' as const :
            id.includes('lawyer') || id.includes('notary') ? 'professional' as const :
            id.includes('agent') ? 'agent' as const : 'operator' as const,
      name: id.replace(/-001$/, "")
    })),
    ...canonicalParticipants.filter(p => !participantIds.includes(p.id))
  ];
  
  const participants = mergedParticipants;

  // Evidence normalization - server-side only (aligns with CanonicalWorkRecord evidence structure)
  const caseEvidence = (work.evidence ?? []).map(e => ({
    label: e.title ?? "Evidence",
    url: (e as any).url ?? "",
    source: (e as any).uploadedBy ?? "system"
  }));

  // Add attached documents from canonical work record (Wave 3 requirement: document attachment)
  const attachedDocuments = (work.attachedDocuments ?? []).map(d => ({
    label: d.title ?? "Dokumen Terlampir",
    url: `/documents/${d.id}`,
    source: "system"
  }));

  // Communication evidence extraction - server-side only
  const communicationEvidence = (communications as any[])
    .filter(e => e.metadata?.evidence_file)
    .map(e => ({
      label: e.metadata.evidence_label || "Dokumen Komunikasi",
      url: e.metadata.evidence_file,
      source: e.actor_id
    }));

  // Activity log creation - server-side only (matches ActivityEntry type from @repo/presentation-entities)
  const activity = (communications as any[]).map(e => ({
    id: e.id || `activity-${Date.now()}`,
    type: "communication" as const,
    actor: e.actor_id || "system",
    title: "Pesan terkirim",
    description: e.content || "",
    timestamp: e.createdAt || new Date().toISOString()
  }));

  // Add linked institutions from canonical work record to coordination section (Wave 3 requirement: institution linking)
  // Matches WorkCoordinationAction type from @repo/presentation-entities
  const linkedInstitutions = (work.linkedInstitutions ?? []).map(i => ({
    id: i.id,
    actor: i.id,
    title: "Institusi Terkait",
    description: `${i.name} terlibat dalam pekerjaan ini sebagai ${i.role}`,
    timestamp: work.createdAt || new Date().toISOString()
  }));

  // Fix coordination property type error - add 'action' field required by WorkCoordinationActionView
  const coordination = [...linkedInstitutions].map(i => ({
    ...i,
    action: "coordinate" as const
  }));

  // Normalize communications to ensure valid recipients array (prevents runtime errors in RealityCommunication)
  const normalizedCommunications = (communications as any[]).map(c => ({
    ...c,
    recipients: Array.isArray(c.recipients) ? c.recipients : 
                Array.isArray(c.recipient_ids) ? c.recipient_ids : 
                [] // Ensure empty array instead of undefined/null to prevent .includes() errors
  }));

  // Build and return canonical WorkRealityModel - single source of truth for presentation layer
  return {
    identity: {
      title: work.title || "Untitled Work",
      description: work.description || "website unreachable",
      workId: work.workId || work.id,
      status: work.status || "in_progress",
      linkedIntentId: work.linkedIntentId,
      specialization: work.specialization
    },
    state: {
      currentState: getNextStatus(work.status, workType),
      nextAction: work.nextAction?.label || "Lanjutkan proses",
      blockers: []
    },
    participants,
    communications: normalizedCommunications,
    inspections: [],
    coordination,
    evidence: [...caseEvidence, ...attachedDocuments, ...communicationEvidence],
    activity
  };
}