"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "@repo/presentation-hooks";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { Card } from "@repo/presentation-ui-system";

// DIGIOP-102: Platform yang didukung untuk Digital Growth Ops (sesuai eos.yaml)
const SUPPORTED_PLATFORMS = [
  "wordpress",
  "shopify", 
  "tokopedia",
  "shopee"
] as const;

type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number];

interface DigitalGrowthOpsRegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string; // Required session context dari core auth
  tenantId: string;
  workspaceId: string; // Workspace sebagai execution context, bukan parent
  actorId: string;
}

export function DigitalGrowthOpsRegistrationForm({ 
  isOpen, 
  onClose, 
  sessionId,
  tenantId,
  workspaceId,
  actorId
}: DigitalGrowthOpsRegistrationFormProps) {
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
      // CR-006: Inisiasi pembayaran Midtrans sebelum submit onboarding
      const midtransResult = await capabilityRegistry.invoke("payment-gateway", "create-transaction", {
        packageId: "digital-growth-ops",
        customerEmail: businessEmail,
        grossAmount: "249000", // Harga Digital Growth Ops IDR 249rb/bulan
        metadata: {
          workId: "DIGIOP-102",
          tenantId,
          websiteUrl
        }
      });

      // Tunggu user menyelesaikan pembayaran (simulasi untuk development, production gunakan webhook)
      const paymentVerified = await capabilityRegistry.invoke("payment-gateway", "wait-for-payment-verification", {
        transactionId: midtransResult.transactionId,
        timeout: 300000 // 5 menit timeout
      });

      // DIGIOP-102: Invoke command schedule-onboarding dari service-directory capability
      // Semua context (tenant, workspace, actor) dikirim sebagai parameter, bukan menjadi parent di database
      await capabilityRegistry.invoke("service-directory", "schedule-onboarding", {
        packageId: "digital-growth-ops",
        // CORE-001: Sertakan priority ke schedule-onboarding command (mandatory compliance)
        priority,
        customerData: {
          businessName,
          businessEmail,
          phoneNumber: businessPhone,
          websiteUrl,
          ecommercePlatform: "",
          crmSystem: "",
          marketplaceIntegrations: selectedPlatforms.join(", "),
          assetDetails: `Platforms: ${selectedPlatforms.join(", ")}`,
          technicalContactName: "",
          technicalContactEmail: "",
          financeContactName: "",
          financeContactEmail: ""
        },
        // Midtrans transaction data untuk validasi pembayaran
        midtransTransactionId: midtransResult.transactionId,
        midtransPaymentStatus: paymentVerified.status,
        grossAmount: "249000",
        workId: "DIGIOP-102",
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
      
      // Trigger refresh daftar paket di workspace
      window.dispatchEvent(new CustomEvent('digital-operations:onboarding-submitted'));
      console.log("[DigitalGrowthOpsRegistrationForm] Pendaftaran berhasil dikirim - DIGIOP-102 mandate terpenuhi");
    } catch (err) {
      console.error("[DigitalGrowthOpsRegistrationForm] Gagal mengirim pendaftaran:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  // Disable submit jika field mandatory belum terisi
  const isSubmitDisabled = loading || !businessName.trim() || !businessEmail.trim() || selectedPlatforms.length === 0 || emailError;
  const submitLabel = loading ? "Memproses pendaftaran..." : "Daftar Digital Growth Ops";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold">Daftar Paket Digital Growth Ops</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Tutup form"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" aria-label="Form pendaftaran Digital Growth Ops">
          {/* Core fields untuk identitas bisnis */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Informasi Bisnis</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bisnis *</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Masukkan nama bisnis Anda..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Bisnis *</label>
            <input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              placeholder="bisnis@contoh.com"
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? 'border-red-500' : 'border-gray-300'}`}
            />
            {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
            <input
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="+62 812 xxx xxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Website/Toko</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://tokoanda.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* CORE-001: Priority field WAJIB untuk semua service request (mandatory compliance) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat Prioritas *</label>
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

          {/* DIGIOP-102: Field khusus platform yang akan diintegrasikan */}
          <div className="md:col-span-2 mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Platform yang Akan Dikelola * (pilih minimal satu)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SUPPORTED_PLATFORMS.map((platform) => (
                <label 
                  key={platform}
                  className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedPlatforms.includes(platform) 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform)}
                    onChange={() => handlePlatformToggle(platform)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="capitalize">{platform}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Debug metadata untuk verifikasi context (bukan disimpan sebagai parent) */}
          <div className="md:col-span-2 mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-600">
            <p>Execution Context (bukan ownership): workspaceId={workspaceId} | tenantId={tenantId} | actorId={actorId}</p>
            <p className="mt-1">DIGIOP-102: Work sebagai invariant, semua context di atas adalah execution/relation, bukan hierarchy.</p>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
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
      </Card>
    </div>
  );
}