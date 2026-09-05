import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work002Work: CanonicalWorkRecord = {
  workId: "cohort2-work-002",
  id: "cohort2-work-002",
  title: "Pendaftaran Hak Cipta Karya Seni Lukis + Pelatihan Digital Marketing",
  description: "COHORT 2 SCALING: Seniman lukis di Bandung membutuhkan pendaftaran hak cipta dan pelatihan digital marketing untuk menjual karya secara online. Cross-domain LawyersHub + ILC, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "medium",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T15:30:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-002-1725963000000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.seni.bandung.001 mengajukan permohonan hak cipta dan pelatihan digital marketing",
      source: "eos-execution-engine",
      uploadedBy: "client.seni.bandung.001",
      uploadedAt: new Date("2026-09-10T15:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.223344556677",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+education-certification",
  nextAction: { label: "Verifikasi permohonan dan assign lawyer + trainer", actionId: "action-verify-assign-cohort2-002" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "ipr-lawyer-service.002", name: "Pengacara Hak Cipta Kemenkumham", role: "Penyedia Layanan Hukum", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T20:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "ipr002@eos.id" },
    { id: "digital-marketing-trainer.002", name: "Trainer Digital Marketing ILC", role: "Penyedia Layanan Pelatihan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T20:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "dmt002@eos.id" },
    { id: "client.seni.bandung.001", name: "Seniman Lukis Profesional", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-bandung-002", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-portofolio-karya", title: "Portofolio Karya Seni", type: "creative-portfolio" },
    { id: "doc-rencana-online", title: "Rencana Penjualan Online", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi Vokasi" },
    { id: "ilc-bandung", name: "ILC Bandung", role: "Penyelenggara Pelatihan" }
  ],
  outcomeDescription: "Target: Hak cipta terdaftar + pelatihan selesai dalam 90 hari, untuk meningkatkan penjualan online 100% dan menjual 50 karya tambahan/tahun",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "90 hari",
    estimated_resolution_time: "75 hari",
    cross_domain: true,
    domains: ["legal-case", "education-case"],
    primitive_reuse_expected: 99.1,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-002-001",
    actor_id: "client.seni.bandung.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan hak cipta dan pelatihan digital marketing",
    content: "Assalamualaikum, saya ingin mendaftarkan hak cipta karya lukis saya dan mengikuti pelatihan digital marketing agar bisa menjual karya secara online. Mohon bantuannya.",
    timestamp: new Date("2026-09-10T15:00:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-002-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["ipr-lawyer-service.002"],
    title: "Tugas Baru: Pendaftaran Hak Cipta Karya Seni untuk Seniman Bandung",
    content: "Anda telah ditugaskan untuk menangani permohonan pendaftaran hak cipta karya seni lukis dari klien seni.bandung.001. Work ID: cohort2-work-002. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T20:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-002-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["digital-marketing-trainer.002"],
    title: "Tugas Baru: Pelatihan Digital Marketing untuk Seniman Lukis Bandung",
    content: "Anda telah ditugaskan untuk menangani permohonan pelatihan digital marketing dari klien seni.bandung.001. Work ID: cohort2-work-002. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T20:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;