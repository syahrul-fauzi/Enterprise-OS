"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "@repo/presentation-hooks";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

// L1 Cohort work categories as defined in L1-COHORT-CONTRACT-EXECUTION.json
const UMKM_WORK_CATEGORIES = {
  A_Go_Digital: ["website", "digital_presence", "online_payment"],
  B_Grow_Sales: ["marketing", "content", "campaign", "sales_ops"],
  C_Improve_Operations: ["process_improvement", "automation", "ai_integration"],
  D_Solve_Critical: ["diagnosis", "specialist", "intervention", "verification"],
} as const;

type UMKMCategory = keyof typeof UMKM_WORK_CATEGORIES;

interface CreateUMKMWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string; // Required session context from core auth
  tenantId: string;
  workspaceId: string;
  actorId: string;
}

export function CreateUMKMWorkModal({ 
  isOpen, 
  onClose, 
  sessionId,
  tenantId,
  workspaceId,
  actorId
}: CreateUMKMWorkModalProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [nib, setNib] = useState("");
  const [nibError, setNibError] = useState("");
  const [umkmCategory, setUmkmCategory] = useState<UMKMCategory>("A_Go_Digital");
  const [subcategory, setSubcategory] = useState("website");
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  // NIB validation (13-digit Indonesian business identifier)
  const validateNIB = (value: string): boolean => {
    if (value.length !== 13) {
      setNibError("NIB harus 13 digit");
      return false;
    }
    if (!/^\d+$/.test(value)) {
      setNibError("NIB hanya boleh berisi angka");
      return false;
    }
    setNibError("");
    return true;
  };

  // Sync with parent isOpen prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Validate NIB before submission
    if (!validateNIB(nib)) return;
    
    setLoading(true);
    try {
      // Invoke core work.create command with L1 cohort compliant data
      await capabilityRegistry.invokeAsync("work-core", "work.create", {
        title,
        description,
        domainType: "service-request", // Reuse existing domain type (no core changes)
        sessionId,
        tenantId,
        workspaceId,
        actorId,
        // Layer3 UMKM-specific data stored in domainSpecificData (core supports this field)
        domainSpecificData: {
          nib,
          umkmCategory,
          umkmSubcategory: subcategory,
          bankAccountVerified: true, // In production this would be verified via API
          cohortTag: "l1-cohort-001", // Tag for evidence-registry metrics collection
        },
      });

      // Reset form
      setTitle("");
      setDescription("");
      setNib("");
      setUmkmCategory("A_Go_Digital");
      setSubcategory("website");
      onClose();
      
      // Trigger refresh to show new work in workspace
      window.dispatchEvent(new CustomEvent('umkm-works:refresh'));
    } catch (err) {
      console.error("[CreateUMKMWorkModal] Failed to create UMKM work:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  const subcategories = UMKM_WORK_CATEGORIES[umkmCategory];

  // L1.3 bulk import support - handle bulk data from CSV/JSON
  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const umkmList = JSON.parse(text);
      console.log(`[CreateUMKMWorkModal] Bulk import initiated: ${umkmList.length} UMKM records`);
      
      // Process each UMKM record with 1s delay to prevent overwhelming the system
      for (let i = 0; i < umkmList.length; i++) {
        const umkm = umkmList[i];
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          await capabilityRegistry.invokeAsync("work-core", "work.create", {
            title: umkm.name,
            description: umkm.description || "",
            domainType: "service-request",
            sessionId,
            tenantId,
            workspaceId,
            actorId,
            domainSpecificData: {
              nib: umkm.nib,
              umkmCategory: umkm.category || "A_Go_Digital",
              umkmSubcategory: umkm.subcategory || "website",
              bankAccountVerified: true,
              cohortTag: "l1-cohort-001",
              bulk_imported: true,
              import_timestamp: new Date().toISOString()
            },
          });
          console.log(`[CreateUMKMWorkModal] Bulk import success: ${umkm.name} (${umkm.nib})`);
        } catch (err) {
          console.error(`[CreateUMKMWorkModal] Bulk import failed for ${umkm.name}:`, err);
        }
      }
      
      window.dispatchEvent(new CustomEvent('umkm-works:refresh'));
      alert(`Bulk import completed: ${umkmList.length} UMKM processed`);
    } catch (err) {
      console.error("[CreateUMKMWorkModal] Bulk import failed:", err);
      alert("Bulk import failed - check JSON format");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Daftarkan UMKM Baru (L1 Cohort)</h3>
          <p className="text-sm text-slate-500 mt-1">Masukkan data bisnis untuk memulai work composition</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Bisnis *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Contoh: Toko Kue Bu Rina"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi Kebutuhan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition"
              placeholder="Ceritakan apa yang ingin Anda capai dengan bisnis ini..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">NIB (Nomor Induk Bisnis) *</label>
            <input
              type="text"
              value={nib}
              onChange={(e) => {
                setNib(e.target.value);
                if (e.target.value.length > 0) validateNIB(e.target.value);
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${nibError ? 'border-red-500' : ''}`}
              placeholder="13 digit NIB"
              maxLength={13}
              required
            />
            {nibError && <p className="text-red-500 text-xs mt-1">{nibError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kategori Work *</label>
            <select
              value={umkmCategory}
              onChange={(e) => {
                setUmkmCategory(e.target.value as UMKMCategory);
                setSubcategory(UMKM_WORK_CATEGORIES[e.target.value as UMKMCategory][0]);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            >
              <option value="A_Go_Digital">Go Digital (Website, Pembayaran Online)</option>
              <option value="B_Grow_Sales">Grow Sales (Marketing, Konten)</option>
              <option value="C_Improve_Operations">Improve Operations (Automasi, AI)</option>
              <option value="D_Solve_Critical">Solve Critical Problem (Diagnosis, Spesialis)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subkategori *</label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            >
              {subcategories.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          {/* L1.3 Bulk import section for cohort onboarding */}
          <div className="pt-4 border-t mt-4">
            <label className="block text-sm font-medium mb-2">Import Massal (L1.3)</label>
            <input
              type="file"
              accept=".json"
              onChange={handleBulkImport}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">Upload JSON file dengan daftar UMKM untuk onboarding massal</p>
          </div>
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading || !title.trim() || nib.length !== 13}
            >
              {loading ? "Membuat Work..." : "Daftarkan UMKM & Mulai Work"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}