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
    service_category: ""
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