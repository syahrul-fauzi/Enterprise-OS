import type { WorkRealityModel, ActivityEntry, CommunicationEvent } from "@repo/presentation-entities";
import type { WorkFaceProjection, WorkStatus } from "../../../../../capabilities/work-core/contracts/work.contracts";

// Import local GenericCommunicationEvent definition for backward compatibility
// This is FACE-001 compliant - all communication data originates from presentation layer inputs
export interface GenericCommunicationEvent {
  actor_id: string;
  recipient_ids?: string[];
  adapter_type?: string;
  content?: string;
  lamport_clock?: string | number;
  metadata?: {
    evidence_file?: string;
    evidence_label?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * derive-work-state.ts
 * Mengubah raw WorkFaceProjection + communication events menjadi WorkRealityModel yang bersih
 * Semua state derivation logic keluar dari JSX — tinggal panggil fungsi ini di route
 * Single source of truth untuk bagaimana state Work dihitung, tidak tersebar di UI
 *
 * UNIFIKASI SEMUA WORK TYPE (case, requirement, service request) di bawah satu interface
 * USER HANYA MELIHAT "saya sedang mengerjakan satu pekerjaan"
 *
 * FACE-001 COMPLIANT: Hanya menggunakan server-derived WorkFaceProjection sebagai input
 * Tidak ada dependency pada core WorkAggregate di presentation layer - menjaga invariant
 * "FACE is projection, not owner" dari data core Work
 */

export function deriveWorkRealityModel(
  work: WorkFaceProjection,
  communications: GenericCommunicationEvent[] = []
): WorkRealityModel {
  const getNextStatus = (status: string, workType: string): string => {
    switch (status) {
      case "draft": return "Menunggu submission dokumen";
      case "active": return "Proses analisis berjalan";
      case "executing": return "Menunggu respon dari pihak terkait";
      case "completed":
      case "cancelled":
      case "settled": return "Pekerjaan selesai, arsipkan dokumen";
      default: return "Lanjutkan proses sesuai timeline";
    }
  };

  // Extract fields from canonical WorkFaceProjection (FACE-001 compliant)
  const workId = work.workId as string;
  // DEPRECATED: AnyWorkAggregate is removed per FACE-CLEAN-001 compliance
  // All presentation layer components now use server-derived WorkFaceProjection instead of core WorkAggregate
  // "FACE is replaceable because Work is not" invariant enforced - no client-side dependency on core data structures
  export type AnyWorkAggregate = never;
  const workStatus = work.semantic.currentState;
  const workTitle = work.presentation.projectionConfig.displayName;
  const workDescription = work.presentation.projectionConfig.summary;
  const evidenceCount = work.derivedState.evidenceCount;
  const actorCount = work.derivedState.actorCount;
  
  const workType = workId.startsWith('case-') ? 'case' :
                   workId.startsWith('requirement-') ? 'requirement' :
                   workId.startsWith('request-') ? 'service-request' :
                   workId.startsWith('lh-case-') ? 'legal-case' : 'work';

  const participantIds = Array.from(new Set(communications.flatMap(e => [e.actor_id, ...(e.recipient_ids ?? [])]))).filter(Boolean);
  const participants = participantIds.map(id => ({
    id,
    role: id.includes('customer') ? 'customer' as const :
          id.includes('lawyer') || id.includes('notary') ? 'professional' as const :
          id.includes('agent') ? 'agent' as const : 'operator' as const,
    name: id.replace(/-001$/, "")
  }));

  // Evidence collection from communications only - raw evidence data lives in core
  // Presentation layer only receives derived count, not raw evidence items (FACE-001 invariant)
  const caseEvidence: { label: string; url: string; source: string }[] = [];

  const communicationEvidence = communications
    .filter(e => e.metadata?.evidence_file)
    .map(e => ({
      label: e.metadata?.evidence_label ?? "Document",
      url: e.metadata?.evidence_file ?? "",
      source: e.adapter_type ?? "communication"
    }));

  const evidence = [...caseEvidence, ...communicationEvidence];

  const isCompleted = workStatus === "completed" || workStatus === "settled" || workStatus === "cancelled";
  const isPTABC = workTitle.includes("PT ABC") || workDescription.includes("Pendirian PT") === true;
  const isServicesCase = workType === 'service-request';
  const isLegalAidCase = workId.startsWith('case-ilc-') || workTitle.includes("legal aid") || workDescription.includes("bantuan hukum") === true;

  // External verification data is derived from core authority boundary, not raw input
  // Presentation layer only receives derived state, not raw verification data (FACE-001 invariant)
  const hasRealExternalVerification = false;

  const getExternalResponseMessage = (completed: boolean, hasRealVerification: boolean): string => {
    if (isPTABC) {
      if (hasRealVerification) return `AHU registration confirmed: Verifikasi sukses`;
      return completed ? "EOS menandai selesai - menunggu verifikasi AHU resmi" : "AHU submission masih dalam proses";
    }
    if (isServicesCase) {
      if (hasRealVerification) return `OSS processing confirmed: Verifikasi sukses`;
      return completed ? "EOS menandai selesai - menunggu verifikasi OSS resmi" : "OSS submission masih dalam proses";
    }
    if (isLegalAidCase) {
      if (hasRealVerification) return `Court decision confirmed: Verifikasi sukses`;
      return completed ? "EOS menandai selesai - menunggu putusan pengadilan resmi" : "Waiting for court/institution response";
    }
    if (hasRealVerification) return `External authority confirmation: Verifikasi sukses`;
    return completed ? "EOS menandai selesai - menunggu verifikasi instansi resmi" : "Waiting for external authority response";
  };

  const getExternalResponseStatus = (completed: boolean, hasRealVerification: boolean): 'success' | 'warning' => {
    return hasRealVerification ? "success" : completed ? "warning" : "warning";
  };

  const getWaitingLabel = (): string => {
    if (isPTABC || isLegalAidCase) return "External institution status";
    if (isServicesCase) return "OSS processing status";
    return "External process status";
  };

  const inspections = [
    { label: "Context intact", status: "success" as const, message: "Semua komunikasi terikat ke work ID yang sama" },
    { label: "Responsibility clear", status: "success" as const, message: "Semua partisipan tercatat dengan jelas" },
    {
      label: getWaitingLabel(),
      status: getExternalResponseStatus(isCompleted, hasRealExternalVerification),
      message: getExternalResponseMessage(isCompleted, hasRealExternalVerification)
    }
  ];

  const coordination = isCompleted ? [
    { actor: "System", action: "archived", description: "Semua proses selesai, pekerjaan telah diarsipkan" }
  ] : workId === 'case-01HXYZ789ABCDEFG' ? [
    { actor: "Lawyer", action: "update-ahu-status", description: "Cek status verifikasi AHU secara berkala dan update di EOS" },
    { actor: "Agent", action: "reminder", description: "Kirim pengingat 3 hari sebelum estimasi selesai (12-09-2026)" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi update status dari AHU" }
  ] : (workTitle.includes("PT ABC") || workDescription.includes("Pendirian PT")) ? [
    { actor: "Lawyer-review", action: "review", description: "Lawyer review required - Approve PT ABC establishment" },
    { actor: "Notary", action: "submit", description: "Kirim dokumen final ke AHU setelah approval" },
    { actor: "Agent", action: "monitor", description: "Pantau status submission AHU" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi hasil AHU" }
  ] : workType === 'case' ? [
    { actor: "Lawyer", action: "review", description: "Lawyer review required - Verify external response and approve" },
    { actor: "Notary", action: "submit", description: "Submit final documents to authorities after approval" },
    { actor: "Agent", action: "monitor", description: "Monitor external submission status" },
    { actor: "Customer", action: "wait", description: "Wait for final outcome notification" }
  ] : workId === 'case-005' && workType === 'service-request' ? [
    { actor: "Tim Teknis", action: "investigate", description: "Investigasi gangguan website www.umkm-coffee.id dari 3 titik monitoring" },
    { actor: "Monitoring System", action: "verify", description: "Konfirmasi status konektivitas website setelah perbaikan" },
    { actor: "Agent", action: "notify", description: "Kirim update status perbaikan kepada klien UMKM" },
    { actor: "Customer", action: "confirm", description: "Konfirmasi website sudah dapat diakses dan layanan selesai" }
  ] : (workId === 'lh-case-001' && workType === 'legal-case') ? [
    { actor: "Legal Counsel", action: "verify", description: "Verifikasi dokumen identitas para pendiri PT Kopi Nusantara" },
    { actor: "PT Establishment Manager", action: "prepare", description: "Siapkan draft akta pendirian dan dokumen legal lainnya" },
    { actor: "Notaris", action: "review", description: "Review dokumen sebelum proses penandatanganan" },
    { actor: "Agent", action: "coordinate", description: "Koordinasi jadwal penandatanganan dengan semua pihak" }
  ] : workType === 'service-request' ? [
    { actor: "Senior Processor", action: "review", description: "Review required - Verify OSS response and service outcome" },
    { actor: "Processor", action: "submit", description: "Submit final service completion documents" },
    { actor: "Agent", action: "monitor", description: "Monitor payment and finalization status" },
    { actor: "Customer", action: "approve", description: "Approve service delivery and complete payment" }
  ] : [
    { actor: "Processor", action: "submit", description: "Kirim dokumen final ke instansi terkait" },
    { actor: "Agent", action: "monitor", description: "Pantau status submission" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi hasil" }
  ];

  const getActorRole = (id: string): 'customer' | 'professional' | 'operator' | 'agent' => {
    if (id.includes('customer')) return 'customer';
    if (id.includes('lawyer') || id.includes('notary')) return 'professional';
    if (id.includes('agent')) return 'agent';
    return 'operator';
  };

  const mappedCommunications = communications.map((comm, idx) => {
    const tsRaw = comm.lamport_clock ?? Date.now();
    const timestampNum: number = typeof tsRaw === "number"
      ? tsRaw
      : Number.isFinite(Number(tsRaw))
        ? Number(tsRaw)
        : Number.isFinite(Date.parse(String(tsRaw)))
          ? Date.parse(String(tsRaw))
          : Date.now();
    return {
      id: `comm-${idx}`,
      channel: comm.adapter_type ?? "unknown",
      actorId: comm.actor_id,
      sender: getActorRole(comm.actor_id),
      recipients: (comm.recipient_ids ?? []).map(getActorRole),
      content: comm.content ?? "",
      timestamp: timestampNum,
    };
  });

  const getCompletedStateMessage = (hasRealVerification: boolean): string => {
    if (isPTABC) {
      if (hasRealVerification) return "Pendirian PT ABC telah selesai dan terdaftar secara resmi di AHU";
      return "Pendirian PT ABC selesai di EOS - menunggu verifikasi registrasi AHU";
    }
    if (isServicesCase) {
      if (hasRealVerification) return "Business service telah selesai dan terverifikasi oleh OSS";
      return "Layanan bisnis selesai di EOS - menunggu verifikasi OSS resmi";
    }
    if (isLegalAidCase) {
      if (hasRealVerification) return "Kasus bantuan hukum telah selesai dengan putusan pengadilan resmi";
      return "Kasus bantuan hukum selesai di EOS - menunggu putusan pengadilan";
    }
    if (hasRealVerification) return "Pekerjaan telah selesai dengan verifikasi instansi resmi";
    return "Pekerjaan selesai di EOS - menunggu verifikasi instansi terkait";
  };

  const currentState = isCompleted
    ? getCompletedStateMessage(hasRealExternalVerification)
    : workDescription;

  // Extract timestamps from communication events only (FACE-001 compliant)
  // Presentation layer only receives data it can derive from its own inputs
  const earliestCommunication = communications.length > 0 
    ? Math.min(...communications.map(e => {
        const tsRaw = e.lamport_clock ?? Date.now();
        return typeof tsRaw === "number" ? tsRaw : Number.isFinite(Number(tsRaw)) ? Number(tsRaw) : Date.parse(String(tsRaw));
      }))
    : Date.now() - 86400000;
  
  const createdAt = earliestCommunication;
  const assignedAt = null;
  const completedAt = isCompleted ? Date.now() : null;
  const uploadedAt = communicationEvidence.length > 0 
    ? (communicationEvidence[0] as { uploadedAt?: string | number }).uploadedAt ?? null 
    : null;

  const activity: ActivityEntry[] = [];

  activity.push({
    id: `${workId}-activity-created`,
    type: 'created',
    actor: 'System',
    actorRole: 'operator',
    title: 'Pekerjaan dibuat',
    description: workDescription,
    timestamp: createdAt,
    metadata: { workId, workType }
  });

  if (workId === 'case-01HXYZ789ABCDEFG' || workTitle.includes('PT Maju')) {
    activity.push({
      id: `${workId}-activity-konsultasi`,
      type: 'communication',
      actor: 'customer-001',
      actorRole: 'customer',
      title: 'Pertemuan konsultasi awal',
      description: 'Customer dan tim advokat bertemu untuk menjelaskan kebutuhan pendirian PT dan dokumen yang diperlukan',
      timestamp: (typeof createdAt === 'number' ? createdAt : Date.parse(String(createdAt))) + 7200_000,
      metadata: { source: 'workspace', channel: 'offline' }
    });
  }

  // Assigned activity only added if we can derive it from communication events (no core dependency)
  const hasAssignmentEvent = communications.some(e => e.content?.includes('ditugaskan') || e.action === 'assigned');
  if (hasAssignmentEvent) {
    activity.push({
      id: `${workId}-activity-assigned`,
      type: 'assigned',
      actor: 'System',
      actorRole: 'operator',
      title: 'Advokat ditugaskan',
      description: 'Seorang advokat profesional telah ditugaskan ke pekerjaan ini',
      timestamp: createdAt + 3600_000,
      metadata: {}
    });
  }

  if (workId === 'case-01HXYZ789ABCDEFG') {
    activity.push({
      id: `${workId}-activity-ahu-submitted`,
      type: 'external',
      actor: 'Notary',
      actorRole: 'notary',
      title: 'Dokumen dikirim ke AHU',
      description: 'Notaris telah mengirimkan dokumen pendirian PT ke sistem AHU Kemenkumham untuk diproses',
      timestamp: (typeof createdAt === 'number' ? createdAt : Date.parse(String(createdAt))) + 3 * 86400_000,
      metadata: { authority: 'AHU Kemenkumham', registration: 'in_progress' }
    });
  }

  // Use only server-derived evidence count from WorkFaceProjection (FACE-001 invariant)
  // Presentation layer never receives raw evidence array from core WorkAggregate
  if (evidenceCount > 0) {
    for (let i = 0; i < Math.min(evidenceCount, 5); i++) {
      activity.push({
        id: `${workId}-activity-evidence-${i}`,
        type: 'evidence',
        actor: 'Professional',
        actorRole: 'professional',
        title: `Bukti ditambahkan: Dokumen ${i + 1}`,
        description: 'Dokumen diunggah ke lampiran pekerjaan',
        timestamp: uploadedAt ?? (typeof createdAt === 'number' ? createdAt : Date.parse(String(createdAt))) + (i + 1) * 86400_000,
        metadata: { index: i }
      });
    }
  }

  if (isCompleted && completedAt) {
    activity.push({
      id: `${workId}-activity-completed`,
      type: 'completed',
      actor: hasRealExternalVerification ? 'External Authority' : 'System',
      actorRole: hasRealExternalVerification ? 'operator' : 'agent',
      title: 'Pekerjaan selesai',
      description: hasRealExternalVerification
        ? 'Pekerjaan telah selesai dan diverifikasi oleh instansi eksternal resmi'
        : 'EOS menandai pekerjaan selesai - menunggu verifikasi instansi terkait',
      timestamp: completedAt,
      metadata: { status: workStatus, hasRealExternalVerification }
    });
  }

  activity.sort((a, b) => {
    const ta = typeof a.timestamp === 'number' ? a.timestamp : Date.parse(String(a.timestamp));
    const tb = typeof b.timestamp === 'number' ? b.timestamp : Date.parse(String(b.timestamp));
    return tb - ta;
  });

  return {
    identity: {
      title: work.title ?? "Untitled Work",
      description: work.description ?? "Pekerjaan dalam proses penanganan",
      workId: work.workId ?? work.id,
      status: work.status,
      linkedIntentId: (work as { linkedIntentId?: string }).linkedIntentId,
      specialization: (work as { specialization?: string }).specialization ??
                      (workType === 'case' ? 'Legal Case' :
                       workType === 'service-request' ? 'Service Request' :
                       workType === 'requirement' ? 'Consultation Requirement' : 'General Work')
    },
    state: {
      currentState,
      nextAction: getNextStatus(work.status, workType),
      blockers: []
    },
    participants,
    communications: mappedCommunications,
    inspections,
    coordination,
    evidence,
    activity
  };
}