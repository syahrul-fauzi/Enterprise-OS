import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort1Work003Work: CanonicalWorkRecord = {
  workId: "cohort1-work-003",
  id: "cohort1-work-003",
  title: "Sertifikasi ISO dan Legalitas Pabrik Minuman",
  description: "COHORT 1 SCALING: Pemilik pabrik minuman di Yogyakarta membutuhkan sertifikasi ISO (Services.ID) dan legalitas perusahaan (LawyersHub). Cross-domain penuh, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "critical",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort1-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T10:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort1-003-1725943200000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.minuman.jogja.001 mengajukan permohonan sertifikasi ISO dan legalitas pabrik",
      source: "eos-execution-engine",
      uploadedBy: "client.minuman.jogja.001",
      uploadedAt: new Date("2026-09-10T10:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.776655443322",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+services-certification",
  nextAction: { label: "Verifikasi permohonan dan assign expert ISO + lawyer", actionId: "action-verify-assign-cohort1-003" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "halal-certification-specialist.001", name: "Spesialis Sertifikasi ISO & Halal", role: "Penyedia Layanan Sertifikasi", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T10:15:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "halal001@eos.id" },
    { id: "client.minuman.jogja.001", name: "Pemilik Pabrik Minuman", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-jogja-003", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-rencana-pabrik", title: "Rencana Pengembangan Pabrik", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "bsn-ri", name: "Badan Standardisasi Nasional RI", role: "Regulator Sertifikasi ISO" }
  ],
  outcomeDescription: "Target: Legalitas perusahaan selesai + sertifikasi ISO tercapai dalam 180 hari, untuk mengikuti tender pabrik minuman nasional senilai Rp300jt",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "180 hari",
    estimated_resolution_time: "150 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 99.0,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_1"
  },
  communications: [{
    id: "comm-cohort1-003-001",
    actor_id: "client.minuman.jogja.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan sertifikasi ISO dan legalitas pabrik",
    content: "Assalamualaikum, saya ingin mengurus legalitas pabrik minuman dan sertifikasi ISO untuk memenuhi standar ekspor. Mohon bantuannya proses keduanya.",
    timestamp: new Date("2026-09-10T09:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort1-003-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["halal-certification-specialist.001"],
    title: "Tugas Baru: Sertifikasi ISO + Legalitas Pabrik untuk UMKM Yogyakarta",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi ISO dan legalitas perusahaan dari klien minuman.jogja.001. Work ID: cohort1-work-003. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T10:15:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;