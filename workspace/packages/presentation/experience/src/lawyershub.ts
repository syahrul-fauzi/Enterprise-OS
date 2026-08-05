import type { ProductExperience } from '@repo/presentation-types';

export const lawyershub: ProductExperience = {
  identity: {
    productId: "lawyershub",
    name: "LawyersHub",
    description: "Professional legal service network and case management platform",
    category: "legal service network"
  },
  audience: {
    primary: "client + legal professional",
    secondary: ["law firms", "corporate legal teams"],
    description: "Lawyers, legal professionals, law firms, corporate legal teams, and clients who are actively running legal work."
  },
  positioning: {
    valueTitle: "Legal Work with Context and Accountability",
    valueDescription: "Run legal work with context, evidence, and accountability so clients and professionals can see what is happening and what comes next."
  },
  narrative: {
    summary: "LawyersHub is a professional legal workbench for opening matters, following legal work, and keeping outcomes accountable.",
    journey: ["legal need", "professional", "matter", "resolution"]
  },
  navigation: {
    primaryCta: {
      label: "Start a Legal Matter",
      href: "/requirements"
    },
    secondaryCta: {
      label: "Lihat Progress Hukum",
      href: "/delivery"
    }
  },
  trustSignals: {
    title: "Accountable Legal Outcomes",
    description: "LawyersHub shows matter progress, supporting records, and accountable outcomes instead of empty legal-tech marketing claims.",
    bullets: [
      "Each legal matter keeps its own visible progress",
      "Supporting records stay attached to the matter",
      "Professional accountability remains visible through the work"
    ]
  },
  journeys: [
    {
      id: "landing",
      label: "Landing",
      description: "Halaman depan dengan nilai proposisi platform hukum profesional"
    },
    {
      id: "describe-legal-need",
      label: "Describe Legal Need",
      description: "Jelaskan kebutuhan hukum yang dihadapi secara detail"
    },
    {
      id: "find-connect-professional",
      label: "Find / Connect Professional",
      description: "Cari dan hubungkan dengan profesional hukum yang sesuai"
    },
    {
      id: "legal-matter",
      label: "Legal Matter",
      description: "Kasus hukum tercatat dan mulai diproses oleh profesional"
    },
    {
      id: "matter-progress",
      label: "Matter Progress",
      description: "Pantau progres penanganan kasus hukum secara real-time"
    },
    {
      id: "supporting-records",
      label: "Supporting Records",
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
  }
};