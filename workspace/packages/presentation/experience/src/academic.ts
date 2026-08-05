import type { ProductExperience } from '@repo/presentation-types';

export const academic: ProductExperience = {
  identity: {
    productId: "academic",
    name: "Academic Community",
    description: "Global academic collaboration and research sharing platform",
    category: "academic research + collaboration"
  },
  audience: {
    primary: "academics, researchers, students, university faculty",
    secondary: ["research institutions, journal editors, industry R&D teams"],
    description: "Academic professionals, researchers, students, and institutions who want to collaborate, share research, and advance knowledge together."
  },
  positioning: {
    valueTitle: "Open Academic Collaboration",
    valueDescription: "Share research, collaborate with peers worldwide, and advance human knowledge through transparent, verified academic work."
  },
  narrative: {
    summary: "Academic Community is the hub for researchers to share findings, collaborate across institutions, and build on collective knowledge with verifiable evidence and open peer review.",
    journey: ["discover research", "connect with peers", "collaborate on projects", "publish findings"]
  },
  navigation: {
    primaryCta: {
      label: "Jelajahi Penelitian",
      href: "/research"
    },
    secondaryCta: {
      label: "Bergabung Komunitas",
      href: "/community"
    },
    tertiaryCta: {
      label: "Mulai Kontribusi",
      href: "/products/academic/requirements"
    }
  },
  trustSignals: {
    title: "Verified Academic Research",
    description: "All research and contributions are linked to institutional profiles, citations, and peer reviews to maintain academic integrity.",
    bullets: [
      "Verified institutional and academic profiles",
      "Citation tracking and impact metrics",
      "Open peer review and collaborative editing",
      "Long-term preservation of research outputs"
    ]
  },
  journeys: [
    {
      id: "landing",
      label: "Landing",
      description: "Halaman depan platform komunitas akademik global"
    },
    {
      id: "browse-research",
      label: "Browse Research",
      description: "Jelajahi paper penelitian dan publikasi dari seluruh dunia"
    },
    {
      id: "connect",
      label: "Connect with Peers",
      description: "Temukan dan kolaborasi dengan peneliti lain di bidang yang sama"
    },
    {
      id: "join-project",
      label: "Join Research Project",
      description: "Bergabung dalam proyek penelitian kolaboratif"
    },
    {
      id: "submit-paper",
      label: "Submit Research",
      description: "Unggah dan publikasikan karya penelitian Anda"
    },
    {
      id: "review-peer",
      label: "Peer Review",
      description: "Lakukan review untuk penelitian rekan peneliti"
    }
  ],
  theme: {
    primaryColor: "#047857",
    accentColor: "#10b981",
    brandName: "Academic Community"
  },
  entry: {
    primaryIntent: "Penelitian, kolaborasi, dan berbagi pengetahuan akademik.",
    primaryActionLabel: "Telusuri Penelitian",
    discoveryMode: "community",
    topics: [
      { id: "computer-science", label: "Computer Science", description: "Artificial intelligence, machine learning, and computing research" },
      { id: "life-sciences", label: "Life Sciences", description: "Biology, medicine, and health research" },
      { id: "physics", label: "Physics & Mathematics", description: "Theoretical and applied physics, mathematics" },
      { id: "social-sciences", label: "Social Sciences", description: "Sociology, economics, and humanities research" },
      { id: "engineering", label: "Engineering", description: "Engineering and applied technology research" }
    ]
  },
  workflow: {
    requirementTitle: "Academic research contribution workflow",
    requirementSummary: "Share your research, collaborate with peers, and publish your findings with verifiable citations and peer review evidence.",
    createHelper: "Tulis paper Anda atau ajukan proyek kolaborasi penelitian",
    updateHelper: "Perbarui penelitian Anda berdasarkan peer review dan diskusi",
    createLabel: "Mulai Kontribusi",
    updateLabel: "Perbarui Penelitian"
  }
};