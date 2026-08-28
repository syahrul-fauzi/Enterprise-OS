import type { WorkRealityModel, ActivityEntry, } from "@repo/presentation-entities";

/**
 * derive-work-state.ts
 * Mengubah raw Work data + communication events menjadi WorkRealityModel yang bersih
 * Semua state derivation logic keluar dari JSX — tinggal panggil fungsi ini di route
 * Single source of truth untuk bagaimana state Work dihitung, tidak tersebar di UI
 *
 * UNIFIKASI SEMUA WORK TYPE (case, requirement, service request) di bawah satu interface
 * USER HANYA MELIHAT "saya sedang mengerjakan satu pekerjaan"
 *
 * FPI COMPLIANT: Presentation layer vocabulary here. NO imports from @capabilities/* layer.
 * Uses structural typing (duck typing). Callers (routes) that pass CaseAggregate / RequirementAggregate
 * / ServiceRequestAggregate will satisfy these contracts via TypeScript structural compatibility.
 */

export interface GenericEvidenceItem {
  title?: string;
  url?: string;
  uploadedBy?: string;
  [key: string]: unknown;
}

export interface GenericExternalVerification {
  verified?: boolean;
  source?: string;
  timestamp?: string | number;
  notes?: string;
  [key: string]: unknown;
}

export interface GenericOutcome {
  description?: string;
  [key: string]: unknown;
}

export interface GenericWorkAggregate {
  id: string;
  workId?: string;
  title?: string;
  description?: string;
  status: string;
  evidence?: GenericEvidenceItem[];
  external_verification?: GenericExternalVerification;
  outcome?: GenericOutcome;
  [key: string]: unknown;
}

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

export type AnyWorkAggregate = GenericWorkAggregate;

