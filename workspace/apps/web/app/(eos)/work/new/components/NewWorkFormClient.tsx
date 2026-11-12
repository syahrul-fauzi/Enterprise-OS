"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Card, 
  Input, 
  TextArea, 
  Button,
  ErrorState
} from "@repo/presentation-ui-system";
import { Loader2 } from "lucide-react";
import type { NewWorkFormClientProps } from "./types";

export function NewWorkFormClient({
  intent,
  intentId,
  workType = "general",
  handleWorkCreation,
}: NewWorkFormClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    objective: "",
    description: "",
    // BPJS Construction specific fields (SLICE-006) - only used when workType = "bpjs-construction"
    project_number: "",
    contractor_name: "",
    worker_estimate: 0,
    project_location: "",
    // Healthcare specific fields (W-INDUSTRY-001-01) - only used when workType = "healthcare-appointment"
    patient_name: "",
    patient_nik: "",
    appointment_date: "",
    appointment_time: "",
    service_type: "",
    // BPJS Kesehatan Claim specific fields (W-DOMAIN-002-01) - only used when workType = "bpjs-kesehatan-claim"
    claim_number: "",
    claim_date: "",
    medical_facility_name: "",
    diagnosis_code: "",
    service_category: "",
    // ACaaS Compliance Check specific fields (ACaaS-COMMERCIAL-001) - only used when workType = "acaas-compliance-check"
    documentType: "",
    documentData: "",
    compliancePolicies: ["ppn-invoice-validation"] as string[],
    invoiceNumber: "",
    taxPeriod: "",
    amount: 0,
    seller: "",
    buyer: "",
    // LawyersHub / Legal Case specific fields (AGENTIC-LAW-001) - only used when workType = "legal-case"
    client_name: "",
    case_number: "",
    case_type: "",
    court_jurisdiction: "",
    deadline_date: "",
    // SMACE / SNI Certification specific fields (SMACE-004) - only used when workType = "sni-certification"
    product_model_number: "",
    sni_standard_type: "",
    factory_location: ""
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await handleWorkCreation({
        ...formData,
        intentId,
      });
      
      if (result?.workId) {
        router.push(`/work/${result.workId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pekerjaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-surface-background px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          {error && <ErrorState title="Gagal membuat pekerjaan" description={error} />}
          
          <Card className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-text-primary mb-6">
              {intent ? `Mulai Pekerjaan: ${intent.title}` : "Buat Pekerjaan Baru"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                id="title"
                name="title"
                label="Judul Pekerjaan"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Masukkan judul yang jelas dan spesifik..."
                className="w-full"
              />

              <TextArea
                id="objective"
                name="objective"
                label="Tujuan Utama"
                rows={3}
                required
                value={formData.objective}
                onChange={(e) => setFormData({...formData, objective: e.target.value})}
                placeholder="Apa tujuan utama dari pekerjaan ini? Apa yang ingin dicapai?"
                className="w-full resize-none"
              />

              <TextArea
                id="description"
                name="description"
                label="Deskripsi / Konteks Tambahan"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Tambahkan informasi tambahan, dokumen yang tersedia, atau hal lain yang relevan..."
                className="w-full resize-none"
              />

              {/* Paket Layanan Digital Operations - workType selector untuk user */}
              <div className="border-t border-border-subtle pt-6 mt-6 space-y-6">
                <h3 className="text-lg font-semibold text-text-primary">Pilih Paket Layanan</h3>
                <select
                  id="workType"
                  name="workType"
                  value={workType}
                  onChange={(e) => {
                    // Redirect untuk set searchParams workType agar form fields sesuai
                    window.location.href = `/work/new?workType=${e.target.value}`;
                  }}
                  className="w-full p-3 border border-border-subtle rounded-md bg-surface-background text-text-primary"
                >
                  <option value="general">Umum</option>
                  <option value="website-fix">Website Fix (Single Issue)</option>
                  <option value="digital-care">Digital Care (Basic Managed)</option>
                  <option value="digital-growth-ops">Digital Growth Ops (Growth Managed)</option>
                  <option value="managed-digital-operations">Managed Digital Business Operations (Enterprise)</option>
                  <option value="bpjs-construction">Proyek Konstruksi BPJS</option>
                  <option value="healthcare-appointment">Janji Temu Kesehatan</option>
                  <option value="bpjs-kesehatan-claim">Klaim BPJS Kesehatan</option>
                  <option value="acaas-compliance-check">Pemeriksaan Kepatuhan ACaaS</option>
                  <option value="legal-case">Kasus Hukum</option>
                  <option value="sni-certification">Sertifikasi SNI</option>
                </select>
              </div>

              {/* SLICE-006: BPJS Construction specific form fields - only rendered for construction work */}
              {workType === "bpjs-construction" && (
                <div className="border-t border-border-subtle pt-6 mt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-text-primary">Detail Proyek Konstruksi (BPJS Ketenagakerjaan)</h3>
                  
                  <Input
                    id="project_number"
                    name="project_number"
                    label="Nomor Proyek"
                    required
                    value={formData.project_number}
                    onChange={(e) => setFormData({...formData, project_number: e.target.value})}
                    placeholder="Masukkan nomor proyek konstruksi yang terdaftar..."
                    className="w-full"
                  />

                  <Input
                    id="contractor_name"
                    name="contractor_name"
                    label="Nama Kontraktor"
                    required
                    value={formData.contractor_name}
                    onChange={(e) => setFormData({...formData, contractor_name: e.target.value})}
                    placeholder="Nama perusahaan kontraktor yang menangani proyek..."
                    className="w-full"
                  />

                  <Input
                    id="worker_estimate"
                    name="worker_estimate"
                    label="Estimasi Jumlah Pekerja"
                    type="number"
                    required
                    value={formData.worker_estimate || ""}
                    onChange={(e) => setFormData({...formData, worker_estimate: parseInt(e.target.value) || 0})}
                    placeholder="Estimasi jumlah pekerja yang terlibat dalam proyek..."
                    className="w-full"
                  />

                  <TextArea
                    id="project_location"
                    name="project_location"
                    label="Lokasi Proyek"
                    rows={2}
                    required
                    value={formData.project_location}
                    onChange={(e) => setFormData({...formData, project_location: e.target.value})}
                    placeholder="Alamat lengkap lokasi proyek konstruksi..."
                    className="w-full resize-none"
                  />
                </div>
              )}

              {/* W-DOMAIN-002-01: BPJS Kesehatan Claim specific form fields - only rendered for healthcare claim work */}
              {workType === "bpjs-kesehatan-claim" && (
                <div className="border-t border-border-subtle pt-6 mt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-text-primary">Detail Klaim BPJS Kesehatan</h3>
                  
                  <Input
                    id="patient_name"
                    name="patient_name"
                    label="Nama Pasien"
                    required
                    value={formData.patient_name}
                    onChange={(e) => setFormData({...formData, patient_name: e.target.value})}
                    placeholder="Masukkan nama lengkap pasien..."
                    className="w-full"
                  />

                  <Input
                    id="patient_nik"
                    name="patient_nik"
                    label="NIK Pasien"
                    required
                    value={formData.patient_nik}
                    onChange={(e) => setFormData({...formData, patient_nik: e.target.value})}
                    placeholder="Masukkan NIK pasien..."
                    className="w-full"
                  />

                  <Input
                    id="claim_number"
                    name="claim_number"
                    label="Nomor Klaim BPJS"
                    required
                    value={formData.claim_number}
                    onChange={(e) => setFormData({...formData, claim_number: e.target.value})}
                    placeholder="Masukkan nomor klaim BPJS yang terdaftar..."
                    className="w-full"
                  />

                  <Input
                    id="claim_date"
                    name="claim_date"
                    label="Tanggal Pengajuan Klaim"
                    type="date"
                    required
                    value={formData.claim_date}
                    onChange={(e) => setFormData({...formData, claim_date: e.target.value})}
                    className="w-full"
                  />

                  <Input
                    id="medical_facility_name"
                    name="medical_facility_name"
                    label="Nama Fasilitas Kesehatan"
                    required
                    value={formData.medical_facility_name}
                    onChange={(e) => setFormData({...formData, medical_facility_name: e.target.value})}
                    placeholder="Nama rumah sakit/faskes yang menangani..."
                    className="w-full"
                  />

                  <Input
                    id="diagnosis_code"
                    name="diagnosis_code"
                    label="Kode Diagnosa (ICD-10)"
                    required
                    value={formData.diagnosis_code}
                    onChange={(e) => setFormData({...formData, diagnosis_code: e.target.value})}
                    placeholder="Masukkan kode diagnosa ICD-10..."
                    className="w-full"
                  />

                  <Input
                    id="service_category"
                    name="service_category"
                    label="Kategori Layanan"
                    required
                    value={formData.service_category}
                    onChange={(e) => setFormData({...formData, service_category: e.target.value})}
                    placeholder="Kategori layanan (rawat inap/rawat jalan/kontingen)"
                    className="w-full"
                  />
                </div>
              )}

              {/* ACaaS-COMMERCIAL-001: ACaaS Compliance Check specific form fields - only rendered for compliance work */}
              {workType === "acaas-compliance-check" && (
                <div className="border-t border-border-subtle pt-6 mt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-text-primary">Detail Pemeriksaan Kepatuhan (ACaaS)</h3>
                  
                  <Input
                    id="documentType"
                    name="documentType"
                    label="Tipe Dokumen"
                    required
                    value={formData.documentType || ""}
                    onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                    placeholder="Pilih tipe dokumen (ppn-invoice, pph21, bpjs, dll.)..."
                    className="w-full"
                  />

                  <Input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    label="Nomor Faktur PPN"
                    value={formData.invoiceNumber || ""}
                    onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                    placeholder="Masukkan nomor faktur PPN (13 digit)..."
                    className="w-full"
                  />

                  <Input
                    id="taxPeriod"
                    name="taxPeriod"
                    label="Masa Pajak"
                    type="month"
                    value={formData.taxPeriod || ""}
                    onChange={(e) => setFormData({...formData, taxPeriod: e.target.value})}
                    className="w-full"
                  />

                  <Input
                    id="amount"
                    name="amount"
                    label="Nilai Transaksi (Rp)"
                    type="number"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    placeholder="Masukkan nilai transaksi..."
                    className="w-full"
                  />

                  <Input
                    id="seller"
                    name="seller"
                    label="Penjual (NPWP/Nama)"
                    value={formData.seller || ""}
                    onChange={(e) => setFormData({...formData, seller: e.target.value})}
                    placeholder="Masukkan data penjual..."
                    className="w-full"
                  />

                  <Input
                    id="buyer"
                    name="buyer"
                    label="Pembeli (NPWP/Nama)"
                    value={formData.buyer || ""}
                    onChange={(e) => setFormData({...formData, buyer: e.target.value})}
                    placeholder="Masukkan data pembeli..."
                    className="w-full"
                  />

                  <Input
                    id="compliancePolicies"
                    name="compliancePolicies"
                    label="Kebijakan Kepatuhan (pisahkan dengan koma)"
                    required
                    value={formData.compliancePolicies?.length ? formData.compliancePolicies.join(", ") : "ppn-invoice-validation"}
                    onChange={(e) => setFormData({...formData, compliancePolicies: e.target.value.split(",").map(s => s.trim())})}
                    placeholder="ppn-invoice-validation, dll."
                    className="w-full"
                  />
                </div>
              )}

              {/* AGENTIC-LAW-001: LawyersHub / Legal Case specific form fields - only rendered for legal-case work */}
              {workType === "legal-case" && (
                <div className="border-t border-border-subtle pt-6 mt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-text-primary">Detail Kasus Hukum (LawyersHub)</h3>
                  
                  <Input
                    id="client_name"
                    name="client_name"
                    label="Nama Klien"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    placeholder="Masukkan nama klien yang terdaftar..."
                    className="w-full"
                  />

                  <Input
                    id="case_number"
                    name="case_number"
                    label="Nomor Kasus"
                    required
                    value={formData.case_number}
                    onChange={(e) => setFormData({...formData, case_number: e.target.value})}
                    placeholder="Masukkan nomor kasus yang terdaftar di pengadilan..."
                    className="w-full"
                  />

                  <Input
                    id="case_type"
                    name="case_type"
                    label="Tipe Kasus"
                    required
                    value={formData.case_type}
                    onChange={(e) => setFormData({...formData, case_type: e.target.value})}
                    placeholder="Contoh: Perdata, Pidana, Dagang, dll."
                    className="w-full"
                  />

                  <Input
                    id="court_jurisdiction"
                    name="court_jurisdiction"
                    label="Yurisdiksi Pengadilan"
                    required
                    value={formData.court_jurisdiction}
                    onChange={(e) => setFormData({...formData, court_jurisdiction: e.target.value})}
                    placeholder="Contoh: PN Jakarta Pusat, PT DKI Jakarta, dll."
                    className="w-full"
                  />

                  <Input
                    id="deadline_date"
                    name="deadline_date"
                    label="Batas Waktu Penyelesaian"
                    type="date"
                    required
                    value={formData.deadline_date}
                    onChange={(e) => setFormData({...formData, deadline_date: e.target.value})}
                    className="w-full"
                  />
                  
                  <Input
                    id="documentType"
                    name="documentType"
                    label="Tipe Dokumen"
                    required
                    value={formData.documentType}
                    onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                    placeholder="Pilih tipe dokumen (pph21, ppn, bpjs, dll.)..."
                    className="w-full"
                  />

                  <TextArea
                    id="documentData"
                    name="documentData"
                    label="Data Dokumen (JSON)"
                    rows={5}
                    required
                    value={formData.documentData}
                    onChange={(e) => setFormData({...formData, documentData: e.target.value})}
                    placeholder="Masukkan data dokumen dalam format JSON..."
                    className="w-full resize-none font-mono text-sm"
                  />

                  <Input
                    id="compliancePolicies"
                    name="compliancePolicies"
                    label="Kebijakan Kepatuhan (pisahkan dengan koma)"
                    required
                    value={formData.compliancePolicies.join(", ")}
                    onChange={(e) => setFormData({...formData, compliancePolicies: e.target.value.split(",").map(s => s.trim())})}
                    placeholder="pajak-indonesia-2024, bpjs-2024, dll."
                    className="w-full"
                  />
                </div>
              )}

              {/* SMACE-004: SMACE / SNI Certification specific form fields - only rendered for sni-certification work */}
              {workType === "sni-certification" && (
                <div className="border-t border-border-subtle pt-6 mt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-text-primary">Detail Sertifikasi SNI (SMACE)</h3>
                  
                  <Input
                    id="product_model_number"
                    name="product_model_number"
                    label="Nomor Model Produk"
                    required
                    value={formData.product_model_number}
                    onChange={(e) => setFormData({...formData, product_model_number: e.target.value})}
                    placeholder="Masukkan nomor model produk yang akan disertifikasi..."
                    className="w-full"
                  />

                  <Input
                    id="sni_standard_type"
                    name="sni_standard_type"
                    label="Jenis Standar SNI"
                    required
                    value={formData.sni_standard_type}
                    onChange={(e) => setFormData({...formData, sni_standard_type: e.target.value})}
                    placeholder="Contoh: SNI 0001:2023, SNI 0002:2024, dll."
                    className="w-full"
                  />

                  <TextArea
                    id="factory_location"
                    name="factory_location"
                    label="Lokasi Pabrik"
                    rows={2}
                    required
                    value={formData.factory_location}
                    onChange={(e) => setFormData({...formData, factory_location: e.target.value})}
                    placeholder="Alamat lengkap lokasi pabrik produksi..."
                    className="w-full resize-none"
                  />
                </div>
              )}

              {/* WordPress/Website Fix specific form fields - works for website-fix, digital-care, and digital-growth-ops packages (digiop-slice-006) */}
              {(workType === "website-fix" || workType === "digital-care" || workType === "digital-growth-ops") && (
                <div className="border-t border-border-subtle pt-6 mt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-text-primary">Detail Website/WordPress Issue</h3>
                  
                  <Input
                    id="website_url"
                    name="website_url"
                    label="URL Website"
                    required
                    value={formData.website_url}
                    onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                    placeholder="https://contohwebsite.com..."
                    className="w-full"
                  />

                  <Input
                    id="cms_platform"
                    name="cms_platform"
                    label="Platform CMS"
                    required
                    value={formData.cms_platform}
                    onChange={(e) => setFormData({...formData, cms_platform: e.target.value})}
                    placeholder="WordPress, Shopify, Static HTML, dll."
                    className="w-full"
                  />

                  <Input
                    id="hosting_provider"
                    name="hosting_provider"
                    label="Penyedia Hosting"
                    value={formData.hosting_provider}
                    onChange={(e) => setFormData({...formData, hosting_provider: e.target.value})}
                    placeholder="CloudFirst, SiteGround, Hostinger, dll."
                    className="w-full"
                  />

                  <TextArea
                    id="error_details"
                    name="error_details"
                    label="Detail Error"
                    rows={3}
                    required
                    value={formData.error_details}
                    onChange={(e) => setFormData({...formData, error_details: e.target.value})}
                    placeholder="Jelaskan detail masalah yang terjadi: white screen, error 500, plugin conflict, dll."
                    className="w-full resize-none"
                  />

                  <TextArea
                    id="error_logs"
                    name="error_logs"
                    label="Log Error (jika ada)"
                    rows={3}
                    value={formData.error_logs}
                    onChange={(e) => setFormData({...formData, error_logs: e.target.value})}
                    placeholder="Tempelkan log error dari server/debug jika tersedia..."
                    className="w-full resize-none"
                  />
                </div>
              )}
                </div>
              )}



              <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row gap-4 justify-end">
                <Link href="/work">
                  <Button intent="secondary" variant="outline" size="lg" className="w-full sm:w-auto">
                    Batal
                  </Button>
                </Link>
                <Button
                  type="submit"
                  intent="primary"
                  variant="solid"
                  size="lg"
                  disabled={isSubmitting}
                  className="px-6 py-3 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                  {isSubmitting ? "Membuat Pekerjaan..." : "Buat Pekerjaan"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}