import type { ProductExperience } from '@repo/presentation-entities';

export const servicesId: ProductExperience = {
  identity: {
    productId: "services-id",
    name: "Services.ID",
    description: "Digital service marketplace and delivery platform",
    category: "service marketplace / service delivery"
  },
  audience: {
    primary: "customer + business user",
    secondary: ["service providers", "operators"],
    description: "Customers, UMKM operators, and business teams who have a service need and want a clear path from request to trusted delivery."
  },
  positioning: {
    valueTitle: "Demand to Service Delivery",
    valueDescription: "Explain what you need, move it into a service flow, and review the delivery result with visible evidence instead of guesswork."
  },
  narrative: {
    summary: "Services.ID is the front door for customers and business teams who need to turn a need into a service that can be tracked and trusted.",
    journey: ["need", "match", "delivery", "outcome"]
  },
  navigation: {
    primaryCta: {
      label: "Mulai Permintaan Layanan",
      href: "/requirements"
    },
    secondaryCta: {
      label: "Lihat Cara Kerja",
      href: "/how-it-works"
    }
  },
  trustSignals: {
    title: "Verified Service Outcomes",
    description: "Services.ID shows visible request progress, delivery evidence, and verified outcomes instead of vague service promises.",
    bullets: [
      "Requests stay visible after they are started",
      "Delivery status and evidence remain attached to the same service need",
      "Completed outcomes can be reviewed again later"
    ]
  },
  journeys: [
    {
      id: "landing",
      label: "Landing",
      description: "Halaman depan dengan nilai proposisi dan call-to-action utama"
    },
    {
      id: "find-start-service",
      label: "Find / Start Service",
      description: "Cari layanan yang sesuai atau mulai permintaan layanan baru"
    },
    {
      id: "describe-need",
      label: "Describe Need",
      description: "Jelaskan kebutuhan layanan secara detail"
    },
    {
      id: "service-request",
      label: "Service Request",
      description: "Permintaan layanan terkirim dan menunggu diproses"
    },
    {
      id: "delivery-progress",
      label: "Delivery Progress",
      description: "Pantau progres pengiriman layanan secara real-time"
    },
    {
      id: "outcome",
      label: "Outcome",
      description: "Layanan selesai dengan hasil yang dapat diverifikasi"
    },
    {
      id: "evidence",
      label: "Evidence",
      description: "Semua bukti dan catatan pengiriman tersimpan untuk audit"
    }
  ],
  theme: {
    primaryColor: "#0066ff",
    accentColor: "#00aaff",
    brandName: "Services.ID"
  },
  entry: {
    primaryIntent: "Cari jasa yang Anda butuhkan.",
    primaryActionLabel: "Cari Jasa",
    discoveryMode: "search",
    searchPlaceholder: "Apa yang Anda butuhkan?",
    categories: [
      "Renovasi", "Legal", "Design", "Marketing", "IT Support", "Jasa Lainnya"
    ]
  },
  workflow: {
    requirementTitle: "Services.ID service request workflow",
    requirementSummary: "Capture a service need, assign a delivery owner, and move the request toward evidence-backed delivery and confirmation.",
    createHelper: "Lengkapi detail layanan yang Anda butuhkan",
    updateHelper: "Perbarui status permintaan layanan",
    createLabel: "Buat Permintaan Layanan",
    updateLabel: "Perbarui Permintaan"
  }
};