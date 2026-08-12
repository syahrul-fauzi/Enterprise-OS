import { BaseSearchBar } from './BaseSearchBar';

export interface CommunitySearchBarProps {
  initialQuery: string;
  initialType: string;
  initialLocation: string;
  productId: string;
}

// Wrapper konfigurasi untuk halaman /community
// Menggunakan BaseSearchBar sebagai shared logic component (REFACTOR REQ-009)
// Ditambahkan filter lokasi sesuai REQ-010
export function CommunitySearchBar({ initialQuery, initialType, initialLocation, productId }: CommunitySearchBarProps) {
  return (
    <BaseSearchBar
      placeholder="Cari peneliti, institusi, atau afiliasi..."
      initialQuery={initialQuery}
      filters={[
        // Filter tipe anggota (existing)
        {
          options: [
            { value: 'all', label: 'Semua Anggota' },
            { value: 'researcher', label: 'Hanya Peneliti' },
            { value: 'institution', label: 'Hanya Institusi' }
          ],
          initialValue: initialType,
          paramName: "type"
        },
        // Filter lokasi (baru - REQ-010)
        {
          options: [
            { value: 'all', label: 'Semua Lokasi' },
            { value: 'indonesia', label: 'Indonesia' },
            { value: 'singapura', label: 'Singapura' },
            { value: 'malaysia', label: 'Malaysia' },
            { value: 'australia', label: 'Australia' },
            { value: 'usa', label: 'Amerika Serikat' }
          ],
          initialValue: initialLocation,
          paramName: "location"
        }
      ]}
      basePath="/community"
      productId={productId}
    />
  );
}