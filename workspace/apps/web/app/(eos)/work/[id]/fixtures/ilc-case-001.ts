import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const ilcCase001Work: CanonicalWorkRecord = {
  workId: "ilc-case-001",
  id: "ilc-case-001",
  title: "Pendidikan Vokasi - Sertifikasi Teknisi Digital untuk UMKM",
  description: "ILC Golden Slice: Pelatihan dan sertifikasi teknisi digital untuk UMKM di Jawa Tengah. Memerlukan proses dari pendaftaran peserta hingga sertifikasi kompetensi yang diakui oleh Kementerian Ketenagakerjaan.",
  status: "in_progress",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "ilc-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "lawyer-finder-service", // Reuse existing human expert matching provider (extended for education domain)
  evidence: [
    {
      id: "evidence-education-work-ilc-case-001-1725553800000",
      type: "reality_signal",
      title: "Orientasi Pelatihan Dijadwalkan",
      content: "Sesi orientasi untuk peserta pelatihan berhasil dijadwalkan oleh trainer.jateng.001",
      source: "eos-execution-engine",
      uploadedBy: "trainer.jateng.001",
      uploadedAt: new Date("2026-09-05T16:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "Google Calendar event created by trainer.jateng.001",
        reality_verified: true
      }
    },
    {
      id: "evidence-education-work-ilc-case-001-1725555000000",
      type: "reality_signal",
      title: "Kehadiran Peserta Terkonfirmasi",
      content: "Peserta participant.umkm.001 mengonfirmasi kehadiran pada sesi orientasi pelatihan",
      source: "eos-execution-engine",
      uploadedBy: "participant.umkm.001",
      uploadedAt: new Date("2026-09-05T17:10:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.1234567890",
        reality_verified: true
      }
    },
    {
      id: "evidence-education-work-ilc-case-001-1725556200000",
      type: "reality_signal",
      title: "Modul Pelatihan Pertama Selesai",
      content: "Trainer.jateng.001 mengonfirmasi peserta telah menyelesaikan modul dasar teknologi digital di LMS ILC",
      source: "eos-execution-engine",
      uploadedBy: "trainer.jateng.001",
      uploadedAt: new Date("2026-09-05T18:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "ILC LMS - course lms-ilc-jateng-001, module MOD001",
        reality_verified: true
      }
    },
    {
      id: "evidence-education-work-ilc-case-001-1725557400000",
      type: "reality_signal",
      title: "Sertifikasi Kemnaker Terbit",
      content: "Verifikator kemnaker.verifier.001 mengonfirmasi penerbitan sertifikasi kompetensi teknisi digital untuk peserta pelatihan",
      source: "eos-execution-engine",
      uploadedBy: "kemnaker.verifier.001",
      uploadedAt: new Date("2026-09-05T19:30:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "Kementerian Ketenagakerjaan RI - sertifikat nomor KEMNAKER/2026/ID/JTG/00123",
        reality_verified: true
      }
    }
  ],
  domainType: "education-case",
  specialization: "vocational-certification",
  nextAction: { label: "Selesaikan proses dan tutup work", actionId: "action-complete-and-close-work" },
  participants: [
    { id: "trainer.jateng.001", name: "Instruktur ILC Jawa Tengah", role: "Pelatih Vokasi", actorType: "professional" },
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "participant.umkm.001", name: "Pemilik UMKM Peserta", role: "Peserta Pelatihan", actorType: "customer" },
    { id: "kemnaker.verifier.001", name: "Verifikator Kemnaker RI", role: "Otoritas Sertifikasi", actorType: "authority" }
  ],
  attachedDocuments: [
    { id: "doc-registration-form", title: "Formulir Pendaftaran Peserta", type: "registration" },
    { id: "doc-syllabus", title: "Silabus Pelatihan Teknisi Digital", type: "curriculum" }
  ],
  linkedInstitutions: [
    { id: "ilc-central", name: "ILC Pusat", role: "Penyelenggara" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi" }
  ],
  outcomeDescription: null,
  external_verification: null,
  metadata: {
    serviceType: "vocational-certification",
    sla: "90 hari",
    estimated_resolution_time: "75 hari"
  }
};