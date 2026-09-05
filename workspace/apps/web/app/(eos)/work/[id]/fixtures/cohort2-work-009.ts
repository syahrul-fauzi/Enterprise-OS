import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work009Work: CanonicalWorkRecord = {
  workId: "cohort2-work-009",
  id: "cohort2-work-009",
  title: "Sertifikasi Produk Pertanian Organik + Ekspor ke Timur Tengah",
  description: "COHORT 2 SCALING: Petani sayur organik di Garut membutuhkan sertifikasi organic dan dokumen ekspor untuk mengirim produk ke Arab Saudi. Cross-domain Services.ID + agriculture, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T19:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-009-1725975600000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.pertanian.garut.001 mengajukan permohonan sertifikasi dan dokumen ekspor",
      source: "eos-execution-engine",
      uploadedBy: "client.pertanian.garut.001",
      uploadedAt: new Date("2026-09-10T19:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.990011223344",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "agriculture+export-certification",
  nextAction: { label: "Verifikasi permohonan dan assign agri expert + export specialist", actionId: "action-verify-assign-cohort2-009" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "organic-cert-specialist.009", name: "Spesialis Sertifikasi Organik BSI", role: "Penyedia Layanan Sertifikasi", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T23:45:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "organic009@eos.id" },
    { id: "export-consultant.009", name: "Spesialis Dokumen Ekspor ITC Jakarta", role: "Penyedia Layanan Ekspor", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T23:45:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "export009@eos.id" },
    { id: "client.pertanian.garut.001", name: "Ketua Kelompok Tani", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-garut-009", title: "KTP Ketua Kelompok", type: "identity" },
    { id: "doc-lahan-pertanian", title: "Sertifikat Hak Atas Lahan 5 Ha", type: "land-document" },
    { id: "doc-loi-ekspor", title: "Letter of Intent dari Importir Arab Saudi", type: "export-document" }
  ],
  linkedInstitutions: [
    { id: "bsi-ri", name: "Badan Sertifikasi Indonesia", role: "Regulator Sertifikasi Organic" },
    { id: "kemenlu-ri", name: "Kementerian Luar Negeri RI", role: "Institusi Ekspor" },
    { id: "itc-jakarta", name: "ITC Jakarta", role: "Dukungan Ekspor" }
  ],
  outcomeDescription: "Target: Sertifikasi organic tercapai + dokumen ekspor lengkap dalam 120 hari, untuk mengekspor 30 ton sayuran organik/tahun senilai USD 250ribu",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "120 hari",
    estimated_resolution_time: "100 hari",
    cross_domain: true,
    domains: ["services-case", "agriculture-case"],
    primitive_reuse_expected: 99.0,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-009-001",
    actor_id: "client.pertanian.garut.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan sertifikasi organic dan dokumen ekspor",
    content: "Assalamualaikum, kelompok tani kami ingin mengekspor sayur organik kami ke Arab Saudi dan membutuhkan sertifikasi serta semua dokumen ekspor yang diperlukan. Mohon bantuannya.",
    timestamp: new Date("2026-09-10T18:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-009-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["organic-cert-specialist.009"],
    title: "Tugas Baru: Sertifikasi Organik Kelompok Tani Garut",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi sayuran organik untuk kelompok tani klien pertanian.garut.001 yang harus diverifikasi oleh BSI Indonesia. Work ID: cohort2-work-009. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T23:45:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-009-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["export-consultant.009"],
    title: "Tugas Baru: Persiapan Ekspor ke Arab Saudi Garut",
    content: "Anda telah ditugaskan untuk menangani permohonan dokumen ekspor untuk kelompok tani klien pertanian.garut.001 yang ingin mengekspor 30 ton sayuran organik ke Arab Saudi. Work ID: cohort2-work-009. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T23:45:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;