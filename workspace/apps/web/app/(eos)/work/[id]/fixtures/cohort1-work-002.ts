import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const cohort1Work002Work: CanonicalWorkRecord = {
  workId: "cohort1-work-002",
  id: "cohort1-work-002",
  title: "Pelatihan Digital Marketing untuk UMKM Fashion",
  description: "COHORT 1 SCALING: Pemilik usaha fashion di Bandung membutuhkan pelatihan digital marketing ILC dan legalitas merek dagang. Cross-domain LawyersHub + ILC, menggunakan EOS spine yang sama.",
  status: "received",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "cohort1-production-workspace",
  actorId: "anonymous.user",
  createdAt: new Date("2026-09-10T09:00:00.000Z").toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher",
  evidence: [
    {
      id: "evidence-cohort1-002-1725939600000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien fashion.bdg.001 mengajukan permohonan pelatihan digital dan pendaftaran merek",
      source: "eos-execution-engine",
      uploadedBy: "client.fashion.bdg.001",
      uploadedAt: new Date("2026-09-10T09:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.887766554433",
        reality_verified: true
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+education-certification",
  nextAction: { label: "Verifikasi permohonan dan assign trainer + lawyer", actionId: "action-verify-assign-cohort1-002" },
  participants: [
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "trainer-finder-service.001", name: "Trainer Digital Marketing ILC", role: "Penyedia Layanan Pelatihan", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T10:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "trainer001@eos.id" },
    { id: "lawyer-finder-service.002", name: "Advokat Khusus Merek Dagang", role: "Penyedia Layanan Hukum", actorType: "human", notification_sent: true, notification_timestamp: new Date("2026-09-10T10:00:00.000Z").toISOString(), reminder_sent: true, reminder_timestamp: new Date("2026-09-11T23:50:00.000Z").toISOString(), acceptance_pending: true, email: "lawyer002@eos.id" },
    { id: "client.fashion.bdg.001", name: "Pemilik UMKM Fashion", role: "Klien UMKM", actorType: "customer" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-bdg-002", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-rencana-ekspansi", title: "Rencana Ekspansi Online Shop", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi Vokasi" },
    { id: "ilc-jabar", name: "ILC Jawa Barat", role: "Penyelenggara Pelatihan" }
  ],
  outcomeDescription: "Target: Pendaftaran merek selesai + pelatihan digital selesai dalam 90 hari, untuk meningkatkan penjualan online 40%",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "90 hari",
    estimated_resolution_time: "75 hari",
    cross_domain: true,
    domains: ["legal-case", "education-case"],
    primitive_reuse_expected: 99.0,
    ambiguity_monitoring_maintained: true,
    human_in_the_loop_active: true,
    core_freeze_compliant: true,
    cohort_assignment: "COHORT_1"
  },
  communications: [{
    id: "comm-cohort1-002-001",
    actor_id: "client.fashion.bdg.001",
    recipient_ids: ["system.eos-execution-engine"],
    title: "Permohonan pelatihan digital dan pendaftaran merek",
    content: "Assalamualaikum, saya ingin mendaftarkan merek usaha fashion saya dan ikut pelatihan digital marketing untuk meningkatkan penjualan online. Bisa dibantu?",
    timestamp: new Date("2026-09-10T08:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now()
  },
  {
    id: "comm-cohort1-002-002",
    actor_id: "system.eos-execution-engine",
    recipient_ids: ["trainer-finder-service.001", "lawyer-finder-service.002"],
    title: "Tugas Baru: Pendaftaran Merek + Pelatihan Digital untuk UMKM Bandung",
    content: "Anda telah ditugaskan untuk menangani permohonan pendaftaran merek dagang dan pelatihan digital marketing dari klien fashion.bdg.001. Work ID: cohort1-work-002. Silakan konfirmasi penerimaan tugas dalam 48 jam.",
    timestamp: new Date("2026-09-10T10:00:00.000Z").toISOString(),
    type: "notification",
    lamport_clock: Date.now()
  }]
} satisfies CanonicalWorkRecord;