"use client";

import React, { useState, useEffect } from "react";
import type { ConsultationPriority } from "../../implementation/contracts/consultation.contracts";

interface CreateConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    userNeed: string;
    priority: ConsultationPriority;
    // PT establishment required fields from RequirementCard pattern
    founder?: string;
    ownership?: string;
    businessType?: string;
    domicile?: string;
    kbli?: string;
  }) => Promise<void>;
}

const priorityOptions: readonly ConsultationPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

// PT-specific business types (Indonesian legal entities)
const businessTypeOptions = [
  { value: "pt", label: "PT (Perseroan Terbatas)" },
  { value: "cv", label: "CV (Commanditaire Vennootschap)" },
  { value: "pt_pma", label: "PT PMA (Penanaman Modal Asing)" },
  { value: "pt_umo", label: "PT UMK (Usaha Mikro Kecil)" },
];

export function CreateConsultationModal({ isOpen, onClose, onSubmit }: CreateConsultationModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userNeed, setUserNeed] = useState("");
  const [priority, setPriority] = useState<ConsultationPriority>("medium");
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);
  // PT establishment additional fields (per requirement card pattern)
  const [founder, setFounder] = useState("");
  const [ownership, setOwnership] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [domicile, setDomicile] = useState("");
  const [kbli, setKbli] = useState("");
  // Show PT-specific fields if userNeed indicates PT establishment
  const [showPtFields, setShowPtFields] = useState(false);

  // Listen for the create event from the workspace button
  useEffect(() => {
    const handleCreate = () => setLocalIsOpen(true);
    window.addEventListener('consultations:create', handleCreate);
    return () => window.removeEventListener('consultations:create', handleCreate);
  }, []);

  // Auto-detect PT establishment need and show additional fields
  useEffect(() => {
    const lowerUserNeed = userNeed.toLowerCase();
    const isPtNeed = 
      lowerUserNeed.includes("memulai usaha") || 
      lowerUserNeed.includes("mulai bisnis") || 
      lowerUserNeed.includes("pendirian pt") || 
      lowerUserNeed.includes("badan usaha");
    setShowPtFields(isPtNeed);
  }, [userNeed]);

  // Sync with parent isOpen prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userNeed.trim()) return;
    
    setLoading(true);
    try {
      // Collect all form data including PT fields if applicable
      const consultationData = { 
        title, 
        description, 
        userNeed, 
        priority,
        // Include PT-specific fields only if they were shown and filled
        ...(showPtFields && {
          founder: founder.trim() || undefined,
          ownership: ownership.trim() || undefined,
          businessType: businessType || undefined,
          domicile: domicile.trim() || undefined,
          kbli: kbli.trim() || undefined,
        })
      };
      
      await onSubmit(consultationData);
      // Reset form
      setTitle("");
      setDescription("");
      setUserNeed("");
      setPriority("medium");
      // Reset PT-specific fields
      setFounder("");
      setOwnership("");
      setBusinessType("");
      setDomicile("");
      setKbli("");
      setShowPtFields(false);
      onClose();
      // Trigger refresh to show new consultation
      window.dispatchEvent(new CustomEvent('consultations:refresh'));
    } catch (err) {
      console.error("[CreateConsultationModal] Failed to create consultation:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  const fmtPriority = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Mulai Konsultasi Baru</h3>
          <p className="text-sm text-slate-500 mt-1">Ceritakan kebutuhan Anda, kami akan bantu arahkan ke solusi yang tepat</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul Konsultasi *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Misal: Konsultasi Pendirian Usaha"
              required
              data-testid="consultation-title-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Apa yang ingin Anda lakukan? *</label>
            <textarea
              value={userNeed}
              onChange={(e) => setUserNeed(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Jelaskan kebutuhan Anda secara singkat, misal: Saya ingin memulai usaha dan butuh bantuan mendirikan PT..."
              required
              data-testid="consultation-userneed-input"
            />
            <p className="text-xs text-slate-500 mt-1">Sistem akan otomatis menganalisis kebutuhan Anda dan merekomendasikan langkah selanjutnya</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi Tambahan (Opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Detail tambahan jika diperlukan..."
              data-testid="consultation-description-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prioritas</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ConsultationPriority)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="consultation-priority-select"
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>{fmtPriority(p)}</option>
              ))}
            </select>
          </div>

          {/* PT Establishment Required Fields - shown only if PT need detected */}
          {showPtFields && (
            <div className="border-t pt-4 mt-4 space-y-4">
              <h4 className="text-md font-semibold text-slate-800">Data Pendirian PT (Diperlukan)</h4>
              <p className="text-xs text-slate-500 -mt-3">Lengkapi data berikut untuk mempercepat proses pendirian usaha Anda</p>
              
              <div>
                <label className="block text-sm font-medium mb-1">Nama Pendiri *</label>
                <input
                  type="text"
                  value={founder}
                  onChange={(e) => setFounder(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama lengkap semua pendiri"
                  data-testid="consultation-founder-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Struktur Kepemilikan Saham *</label>
                <textarea
                  value={ownership}
                  onChange={(e) => setOwnership(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  placeholder="Contoh: Andi 50%, Budi 30%, Citra 20%"
                  data-testid="consultation-ownership-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Jenis Badan Usaha *</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="consultation-businesstype-select"
                >
                  <option value="">Pilih jenis badan usaha</option>
                  {businessTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Domisili Perusahaan *</label>
                <input
                  type="text"
                  value={domicile}
                  onChange={(e) => setDomicile(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Alamat kantor pusat/kota domisili"
                  data-testid="consultation-domicile-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kode KBLI *</label>
                <input
                  type="text"
                  value={kbli}
                  onChange={(e) => setKbli(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Klasifikasi Baku Lapangan Usaha Indonesia (contoh: 62011"
                  data-testid="consultation-kbli-input"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              disabled={loading}
              data-testid="submit-consultation-button"
            >
              {loading ? "Memproses..." : "Kirim Konsultasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}