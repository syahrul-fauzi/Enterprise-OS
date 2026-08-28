import type { ProductExperience } from '@repo/presentation-entities';

export const commsme: ProductExperience = {
  identity: {
    productId: "commsme",
    name: "Pendamping Hukum UMKM",
    description: "Pendamping hukum terpadu untuk pelaku UMKM Indonesia: daftar badan usaha, perizinan, kontrak vendor, konsultasi, dan SOP legal.",
    category: "pendamping hukum untuk usaha mikro, kecil, dan menengah"
  },
  audience: {
    primary: "pelaku UMKM, owner toko kecil, startup lokal, pedagang, home industry, franchisor lokal",
    secondary: ["asisten usaha UMKM", "konsultan UMKM lokal", "inkubator startup regional", "lembaga pembina UMKM"],
    description: "Pemilik UMKM dan pengusaha skala kecil-menengah di Indonesia yang butuh akses hukum terjangkau tanpa memahami jargon legal: pendirian PT/CV, NIB/PIRT, kontrak vendor, konsultasi harian, SOP HR/keuangan legal."
  },
  positioning: {
    valueTitle: "Pendamping Hukum UMKM 1 Pintu",
    valueDescription: "Satu permukaan untuk 6 kebutuhan hukum UMKM tersering: daftar badan usaha, perizinan produk, kontrak vendor/NDA, konsultasi bisnis harian, SOP legal karyawan, dan temukan vendor legal terpercaya. Semua layanan hukum yang dibutuhkan UMKM dalam satu platform."
  },
  narrative: {
    summary: "COMMSME adalah platform pendamping hukum yang sederhana untuk UMKM Indonesia, menggabungkan layanan hukum terpercaya ke dalam alur kerja yang mudah dipahami tanpa jargon legal. Cepat, terjangkau, dan dirancang khusus untuk kebutuhan usaha skala kecil-menengah.",
    journey: ["buka dashboard UMKM", "pilih kebutuhan hukum", "sesuaikan detail usaha", "proses berjalan otomatis", "lihat status dan dokumen hasil", "simpan bukti transaksi usaha"]
  },
  navigation: {
    primaryCta: {
      label: "Mulai Kebutuhan Hukum UMKM",
      href: "/umkm"
    },
    secondaryCta: {
      label: "Lihat 6 Paket Hukum Populer",
      href: "/umkm/legal-needs"
    },
    tertiaryCta: {
      label: "Ajukan Kebutuhan",
      href: "/products/commsme/requirements"
    }
  },
  trustSignals: {
    title: "Dipercaya untuk Pelaku UMKM Lokal",
    description: "Platform hukum yang teruji dan aman untuk ribuan usaha di Indonesia. Setiap proses dijalankan oleh profesional hukum berpengalaman dengan standar keamanan data enterprise.",
    bullets: [
      "Semua layanan hukum dari penyedia terverifikasi dan berpengalaman",
      "Harga dan alur kerja disesuaikan skala UMKM (bukan korporasi)",
      "Semua status dan dokumen usaha tersimpan aman dengan enkripsi penuh",
      "Dukungan Bahasa Indonesia lokal untuk semua dokumen dan alur"
    ]
  },
  journeys: [
    {
      id: "dashboard",
      label: "Dashboard UMKM",
      description: "Ringkasan 6 kebutuhan hukum UMKM utama + progress tiap item"
    },
    {
      id: "badan-hukum",
      label: "Daftar PT / CV",
      description: "Pendirian badan usaha PT perorangan / CV untuk UMKM via LawyersHub legal-case + dokumen akta"
    },
    {
      id: "perizinan",
      label: "NIB / PIRT / Izin",
      description: "Daftar NIB, PIRT produk makanan/minuman, dan izin usaha via Services.ID provider marketplace"
    },
    {
      id: "kontrak",
      label: "Kontrak Vendor / NDA",
      description: "Template dan proses eksekusi kontrak vendor, NDA, perjanjian kerjasama klien via legal-case"
    },
    {
      id: "konsultasi",
      label: "Konsultasi Bisnis",
      description: "Tanya jawab konsultasi hukum harian UMKM via legal-community discussion forum"
    },
    {
      id: "sop-hr",
      label: "SOP Legal & HR",
      description: "Publikasi SOP karyawan, kontrak kerja, kebijakan toko via legal-community article publish"
    },
    {
      id: "vendor",
      label: "Cari Vendor Legal",
      description: "Temukan notaris, konsultan pajak, dan advokat UMKM terpercaya via service-directory"
    }
  ],
  theme: {
    primaryColor: "#b45309",
    accentColor: "#f59e0b",
    brandName: "COMMSME — Pendamping Hukum UMKM"
  },
  entry: {
    primaryIntent: "Pendamping hukum UMKM Indonesia untuk 6 kebutuhan tersering (pendirian, perizinan, kontrak, konsultasi, SOP, vendor)",
    primaryActionLabel: "Mulai Kebutuhan Hukum UMKM",
    discoveryMode: "topic",
    searchPlaceholder: "Cari kebutuhan hukum UMKM Anda (cth: daftar PT, buat kontrak vendor, konsultasi pajak)",
    topics: [
      { id: "pendirian-badan-usaha", label: "Pendirian PT / CV", description: "Badan hukum PT perorangan, CV, atau UD untuk memulai usaha formal" },
      { id: "perizinan-produk", label: "NIB / PIRT / Izin Usaha", description: "Nomor Induk Berusaha, PIRT untuk produk pangan/minuman, SPPL/AMDAL ringan" },
      { id: "kontrak-kerjasama", label: "Kontrak Vendor / NDA / Klien", description: "Perjanjian kerjasama vendor, NDA rahasia dagang, kontrak proyek klien" },
      { id: "konsultasi-harian", label: "Konsultasi Bisnis Harian", description: "Pertanyaan hukum sehari-hari: retur barang, batas tanggung jawab, UU Perlindungan Konsumen" },
      { id: "sop-karyawan", label: "SOP Karyawan & HR Legal", description: "Kontrak kerja harian/tetap, peraturan internal toko, SOP keuangan legal" },
      { id: "vendor-legal-terpercaya", label: "Temukan Vendor Legal", description: "Direktori notaris, konsultan pajak, advokat UMKM lokal yang terverifikasi" }
    ]
  },
  workflow: {
    requirementTitle: "Pengajuan kebutuhan hukum UMKM via MSME Legal Companion",
    requirementSummary: "Pilih salah satu 6 paket kebutuhan UMKM, isi detail spesifik usaha, lalu alur kerja otomatis menjalankan substrate capability yang sesuai (legal-case untuk dokumen badan usaha/kontrak, service-directory untuk perizinan/vendor, legal-community untuk konsultasi/SOP publish). Semua bukti perubahan tersimpan end-to-end.",
    createHelper: "Pilih paket kebutuhan hukum dan isi data UMKM Anda (nama toko, NPWP, alamat, detail kebutuhan)",
    updateHelper: "Pantau progress tiap langkah atau ubah detail kebutuhan sebelum tahap terminal",
    createLabel: "Ajukan Kebutuhan UMKM",
    updateLabel: "Perbarui Detail Kebutuhan"
  }
};