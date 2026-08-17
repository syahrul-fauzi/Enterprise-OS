import { BaseSearchBar } from './BaseSearchBar.js';

export interface ResearchSearchBarProps {
  initialQuery: string;
  initialStatus: string;
  productId: string;
}

// Wrapper konfigurasi untuk halaman /research
// Menggunakan BaseSearchBar sebagai shared logic component (REFACTOR REQ-009)
export function ResearchSearchBar({ initialQuery, initialStatus, productId }: ResearchSearchBarProps) {
  // Filter options spesifik untuk research page
  const researchFilterOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'open', label: 'Penelitian Dibuka' },
    { value: 'in-progress', label: 'Sedang Berjalan' },
    { value: 'completed', label: 'Selesai' }
  ];

  return (
    <BaseSearchBar
      placeholder="Cari judul penelitian, deskripsi, atau penulis..."
      initialQuery={initialQuery}
      filters={[
        {
          options: researchFilterOptions,
          initialValue: initialStatus,
          paramName: "status"
        }
      ]}
      basePath="/research"
      productId={productId}
    />
  );
}