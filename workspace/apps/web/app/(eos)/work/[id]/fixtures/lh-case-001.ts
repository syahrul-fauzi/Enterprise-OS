import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const lhCase001Work: CanonicalWorkRecord = {
  workId: "lh-case-001",
  id: "lh-case-001",
  title: "PT Pendirian - PT Kopi Nusantara Mandiri",
  description: "LawyersHub Golden Slice: Klien membutuhkan pendirian PT untuk usaha kopi retail di Jakarta. Memerlukan proses legal lengkap dari konsultasi hingga sertifikat NIB.",
  status: "formed",
  priority: "high",
  tenantId: "tenant.anonymous",
  workspaceId: "professional-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "pt-establishment-manager",
  evidence: [{
    id: "ev-consultation-note-001",
    title: "Catatan Konsultasi Awal",
    url: "/assets/evidence/lh-case-001-consultation.pdf",
    uploadedBy: "Advokat Jakarta",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
    type: "report",
    verified: true,
    verifiedBy: "lawyer.jakarta.001",
    verifiedAt: new Date().toISOString(),
    verification_notes: "Dokumen konsultasi awal telah diverifikasi, semua persyaratan tercatat dengan benar."
  }],
  domainType: "legal-case",
  specialization: "company_formation",
  nextAction: { label: "Verifikasi dokumen identitas pendiri", actionId: "action-verify-founder-docs" },
  participants: [
    { id: "lawyer.jakarta.001", name: "Advokat Jakarta", role: "Legal Counsel", actorType: "professional" },
    { id: "pt-establishment-manager", name: "Sistem Pendirian PT", role: "Penyedia Layanan", actorType: "system" },
    { id: "client.kopi.001", name: "Pemilik Usaha Kopi", role: "Klien", actorType: "customer" },
    { id: "notary.jakarta.001", name: "Notaris Pusat", role: "Notaris", actorType: "authority" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-founders", title: "KTP Para Pendiri", type: "identity" },
    { id: "doc-name-precheck", title: "Pengecekan Nama Perusahaan", type: "verification" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator" },
    { id: "oss-rba", name: "OSS RBA", role: "Pendaftaran" }
  ],
  outcomeDescription: null,
  external_verification: null,
  metadata: {
    serviceType: "company-formation",
    sla: "14 hari",
    estimated_resolution_time: "10 hari"
  },
  communications: [{
    id: "comm-consultation-001",
    actor_id: "lawyer.jakarta.001",
    recipient_ids: ["client.kopi.001", "notary.jakarta.001"],
    title: "Konsultasi awal selesai - dokumen identitas diperlukan",
    content: "Halo semuanya, konsultasi awal untuk pendirian PT Kopi Nusantara Mandiri telah selesai. Mohon untuk mengirimkan KTP para pendiri untuk proses verifikasi selanjutnya.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
    type: "message",
    lamport_clock: Date.now() - 1000 * 60 * 60 * 1.5
  }, {
    id: "comm-client-response-001",
    actor_id: "client.kopi.001",
    recipient_ids: ["lawyer.jakarta.001", "notary.jakarta.001"],
    title: "Dokumen KTP telah diunggah",
    content: "Terima kasih, dokumen KTP semua pendiri sudah saya upload ke sistem. Silakan dicek.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    type: "message",
    lamport_clock: Date.now() - 1000 * 60 * 30
  }]
} as unknown as CanonicalWorkRecord;