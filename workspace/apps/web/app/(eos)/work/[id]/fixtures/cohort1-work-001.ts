import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort1Work001Work: CanonicalWorkRecord = {
  workId: "cohort1-work-001",
  id: "cohort1-work-001",
  title: "Sertifikasi Halal + Legalitas Produk Makanan Beku",
  description: "COHORT 1 SCALING: Pemilik usaha makanan beku di Surabaya membutuhkan pendaftaran merek dagang dan sertifikasi halal untuk ekspor ke Malaysia. Cross-domain LawyersHub + Services.ID, menggunakan EOS spine yang sama.",
  status: "candidate_contactable_pending",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort1-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-05T09:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort1-001-1725478800000",
      type: "reality_signal",
      title: "Kontak Klien Diverifikasi - Nomor WhatsApp Aktif",
      content: "Klien frozen.sby.001 terverifikasi kontaknya, siap untuk outreach",
      source: "eos-acquisition-engine",
      uploadedBy: "system.eos",
      uploadedAt: new Date("2026-09-05T09:10:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.998877665544",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+halal-certification",
  nextAction: { label: "Verifikasi permohonan dan assign expert", actionId: "action-verify-assign-cohort1-001" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "lawyer-finder-service.001", name: "Advokat Khusus Merek Dagang", role: "Penyedia Layanan Hukum", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T09:30:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "lawyer001@eos.id" },
    { id: "client.frozen.sby.001", name: "Pemilik UMKM Makanan Beku", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-sby-001", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-ekspor-malaysia", title: "Rencana Ekspor ke Malaysia", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "bpjph-ri", name: "Badan Penyelenggara Jaminan Produk Halal RI", role: "Regulator Sertifikasi Halal" }
  ],
  outcomeDescription: "Target: Pendaftaran merek selesai + sertifikasi halal tercapai dalam 120 hari, untuk mengikuti tender ekspor Malaysia senilai Rp150jt",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "120 hari",
    estimated_resolution_time: "100 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 99.0,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_1"
  },
  communications: [{
    id: "comm-cohort1-001-001",
    actor_id: "client.frozen.sby.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan pendaftaran merek dan sertifikasi halal",
    content: "Assalamualaikum, saya ingin mendaftarkan merek usaha makanan beku dan mengurus sertifikasi halal untuk ekspor ke Malaysia. Mohon bantuannya.",
    timestamp: new Date("2026-09-10T07:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort1-001-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["lawyer-finder-service.001"],
    title: "Tugas Baru: Pendaftaran Merek Dagang untuk UMKM Surabaya",
    content: "Anda telah ditugaskan untuk menangani permohonan pendaftaran merek dagang dari klien frozen.sby.001. Work ID: cohort1-work-001. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T09:30:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;