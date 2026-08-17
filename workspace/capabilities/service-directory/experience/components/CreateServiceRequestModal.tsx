"use client";

import React, { useState, useEffect } from "react";
import type { ServiceProviderCategory } from "../../implementation/contracts/service.contracts.js";

interface CreateServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    category: ServiceProviderCategory;
    budget?: string;
  }) => Promise<void>;
}

const categoryOptions: readonly ServiceProviderCategory[] = [
  "Cloud Services",
  "IT Support",
  "Infrastructure",
  "Cybersecurity",
  "Software Development",
  "Managed Services",
  "Data & Analytics",
];

export function CreateServiceRequestModal({ isOpen, onClose, onSubmit }: CreateServiceRequestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServiceProviderCategory>("IT Support");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  // Listen for the create event from the workspace button
  useEffect(() => {
    const handleCreate = () => setLocalIsOpen(true);
    window.addEventListener('service-requests:create', handleCreate);
    return () => window.removeEventListener('service-requests:create', handleCreate);
  }, []);

  // Sync with parent isOpen prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit({ title, description, category, budget: budget || undefined });
      setTitle("");
      setDescription("");
      setCategory("IT Support");
      setBudget("");
      onClose();
      // Trigger refresh to show new request
      window.dispatchEvent(new CustomEvent('service-requests:refresh'));
    } catch (err) {
      console.error("[CreateServiceRequestModal] Failed to create request:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Buat Permintaan Layanan Baru</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul Permintaan *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Misal: Perbaikan Server Kantor"
              required
              data-testid="service-request-title-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Jelaskan detail kebutuhan layanan Anda..."
              data-testid="service-request-description-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kategori Layanan *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceProviderCategory)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              data-testid="service-request-category-select"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estimasi Budget (Opsional)</label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Misal: Rp 50.000.000"
              data-testid="service-request-budget-input"
            />
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
              data-testid="submit-service-request-button"
            >
              {loading ? "Membuat..." : "Buat Permintaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}