import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work006Work: CanonicalWorkRecord = {
  workId: "cohort2-work-006",
  id: "cohort2-work-006",
  title: "Izin Operasional Klinik Kecantikan + Sertifikasi Tenaga Medis",
  description: "COHORT 2 SCALING: Pemilik klinik kecantikan di Surabaya membutuhkan izin operasional dari Kemenkes dan sertifikasi tenaga medis. Cross-domain health + services.id, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T17:30:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-006-1725970200000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.klinik.sby.001 mengajukan permohonan izin operasional dan sertifikasi tenaga medis",
      source: "eos-execution-engine",
      uploadedBy: "client.klinik.sby.001",
      uploadedAt: new Date("2026-09-10T17:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.667788990011",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "health+business-certification",
  nextAction: { label: "Verifikasi permohonan dan assign health expert", actionId: "action-verify-assign-cohort2-006" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "health-operation-specialist.006", name: "Spesialis Izin Operasional Kemenkes", role: "Penyedia Layanan Kesehatan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T22:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "health006@eos.id" },
    { id: "medical-cert-specialist.006", name: "Spesialis Sertifikasi Tenaga Medis Konsilkedokteran", role: "Penyedia Layanan Sertifikasi", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T22:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "medical006@eos.id" },
    { id: "client.klinik.sby.001", name: "Dokter & Pemilik Klinik", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-sby-006", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-ijazah-dokter", title: "Ijazah Kedokteran & STR", type: "medical-document" },
    { id: "doc-lokasi-klinik", title: "Surat Keterangan Lokasi Klinik", type: "business-document" },
    { id: "doc-denah-klinik", title: "Denah Bangunan Klinik", type: "facility-document" }
  ],
  linkedInstitutions: [
    { id: "kemenkes-ri", name: "Kementerian Kesehatan RI", role: "Regulator Kesehatan" },
    { id: "dinkes-jatim", name: "Dinas Kesehatan Jawa Timur", role: "Regulator Kesehatan Daerah" },
    { id: "konsilkedokteran", name: "Konsil Kedokteran Indonesia", role: "Regulator Profesi Medis" }
  ],
  outcomeDescription: "Target: Izin operasional terbit + sertifikasi tenaga medis selesai dalam 180 hari, untuk mulai beroperasi dan melayani 50 pasien/bulan",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "180 hari",
    estimated_resolution_time: "150 hari",
    cross_domain: true,
    domains: ["health-case", "services-case"],
    primitive_reuse_expected: 98.9,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-006-001",
    actor_id: "client.klinik.sby.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan izin operasional klinik dan sertifikasi tenaga medis",
    content: "Assalamualaikum, saya ingin mengurus izin operasional untuk klinik kecantikan saya dan memastikan semua tenaga medis memiliki sertifikasi yang sesuai. Mohon bantuannya.",
    timestamp: new Date("2026-09-10T17:00:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-006-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["health-operation-specialist.006"],
    title: "Tugas Baru: Izin Operasional Klinik Kecantikan Surabaya",
    content: "Anda telah ditugaskan untuk menangani permohonan izin operasional klinik kecantikan dari klien klinik.sby.001 yang membutuhkan persetujuan Kemenkes dan Dinkes Jatim. Work ID: cohort2-work-006. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T22:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-006-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["medical-cert-specialist.006"],
    title: "Tugas Baru: Sertifikasi Tenaga Medis Klinik Surabaya",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi tenaga medis untuk klinik kecantikan klien klinik.sby.001 yang harus diverifikasi oleh Konsil Kedokteran Indonesia. Work ID: cohort2-work-006. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T22:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;