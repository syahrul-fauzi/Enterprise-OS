import type { ProductExperience } from '@repo/presentation-entities';

export const ilc: ProductExperience = {
  identity: {
    productId: "ilc",
    name: "ILC",
    description: "Legal knowledge platform and professional community",
    category: "legal knowledge + community"
  },
  audience: {
    primary: "public + lawyers + legal community",
    secondary: ["academics", "policy makers", "legal researchers"],
    description: "Public, legal professionals, academics, and community members who want to explore, discuss, and contribute to legal knowledge."
  },
  positioning: {
    valueTitle: "Collective Legal Knowledge Sharing",
    valueDescription: "Discover legal insights, join discussions with experts, and contribute to the growing body of shared legal knowledge accessible to everyone."
  },
  narrative: {
    summary: "ILC is the hub for legal knowledge exchange and community collaboration where anyone can explore, understand, discuss, and contribute to legal discourse.",
    journey: ["discover", "understand", "discuss", "contribute"]
  },
  navigation: {
    primaryCta: {
      label: "Jelajahi / Bergabung",
      href: "/topics"
    },
    secondaryCta: {
      label: "Ikuti Komunitas",
      href: "/community"
    },
    tertiaryCta: {
      label: "Bergabung Sekarang",
      href: "/signup"
    }
  },
  trustSignals: {
    title: "Verified Legal Knowledge",
    description: "ILC presents curated legal knowledge from verified contributors, active community discussions, and real-time updates on legal developments.",
    bullets: [
      "Knowledge from verified legal professionals and academics",
      "Transparent discussion threads with version history",
      "Community activity metrics to gauge active participation",
      "Regular updates on legal changes and precedents"
    ]
  },
  journeys: [
    {
      id: "landing",
      label: "Landing",
      description: "Halaman depan dengan penjelasan platform komunitas hukum"
    },
    {
      id: "explore-topics",
      label: "Explore Topics",
      description: "Jelajahi berbagai topik hukum yang tersedia di platform"
    },
    {
      id: "read-watch",
      label: "Read / Watch",
      description: "Pelajari konten mendalam melalui artikel, video, dan webinar"
    },
    {
      id: "discussion",
      label: "Discussion",
      description: "Bergabung dalam diskusi dengan profesional dan sesama pengguna"
    },
    {
      id: "follow-community",
      label: "Follow Community",
      description: "Ikuti komunitas dan dapatkan update terbaru seputar hukum"
    },
    {
      id: "contribute",
      label: "Contribute",
      description: "Bagikan pengetahuan dan pengalaman Anda ke komunitas"
    }
  ],
  theme: {
    primaryColor: "#2e7d32",
    accentColor: "#66bb6a",
    brandName: "ILC"
  },
  entry: {
    primaryIntent: "Wawasan, diskusi, dan perkembangan dunia hukum.",
    primaryActionLabel: "Jelajahi Topik",
    discoveryMode: "topic",
    topics: [
      { id: "bisnis", label: "Hukum Bisnis", description: "Peraturan dan praktik hukum untuk dunia usaha" },
      { id: "pidana", label: "Hukum Pidana", description: "Kasus dan proses hukum pidana di Indonesia" },
      { id: "perdata", label: "Hukum Perdata", description: "Hukum perdata dan hak-hak sipil" },
      { id: "konstitusi", label: "Hukum Konstitusi", description: "Perkembangan undang-undang dasar dan hak konstitusional" },
      { id: "profesi", label: "Profesi Hukum", description: "Standar dan etika profesi hukum di Indonesia" }
    ]
  },
  workflow: {
    requirementTitle: "ILC knowledge contribution workflow",
    requirementSummary: "Share your legal insights, participate in discussions, and contribute to the collective knowledge base with verifiable sources and references.",
    createHelper: "Tulis artikel atau bagikan wawasan hukum Anda",
    updateHelper: "Perbarui kontribusi Anda berdasarkan diskusi komunitas",
    createLabel: "Kontribusikan Pengetahuan",
    updateLabel: "Perbarui Kontribusi"
  }
};