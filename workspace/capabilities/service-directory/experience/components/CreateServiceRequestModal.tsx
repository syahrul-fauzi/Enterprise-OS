"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "@repo/presentation-hooks";
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

interface BatchRequestItem {
  id: string;
  title: string;
  description: string;
  category: ServiceProviderCategory;
  budget?: string;
}

interface BatchCreateServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBatch: (items: BatchRequestItem[]) => Promise<void>;
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
  const { t } = useLocale();
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
          <h3 className="text-xl font-bold">{t("services.modal.createHeading")}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("services.modal.titleLabel")} *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder={t("services.modal.titlePlaceholder")}
              required
              data-testid="service-request-title-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("services.modal.descriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition"
              placeholder={t("services.modal.descriptionPlaceholder")}
              data-testid="service-request-description-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("services.modal.categoryLabel")} *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceProviderCategory)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
              data-testid="service-request-category-select"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("services.modal.budgetLabel")}</label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder={t("services.modal.budgetPlaceholder")}
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
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
              data-testid="submit-service-request-button"
            >
              {loading ? t("common.creating") : t("services.modal.createButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BatchCreateServiceRequestModal({ isOpen, onClose, onSubmitBatch }: BatchCreateServiceRequestModalProps) {
  const { t } = useLocale();
  const [items, setItems] = useState<BatchRequestItem[]>([{
    id: crypto.randomUUID(),
    title: "",
    description: "",
    category: "IT Support" as ServiceProviderCategory,
    budget: ""
  }]);
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['first']));

  // Sync with parent isOpen prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
    if (isOpen) {
      // Reset to single item when opening
      setItems([{
        id: crypto.randomUUID(),
        title: "",
        description: "",
        category: "IT Support" as ServiceProviderCategory,
        budget: ""
      }]);
      setExpandedItems(new Set(['first']));
    }
  }, [isOpen]);

  const addNewItem = () => {
    const newId = crypto.randomUUID();
    setItems([...items, {
      id: newId,
      title: "",
      description: "",
      category: "IT Support" as ServiceProviderCategory,
      budget: ""
    }]);
    // Expand the new item
    setExpandedItems(prev => new Set([...prev, newId]));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return; // Prevent removing last item
    setItems(items.filter(item => item.id !== id));
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateItem = (id: string, updates: Partial<BatchRequestItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isItemExpanded = (id: string, index: number) => {
    return expandedItems.has(id) || (index === 0 && expandedItems.has('first'));
  };

  const validItemsCount = items.filter(item => item.title.trim().length > 0).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validItemsCount === 0) return;
    
    const validItems = items.filter(item => item.title.trim().length > 0);
    
    setLoading(true);
    try {
      await onSubmitBatch(validItems);
      // Reset state
      setItems([{
        id: crypto.randomUUID(),
        title: "",
        description: "",
        category: "IT Support" as ServiceProviderCategory,
        budget: ""
      }]);
      onClose();
      window.dispatchEvent(new CustomEvent('service-requests:refresh'));
    } catch (err) {
      console.error("[BatchCreateServiceRequestModal] Failed to create batch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{t("services.modal.batchCreateHeading")}</h3>
              <p className="text-sm text-gray-500 mt-1">{t("services.modal.batchSubheading", { count: validItemsCount, total: items.length })}</p>
            </div>
            <button
              onClick={addNewItem}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              type="button"
            >
              + {t("services.modal.addAnother")}
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className="border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm"
            >
              <div 
                className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.title.trim() || t("services.modal.untitledRequest")}
                    </p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title={t("common.delete")}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <svg 
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isItemExpanded(item.id, index) ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {isItemExpanded(item.id, index) && (
                <div className="p-4 space-y-4 bg-white">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("services.modal.titleLabel")} *</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      placeholder={t("services.modal.titlePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("services.modal.descriptionLabel")}</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] transition"
                      placeholder={t("services.modal.descriptionPlaceholder")}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t("services.modal.categoryLabel")} *</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(item.id, { category: e.target.value as ServiceProviderCategory })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t("services.modal.budgetLabel")}</label>
                      <input
                        type="text"
                        value={item.budget || ""}
                        onChange={(e) => updateItem(item.id, { budget: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder={t("services.modal.budgetPlaceholder")}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              disabled={loading || validItemsCount === 0}
              data-testid="submit-batch-service-request-button"
            >
              {loading ? t("common.creating") : `${t("services.modal.batchCreateButton")} (${validItemsCount})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}