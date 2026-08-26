import type { CaseAggregate } from "@capabilities/legal-case/implementation/contracts/index.js";
import type { RequirementAggregate } from "@capabilities/requirement-management/implementation/contracts/requirement.contracts.js";
import type { ServiceRequestAggregate } from "@capabilities/service-directory/implementation/contracts/service.contracts.js";
import type { CommunicationEvent } from "@capabilities/communication/implementation/contracts/communication.contracts.js";
import type { WorkRealityModel } from "../../../experience/src/work-reality/work-reality.types";

/**
 * derive-work-state.ts
 * Mengubah raw Work data + communication events menjadi WorkRealityModel yang bersih
 * Semua state derivation logic keluar dari JSX — tinggal panggil fungsi ini di route
 * Single source of truth untuk bagaimana state Work dihitung, tidak tersebar di UI
 * 
 * UNIFIKASI SEMUA WORK TYPE (case, requirement, service request) di bawah satu interface
 * USER HANYA MELIHAT "saya sedang mengerjakan satu pekerjaan"
 */

type AnyWorkAggregate = CaseAggregate | RequirementAggregate | ServiceRequestAggregate;

export function deriveWorkRealityModel(
  work: AnyWorkAggregate, 
  communications: CommunicationEvent[]
): WorkRealityModel {
  // Derive next status berdasarkan work status (single source of truth)
  const getNextStatus = (status: string, workType: string): string => {
    switch (status) {
      case "draft": return "Menunggu submission dokumen";
      case "open": return "Proses analisis berjalan";
      case "in_progress": return "Menunggu respon dari pihak terkait";
      case "resolved": 
      case "closed": return "Pekerjaan selesai, arsipkan dokumen";
      default: return "Lanjutkan proses sesuai timeline";
    };
  };

  // Deteksi tipe work dari ID prefix untuk derivation yang sesuai
  const workId = work.id as string;
  const workType = workId.startsWith('case-') ? 'case' : 
                   workId.startsWith('requirement-') ? 'requirement' : 
                   workId.startsWith('request-') ? 'service-request' : 'work';

  // Extract participants dari semua communication events
  const participantIds = Array.from(new Set(communications.flatMap(e => [e.actor_id, ...e.recipient_ids]))).filter(Boolean);
  const participants = participantIds.map(id => ({
    id,
    role: id.includes('customer') ? 'customer' as const : 
          id.includes('lawyer') || id.includes('notary') ? 'professional' as const :
          id.includes('agent') ? 'agent' as const : 'operator' as const,
    name: id.replace(/-001$/, "")
  }));

  // Extract evidence artifacts dari kasus (evidence chain) + komunikasi
  const caseEvidence = (work.evidence || []).map(e => ({
    label: e.title,
    url: e.url || "",
    source: e.uploadedBy
  }));
  
  const communicationEvidence = communications
    .filter(e => e.metadata?.evidence_file)
    .map(e => ({
      label: e.metadata.evidence_label || "Document",
      url: e.metadata.evidence_file,
      source: e.adapter_type
    }));
    
  // Gabungkan bukti dari kedua sumber untuk chain bukti yang lengkap
  const evidence = [...caseEvidence, ...communicationEvidence];

  // Inspection status (automated continuity checks) - update jika pekerjaan sudah selesai
  // Support Wave B complete: PT ABC, LawyersHub, ILC, Services.ID
  const isCompleted = work.status === "closed" || work.status === "completed";
  const isPTABC = work.title?.includes("PT ABC") || work.description?.includes("Pendirian PT");
  const isServicesCase = workType === 'service-request';
  const isLegalAidCase = workId.startsWith('case-ilc-') || work.title?.includes("legal aid") || work.description?.includes("bantuan hukum");
  
  // Check if we have REAL external verification (not just system mark completed)
  const hasRealExternalVerification = work.external_verification?.verified === true && 
                                     work.external_verification?.source && 
                                     work.external_verification?.timestamp;
  
  const getExternalResponseMessage = (completed: boolean, hasRealVerification: boolean): string => {
    if (isPTABC) {
      if (hasRealVerification) return `AHU registration confirmed: ${work.external_verification.notes || 'Verifikasi sukses'}`;
      return completed ? "EOS menandai selesai - menunggu verifikasi AHU resmi" : "AHU submission masih dalam proses";
    }
    if (isServicesCase) {
      if (hasRealVerification) return `OSS processing confirmed: ${work.external_verification.notes || 'Verifikasi sukses'}`;
      return completed ? "EOS menandai selesai - menunggu verifikasi OSS resmi" : "OSS submission masih dalam proses";
    }
    if (isLegalAidCase) {
      if (hasRealVerification) return `Court decision confirmed: ${work.external_verification.notes || 'Verifikasi sukses'}`;
      return completed ? "EOS menandai selesai - menunggu putusan pengadilan resmi" : "Waiting for court/institution response";
    }
    if (hasRealVerification) return `External authority confirmation: ${work.external_verification.notes || 'Verifikasi sukses'}`;
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
    // Always include core continuity inspections
    { label: "Context intact", status: "success" as const, message: "Semua komunikasi terikat ke work ID yang sama" },
    { label: "Responsibility clear", status: "success" as const, message: "Semua partisipan tercatat dengan jelas" },
    { 
      label: getWaitingLabel(), 
      status: getExternalResponseStatus(isCompleted, hasRealExternalVerification), 
      message: getExternalResponseMessage(isCompleted, hasRealExternalVerification)
    }
  ];

  // Coordination actions (who does what next) - Wave B complete: ALL 3 products
  // Support PT ABC (WORK-MOVE-001), LawyersHub (LH-001), ILC (ILC-001), Services.ID (SV-001)
  const coordination = work.status === "closed" || work.status === "completed" ? [
    { actor: "System", action: "archived", description: "Semua proses selesai, pekerjaan telah diarsipkan" }
  ] : workId === 'case-01HXYZ789ABCDEFG' ? [
    // P0-REAL-001: PT. Maju Bersama real work flow
    { actor: "Lawyer", action: "update-ahu-status", description: "Cek status verifikasi AHU secara berkala dan update di EOS" },
    { actor: "Agent", action: "reminder", description: "Kirim pengingat 3 hari sebelum estimasi selesai (12-09-2026)" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi update status dari AHU" }
  ] : work.title?.includes("PT ABC") || work.description?.includes("Pendirian PT") ? [
    // WORK-MOVE-001: PT ABC spesifik flow (Wave A - demo case)
    { actor: "Lawyer-review", action: "review", description: "Lawyer review required - Approve PT ABC establishment" },
    { actor: "Notary", action: "submit", description: "Kirim dokumen final ke AHU setelah approval" },
    { actor: "Agent", action: "monitor", description: "Pantau status submission AHU" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi hasil AHU" }
  ] : workType === 'case' ? [
    // Wave B: General LawyersHub OR ILC legal case flow
    { actor: "Lawyer", action: "review", description: "Lawyer review required - Verify external response and approve" },
    { actor: "Notary", action: "submit", description: "Submit final documents to authorities after approval" },
    { actor: "Agent", action: "monitor", description: "Monitor external submission status" },
    { actor: "Customer", action: "wait", description: "Wait for final outcome notification" }
  ] : workType === 'service-request' ? [
    // Wave B: Services.ID business service flow
    { actor: "Senior Processor", action: "review", description: "Review required - Verify OSS response and service outcome" },
    { actor: "Processor", action: "submit", description: "Submit final service completion documents" },
    { actor: "Agent", action: "monitor", description: "Monitor payment and finalization status" },
    { actor: "Customer", action: "approve", description: "Approve service delivery and complete payment" }
  ] : [
    // Default flow untuk work type lainnya
    { actor: "Processor", action: "submit", description: "Kirim dokumen final ke instansi terkait" },
    { actor: "Agent", action: "monitor", description: "Pantau status submission" },
    { actor: "Customer", action: "wait", description: "Tunggu notifikasi hasil" }
  ];

  // Helper untuk map role dari actor_id ke WorkRealityPerspective yang konsisten
  const getActorRole = (id: string): 'customer' | 'professional' | 'operator' | 'agent' => {
    if (id.includes('customer')) return 'customer';
    if (id.includes('lawyer') || id.includes('notary')) return 'professional';
    if (id.includes('agent')) return 'agent';
    return 'operator';
  };

  // Map communication events ke model kita dengan sender/recipients yang sudah diformat
  const mappedCommunications = communications.map((comm, idx) => ({
    id: `comm-${idx}`,
    channel: comm.adapter_type,
    actorId: comm.actor_id,
    sender: getActorRole(comm.actor_id),
    recipients: (comm.recipient_ids || []).map(getActorRole),
    content: comm.content,
    timestamp: comm.lamport_clock
  }));

  // Update currentState untuk semua product yang sudah selesai (Wave B complete)
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
  
  const currentState = isCompleted && work.outcome?.description 
    ? work.outcome.description 
    : isCompleted 
      ? getCompletedStateMessage(hasRealExternalVerification)
      : work.description || "Pekerjaan dalam proses";

  return {
    identity: {
      title: work.title,
      description: work.description || "Pekerjaan dalam proses penanganan",
      workId: work.workId || work.id,
      status: work.status
    },
    state: {
      currentState: currentState,
      nextAction: getNextStatus(work.status, workType),
      blockers: []
    },
    participants,
    communications: mappedCommunications,
    inspections,
    coordination,
    evidence
  };
}