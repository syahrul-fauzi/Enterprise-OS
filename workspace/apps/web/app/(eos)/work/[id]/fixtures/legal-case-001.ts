// LawyersHub Golden Slice: legal-case-001 - Pembuatan Kontrak Perjanjian Kerja
// Reuse canonical work schema yang sama dengan SERVICES.ID case-005 untuk membuktikan reuse EOS runtime
import type { CanonicalWorkRecord } from '../../../../api/work/create/route';

export const legalCase001: CanonicalWorkRecord = {
  workId: "legal-case-001",
  id: "legal-case-001",
  title: "Pembuatan Kontrak Perjanjian Kerja - Karyawan Senior IT",
  description: "LawyersHub Golden Slice: Klien memerlukan pembuatan kontrak kerja fullstack developer untuk startup baru. Membutuhkan review hukum oleh advokat, tanda tangan digital, dan pendaftaran ke Kemnaker.",
  status: "closed",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "professional-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // dibuat 3 hari yang lalu
  updatedAt: new Date().toISOString(),
  providerId: "advokat.legal.001", // Tim hukum yang ditugaskan
  evidence: [{
    id: "ev-contract-final-001",
    title: "Kontrak Perjanjian Kerja Final (Signed)",
    url: "/assets/evidence/legal-case-001-contract-signed.pdf",
    uploadedBy: "advokat.legal.001",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    type: "legal_document"
  }, {
    id: "ev-kemnaker-confirmation-001",
    title: "Konfirmasi Pendaftaran Kemnaker",
    url: "/assets/evidence/legal-case-001-kemnaker.pdf",
    uploadedBy: "Sistem Integrasi Kemnaker",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    type: "government_verification"
  }],
  domainType: "legal-request",
  specialization: "employment-contract",
  nextAction: { 
    label: "Pekerjaan selesai - semuanya terverifikasi", 
    actionId: "action-work-completed" 
  },
  participants: [
    { id: "client.startup.001", name: "Founder Startup", role: "Klien", actorType: "customer" },
    { id: "advokat.legal.001", name: "Tim Advokat", role: "Penyedia Layanan Hukum", actorType: "professional" },
    { id: "notaris.001", name: "Notaris Publik", role: "Verifikator Dokumen", actorType: "third-party" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-founder", title: "KTP Founder", type: "identity" },
    { id: "doc-siup-perusahaan", title: "SIUP Perusahaan", type: "legal-document" },
    { id: "doc-contract-signed", title: "Kontrak Kerja yang Sudah Ditandatangani", type: "final-document" }
  ],
  linkedInstitutions: ["Kementerian Ketenagakerjaan RI"],
  outcomeDescription: "Kontrak perjanjian kerja telah selesai dibuat, ditandatangani oleh kedua belah pihak, dan terdaftar resmi di Kementerian Ketenagakerjaan. Klien telah mengkonfirmasi kepuasan dengan layanan hukum.",
  external_verification: {
    verified: true,
    source: "Kemnaker Sistem Integrasi + Client Confirmation",
    timestamp: new Date().toISOString(),
    notes: "Pendaftaran kontrak berhasil, nomor registrasi: KEMNAKER-2026-001234. Klien mengirim email konfirmasi pada 2 jam yang lalu."
  },
  metadata: {
    legalJurisdiction: "IDN",
    contractType: "full-time",
    duration: "2 tahun",
    resolution_time: "3 hari"
  }
} as unknown as CanonicalWorkRecord;