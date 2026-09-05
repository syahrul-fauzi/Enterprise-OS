import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort2Work001Work: CanonicalWorkRecord = {
  workId: "cohort2-work-001",
  id: "cohort2-work-001",
  title: "Sertifikasi PIRT + Izin Edar Minuman Herbal",
 description: "COHORT 2 SCALING: Pemilik usaha minuman herbal di Yogyakarta membutuhkan sertifikasi PIRT dan izin edar dari BPOM. Cross-domain Services.ID + health, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort2-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T15:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort2-001-1725961200000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien.minuman.jogja.001 mengajukan permohonan sertifikasi PIRT dan izin edar BPOM",
      source: "eos-execution-engine",
      uploadedBy: "client.minuman.jogja.001",
      uploadedAt: new Date("2026-09-10T15:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.112233445566",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "health+food-certification",
  nextAction: { label: "Verifikasi permohonan dan assign expert", actionId: "action-verify-assign-cohort2-001" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "health-certification-specialist.001", name: "Spesialis Sertifikasi Kesehatan Dinkes", role: "Penyedia Layanan Kesehatan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T20:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "health001@eos.id" },
    { id: "food-safety-specialist.001", name: "Spesialis Keamanan Pangan BPOM", role: "Penyedia Layanan Pangan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T20:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "foodsafety001@eos.id" },
    { id: "client.minuman.jogja.001", name: "Pemilik UMKM Minuman Herbal", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-jogja-001", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-resep-produksi", title: "Resep dan Formulasi Produk", type: "product-data" },
    { id: "doc-lokasi-usaha", title: "Surat Keterangan Lokasi Usaha", type: "business-document" }
  ],
  linkedInstitutions: [
    { id: "bpom-ri", name: "BPOM RI", role: "Regulator Pangan" },
    { id: "dinkes-yogyakarta", name: "Dinas Kesehatan Yogyakarta", role: "Regulator Kesehatan" }
  ],
  outcomeDescription: "Target: Sertifikasi PIRT + Izin Edar selesai dalam 150 hari, untuk menjual produk ke 5 kota di Pulau Jawa dan meningkatkan omzet Rp200jt/tahun",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "150 hari",
    estimated_resolution_time: "120 hari",
    cross_domain: true,
    domains: ["services-case", "health-case"],
    primitive_reuse_expected: 99.2,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_2"
  },
  communications: [{
    id: "comm-cohort2-001-001",
    actor_id: "client.minuman.jogja.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan sertifikasi PIRT dan izin edar BPOM",
    content: "Assalamualaikum, saya ingin mengurus sertifikasi PIRT dan izin edar untuk minuman herbal saya. Mohon bantuannya agar bisa dipasarkan ke supermarket di Yogyakarta dan kota lain.",
    timestamp: new Date("2026-09-10T14:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-001-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["health-certification-specialist.001"],
    title: "Tugas Baru: Sertifikasi PIRT untuk Minuman Herbal Yogyakarta",
    content: "Anda telah ditugaskan untuk menangani permohonan sertifikasi PIRT dari klien minuman.jogja.001. Work ID: cohort2-work-001. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T20:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort2-001-003",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["food-safety-specialist.001"],
    title: "Tugas Baru: Izin Edar BPOM untuk UMKM Minuman Herbal",
    content: "Anda telah ditugaskan untuk menangani permohonan izin edar BPOM dari klien minuman.jogja.001. Work ID: cohort2-work-001. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T20:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;