import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const eosProd002Work: CanonicalWorkRecord = {
  workId: "eos-prod-002",
  id: "eos-prod-002",
  title: "Layanan UMKM - Legalitas + Sertifikasi ISO untuk Produk Ekspor",
  description: "EOS Production Volume: Kasus cross-domain LawyersHub + Services.ID. Pemilik usaha kerajinan kayu membutuhkan pendaftaran merk (legal) dan sertifikasi ISO untuk ekspor ke Malaysia. Memproses kedua domain dalam satu EOS spine, termasuk reality pressure non-happy-path dan target ambiguity count 3 untuk LMS parsing classification.",
  status: "formed",
  priority: "critical",
  tenantId: "tenant.anonymous",
  workspaceId: "cross-domain-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher", // Reuse existing provider (proven in ILC, LawyersHub, CREA, EOS-PROD-001 cases)
  evidence: [
    {
      id: "evidence-crossdomain-eos-prod-002-1725790000000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien kerajinan.surakarta.001 mengajukan permohonan pendaftaran merk dagang dan sertifikasi ISO dalam satu permintaan",
      source: "eos-execution-engine",
      uploadedBy: "client.kerajinan.001",
      uploadedAt: new Date("2026-09-10T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.998877665544",
        reality_verified: true
      }
    },
    {
      id: "evidence-provider-unavailable-prod002-1725793600000",
      type: "reality_signal",
      title: "Provider Unavailable Terdeteksi - Konsultan ISO tidak tersedia untuk meeting minggu ini",
      content: "Services.ID expert.semarang.001 tidak bisa menjadwalkan meeting audit sertifikasi selama 7 hari ke depan karena cuti",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-reality-gate",
      uploadedAt: new Date("2026-09-11T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "Google Calendar API - calendarevent.def456ghi789",
        reality_verified: true,
        signal_type: "PROVIDER_UNAVAILABLE",
        pipeline_execution: ["SIGNAL_CAPTURED", "ASSESSMENT: Provider unavailable, trigger human-consultant-matcher reassign", "WORK_UPDATED: Expert changed to expert.jogja.002", "EXECUTION: Notifikasi klien dan expert baru dikirim", "EVIDENCE_RECORDED", "OUTCOME_ACHIEVED: Proses tetap berjalan dengan pengganti expert"]
      }
    },
    {
      id: "evidence-ambiguous-lms-prod002-1725797200000",
      type: "reality_signal",
      title: "Ambiguous LMS Signal Terdeteksi - State \"selesai tapi belum lulus\" ketiga kalinya",
      content: "Services.ID LMS mengembalikan status pelatihan standar ekspor: \"selesai tapi belum lulus\" - hitung sebagai ambiguity count ketiga, mencapai threshold",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-reality-gate",
      uploadedAt: new Date("2026-09-12T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "Services.ID LMS Webhook - lms-event-789ghi012jkl345",
        reality_verified: true,
        signal_type: "AMBIGUOUS_LMS_SIGNAL",
        pipeline_execution: ["SIGNAL_CAPTURED", "ASSESSMENT: Ambiguous signal, third occurrence - threshold reached", "WORK_UPDATED: Flag for engineering classification review", "EXECUTION: human-in-the-loop triggered, engineering notification sent", "EVIDENCE_RECORDED", "OUTCOME_ACHIEVED: Sistem tidak crash, menunggu klasifikasi engineering"]
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+services-certification",
  nextAction: { label: "Jadwalkan konsultasi awal dengan expert baru untuk kedua kebutuhan", actionId: "action-schedule-crossdomain-consultation-prod002" },
  participants: [
    { id: "lawyer.semarang.002", name: "Advokat Hukum Dagang", role: "Legal Counsel", actorType: "professional" },
    { id: "expert.jogja.002", name: "Konsultan Sertifikasi ISO", role: "Services Expert", actorType: "professional" },
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "client.kerajinan.001", name: "Pemilik Usaha Kerajinan Kayu", role: "Klien UMKM", actorType: "customer" },
    { id: "notary.surakarta.001", name: "Notaris Surakarta", role: "Notaris", actorType: "authority" },
    { id: "kemenperin.verifier.003", name: "Verifikator Kemenperin RI", role: "Otoritas Sertifikasi" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-founders-prod002", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-export-plan-prod002", title: "Rencana Ekspor ke Malaysia", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "kemenperin-ri", name: "Kementerian Perindustrian RI", role: "Regulator Sertifikasi" },
    { id: "servicesid-jateng", name: "Services.ID Jawa Tengah", role: "Penyelenggara Sertifikasi" }
  ],
  outcomeDescription: "Target: Pendaftaran merk selesai + sertifikasi ISO tercapai dalam 120 hari, memungkinkan klien mengikuti tender ekspor kerajinan senilai Rp220jt",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "120 hari",
    estimated_resolution_time: "95 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case"],
    primitive_reuse_expected: 98.5, // Semua primitive existing, tidak ada code baru
    ambiguity_threshold_reached: true, // Ketiga ambiguous signal captured, siap klasifikasi
    threshold_achieved_at: "2026-09-12T14:00:00.000Z"
  },
  communications: [{
    id: "comm-client-request-prod002-001",
    actor_id: "client.kerajinan.001",
    recipient_ids: ["lawyer.semarang.002", "expert.jogja.002"],
    title: "Permohonan dua kebutuhan: pendaftaran merk dan sertifikasi ISO",
    content: "Assalamualaikum, saya ingin mendaftarkan merk usaha kerajinan kayu saya dan juga mengurus sertifikasi ISO untuk bisa ekspor ke Malaysia. Bisa dibantu proses keduanya?",
    timestamp: new Date("2026-09-10T13:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now() - 1000 * 60 * 60
  }]
} as unknown as CanonicalWorkRecord;