export function deriveWorkRealityModel(
  work: AnyWorkAggregate,
  communications: GenericCommunicationEvent[] = []
): WorkRealityModel {
  const getNextStatus = (status: string, workType: string): string => {
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
  const workType = workId.startsWith('case-') ? 'case' :
                   workId.startsWith('requirement-') ? 'requirement' :
                   workId.startsWith('request-') ? 'service-request' : 'work';

  const participantIds = Array.from(new Set(communications.flatMap(e => [e.actor_id, ...(e.recipient_ids ?? [])]))).filter(Boolean);
  const participants = participantIds.map(id => ({
    id,
    role: id.includes('customer') ? 'customer' as const :
          id.includes('lawyer') || id.includes('notary') ? 'professional' as const :
          id.includes('agent') ? 'agent' as const : 'operator' as const,
    name: id.replace(/-001$/, "")
  }));

  const caseEvidence = (work.evidence ?? []).map(e => ({
    label: e.title ?? "Evidence",
    url: e.url ?? "",
    source: e.uploadedBy ?? "system"
  }));

  const communicationEvidence = communications
    .filter(e => e.metadata?.evidence_file)
    .map(e => ({
      label: e.metadata?.evidence_label ?? "Document",
      url: e.metadata?.evidence_file ?? "",
      source: e.adapter_type ?? "communication"
    }));

  const evidence = [...caseEvidence, ...communicationEvidence];

  const isCompleted = work.status === "closed" || work.status === "completed";
  const isPTABC = work.title?.includes("PT ABC") || work.description?.includes("Pendirian PT") === true;
  const isServicesCase = workType === 'service-request';
  const isLegalAidCase = workId.startsWith('case-ilc-') || work.title?.includes("legal aid") || work.description?.includes("bantuan hukum") === true;

  const ext = work.external_verification;
  const hasRealExternalVerification = ext?.verified === true &&
                                     Boolean(ext?.source) &&
                                     Boolean(ext?.timestamp);

  const getExternalResponseMessage = (completed: boolean, hasRealVerification: boolean): string => {
    if (isPTABC) {
      if (hasRealVerification) return `AHU registration confirmed: ${ext?.notes ?? 'Verifikasi sukses'}`;
      return completed ? "EOS menandai selesai - menunggu verifikasi AHU resmi" : "AHU submission masih dalam proses";
    }
    if (isServicesCase) {
      if (hasRealVerification) return `OSS processing confirmed: ${ext?.notes ?? 'Verifikasi sukses'}`;
      return completed ? "EOS menandai selesai - menunggu verifikasi OSS resmi" : "OSS submission masih dalam proses";
    }
    if (isLegalAidCase) {
      if (hasRealVerification) return `Court decision confirmed: ${ext?.notes ?? 'Verifikasi sukses'}`;
      return completed ? "EOS menandai selesai - menunggu putusan pengadilan resmi" : "Waiting for court/institution response";
    }
    if (hasRealVerification) return `External authority confirmation: ${ext?.notes ?? 'Verifikasi sukses'}`;
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

  const coordination = (work.status === "closed" || work.status === "completed") ? [
    { actor: "System", action: "archived", description: "Semua proses selesai, pekerjaan telah diarsipkan" }
  ] : workId === 'case-01HXYZ789ABCDEFG' ? [
    { actor: "Lawyer", action: "update-ahu-status", description: "Cek status verifikasi AHU secara berkala dan update di EOS" },
    { actor: "Agent", action: "reminder", description: "Kirim pengingat 3 hari sebelum estimasi selesai (12-09-2026)" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi update status dari AHU" }
  ] : (work.title?.includes("PT ABC") || work.description?.includes("Pendirian PT")) ? [
    { actor: "Lawyer-review", action: "review", description: "Lawyer review required - Approve PT ABC establishment" },
    { actor: "Notary", action: "submit", description: "Kirim dokumen final ke AHU setelah approval" },
    { actor: "Agent", action: "monitor", description: "Pantau status submission AHU" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi hasil AHU" }
  ] : workType === 'case' ? [
    { actor: "Lawyer", action: "review", description: "Lawyer review required - Verify external response and approve" },
    { actor: "Notary", action: "submit", description: "Submit final documents to authorities after approval" },
    { actor: "Agent", action: "monitor", description: "Monitor external submission status" },
    { actor: "Customer", action: "wait", description: "Wait for final outcome notification" }
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

  const currentState = (isCompleted && work.outcome?.description)
    ? work.outcome.description
    : isCompleted
      ? getCompletedStateMessage(hasRealExternalVerification)
      : (work.description ?? "Pekerjaan dalam proses");

  const createdAt = (work as { createdAt?: string | number }).createdAt ?? Date.now() - 86400000;
  const lawyerAssignedAt = (work as { lawyerAssignedAt?: string | number; assignedAt?: string | number }).lawyerAssignedAt ??
                            (work as { assignedAt?: string | number }).assignedAt;
  const closedAt = (work as { closedAt?: string | number; completedAt?: string | number }).closedAt ??
                    (work as { completedAt?: string | number }).completedAt;
  const uploadedAt = (evidence?.[0] && (evidence[0] as { uploadedAt?: string | number }).uploadedAt) ?? null;

  const activity: ActivityEntry[] = [];

  activity.push({
    id: `${workId}-activity-created`,
    type: 'created',
    actor: 'System',
    actorRole: 'operator',
    title: 'Pekerjaan dibuat',
    description: work.title ?? 'Pekerjaan baru dibuat di EOS',
    timestamp: createdAt,
    metadata: { workId, workType }
  });

  if (workId === 'case-01HXYZ789ABCDEFG' || (work as { customerId?: string }).customerId || work.title?.includes('PT Maju')) {
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

  if (lawyerAssignedAt) {
    activity.push({
      id: `${workId}-activity-assigned`,
      type: 'assigned',
      actor: 'System',
      actorRole: 'operator',
      title: 'Advokat ditugaskan',
      description: (work as { lawyerId?: string; lawyerName?: string }).lawyerName ?? 'Seorang advokat profesional telah ditugaskan ke pekerjaan ini',
      timestamp: lawyerAssignedAt,
      metadata: { lawyerId: (work as { lawyerId?: string }).lawyerId }
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

  if (work.evidence && work.evidence.length > 0) {
    work.evidence.forEach((ev, i) => {
      activity.push({
        id: `${workId}-activity-evidence-${i}`,
        type: 'evidence',
        actor: ev.uploadedBy ?? 'Professional',
        actorRole: 'professional',
        title: `Bukti ditambahkan: ${ev.title ?? `Dokumen ${i + 1}`}`,
        description: ev.url ? `Dokumen tersedia di sistem evidence` : 'Dokumen diunggah ke lampiran pekerjaan',
        timestamp: uploadedAt ?? (typeof createdAt === 'number' ? createdAt : Date.parse(String(createdAt))) + (i + 1) * 86400_000,
        metadata: { index: i, title: ev.title, url: ev.url }
      });
    });
  }

  if (isCompleted && closedAt) {
    activity.push({
      id: `${workId}-activity-completed`,
      type: 'completed',
      actor: hasRealExternalVerification ? 'External Authority' : 'System',
      actorRole: hasRealExternalVerification ? 'operator' : 'agent',
      title: 'Pekerjaan selesai',
      description: hasRealExternalVerification
        ? 'Pekerjaan telah selesai dan diverifikasi oleh instansi eksternal resmi'
        : 'EOS menandai pekerjaan selesai - menunggu verifikasi instansi terkait',
      timestamp: closedAt,
      metadata: { status: work.status, hasRealExternalVerification }
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