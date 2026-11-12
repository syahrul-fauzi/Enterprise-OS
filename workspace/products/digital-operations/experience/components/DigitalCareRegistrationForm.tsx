"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "../../../../packages/presentation/hooks/src/use-locale/use-locale";
import { capabilityRegistry } from "../../../../packages/core/kernel/src/registry/capability-command-registry";
import { Card } from "../../../../packages/presentation/ui-system/src/components/card/card";

// DIGIOP-101: Platform yang didukung untuk Digital Care (sesuai eos.yaml)
const SUPPORTED_PLATFORMS = [
  "wordpress",
  "static-html",
  "blogger",
  "hosting-umum"
] as const;

type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number];

interface DigitalCareRegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string; // Required session context dari core auth
  tenantId: string;
  workspaceId: string; // Workspace sebagai execution context, bukan parent
  actorId: string;
}

export function DigitalCareRegistrationForm({ 
  isOpen, 
  onClose, 
  sessionId,
  tenantId,
  workspaceId,
  actorId
}: DigitalCareRegistrationFormProps) {
  const { t } = useLocale();
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SupportedPlatform[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);
  const [emailError, setEmailError] = useState("");
  // CORE-001: Priority field WAJIB untuk semua service request (mandatory compliance)
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");

  // Validasi email
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("Email tidak valid");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Handle platform selection toggle
  const handlePlatformToggle = (platform: SupportedPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Sinkronisasi state modal dengan parent prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !businessEmail.trim() || selectedPlatforms.length === 0) return;
    
    // Validasi email sebelum submit
    if (!validateEmail(businessEmail)) return;

    setLoading(true);
    try {
      // DIGIOP-101: Invoke command schedule-onboarding dari service-directory capability
      // Semua context (tenant, workspace, actor) dikirim sebagai parameter, bukan menjadi parent di database
      await capabilityRegistry.invoke("service-directory", "schedule-onboarding", {
        packageId: "digital-care",
        // CORE-001: Sertakan priority ke schedule-onboarding command (mandatory compliance)
        priority,
        customerData: {
          businessName,
          businessEmail,
          phoneNumber: businessPhone,
          websiteUrl,
          ecommercePlatform: "",
          crmSystem: "",
          marketplaceIntegrations: "",
          assetDetails: `Platforms: ${selectedPlatforms.join(", ")}`,
          technicalContactName: "",
          technicalContactEmail: "",
          financeContactName: "",
          financeContactEmail: ""
        },
        workId: "DIGIOP-101",
        sessionId,
        tenantId,
        workspaceId, // Workspace sebagai execution context, bukan owner
        actorId,
        timestamp: new Date().toISOString()
      });

      // Reset form setelah berhasil
      setBusinessName("");
      setBusinessEmail("");
      setBusinessPhone("");
      setSelectedPlatforms([]);
      setWebsiteUrl("");
      onClose();
    } catch (error) {
      console.error("[DIGIOP-101] Gagal jadwalkan onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    localIsOpen ? (
      <Card className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Daftarkan Bisnis Anda ke Digital Care</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Bisnis</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email Bisnis</label>
            <input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nomor Telepon</label>
            <input
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL Website</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="https://contohwebsite.com"
              required
            />
          </div>

          {/* CORE-001: Priority field WAJIB untuk semua service request (mandatory compliance) */}
          <div>
            <label className="block text-sm font-medium mb-1">Tingkat Prioritas *</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Rendah - Onboarding reguler</option>
              <option value="medium">Sedang - Prioritas standar</option>
              <option value="high">Tinggi - Butuh perhatian cepat</option>
              <option value="critical">Kritis - Bisnis terhenti</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Platform Website</label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform)}
                    onChange={() => handlePlatformToggle(platform)}
                    className="h-4 w-4"
                  />
                  <span className="capitalize">{platform.replace("-", " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </div>
        </form>
      </Card>
    ) : null
  );
}