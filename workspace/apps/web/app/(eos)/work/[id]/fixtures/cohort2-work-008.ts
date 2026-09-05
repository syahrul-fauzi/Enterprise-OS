import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work008Work: CanonicalWorkRecord = {
  workId: "cohort2-work-008",
  id: "cohort2-work-008",
  title: "Pelatihan Guru Online + Sertifikasi Pendidikan Digital",
  description: "COHORT 2 SCALING: Pengelola lembaga kursus online di Solo membutuhkan pelatihan untuk guru dan sertifikasi pendidikan digital. Cross-domain ILC + education, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "medium",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T18:30:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-008-1725973800000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.kursus.solo.001 mengajukan permohonan pelatihan guru dan sertifikasi pendidikan",
      source: "eos-execution-engine",
      uploadedBy: "client.kursus.solo.001",
      uploadedAt: new Date("2026-09-10T18:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.889900112233",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "education+training-certification",
  nextAction: { label: "Verifikasi permohonan dan assign trainer", actionId: "action-verify-assign-cohort2-008" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "education-trainer.008", name: "Spesialis Pelatihan Pendidikan Digital Kemdikbud", role: "Penyedia Layanan Pendidikan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T23:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "education008@eos.id" },
    { id: "training-cert-specialist.008", name: "Spesialis Sertifikasi Lembaga Pelatihan Kemnaker", role: "Penyedia Layanan Sertifikasi", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T23:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "training008@eos.id" },
    { id: "client.kursus.solo.001", name: "Pengelola Lembaga Kursus", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-solo-008", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-data-guru", title: "Data 15 Guru yang Akan Dilatih", type: "personnel-document" },
    { id: "doc-kurikulum", title: "Kurikulum Kursus Saat Ini", type: "curriculum-document" }
  ],
  linkedInstitutions: [
    { id: "kemdikbud-ri", name: "Kemdikbud RI", role: "Regulator Pendidikan" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi Vokasi" },
    { id: "ilc-jateng", name: "ILC Jawa Tengah", role: "Penyelenggara Pelatihan" }
  ],
  outcomeDescription: "Target: Pelatihan selesai + sertifikasi pendidikan digital tercapai dalam 90 hari, untuk meningkatkan jumlah siswa 40% dan membuka 2 cabang baru",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "90 hari",
    estimated_resolution_time: "75 hari",
    cross_domain: true,
    domains: ["education-case", "services-case"],
    primitive_reuse_expected: 99.2,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-008-001",
    actor_id: "client.kursus.solo.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan pelatihan guru dan sertifikasi pendidikan digital",
    content: "Assalamualaikum, kami ingin mengirimkan 15 guru kami untuk pelatihan pengajaran online dan mendapatkan sertifikasi pendidikan digital untuk lembaga kami. Mohon informasinya.",
    timestamp: new Date("2026-09-10T18:00:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-008-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["education-trainer.008"],
    title: "Tugas Baru: Pelatihan Guru Lembaga Kursus Online Solo",
    content: "Anda telah ditugaskan untuk menangani permohonan pelatihan 15 guru untuk lembaga kursus online klien kursus.solo.001 yang membutuhkan pelatihan pengajaran digital dari Kemdikbud. Work ID: cohort2-work-008. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T23:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-008-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["training-cert-specialist.008"],
    title: "Tugas Baru: Sertifikasi Lembaga Pelatihan Solo",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi pendidikan digital untuk lembaga kursus online klien kursus.solo.001 yang harus diverifikasi oleh Kemenaker RI. Work ID: cohort2-work-008. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T23:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;