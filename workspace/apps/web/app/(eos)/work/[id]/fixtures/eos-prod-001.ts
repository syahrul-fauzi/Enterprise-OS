import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const eosProd001Work: CanonicalWorkRecord = {
  workId: "HIGH-VALUE-001",
  id: "HIGH-VALUE-001",
  title: "HIGH-VALUE-001: Pendaftaran Merek Dagang FrozenSby - Christie_Law_Firm",
  description: "HIGH-VALUE PRODUCTION SLICE: Klien UMKM Surabaya (client.frozen.sby.001) membutuhkan pendaftaran merek dagang 'FrozenSby' untuk ekspor ke Malaysia. Christie_Law_Firm (AAI-ID-00745) ditugaskan sebagai legal counsel, namun mengalami keterlambatan 24 jam dalam pengiriman surat permohonan ke Kemenkumham. Cross-domain LawyersHub + Services.ID menggunakan EOS spine yang sama, 100% primitive reuse.",
  status: "formed",
  priority: "critical",
  tenantId: "tenant.anonymous",
  workspaceId: "cross-domain-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "christielaw.com", // Christie_Law_Firm sebagai official provider (verified in .eos-state)
  evidence: [
    {
      id: "evidence-crossdomain-hv001-1725700000000",
      type: "reality_signal",
      title: "Permohonan Diterima - Klien Christie_Law_Firm mengajukan pendaftaran merek",
      content: "Klien client.frozen.sby.001 mengajukan permohonan pendaftaran merek dagang 'FrozenSby' untuk ekspor ke Malaysia, membutuhkan layanan Christie_Law_Firm spesialis IP sesuai LAW-003",
      source: "eos-execution-engine",
      uploadedBy: "client.frozen.sby.001",
      uploadedAt: new Date("2026-09-07T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.112233445566",
        reality_verified: true
      }
    },
    {
      id: "evidence-missing-document-hv001-1725703600000",
      type: "reality_signal",
      title: "Delayed Document Terdeteksi - Surat permohonan Kemenkumham terlambat dikirim",
      content: "Lawyer.makassar.001 (Christie_Law_Firm) belum mengirimkan surat permohonan pendaftaran merek (nomor Christie-IP-2026-0045) ke Kemenkumham selama lebih dari 24 jam setelah tenggat waktu pengiriman",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-reality-gate",
      uploadedAt: new Date("2026-09-08T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "Kemenkumham API - kumenkumham.001.sip.ssb",
        reality_verified: true,
        signal_type: "DELAYED_DOCUMENT",
        pipeline_execution: ["SIGNAL_CAPTURED", "ASSESSMENT: Keterlambatan terdeteksi, kirim reminder ke advokat", "WORK_UPDATED: Status dokumen menjadi 'awaiting_delivery'", "EXECUTION: Notifikasi klien dikirim, reschedule pengajuan", "BOTTLENECK_DETECTED: MISSING_RESPONSE, severity MEDIUM", "EVIDENCE_RECORDED", "OUTCOME_ACHIEVED: Dokumen terkirim 23/09/2026, merek terdaftar sukses"]
      }
    },
    {
      id: "evidence-ambiguous-lms-prod001-1725707200000",
      type: "reality_signal",
      title: "Ambiguous LMS Signal Terdeteksi - State \"selesai tapi belum lulus\"",
      content: "ILC LMS mengembalikan status pelatihan: \"selesai tapi belum lulus\" - membutuhkan verifikasi manusia",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-reality-gate",
      uploadedAt: new Date("2026-09-09T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "ILC LMS Webhook - lms-event-456def789ghi",
        reality_verified: true,
        signal_type: "AMBIGUOUS_LMS_SIGNAL",
        pipeline_execution: ["SIGNAL_CAPTURED", "ASSESSMENT: Ambiguous signal, flag for human review", "WORK_UPDATED: Await human verification of LMS status", "EXECUTION: human-in-the-loop triggered", "EVIDENCE_RECORDED", "OUTCOME_ACHIEVED: Sistem tidak crash, menunggu verifikasi manusia"]
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+education-certification",
  nextAction: { label: "Jadwalkan konsultasi awal untuk kedua kebutuhan", actionId: "action-schedule-crossdomain-consultation" },
  participants: [
    { id: "lawyer.makassar.001", name: "Advokat Christie_Law_Firm", role: "Legal Counsel IP", actorType: "professional" },
    { id: "notary.jakarta.001", name: "Notaris Christie_Law_Firm", role: "Notaris Resmi", actorType: "authority" },
    { id: "christielaw.system", name: "Sistem Admin Christie_Law_Firm", role: "Penyedia Layanan", actorType: "system" },
    { id: "client.frozen.sby.001", name: "Pemilik UMKM FrozenSby", role: "Klien UMKM", actorType: "customer" },
    { id: "kemenkumham.verifier.001", name: "Verifikator Kemenkumham RI", role: "Otoritas Pendaftaran Merek", actorType: "authority" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-frozen.sby", title: "KTP Pemilik Usaha FrozenSby", type: "identity" },
    { id: "doc-business-plan-ekspor", title: "Rencana Ekspor ke Malaysia", type: "business-plan" },
    { id: "christie-ip-2026-0045", title: "Surat Permohonan Pendaftaran Merek Dagang", type: "legal-document" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal", country: "Indonesia" },
    { id: "christielaw.com", name: "Christie_Law_Firm", role: "Penyedia Layanan Hukum", aai_id: "AAI-ID-00745" },
    { id: "ministry-trade", name: "Kementerian Perdagangan RI", role: "Regulator Ekspor" }
  ],
  outcomeDescription: "Target: Pendaftaran merek dagang tercapai dalam 60 hari, memungkinkan klien mengikuti tender ekspor Malaysia senilai Rp150jt. OUTCOME_ACHIEVED: 28/09/2026 merek terdaftar sukses di Kemenkumham",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-ip-registration",
    sla: "60 hari",
    estimated_resolution_time: "45 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 100.0, // SEMUA PRIMITIVE REUSED, TIDAK ADA KODE BARU - SESUAI PERMINTAAAN
    bottleneck_detected: true,
    bottleneck_type: "MISSING_RESPONSE",
    bottleneck_resolved: true
  },
  communications: [{
    id: "comm-client-request-001",
    actor_id: "client.warung.001",
    recipient_ids: ["lawyer.makassar.001", "trainer.sulsel.001"],
    title: "Permohonan dua kebutuhan: pendirian PT dan sertifikasi digital",
    content: "Assalamualaikum, saya ingin mendirikan PT untuk warung saya dan juga ikut pelatihan digital marketing untuk ekspansi online. Bisa dibantu proses keduanya?",
    timestamp: new Date("2026-09-07T13:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now() - 1000 * 60 * 60
  }]
} as unknown as CanonicalWorkRecord;