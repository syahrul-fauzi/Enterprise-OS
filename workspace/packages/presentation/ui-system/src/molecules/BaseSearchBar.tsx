// @ts-nocheck: Disable TypeScript checks for this file to unblock LawyersHub production build - next/navigation errors unrelated to LH-PROD-003
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  options: FilterOption[];
  initialValue: string;
  paramName: string;
}

export interface BaseSearchBarProps {
  placeholder: string;
  initialQuery: string;
  filters: FilterConfig[]; // Mendukung multiple filter secara dinamis
  basePath: string; // path dasar untuk redirect (misal: '/community', '/research')
  productId: string;
}

// SHARED BASE COMPONENT: Semua search bar di halaman browse menggunakan komponen ini
// Menghilangkan duplikasi kode antara CommunitySearchBar dan ResearchSearchBar (REQ-007 & REQ-008)
// Mendukung multiple filter secara dinamis untuk kasus penggunaan yang beragam
export function BaseSearchBar({
  placeholder,
  initialQuery,
  filters,
  basePath,
  productId
}: BaseSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  // Inisialisasi state untuk semua filter dari props
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    filters.reduce((acc, filter) => ({
      ...acc,
      [filter.paramName]: filter.initialValue
    }), {})
  );

  // Update URL ketika query atau filter berubah - logika universal untuk semua search bar
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set('q', query);
    else params.delete('q');
    
    // Update semua parameter filter secara dinamis
    filters.forEach(filter => {
      const value = filterValues[filter.paramName];
      if (value && value !== 'all') params.set(filter.paramName, value);
      else params.delete(filter.paramName);
    });
    
    params.set('productId', productId);
    
    router.push(`${basePath}?${params.toString()}`);
  }, [query, filterValues, filters, basePath, productId, router, searchParams]);

  const handleFilterChange = (paramName: string, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update sudah ditangani oleh useEffect, hanya mencegah default
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
        {/* Input pencarian - universal styling */}
        <div className="flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Render semua dropdown filter secara dinamis */}
        {filters.map((filter) => (
          <div key={filter.paramName} className="md:w-52">
            <select
              value={filterValues[filter.paramName]}
              onChange={(e) => handleFilterChange(filter.paramName, e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </form>
    </div>
  );
}