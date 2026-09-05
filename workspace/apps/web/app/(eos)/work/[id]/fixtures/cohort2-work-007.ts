import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work007Work: CanonicalWorkRecord = {
  workId: "cohort2-work-007",
  id: "cohort2-work-007",
  title: "Pendaftaran Hak Paten Teknologi Pengolahan Limbah + Izin Lingkungan",
  description: "COHORT 2 SCALING: Penemu teknologi pengolahan limbah di Malang membutuhkan hak paten dan izin lingkungan untuk komersialisasi. Cross-domain LawyersHub + Services.ID, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T18:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-007-1725972000000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.teknologi.mlg.001 mengajukan permohonan hak paten dan izin lingkungan",
      source: "eos-execution-engine",
      uploadedBy: "client.teknologi.mlg.001",
      uploadedAt: new Date("2026-09-10T18:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.778899001122",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+environment-certification",
  nextAction: { label: "Verifikasi permohonan dan assign patent lawyer + environment expert", actionId: "action-verify-assign-cohort2-007" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "patent-lawyer.007", name: "Spesialis Hak Paten Kemenkumham", role: "Penyedia Layanan Hukum", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T23:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "patent007@eos.id" },
    { id: "environment-permit-specialist.007", name: "Spesialis Izin Lingkungan KLHK", role: "Penyedia Layanan Lingkungan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T23:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "environment007@eos.id" },
    { id: "client.teknologi.mlg.001", name: "Penemu & Pemilik Startup", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-mlg-007", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-dokumen-teknologi", title: "Dokumen Lengkap Teknologi", type: "technical-document" },
    { id: "doc-lokasi-pabrik", title: "Lokasi Rencana Pabrik", type: "land-document" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator HAKI" },
    { id: "klhk-ri", name: "Kementerian LHK RI", role: "Regulator Lingkungan" },
    { id: "ppkjh", name: "PPKJH Malang", role: "Instansi Lingkungan Daerah" }
  ],
  outcomeDescription: "Target: Hak paten terdaftar + izin lingkungan terbit dalam 240 hari, untuk mengkomersilkan teknologi ke 10 pabrik di Jawa Timur",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "240 hari",
    estimated_resolution_time: "200 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 98.7,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-007-001",
    actor_id: "client.teknologi.mlg.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan hak paten dan izin lingkungan",
    content: "Assalamualaikum, saya ingin mendaftarkan hak paten untuk teknologi pengolahan limbah yang saya temukan dan mengurus izin lingkungan untuk pabrik rencana kami. Mohon bimbingannya.",
    timestamp: new Date("2026-09-10T17:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-007-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["patent-lawyer.007"],
    title: "Tugas Baru: Pendaftaran Hak Paten Teknologi Pengolahan Limbah Malang",
    content: "Anda telah ditugaskan untuk menangani permohonan hak paten teknologi pengolahan limbah dari klien teknologi.mlg.001 yang ingin mengkomersilkan inovasinya. Work ID: cohort2-work-007. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T23:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-007-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["environment-permit-specialist.007"],
    title: "Tugas Baru: Izin Lingkungan Pabrik Pengolahan Limbah Malang",
    content: "Anda telah ditugaskan untuk menangani permohonan izin lingkungan untuk pabrik pengolahan limbah klien teknologi.mlg.001 yang harus diverifikasi oleh KLHK dan PPKJH Malang. Work ID: cohort2-work-007. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T23:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;