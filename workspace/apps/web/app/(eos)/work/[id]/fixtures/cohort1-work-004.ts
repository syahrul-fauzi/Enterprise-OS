import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort1Work004Work: CanonicalWorkRecord = {
  workId: "cohort1-work-004",
  id: "cohort1-work-004",
  title: "Pendirian PT dan Sertifikasi K3 untuk Tambak Udang",
  description: "COHORT 1 SCALING: Pemilik tambak udang di Sumatra Utara membutuhkan pendirian PT (LawyersHub) dan sertifikasi K3 (Services.ID). Cross-domain, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort1-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T11:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort1-004-1725946800000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.tambak.sumut.001 mengajukan permohonan pendirian PT dan sertifikasi K3",
      source: "eos-execution-engine",
      uploadedBy: "client.tambak.sumut.001",
      uploadedAt: new Date("2026-09-10T11:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.665544332211",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+services-certification",
  nextAction: { label: "Verifikasi permohonan dan assign lawyer + expert K3", actionId: "action-verify-assign-cohort1-004" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "import-consultant.001", name: "Konsultan Impor/Ekspor", role: "Penyedia Layanan Sertifikasi", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T10:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "import001@eos.id" },
    { id: "client.tambak.sumut.001", name: "Pemilik Tambak Udang", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-sumut-004", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-rencana-ekspor-udang", title: "Rencana Ekspor Udang ke Singapura", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi K3" }
  ],
  outcomeDescription: "Target: Pendirian PT selesai + sertifikasi K3 tercapai dalam 120 hari, untuk mengikuti ekspor udang senilai Rp200jt",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "120 hari",
    estimated_resolution_time: "100 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 99.0,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_1"
  },
  communications: [{
    id: "comm-cohort1-004-001",
    actor_id: "client.tambak.sumut.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan pendirian PT dan sertifikasi K3",
    content: "Assalamualaikum, saya ingin mendirikan PT untuk tambak udang saya dan mengurus sertifikasi K3 untuk memenuhi standar ekspor. Mohon bantuannya.",
    timestamp: new Date("2026-09-10T10:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort1-004-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["import-consultant.001"],
    title: "Tugas Baru: Pendirian PT + Sertifikasi K3 untuk UMKM Sumatra Utara",
    content: "Anda telah ditugaskan untuk menangani permohonan pendirian PT dan sertifikasi K3 dari klien tambak.sumut.001. Work ID: cohort1-work-004. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T10:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;