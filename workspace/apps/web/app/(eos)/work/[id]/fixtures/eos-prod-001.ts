import type { CanonicalWorkRecord } from "@/app/api/work/create/route";

export const eosProd001Work: CanonicalWorkRecord = {
  workId: "eos-prod-001",
  id: "eos-prod-001",
  title: "Kasus Hukum UMKM - Sertifikasi Legal + Digital untuk Warung Makan",
  description: "EOS Production Volume: Kasus cross-domain LawyersHub + ILC. Pemilik warung makan membutuhkan pendirian PT (legal) dan sertifikasi teknisi digital (ILC) untuk ekspansi usaha. Memproses kedua domain dalam satu EOS spine, termasuk reality pressure non-happy-path.",
  status: "formed",
  priority: "critical",
  tenantId: "tenant.anonymous",
  workspaceId: "cross-domain-workspace.anonymous",
  actorId: "anonymous.user",
  createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  updatedAt: new Date().toISOString(),
  providerId: "human-consultant-matcher", // Reuse existing provider (already proven in ILC, LawyersHub, CREA cases)
  evidence: [
    {
      id: "evidence-crossdomain-eos-prod-001-1725700000000",
      type: "reality_signal",
      title: "Permohonan Diterima - Dua Kebutuhan Domain Tercatat",
      content: "Klien warung.makassar.001 mengajukan permohonan pendirian PT dan sertifikasi digital dalam satu permintaan",
      source: "eos-execution-engine",
      uploadedBy: "client.warung.001",
      uploadedAt: new Date("2026-09-07T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "WhatsApp Business API - wamid.112233445566",
        reality_verified: true
      }
    },
    {
      id: "evidence-late-response-prod001-1725703600000",
      type: "reality_signal",
      title: "Late Response Terdeteksi - Advokat terlambat merespons selama 24 jam",
      content: "Lawyer.makassar.001 belum merespons permintaan klien selama lebih dari 24 jam setelah pesan dikirim",
      source: "eos-reality-monitor",
      uploadedBy: "system.eos-reality-gate",
      uploadedAt: new Date("2026-09-08T14:00:00.000Z").toISOString(),
      metadata: {
        provenance: "eos_evidence",
        external_provenance: "Google Calendar API - calendarevent.xyz789abc123",
        reality_verified: true,
        signal_type: "LATE_RESPONSE",
        pipeline_execution: ["SIGNAL_CAPTURED", "ASSESSMENT: Late response but acceptable, reschedule consultation", "WORK_UPDATED: Consultation date changed", "EXECUTION: Notifikasi klien dan notaris dikirim", "EVIDENCE_RECORDED", "OUTCOME_ACHIEVED: Proses tetap berjalan"]
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
    { id: "lawyer.makassar.001", name: "Advokat Makassar", role: "Legal Counsel", actorType: "professional" },
    { id: "trainer.sulsel.001", name: "Instruktur ILC Sulawesi Selatan", role: "Pelatih Vokasi", actorType: "professional" },
    { id: "human-consultant-matcher", name: "Sistem Pencocokan Pakar", role: "Penyedia Layanan", actorType: "system" },
    { id: "client.warung.001", name: "Pemilik Warung Makan", role: "Klien UMKM", actorType: "customer" },
    { id: "notary.makassar.001", name: "Notaris Makassar", role: "Notaris", actorType: "authority" },
    { id: "kemnaker.verifier.002", name: "Verifikator Kemnaker RI Sulsel", role: "Otoritas Sertifikasi", actorType: "authority" }
  ],
  attachedDocuments: [
    { id: "doc-ktp-founders", title: "KTP Pemilik Usaha", type: "identity" },
    { id: "doc-business-plan", title: "Rencana Ekspansi Usaha", type: "business-plan" }
  ],
  linkedInstitutions: [
    { id: "kemenkumham", name: "Kemenkumham RI", role: "Regulator Legal" },
    { id: "kemnaker-ri", name: "Kementerian Ketenagakerjaan RI", role: "Regulator Sertifikasi" },
    { id: "ilc-sulsel", name: "ILC Sulawesi Selatan", role: "Penyelenggara Pelatihan" }
  ],
  outcomeDescription: "Target: Pendirian PT selesai + sertifikasi digital tercapai dalam 90 hari, memungkinkan klien mengikuti tender kuliner rumahan senilai Rp180jt",
  external_verification: null,
  metadata: {
    serviceType: "cross-domain-certification",
    sla: "90 hari",
    estimated_resolution_time: "75 hari",
    cross_domain: true,
    domains: ["legal-case", "education-case"],
    primitive_reuse_expected: 98.2 // Semua primitive existing, tidak ada code baru
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