import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort1Work005Work: CanonicalWorkRecord = {
  workId: "cohort1-work-005",
  id: "cohort1-work-005",
  title: "Pendaftaran Merek dan Pelatihan Produksi Kerajinan Tangan",
  description: "COHORT 1 SCALING: Pengrajin kerajinan tangan di Bali membutuhkan pendaftaran merek (LawyersHub) dan pelatihan produksi (ILC). Cross-domain, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "medium",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort1-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T12:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort1-005-1725950400000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.kerajinan.bali.001 mengajukan permohonan pendaftaran merek dan pelatihan produksi",
      source: "eos-execution-engine",
      uploadedBy: "client.kerajinan.bali.001",
      uploadedAt: new Date("2026-09-10T12:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.554433221100",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+education-certification",
  nextAction: { label: "Verifikasi permohonan dan assign lawyer + trainer", actionId: "action-verify-assign-cohort1-005" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "tax-specialist.001", name: "Spesialis Pajak UMKM", role: "Penyedia Layanan Pajak", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T12:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "tax001@eos.id" },
    { id: "client.kerajinan.bali.001", name: "Pengrajin Kerajinan Tangan", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-bali-005", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-rencana-ekspor-kerajinan", title: "Rencana Ekspor ke Jepang", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi Vokasi" },
    { id: "ilc-bali", name: "ILC Bali", role: "Penyelenggara Pelatihan" }
  ],
  outcomeDescription: "Target: Pendaftaran merek selesai + pelatihan produksi selesai dalam 90 hari, untuk meningkatkan produksi 50% dan ekspor ke Jepang",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "90 hari",
    estimated_resolution_time: "75 hari",
    cross_domain: true,
    domains: ["legal-case", "education-case"],
    primitive_reuse_expected: 99.0,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_1"
  },
  communications: [{
    id: "comm-cohort1-005-001",
    actor_id: "client.kerajinan.bali.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan pendaftaran merek dan pelatihan produksi",
    content: "Assalamualaikum, saya ingin mendaftarkan merek kerajinan tangan saya dan ikut pelatihan produksi untuk meningkatkan kualitas dan ekspor ke Jepang. Bisa dibantu?",
    timestamp: new Date("2026-09-10T11:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort1-005-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["tax-specialist.001"],
    title: "Tugas Baru: Pendaftaran Merek + Pelatihan Produksi untuk UMKM Bali",
    content: "Anda telah ditugaskan untuk menangani permohonan pendaftaran merek dan pelatihan produksi dari klien kerajinan.bali.001. Work ID: cohort1-work-005. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T12:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;