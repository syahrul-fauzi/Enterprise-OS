import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work004Work: CanonicalWorkRecord = {
  workId: "cohort2-work-004",
  id: "cohort2-work-004",
  title: "Pendaftaran Merek Dagang Produksi Kopi Spesialti + Sertifikasi Organic",
  description: "COHORT 2 SCALING: Petani kopi di Sumatera Utara membutuhkan pendaftaran merek dagang dan sertifikasi organic untuk ekspor ke Eropa. Cross-domain LawyersHub + Services.ID, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T16:30:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-004-1725966600000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.kopi.sumut.001 mengajukan permohonan merek dagang dan sertifikasi organic",
      source: "eos-execution-engine",
      uploadedBy: "client.kopi.sumut.001",
      uploadedAt: new Date("2026-09-10T16:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.445566778899",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+agri-certification",
  nextAction: { label: "Verifikasi permohonan dan assign expert", actionId: "action-verify-assign-cohort2-004" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "agri-ip-lawyer.004", name: "Spesialis Hukum Merek Pertanian Kemenkumham", role: "Penyedia Layanan Hukum", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T21:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "agri004@eos.id" },
    { id: "organic-cert-consultant.004", name: "Konsultan Sertifikasi Organic BSI", role: "Penyedia Layanan Sertifikasi", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T21:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "organic004@eos.id" },
    { id: "client.kopi.sumut.001", name: "Petani Kopi & Pemilik Usaha", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-sumut-004", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-lahan-kopi", title: "Sertifikat Hak Atas Lahan", type: "land-document" },
    { id: "doc-rencana-ekspor", title: "Rencana Ekspor ke Jerman dan Belanda", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "bsi-ri", name: "BSI (Badan Sertifikasi Indonesia)", role: "Regulator Sertifikasi Organic" },
    { id: "eubusiness", name: "EU Business Chamber", role: "Mitra Ekspor" }
  ],
  outcomeDescription: "Target: Merek dagang terdaftar + sertifikasi organic tercapai dalam 150 hari, untuk mengekspor 20 ton kopi spesialti/tahun senilai USD 300ribu",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "150 hari",
    estimated_resolution_time: "130 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 99.0,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-004-001",
    actor_id: "client.kopi.sumut.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan merek dagang dan sertifikasi organic",
    content: "Assalamualaikum, kami ingin mendaftarkan merek dagang kopi kami dan mendapatkan sertifikasi organic untuk ekspor ke Eropa. Mohon bantuannya untuk proses yang cepat dan benar.",
    timestamp: new Date("2026-09-10T16:00:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-004-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["agri-ip-lawyer.004"],
    title: "Tugas Baru: Pendaftaran Merek Dagang Kopi Sumatera Utara",
    content: "Anda telah ditugaskan untuk menangani permohonan pendaftaran merek dagang kopi spesialti dari klien kopi.sumut.001. Work ID: cohort2-work-004. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T21:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-004-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["organic-cert-consultant.004"],
    title: "Tugas Baru: Sertifikasi Organic Kopi untuk Ekspor Eropa",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi organic dari klien kopi.sumut.001 yang akan mengekspor ke Eropa. Work ID: cohort2-work-004. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T21:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;