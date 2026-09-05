import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work010Work: CanonicalWorkRecord = {
  workId: "cohort2-work-010",
  id: "cohort2-work-010",
  title: "Pendirian PT Startup Teknologi + Sertifikasi PSE Kominfo",
  description: "COHORT 2 SCALING: Pendiri startup SaaS di Jakarta Selatan membutuhkan pendirian PT dan sertifikasi PSE dari Kominfo. Cross-domain LawyersHub + Services.ID, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T19:30:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-010-1725977400000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.startup.jaksel.001 mengajukan permohonan pendirian PT dan sertifikasi PSE",
      source: "eos-execution-engine",
      uploadedBy: "client.startup.jaksel.001",
      uploadedAt: new Date("2026-09-10T19:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.001122334455",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+tech-certification",
  nextAction: { label: "Verifikasi permohonan dan assign corporate lawyer + tech specialist", actionId: "action-verify-assign-cohort2-010" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "corporate-lawyer-service.010", name: "Advokat Khusus Pendirian Perusahaan", role: "Penyedia Layanan Hukum", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T19:45:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "corporate010@eos.id" },
    { id: "tech-certification-specialist.010", name: "Spesialis Sertifikasi Teknologi Kominfo", role: "Penyedia Layanan Teknis", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T19:45:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "tech010@eos.id" },
    { id: "client.startup.jaksel.001", name: "Founder & CEO Startup", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-jaksel-010", title: "KTP Semua Founder", type: "identity" },
    { id: "doc-idebisnis", title: "Dokumen Ide Bisnis SaaS", type: "business-plan" },
    { id: "doc-alamatkantor", title: "Bukti Sewa Kantor", type: "business-document" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "kominfo-ri", name: "Kementerian Kominfo RI", role: "Regulator Teknologi" },
    { id: "oss-rba", name: "OSS RBA", role: "Platform Bisnis Terintegrasi" }
  ],
  outcomeDescription: "Target: PT berdiri + PSE terbit dalam 120 hari, untuk meluncurkan SaaS dan mendapatkan 50 pelanggan pertama",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "120 hari",
    estimated_resolution_time: "100 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 99.1,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-010-001",
    actor_id: "client.startup.jaksel.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan pendirian PT dan sertifikasi PSE Kominfo",
    content: "Assalamualaikum, saya dan co-founder ingin mendirikan PT untuk startup SaaS kami dan membutuhkan sertifikasi PSE dari Kominfo agar bisa beroperasi secara legal. Mohon bantuannya prosesnya.",
    timestamp: new Date("2026-09-10T19:00:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-010-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["corporate-lawyer-service.010"],
    title: "Tugas Baru: Pendirian PT untuk Startup SaaS Jakarta Selatan",
    content: "Anda telah ditugaskan untuk menangani permohonan pendirian PT dari klien startup.jaksel.001. Work ID: cohort2-work-010. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T19:45:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-010-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["tech-certification-specialist.010"],
    title: "Tugas Baru: Sertifikasi PSE Kominfo untuk Startup SaaS",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi PSE Kominfo dari klien startup.jaksel.001. Work ID: cohort2-work-010. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T19:45:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;