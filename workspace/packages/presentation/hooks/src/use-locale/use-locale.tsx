"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// BCP 47 compliant locales
export type SupportedLocale = "id-ID" | "en-US";

export const DEFAULT_LOCALE: SupportedLocale = "id-ID";
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ["id-ID", "en-US"];

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
  formatDate: (date: Date | string) => string;
  formatNumber: (num: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// UI Dictionary (dapat di-extend untuk semua produk)
const translations: Record<SupportedLocale, Record<string, string>> = {
  "id-ID": {
    // Common UI
    "common.loading": "Memuat...",
    "common.search": "Cari...",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.delete": "Hapus",
    "common.edit": "Edit",
    "common.create": "Buat",
    "common.back": "Kembali",
    "common.close": "Tutup",
    "common.submit": "Kirim",
    
    // Cases Page
    "cases.title": "Daftar Kasus Hukum Anda",
    "cases.empty.heading": "Belum ada kasus hukum",
    "cases.empty.subheading": "Mulai dengan membuat kasus pertama Anda.",
    "cases.button.create": "Buat Kasus Baru",
    "cases.status.draft": "Draf",
    "cases.status.open": "Terbuka",
    "cases.status.inProgress": "Berjalan",
    "cases.status.closed": "Selesai",
    "cases.priority.low": "Rendah",
    "cases.priority.medium": "Sedang",
    "cases.priority.high": "Tinggi",
    "cases.priority.critical": "Kritis",
    
    // Case Detail
    "casedetail.artifacts": "Dokumen & Bukti",
    "casedetail.agents.observer": "Asisten Pengumpul Data",
    "casedetail.agents.validator": "Asisten Pemeriksa",
    "casedetail.agents.pattern": "Asisten Analisis",
    
    // Services.ID - P0 Prioritas
    "services.title": "Daftar Permintaan Layanan Anda",
    "services.empty.heading": "Belum ada permintaan layanan",
    "services.empty.subheading": "Mulai dengan membuat permintaan layanan pertama Anda.",
    "services.empty.cta": "Buat Permintaan Baru",
    "services.button.create": "Buat Permintaan Layanan Baru",
    "services.search.placeholder": "Cari permintaan layanan...",
    "services.status.draft": "Draf",
    "services.status.accepted": "Diterima",
    "services.status.in_service": "Sedang Diproses",
    "services.status.delivered": "Terkirim",
    "services.status.verified": "Terverifikasi",
    "services.showing": "Menampilkan {filtered} dari {total} (cocok {matched})",
    "services.noMatches": "Tidak ada permintaan layanan yang cocok dengan filter saat ini.",
    
    // Services.ID - P1 Categories (natural untuk user Indonesia)
    "services.category.cloud": "Layanan Cloud",
    "services.category.it": "Dukungan IT",
    "services.category.infrastructure": "Infrastruktur",
    "services.category.cybersecurity": "Keamanan Siber",
    "services.category.software": "Pengembangan Software",
    "services.category.managed": "Layanan Terkelola",
    "services.category.data": "Analitik Data",
    
    // Services.ID - Create Modal (Single & Batch)
    "services.modal.createHeading": "Buat Permintaan Layanan Baru",
    "services.modal.batchCreateHeading": "Buat Permintaan Massal",
    "services.modal.batchSubheading": "{count} dari {total} permintaan valid siap dibuat",
    "services.modal.addAnother": "Tambah Permintaan",
    "services.modal.untitledRequest": "Permintaan Tanpa Judul",
    "services.modal.titleLabel": "Judul Permintaan",
    "services.modal.titlePlaceholder": "Misal: Perbaikan Server Kantor",
    "services.modal.descriptionLabel": "Deskripsi",
    "services.modal.descriptionPlaceholder": "Jelaskan detail kebutuhan layanan Anda...",
    "services.modal.categoryLabel": "Kategori Layanan",
    "services.modal.budgetLabel": "Estimasi Budget (Opsional)",
    "services.modal.budgetPlaceholder": "Misal: Rp 50.000.000",
    "services.modal.createButton": "Buat Permintaan",
    "services.modal.batchCreateButton": "Buat Semua Permintaan",
    "common.creating": "Membuat..."
  },
  "en-US": {
    // Common UI
    "common.loading": "Loading...",
    "common.search": "Search...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.back": "Back",
    "common.close": "Close",
    "common.submit": "Submit",
    
    // Cases Page
    "cases.title": "Your Legal Cases",
    "cases.empty.heading": "No legal cases yet",
    "cases.empty.subheading": "Start by creating your first case.",
    "cases.button.create": "New Case",
    "cases.status.draft": "Draft",
    "cases.status.open": "Open",
    "cases.status.inProgress": "In Progress",
    "cases.status.closed": "Closed",
    "cases.priority.low": "Low",
    "cases.priority.medium": "Medium",
    "cases.priority.high": "High",
    "cases.priority.critical": "Critical",
    
    // Case Detail
    "casedetail.artifacts": "Documents & Evidence",
    "casedetail.agents.observer": "Data Collection Assistant",
    "casedetail.agents.validator": "Review Assistant",
    "casedetail.agents.pattern": "Analysis Assistant",
    
    // Services.ID - P0 Prioritas
    "services.title": "Your Service Requests",
    "services.empty.heading": "No service requests yet",
    "services.empty.subheading": "Start by creating your first service request.",
    "services.empty.cta": "Create New Request",
    "services.button.create": "New Service Request",
    "services.search.placeholder": "Search service requests...",
    "services.status.draft": "Draft",
    "services.status.accepted": "Accepted",
    "services.status.in_service": "In Progress",
    "services.status.delivered": "Delivered",
    "services.status.verified": "Verified",
    "services.showing": "Showing {filtered} of {total} (matched {matched})",
    "services.noMatches": "No service requests match the current filters.",
    
    // Services.ID - Categories
    "services.category.cloud": "Cloud Services",
    "services.category.it": "IT Support",
    "services.category.infrastructure": "Infrastructure",
    "services.category.cybersecurity": "Cybersecurity",
    "services.category.software": "Software Development",
    "services.category.managed": "Managed Services",
    "services.category.data": "Data & Analytics",
    
    // Services.ID - Create Modal (Single & Batch)
    "services.modal.createHeading": "Create New Service Request",
    "services.modal.batchCreateHeading": "Batch Create Requests",
    "services.modal.batchSubheading": "{count} of {total} valid requests ready to create",
    "services.modal.addAnother": "Add Another",
    "services.modal.untitledRequest": "Untitled Request",
    "services.modal.titleLabel": "Request Title",
    "services.modal.titlePlaceholder": "e.g., Office Server Repair",
    "services.modal.descriptionLabel": "Description",
    "services.modal.descriptionPlaceholder": "Describe your service needs in detail...",
    "services.modal.categoryLabel": "Service Category",
    "services.modal.budgetLabel": "Budget Estimate (Optional)",
    "services.modal.budgetPlaceholder": "e.g., $5,000",
    "services.modal.createButton": "Create Request",
    "services.modal.batchCreateButton": "Create All Requests",
    "common.creating": "Creating..."
  }
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  // Load saved locale from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("preferred-locale") as SupportedLocale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      setLocaleState(saved);
    } else {
      // Detect browser locale as fallback
      const browserLocale = navigator.language as SupportedLocale;
      if (SUPPORTED_LOCALES.includes(browserLocale)) {
        setLocaleState(browserLocale);
      }
    }
  }, []);

  // Persist locale to localStorage when changed
  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem("preferred-locale", newLocale);
    document.documentElement.lang = newLocale;
  };

  // Translation function
  const t = (key: string): string => {
    return translations[locale][key] || translations[DEFAULT_LOCALE][key] || key;
  };

  // Date formatting
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString(locale, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Number formatting
  const formatNumber = (num: number): string => {
    return num.toLocaleString(locale);
  };

  // Currency formatting - Fix default currency based on locale
  const formatCurrency = (amount: number, currency?: string): string => {
    const finalCurrency = currency || (locale === "id-ID" ? "IDR" : "USD");
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: finalCurrency 
    }).format(amount);
  };

  // Set initial lang attribute on mount
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        t,
        formatDate,
        formatNumber,
        formatCurrency
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}