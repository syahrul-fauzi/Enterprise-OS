import type { ProductExperience } from '@repo/presentation-types';

export const lawyershub: ProductExperience & { card?: any } = {
  identity: {
    productId: "lawyershub",
    name: "LawyersHub",
    description: "Platform Manajemen Kasus Hukum Profesional",
    category: "Platform Hukum"
  },
  audience: {
    primary: "Klien + Profesional Hukum",
    secondary: ["Firma Hukum", "Tim Hukum Perusahaan"],
    description: "Pengacara, profesional hukum, firma hukum, tim hukum perusahaan, dan klien yang aktif mengelola pekerjaan hukum."
  },
  positioning: {
    valueTitle: "Pekerjaan Hukum dengan Konteks dan Akuntabilitas",
    valueDescription: "Kelola pekerjaan hukum dengan konteks, bukti, dan akuntabilitas agar klien dan profesional dapat melihat apa yang terjadi dan langkah selanjutnya."
  },
  narrative: {
    summary: "LawyersHub adalah workbench hukum profesional untuk membuka perkara, memantau pekerjaan hukum, dan menjaga akuntabilitas outcome.",
    journey: ["kebutuhan hukum", "profesional", "perkara", "selesai"]
  },
  navigation: {
    primaryCta: {
      label: "Buat Kasus Hukum Baru",
      href: "/cases/new"
    },
    secondaryCta: {
      label: "Lihat Semua Kasus",
      href: "/cases"
    }
  },
  trustSignals: {
    title: "Outcome Hukum yang Akuntabel",
    description: "LawyersHub menampilkan progres perkara, catatan pendukung, dan outcome yang akuntabel, bukan klaim pemasaran legal-tech yang kosong.",
    bullets: [
      "Setiap perkara hukum memiliki progres yang terlihat",
      "Catatan pendukung tetap terhubung dengan perkara",
      "Akuntabilitas profesional tetap terlihat sepanjang pekerjaan"
    ]
  },
  journeys: [
    {
      id: "landing",
      label: "Halaman Utama",
      description: "Halaman depan dengan nilai proposisi platform hukum profesional"
    },
    {
      id: "describe-legal-need",
      label: "Jelaskan Kebutuhan Hukum",
      description: "Jelaskan kebutuhan hukum yang Anda hadapi secara detail"
    },
    {
      id: "find-connect-professional",
      label: "Cari & Hubungkan Profesional",
      description: "Cari dan hubungkan dengan profesional hukum yang sesuai"
    },
    {
      id: "legal-matter",
      label: "Perkara Hukum",
      description: "Kasus hukum tercatat dan mulai diproses oleh profesional"
    },
    {
      id: "matter-progress",
      label: "Progres Perkara",
      description: "Pantau progres penanganan kasus hukum secara real-time"
    },
    {
      id: "supporting-records",
      label: "Catatan Pendukung",
      description: "Semua dokumen dan bukti pendukung kasus tersimpan terorganisir"
    },
    {
      id: "outcome",
      label: "Outcome",
      description: "Kasus hukum selesai dengan putusan yang dapat diverifikasi"
    }
  ],
  theme: {
    primaryColor: "#0a2463",
    accentColor: "#3e92cc",
    brandName: "LawyersHub"
  },
  entry: {
    primaryIntent: "Temukan bantuan hukum yang tepat.",
    primaryActionLabel: "Lanjutkan",
    discoveryMode: "role",
    audienceChoices: [
      {
        label: "Saya Butuh Pengacara",
        value: "client",
        description: "Saya membutuhkan bantuan hukum untuk kasus atau masalah pribadi/bisnis"
      },
      {
        label: "Saya Profesional Hukum",
        value: "professional",
        description: "Saya adalah pengacara atau profesional hukum yang ingin bergabung"
      }
    ]
  },
  workflow: {
    requirementTitle: "LawyersHub legal matter workflow",
    requirementSummary: "Structure a legal matter clearly, keep professional context visible, and move the work toward evidence-backed completion.",
    createHelper: "Lengkapi detail kasus hukum yang Anda hadapi",
    updateHelper: "Perbarui status penanganan kasus",
    createLabel: "Buat Kasus Hukum",
    updateLabel: "Perbarui Kasus"
  },
  card: {
    statusLabels: {
      draft: "Draf",
      open: "Terbuka",
      in_progress: "Dalam Proses",
      closed: "Selesai",
      "In Progress": "Dalam Proses",
      "Open": "Terbuka",
      "Closed": "Selesai",
      "Draft": "Draf"
    },
    verificationLabel: "Terverifikasi",
    ownerLabel: "Pemilik",
    successLabel: "Sukses",
    referenceLabel: "Referensi",
    readyLabel: "Siap",
    actionLabels: {},
    showCapabilityIds: false
  }
};