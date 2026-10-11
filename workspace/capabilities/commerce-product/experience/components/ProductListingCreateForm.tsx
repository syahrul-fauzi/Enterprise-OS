"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "@repo/presentation-hooks";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

// COM-001: Kategori produk marketplace untuk verifikasi lintas-domain boundary
const PRODUCT_CATEGORIES = [
  "Elektronik",
  "Pakaian & Aksesoris",
  "Peralatan Rumah Tangga",
  "Kecantikan & Kesehatan",
  "Makanan & Minuman",
  "Mainan & Hobi",
  "Perlengkapan Olahraga",
  "Kendaraan",
] as const;

type ProductCategory = typeof PRODUCT_CATEGORIES[number];

interface ProductListingCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string; // Required session context dari core auth (sesuai pola SID/ILC/LH)
  tenantId: string;
  workspaceId: string; // Workspace HANYA sebagai execution context, bukan parent
  actorId: string;
}

export function ProductListingCreateForm({ 
  isOpen, 
  onClose, 
  sessionId,
  tenantId,
  workspaceId,
  actorId
}: ProductListingCreateFormProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Elektronik");
  const [stockQuantity, setStockQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);
  const [skuError, setSkuError] = useState("");

  // COM-001: Validasi SKU product (minimum 6 karakter alfanumerik)
  const validateSKU = (value: string): boolean => {
    if (value.length < 6) {
      setSkuError("SKU harus minimal 6 karakter");
      return false;
    }
    if (!/^[A-Z0-9]+$/.test(value)) {
      setSkuError("SKU hanya boleh berisi huruf besar dan angka");
      return false;
    }
    setSkuError("");
    return true;
  };

  // Sinkronisasi state modal dengan parent prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price.trim()) return;
    
    // Validasi SKU sebelum submit
    if (!validateSKU(sku)) return;

    setLoading(true);
    try {
      // COM-001: Invoke command product-listing.create dari capability registry
      // Semua context (tenant, workspace, actor) dikirim sebagai parameter, bukan menjadi parent di database
      await capabilityRegistry.invokeAsync("commerce-product", "product-listing.create", {
        title,
        description,
        price: parseFloat(price),
        sku,
        category,
        stockQuantity,
        sessionId,
        tenantId,
        workspaceId, // Workspace sebagai execution context, bukan owner
        actorId,
      });

      // Reset form setelah berhasil
      setTitle("");
      setDescription("");
      setPrice("");
      setSku("");
      setCategory("Elektronik");
      setStockQuantity(10);
      onClose();
      
      // Trigger refresh daftar listing di workspace
      window.dispatchEvent(new CustomEvent('product-listings:refresh'));
      console.log("[ProductListingCreateForm] Product listing created successfully - COM-001 mandate terpenuhi");
    } catch (err) {
      console.error("[ProductListingCreateForm] Failed to create product listing:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  // Disable submit jika field mandatory belum terisi
  const isSubmitDisabled = loading || !title.trim() || !price.trim() || !sku.trim() || skuError;
  const submitLabel = loading ? "Memproses..." : "Tambah Produk";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold">Tambah Listing Produk Baru</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Tutup form"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3" aria-label="Form tambah listing produk">
          {/* Core fields yang sama dengan semua slice (reuse work-core primitive) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan nama produk..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Produk</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail produk, spesifikasi, dan manfaatnya..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* COM-001: Field khusus produk yang diperlukan untuk economic value testing */}
          <div className="md:col-span-3 mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Detail Produk (wajib untuk marketplace)</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Stock Keeping Unit) *</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="PROD001"
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${skuError ? 'border-red-500' : 'border-gray-300'}`}
            />
            {skuError && <p className="text-red-500 text-xs mt-1">{skuError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="150000"
              min="0"
              step="1000"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
            <input
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-500 text-xs mt-1">Stok &lt; 5 akan otomatis ditandai low stock</p>
          </div>

          {/* Debug metadata untuk verifikasi context (bukan disimpan sebagai parent) */}
          <div className="md:col-span-3 mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-600">
            <p>Execution Context (bukan ownership): workspaceId={workspaceId} | tenantId={tenantId} | actorId={actorId}</p>
            <p className="mt-1">COM-001: Work sebagai invariant, semua context di atas adalah execution/relation, bukan hierarchy.</p>
          </div>

          <div className="md:col-span-3 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}