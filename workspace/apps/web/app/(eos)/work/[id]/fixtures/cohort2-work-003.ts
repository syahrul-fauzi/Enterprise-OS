import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work003Work: CanonicalWorkRecord = {
  workId: "cohort2-work-003",
  id: "cohort2-work-003",
  title: "Izin Usaha Jasa Konstruksi + Sertifikasi ISO 9001",
  description: "COHORT 2 SCALING: Pemilik usaha konstruksi di Jakarta membutuhkan SIUJK dan sertifikasi ISO 9001 untuk mengikuti tender proyek pemerintah. Cross-domain Services.ID + legal, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "critical",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T16:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-003-1725964800000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.konstruksi.jkt.001 mengajukan permohonan SIUJK dan sertifikasi ISO 9001",
      source: "eos-execution-engine",
      uploadedBy: "client.konstruksi.jkt.001",
      uploadedAt: new Date("2026-09-10T16:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.334455667788",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+business-certification",
  nextAction: { label: "Verifikasi permohonan dan assign expert", actionId: "action-verify-assign-cohort2-003" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "construction-legal-specialist.003", name: "Spesialis Hukum Konstruksi KemenPUPR", role: "Penyedia Layanan Hukum", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T21:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "construction003@eos.id" },
     { id: "iso-certification-consultant.003", name: "Konsultan Sertifikasi ISO BSN", role: "Penyedia Layanan Sertifikasi", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T21:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "iso003@eos.id" },
    { id: "client.konstruksi.jkt.001", name: "Pemilik Usaha Konstruksi", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-jkt-003", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-akta-perusahaan", title: "Akta Pendirian Perusahaan", type: "legal-document" },
    { id: "doc-nib-perusahaan", title: "Nomor Induk Bisnis", type: "business-document" },
    { id: "doc-laporan-keuangan", title: "Laporan Keuangan 2 Tahun Terakhir", type: "financial-document" }
  ],
  linkedInstitutions: [
    { id: "kemenpupr", name: "Kementerian PUPR RI", role: "Regulator Konstruksi" },
    { id: "bsn-ri", name: "Badan Standardisasi Nasional", role: "Regulator Sertifikasi ISO" },
    { id: "oss-rfi", name: "OSS RBA", role: "Platform Bisnis Terintegrasi" }
  ],
  outcomeDescription: "Target: SIUJK terbit + ISO 9001 tercapai dalam 180 hari, untuk memenangkan tender proyek jalan tol senilai Rp50M",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "180 hari",
    estimated_resolution_time: "150 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 98.8,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-003-001",
    actor_id: "client.konstruksi.jkt.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan SIUJK dan sertifikasi ISO 9001",
    content: "Assalamualaikum, saya perlu mengurus SIUJK dan sertifikasi ISO 9001 untuk mengikuti tender proyek pemerintah yang deadline-nya dekat. Mohon bantuannya secepat mungkin.",
    timestamp: new Date("2026-09-10T15:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-003-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["construction-legal-specialist.003"],
    title: "Tugas Baru: Pengurusan SIUJK untuk Usaha Konstruksi Jakarta",
    content: "Anda telah ditugaskan untuk menangani permohonan pengurusan SIUJK (Izin Usaha Jasa Konstruksi) dari klien konstruksi.jkt.001. Work ID: cohort2-work-003. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T21:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-003-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["iso-certification-consultant.003"],
    title: "Tugas Baru: Sertifikasi ISO 9001 untuk Usaha Konstruksi Jakarta",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi ISO 9001 dari klien konstruksi.jkt.001. Work ID: cohort2-work-003. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T21:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;