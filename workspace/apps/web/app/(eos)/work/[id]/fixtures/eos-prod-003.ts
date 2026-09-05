import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const eosProd003Work: CanonicalWorkRecord = {
  workId: "eos-prod-003",
  id: "eos-prod-003",
  title: "Konsultasi Hukum + Sertifikasi Halal untuk Produk FMCG UMKM",
  description: "EOS Production Volume: Kasus cross-domain LawyersHub + ILC + Services.ID. Pemilik usaha makanan ringan membutuhkan pendaftaran merek dagang (legal), sertifikasi halal (services), dan pelatihan produksi pangan (ILC) untuk ekspansi ke pasar ASEAN. Memproses ketiga domain dalam satu EOS spine, termasuk reality pressure non-happy-path dan maintain LMS ambiguity monitoring.",
  status: "formed",
  priority: "critical",
  tenantId: "tenant.anonymous",
  workspaceId: "cross-domain-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher", // Reuse existing provider (proven in all prior ILC, LawyersHub, CREA, EOS-PROD-001/002 cases)
  evidence: [
    {
      id: "evidence-crossdomain-eos-prod-003-1725876400000",
      type: "reality_signal",
      title: "Permohonan Diterima - Tiga Kebutuhan Domain Tercatat",
      content: "Klien fmcg.semarang.001 mengajukan permohonan pendaftaran merek, sertifikasi halal, dan pelatihan produksi dalam satu permintaan",
      source: "eos-execution-engine",
      uploadedBy: "client.fmcg.001",
      uploadedAt: new Date("2026-09-13T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.556677889900",
        reality_verified: true
      }
    },
    {
      id: "evidence-no-response-prod003-1725879999000",
      type: "reality_signal",
      title: "No Response Terdeteksi - Ahli halal belum merespons selama 48 jam",
      content: "Services.ID expert.jakarta.003 (konsultan halal) belum merespons permintaan klien selama lebih dari 48 jam setelah pesan dikirim",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-reality-gate",
      uploadedAt: new Date("2026-09-15T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "Google Calendar API - calendareven.abc123def456ghi789",
        reality_verified: true,
        signal_type: "NO_RESPONSE",
        pipeline_execution: ["SIGNAL_CAPTURED", "ASSESSMENT: No response detected, trigger reassign via human-consultant-matcher", "WORK_UPDATED: Expert changed to expert.bandung.004", "EXECUTION: Notifikasi klien dan expert baru dikirim", "EVIDENCE_RECORDED", "OUTCOME_ACHIEVED: Proses tetap berjalan dengan pengganti expert"]
      }
    },
    {
      id: "evidence-ambiguous-lms-prod003-1725883600000",
      type: "reality_signal",
      title: "Ambiguous LMS Signal Terdeteksi - State \"selesai tapi belum lulus\" keempat kalinya",
      content: "ILC LMS mengembalikan status pelatihan produksi pangan: \"selesai tapi belum lulus\" - maintain ambiguity monitoring, human-in-the-loop tetap aktif",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-reality-gate",
      uploadedAt: new Date("2026-09-17T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "ILC LMS Webhook - lms-event-012jkl345mno678",
        reality_verified: true,
        signal_type: "AMBIGUOUS_LMS_SIGNAL",
        pipeline_execution: ["SIGNAL_CAPTURED", "ASSESSMENT: Ambiguous signal, classification already complete - human-in-the-loop sufficient", "WORK_UPDATED: Await human verification of LMS status", "EXECUTION: human-in-the-loop triggered, no engineering action needed", "EVIDENCE_RECORDED", "OUTCOME_ACHIEVED: Sistem tidak crash, menunggu verifikasi manusia"]
      }
    }
  ],
  domainType: "cross-domain-case",
  specialization: "legal+halal-certification+vocational-training",
  nextAction: { label: "Jadwalkan konsultasi awal dengan semua expert untuk ketiga kebutuhan", actionId: "action-schedule-crossdomain-consultation-prod003" },
  participants: [
    { id: "lawyer.semarang.003", name: "Advokat Hukum Dagang", role: "Legal Counsel", actorType: "professional" },
    { id: "expert.bandung.004", name: "Konsultan Sertifikasi Halal", role: "Services Expert", actorType: "professional" },
    { id: "trainer.jateng.002", name: "Instruktur ILC Jawa Tengah", role: "Pelatih Produksi Pangan", actorType: "professional" },
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "client.fmcg.001", name: "Pemilik UMKM FMCG", role: "Klien UMKM", actorType: "customer" },
    { id: "notary.semarang.002", name: "Notaris Semarang", role: "Notaris", actorType: "authority" },
    { id: "bpjph.verifier.001", name: "Verifikator BPJPH RI", role: "Otoritas Sertifikasi Halal", actorType: "authority" },
    { id: "kemnaker.verifier.003", name: "Verifikator Kemnaker RI Jateng", role: "Otoritas Sertifikasi Vokasi", actorType: "authority" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-founders-prod003", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-asean-export-plan-prod003", title: "Rencana Ekspor ke Malaysia dan Singapura", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "bpjph-ri", name: "Badan Penyelenggara Jaminan Produk Halal RI", role: "Regulator Sertifikasi Halal" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi Vokasi" },
    { id: "ilc-jateng", name: "ILC Jawa Tengah", role: "Penyelenggara Pelatihan" },
    { id: "servicesid-jabar", name: "Services.ID Jawa Barat", role: "Penyelenggara Sertifikasi Halal" }
  ],
  outcomeDescription: "Target: Pendaftaran merek selesai + sertifikasi halal tercapai + pelatihan produksi selesai dalam 150 hari, memungkinkan klien mengikuti tender FMCG ASEAN senilai Rp270jt",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "150 hari",
    estimated_resolution_time: "120 hari",
    cross_domain: true,
    domains: ["legal-case", "services-case", "education-case"],
    primitive_reuse_expected: 98.0, // Semua primitive existing, tidak ada code baru - core freeze compliant
    ambiguity_monitoring_maintained: true, // Maintain existing classification, no new engineering
    human_in_the_loop_active: true,
    core_freeze_compliant: true
  },
  communications: [{
    id: "comm-client-request-prod003-001",
    actor_id: "client.fmcg.001",
    recipient_ids: ["lawyer.semarang.003", "expert.bandung.004", "trainer.jateng.002"],
    title: "Permohonan tiga kebutuhan: pendaftaran merek, sertifikasi halal, dan pelatihan produksi",
    content: "Assalamualaikum, saya ingin mendaftarkan merek usaha makanan ringan saya, mengurus sertifikasi halal untuk ekspor, dan ikut pelatihan produksi pangan untuk meningkatkan kualitas. Bisa dibantu proses ketiganya?",
    timestamp: new Date("2026-09-13T13:30:00.000Z").toISOString(),
    type: "message",
    lamport_clock: Date.now() - 1000 * 60 * 60
  }]
} as unknown as CanonicalWorkRecord;