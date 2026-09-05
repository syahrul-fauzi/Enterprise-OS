import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work005Work: CanonicalWorkRecord = {
  workId: "cohort2-work-005",
  id: "cohort2-work-005",
  title: "Pelatihan Pengelolaan Keuangan UMKM + Sertifikasi Pajak E-Commerce",
  description: "COHORT 2 SCALING: Pemilik toko online di Semarang membutuhkan pelatihan keuangan dan sertifikasi pajak e-commerce untuk mengembangkan usaha. Cross-domain ILC + Services.ID, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "medium",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T17:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-005-1725968400000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.tokoonline.smg.001 mengajukan permohonan pelatihan keuangan dan sertifikasi pajak",
      source: "eos-execution-engine",
      uploadedBy: "client.tokoonline.smg.001",
      uploadedAt: new Date("2026-09-10T17:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.556677889900",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "education+tax-certification",
  nextAction: { label: "Verifikasi permohonan dan assign trainer + tax expert", actionId: "action-verify-assign-cohort2-005" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "financial-trainer.005", name: "Trainer Keuangan UMKM ILC Jawa Tengah", role: "Penyedia Layanan Pelatihan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T22:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "financial005@eos.id" },
    { id: "tax-compliance-specialist.005", name: "Spesialis Pajak E-Commerce Ditjen Pajak", role: "Penyedia Layanan Pajak", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T22:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "tax005@eos.id" },
    { id: "client.tokoonline.smg.001", name: "Pemilik Toko Online Shopee/Tokopedia", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-smg-005", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-nib-usaha", title: "Nomor Induk Bisnis", type: "business-document" },
    { id: "doc-laporan-penjualan", title: "Laporan Penjualan 6 Bulan Terakhir", type: "financial-document" }
  ],
  linkedInstitutions: [
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi Vokasi" },
    { id: "pajak-go-id", name: "Ditjen Pajak RI", role: "Regulator Perpajakan" },
    { id: "ilc-jateng", name: "ILC Jawa Tengah", role: "Penyelenggara Pelatihan" }
  ],
  outcomeDescription: "Target: Pelatihan selesai + sertifikasi pajak tercapai dalam 90 hari, untuk meningkatkan efisiensi keuangan 30% dan mengembangkan usaha ke marketplace internasional",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "90 hari",
    estimated_resolution_time: "75 hari",
    cross_domain: true,
    domains: ["education-case", "services-case"],
    primitive_reuse_expected: 99.3,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-005-001",
    actor_id: "client.tokoonline.smg.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan pelatihan keuangan dan sertifikasi pajak e-commerce",
    content: "Assalamualaikum, saya ingin mengikuti pelatihan pengelolaan keuangan dan mengurus sertifikasi pajak untuk toko online saya. Saat ini masih bingung mengelola laporan keuangan dan pajak untuk e-commerce.",
    timestamp: new Date("2026-09-10T16:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-005-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["financial-trainer.005"],
    title: "Tugas Baru: Pelatihan Keuangan UMKM Semarang",
    content: "Anda telah ditugaskan untuk menangani permohonan pelatihan pengelolaan keuangan UMKM dari klien tokoonline.smg.001. Work ID: cohort2-work-005. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T22:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-005-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["tax-compliance-specialist.005"],
    title: "Tugas Baru: Sertifikasi Pajak E-Commerce Toko Online",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi pajak e-commerce dari klien tokoonline.smg.001 yang ingin mengembangkan usaha ke marketplace internasional. Work ID: cohort2-work-005. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T22:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;