"use client";
import { useLocale } from "../../../../workspace/packages/presentation/hooks/src/use-locale/use-locale";
import { capabilityRegistry } from "../../../../workspace/packages/core/kernel/src/registry/capability-command-registry";
import { Card } from "../../../../workspace/packages/presentation/ui-system/src/card/card";
import { Input } from "../../../../workspace/packages/presentation/ui-system/src/components/input/input";
import { Button } from "../../../../workspace/packages/presentation/ui-system/src/components/button/button";
import { useState } from "react";

// DIGIOP-104: Interface untuk menerima context yang diperlukan dari core auth dan execution context
interface ManagedDigitalOperationsRegistrationFormProps {
  sessionId: string; // Required session context dari core auth
  tenantId: string;
  workspaceId: string; // Workspace sebagai execution context, bukan parent
  actorId: string;
}

export function ManagedDigitalOperationsRegistrationForm({
  sessionId,
  tenantId,
  workspaceId,
  actorId
}: ManagedDigitalOperationsRegistrationFormProps) {
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // CORE-001: Priority field WAJIB untuk semua service request (mandatory compliance)
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [formData, setFormData] = useState({
    businessName: "",
    businessEmail: "",
    phoneNumber: "",
    websiteUrl: "",
    ecommercePlatform: "",
    crmSystem: "",
    marketplaceIntegrations: "",
    assetDetails: "",
    technicalContactName: "",
    technicalContactEmail: "",
    financeContactName: "",
    financeContactEmail: "",
    // DIGIOP-PILOT-001: Field untuk integrasi payment gateway untuk Automated Reconciliation
    paymentGatewayIntegration: "",
    // CR-006: Midtrans payment data yang diperlukan untuk paket berbayar
    midtransTransactionId: "",
    grossAmount: "15000000" // Default harga paket Managed Digital Operations (IDR 15Jt/bulan)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Validasi field yang diperlukan sebelum submit
      if (!formData.businessName || !formData.businessEmail || !formData.phoneNumber) {
        throw new Error(t("managed-operations.registration.required-fields-missing"));
      }

      // Validasi untuk paket Finance Operations Basic (DIGIOP-PILOT-001)
      if (!formData.midtransTransactionId) {
        throw new Error(t("managed-operations.registration.midtrans-transaction-id-required"));
      }

      // Invoke capability yang sudah terdaftar: schedule-onboarding dengan package ID yang benar
      const result = await capabilityRegistry.invoke("service-directory", "schedule-onboarding", {
        packageId: "finance-operations-basic",
        // CORE-001: Sertakan priority ke schedule-onboarding call (mandatory compliance)
        priority,
        customerData: {
          businessName: formData.businessName,
          businessEmail: formData.businessEmail,
          phoneNumber: formData.phoneNumber,
          websiteUrl: formData.websiteUrl,
          ecommercePlatform: formData.ecommercePlatform,
          crmSystem: formData.crmSystem,
          marketplaceIntegrations: formData.marketplaceIntegrations,
          assetDetails: formData.assetDetails,
          technicalContactName: formData.technicalContactName,
          technicalContactEmail: formData.technicalContactEmail,
          financeContactName: formData.financeContactName,
          financeContactEmail: formData.financeContactEmail,
          // DIGIOP-PILOT-001: Tambahkan flag untuk mengaktifkan reconciliation workflow
          enableAutomatedReconciliation: true,
          requiredPaymentGateways: formData.paymentGatewayIntegration // Field baru untuk integrasi payment gateway
        },
        workId: "DIGIOP-PILOT-001",
        sessionId,
        tenantId,
        workspaceId, // Workspace sebagai execution context, bukan owner
        actorId,
        timestamp: new Date().toISOString(),
        // CR-006: Kirimkan data Midtrans untuk validasi di backend via getMidtransPaymentStatus
        midtransTransactionId: formData.midtransTransactionId,
        midtransPaymentStatus: "pending", // Akan diverifikasi ulang di backend
        grossAmount: formData.grossAmount
      });

      setSuccess(true);
      console.log("[DIGIOP-104] ✅ Onboarding berhasil dikirim:", result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("[DIGIOP-104] Onboarding failed:", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">{t("managed-operations.registration.title")}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Bisnis Utama */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("common.business-name")}
            value={formData.businessName}
            onChange={(e) => setFormData({...formData, businessName: e.target.value})}
            required
          />
          <Input
            label={t("common.business-email")}
            type="email"
            value={formData.businessEmail}
            onChange={(e) => setFormData({...formData, businessEmail: e.target.value})}
            required
          />
        </div>

        {/* Detail Aset Bisnis */}
        <h3 className="text-xl font-semibold mt-8 mb-4">{t("managed-operations.assets.title")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("common.website-url")}
            value={formData.websiteUrl}
            onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
          />
          <Input
            label={t("managed-operations.ecommerce-platform")}
            value={formData.ecommercePlatform}
            onChange={(e) => setFormData({...formData, ecommercePlatform: e.target.value})}
          />
          <Input
            label={t("managed-operations.crm-system")}
            value={formData.crmSystem}
            onChange={(e) => setFormData({...formData, crmSystem: e.target.value})}
          />
          <Input
            label={t("managed-operations.marketplaces")}
            value={formData.marketplaceIntegrations}
            onChange={(e) => setFormData({...formData, marketplaceIntegrations: e.target.value})}
          />
        </div>
        <Input
          label={t("managed-operations.additional-assets")}
          value={formData.assetDetails}
          onChange={(e) => setFormData({...formData, assetDetails: e.target.value})}
          multiline
          rows={3}
        />

        {/* Contact Persons */}
        <h3 className="text-xl font-semibold mt-8 mb-4">{t("managed-operations.contacts.title")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("managed-operations.technical-contact-name")}
            value={formData.technicalContactName}
            onChange={(e) => setFormData({...formData, technicalContactName: e.target.value})}
            required
          />
          <Input
            label={t("managed-operations.technical-contact-email")}
            type="email"
            value={formData.technicalContactEmail}
            onChange={(e) => setFormData({...formData, technicalContactEmail: e.target.value})}
            required
          />
          <Input
            label={t("managed-operations.finance-contact-name")}
            value={formData.financeContactName}
            onChange={(e) => setFormData({...formData, financeContactName: e.target.value})}
            required
          />
          <Input
            label={t("managed-operations.finance-contact-email")}
            type="email"
            value={formData.financeContactEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, financeContactEmail: e.target.value})}
            required
          />
        </div>

        {/* CORE-001: Priority Selection untuk Service Request */}
        <h3 className="text-xl font-semibold mt-8 mb-4">{t("managed-operations.priority.title")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("managed-operations.priority.label")} *
            </label>
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
        </div>

        {/* CR-006: Informasi Pembayaran Midtrans */}
        <h3 className="text-xl font-semibold mt-8 mb-4">{t("managed-operations.payment.title")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("managed-operations.payment.midtrans-transaction-id")}
            value={formData.midtransTransactionId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, midtransTransactionId: e.target.value})}
            required
            placeholder="MIDTRANS-XXXX-XXXX-XXXX"
          />
          <Input
            label={t("managed-operations.payment.amount")}
            value={formData.grossAmount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, grossAmount: e.target.value})}
            disabled
          />
        </div>

        {/* DIGIOP-PILOT-001: Payment Gateway Integrations untuk Reconciliation */}
        <h3 className="text-xl font-semibold mt-8 mb-4">{t("managed-operations.finance-integration.title")}</h3>
        <Input
          label={t("managed-operations.finance-integration.payment-gateways")}
          value={formData.paymentGatewayIntegration}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, paymentGatewayIntegration: e.target.value})}
          required
          placeholder="Midtrans, Xendit, GoPay, ShopeePay, atau Bank Transfer (manual upload)"
        />

        {/* Pesan error dan success */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
            {t("managed-operations.registration.success")}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full mt-8" 
          disabled={isSubmitting}
        >
          {isSubmitting ? t("common.submitting") : t("managed-operations.registration.submit")}
        </Button>
      </form>
    </Card>
  );
}