"use client";

import * as React from "react";
import { useState } from "react";
import { Card, Input, TextArea, Select, Button } from "@repo/presentation-ui-system";

type ServiceProviderCategory =
  | "Cloud Services"
  | "IT Support"
  | "Infrastructure"
  | "Cybersecurity"
  | "Software Development"
  | "Managed Services"
  | "Data & Analytics";

type CasePriority = "low" | "medium" | "high" | "critical";

type TopicCategory =
  | "Hukum Perusahaan"
  | "Hukum Perdata"
  | "Hukum Pidana"
  | "Hukum Keluarga"
  | "Hukum Internasional"
  | "Hukum Teknologi Digital"
  | "Hukum Ketenagakerjaan"
  | "Hukum Tata Negara";

function readServiceProviderCategories(): readonly ServiceProviderCategory[] {
  return ["Cloud Services", "IT Support", "Infrastructure", "Cybersecurity", "Software Development"];
}

export interface ProductCreateFormProps {
  readonly productId: "lawyershub" | "services-id" | "ilc" | "academic";
  readonly onCreated?: (result: { output: unknown; record: unknown }) => void;
}

const CASE_PRIORITIES: readonly CasePriority[] = ["low", "medium", "high", "critical"] as const;
const PRIORITY_LABEL: Record<CasePriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  critical: "Kritis",
};

const PRODUCT_TITLE: Record<ProductCreateFormProps['productId'], { title: string; description: string }> = {
  lawyershub: {
    title: "Buat Kasus Hukum Baru",
    description: "Catat kasus hukum baru untuk klien — berjalan melalui workflow Draf → Terbuka → Dalam Proses → Selesai.",
  },
  "services-id": {
    title: "Ajukan Permintaan Layanan",
    description: "Kirim permintaan layanan ke provider terdaftar — dari Draf → Diterima → Dalam Layanan → Selesai.",
  },
  ilc: {
    title: "Daftarkan Pelatihan & Sertifikasi Baru",
    description: "Buat program pelatihan vokasi dan sertifikasi teknisi digital untuk UMKM — dari Pendaftaran → Pelaksanaan → Sertifikasi.",
  },
  academic: {
    title: "Tulis Artikel Komunitas Baru",
    description: "Submit artikel penelitian / analisis hukum — melalui Diajukan → Diterima → Dipublikasikan.",
  },
};

function useCreateFormState() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ output: unknown; record: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return { submitting, setSubmitting, result, setResult, error, setError };
}

interface SubFormProps {
  readonly submitting: boolean;
  readonly onSubmit: (body: Record<string, unknown>) => void;
}

export function ProductCreateForm({ productId, onCreated }: ProductCreateFormProps) {
  const state = useCreateFormState();
  const serviceCategories = readServiceProviderCategories() as readonly string[];
  const ilcTopicLabels: readonly TopicCategory[] = [
    "Hukum Perusahaan",
    "Hukum Perdata",
    "Hukum Pidana",
    "Hukum Keluarga",
    "Hukum Internasional",
    "Hukum Teknologi Digital",
    "Hukum Ketenagakerjaan",
    "Hukum Tata Negara",
  ];

  const commonSubmit = async (endpoint: string, body: Record<string, unknown>) => {
    state.setError(null);
    state.setResult(null);
    state.setSubmitting(true);
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      state.setSubmitting(false);
      if (!resp.ok || !json.ok) {
        state.setError(json.error ?? `HTTP ${resp.status}`);
        return;
      }
      state.setResult({ output: json.output, record: json.record });
      onCreated?.({ output: json.output, record: json.record });
    } catch (err) {
      state.setSubmitting(false);
      state.setError(err instanceof Error ? err.message : String(err));
    }
  };

  const content = PRODUCT_TITLE[productId];

  const renderSubForm = () => {
    switch (productId) {
      case "lawyershub":
        return (
          <LawyersHubCreateForm
            submitting={state.submitting}
            onSubmit={(body) => commonSubmit("/api/capabilities/legal-case/case.create", body)}
          />
        );
      case "services-id":
        return (
          <ServicesCreateForm
            submitting={state.submitting}
            categories={serviceCategories}
            onSubmit={(body) => commonSubmit("/api/capabilities/service-directory/service-directory.createServiceRequest", body)}
          />
        );
      case "ilc":
        return (
          <ILCTrainingCreateForm
            submitting={state.submitting}
            onSubmit={(body) => commonSubmit("/api/capabilities/human-consultant-matcher/match-experts", body)}
          />
        );
      case "academic":
        return (
          <ILCArticleCreateForm
            submitting={state.submitting}
            topics={ilcTopicLabels}
            onSubmit={(body) => commonSubmit("/api/capabilities/academic/createContentArticle", body)}
          />
        );
    }
  };

  return (
    <section aria-labelledby="product-create-title">
      <Card
        size="lg"
        title={
          <h2 id="product-create-title" className="text-xl font-bold text-text-primary">
            {content.title}
          </h2>
        }
        subtitle={content.description}
      >
        {renderSubForm()}

        {(state.result || state.error) && (
          <div className="mt-6 space-y-3">
            {state.error && (
              <div
                role="alert"
                className="rounded-xl border border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger-fg"
              >
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Gagal diproses:
                </div>
                <div>{state.error}</div>
              </div>
            )}
            {state.result && (
              <div
                role="status"
                className="rounded-xl border border-status-success/30 bg-status-success/5 p-4 text-sm text-status-success-fg"
              >
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Berhasil dibuat:
                </div>
                <pre className="whitespace-pre-wrap text-xs bg-status-success/10 rounded-lg p-3 mt-2 overflow-x-auto border border-status-success/20">
{JSON.stringify(state.result.output, null, 2)}
                </pre>
                {(state.result.record as { invokedAt?: string } | null)?.invokedAt && (
                  <div className="mt-2 text-xs text-status-success-fg/90">
                    Executed at: {(state.result.record as { invokedAt: string }).invokedAt}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

function LawyersHubCreateForm({ submitting, onSubmit }: SubFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");
  // PT Pendirian fields untuk kasus pendaftaran PT Indonesia (lh-case-001)
  const [namaPTLengkap, setNamaPTLengkap] = useState("");
  const [alamatDomisili, setAlamatDomisili] = useState("");
  const [bidangUsaha, setBidangUsaha] = useState("");
  const [jumlahPendiri, setJumlahPendiri] = useState(1);
  const [modalDasar, setModalDasar] = useState(100000000);
  const [noNIB, setNoNIB] = useState("");
  const [npwp, setNpwp] = useState("");
  const [penanggungJawabNIK, setPenanggungJawabNIK] = useState("");

  const disabled = submitting || title.trim().length < 3;
  const submitLabel = submitting ? "Memproses..." : "Buat Kasus";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Sertakan detail PT Pendirian jika semua field terisi (untuk kasus pendaftaran PT)
        const ptEstablishmentDetails = namaPTLengkap && alamatDomisili && bidangUsaha && noNIB && npwp && penanggungJawabNIK.length === 16
          ? { namaPTLengkap, alamatDomisili, bidangUsaha, jumlahPendiri, modalDasar, noNIB, npwp, penanggungJawabNIK }
          : undefined;
        
        onSubmit({ 
          title, 
          description, 
          priority,
          ...(ptEstablishmentDetails && { ptEstablishmentDetails })
        });
      }}
      className="grid gap-4 md:grid-cols-3"
      aria-label="Form pembuatan kasus hukum"
    >
      {/* Existing core case fields */}
      <div className="md:col-span-2">
        <Input
          label="Judul Kasus"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul kasus hukum..."
          required
          size="md"
        />
      </div>
      <div>
        <Select
          label="Prioritas"
          value={priority}
          onChange={(e) => setPriority(e.target.value as CasePriority)}
          size="md"
          options={CASE_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
        />
      </div>
      <div className="md:col-span-3">
        <TextArea
          label="Deskripsi"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan detail kasus hukum..."
          rows={4}
          size="md"
        />
      </div>

      {/* PT Pendirian fields - hanya untuk kasus pendaftaran PT (lh-case-001) */}
      <div className="md:col-span-3 mt-4">
        <h3 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">Detail Pendaftaran PT (opsional, isi hanya jika kasus adalah pendirian PT)</h3>
      </div>
      <div className="md:col-span-2">
        <Input
          label="Nama PT Lengkap"
          value={namaPTLengkap}
          onChange={(e) => setNamaPTLengkap(e.target.value)}
          placeholder="Contoh: PT Kopi Nusantara Mandiri"
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Jumlah Pendiri"
          type="number"
          min={1}
          max={100}
          value={jumlahPendiri.toString()}
          onChange={(e) => setJumlahPendiri(parseInt(e.target.value) || 1)}
          size="md"
        />
      </div>
      <div className="md:col-span-3">
        <Input
          label="Alamat Domisili"
          value={alamatDomisili}
          onChange={(e) => setAlamatDomisili(e.target.value)}
          placeholder="Alamat lengkap domisili PT"
          size="md"
        />
      </div>
      <div className="md:col-span-2">
        <Input
          label="Bidang Usaha"
          value={bidangUsaha}
          onChange={(e) => setBidangUsaha(e.target.value)}
          placeholder="Contoh: Jasa Teknologi Informasi"
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Modal Dasar (Rp)"
          type="number"
          min={100000000}
          value={modalDasar.toString()}
          onChange={(e) => setModalDasar(parseInt(e.target.value) || 100000000)}
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Nomor NIB"
          value={noNIB}
          onChange={(e) => setNoNIB(e.target.value)}
          placeholder="10-13 digit"
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="NPWP Badan"
          value={npwp}
          onChange={(e) => setNpwp(e.target.value)}
          placeholder="15-20 digit"
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="NIK Penanggung Jawab"
          value={penanggungJawabNIK}
          onChange={(e) => setPenanggungJawabNIK(e.target.value)}
          placeholder="16 digit"
          size="md"
          maxLength={16}
        />
      </div>

      <div className="md:col-span-3">
        <Button
          type="submit"
          intent="primary"
          variant="solid"
          size="md"
          loading={submitting}
          loadingText="Memproses..."
          disabled={disabled}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ServicesCreateForm({ submitting, categories, onSubmit }: SubFormProps & { categories: readonly string[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  // Golden slice SERVICES-ID-CASE-001: Specific service request fields for cybersecurity audit
  const [requesterName, setRequesterName] = useState("");
  const [budget, setBudget] = useState("");

  const disabled = submitting || title.trim().length < 3 || category.trim().length < 3;
  const submitLabel = submitting ? "Memproses..." : "Ajukan Permintaan";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Sertakan detail lengkap untuk permintaan layanan keamanan siber (golden slice SERVICES-ID-CASE-001)
        onSubmit({ 
          title, 
          description, 
          category,
          requesterName,
          budget,
          sessionId: "anon-session-001" // Hardcoded dev session (matches LH/ILC pattern)
        });
      }}
      className="grid gap-4 md:grid-cols-3"
      aria-label="Form permintaan layanan"
    >
      {/* Core service request fields */}
      <div className="md:col-span-2">
        <Input
          label="Judul Permintaan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul permintaan layanan..."
          required
          size="md"
        />
      </div>
      <div>
        <Select
          label="Kategori"
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          size="md"
          placeholder="Pilih kategori"
          options={categories.map((c) => ({ value: c, label: c }))}
          required
        />
      </div>
      <div className="md:col-span-3">
        <TextArea
          label="Deskripsi"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan detail permintaan layanan..."
          rows={4}
          size="md"
        />
      </div>
      
      {/* Golden slice-specific fields for cybersecurity audit request */}
      <div className="md:col-span-3 mt-4">
        <h3 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">Detail Permintaan (wajib untuk audit keamanan siber)</h3>
      </div>
      <div className="md:col-span-2">
        <Input
          label="Nama Pemohon"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          placeholder="Nama lengkap pemohon layanan"
          required
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Estimasi Budget (Rp)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="Contoh: 50000000"
          size="md"
        />
      </div>

      <div className="md:col-span-3">
        <Button
          type="submit"
          intent="primary"
          variant="solid"
          size="md"
          loading={submitting}
          loadingText="Memproses..."
          disabled={disabled}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ILCTrainingCreateForm({ submitting, onSubmit }: SubFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");
  // Pelatihan & Sertifikasi fields untuk ILC golden slice ilc-case-001
  const [lokasiPelatihan, setLokasiPelatihan] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kuotaPeserta, setKuotaPeserta] = useState(30);
  const [biayaPelatihan, setBiayaPelatihan] = useState(500000);
  const [kategoriPelatihan, setKategoriPelatihan] = useState("Teknologi Digital");

  const disabled = submitting || title.trim().length < 3;
  const submitLabel = submitting ? "Memproses..." : "Daftarkan Pelatihan";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Sertakan detail pelatihan jika semua field terisi (untuk kasus pendaftaran program pelatihan)
        const trainingDetails = lokasiPelatihan && tanggalMulai && tanggalSelesai
          ? { lokasiPelatihan, tanggalMulai, tanggalSelesai, kuotaPeserta, biayaPelatihan, kategoriPelatihan }
          : undefined;
        
        onSubmit({ 
                  title, 
                  description, 
                  priority,
                  ...(trainingDetails && { trainingDetails })
                });
      }}
      className="grid gap-4 md:grid-cols-3"
      aria-label="Form pendaftaran program pelatihan dan sertifikasi"
    >
      {/* Core training fields */}
      <div className="md:col-span-2">
        <Input
          label="Nama Program Pelatihan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan nama program pelatihan..."
          required
          size="md"
        />
      </div>
      <div>
        <Select
          label="Prioritas"
          value={priority}
          onChange={(e) => setPriority(e.target.value as CasePriority)}
          size="md"
          options={CASE_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
        />
      </div>
      <div className="md:col-span-3">
        <TextArea
          label="Deskripsi Program"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan detail program pelatihan dan sertifikasi..."
          rows={4}
          size="md"
        />
      </div>

      {/* Pelatihan & Sertifikasi fields - untuk ILC golden slice ilc-case-001 */}
      <div className="md:col-span-3 mt-4">
        <h3 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">Detail Pelaksanaan Pelatihan</h3>
      </div>
      <div className="md:col-span-3">
        <Input
          label="Lokasi Pelatihan"
          value={lokasiPelatihan}
          onChange={(e) => setLokasiPelatihan(e.target.value)}
          placeholder="Alamat lengkap lokasi pelatihan atau link virtual"
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Tanggal Mulai"
          type="date"
          value={tanggalMulai}
          onChange={(e) => setTanggalMulai(e.target.value)}
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Tanggal Selesai"
          type="date"
          value={tanggalSelesai}
          onChange={(e) => setTanggalSelesai(e.target.value)}
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Kuota Peserta"
          type="number"
          min={1}
          max={100}
          value={kuotaPeserta.toString()}
          onChange={(e) => setKuotaPeserta(parseInt(e.target.value) || 30)}
          size="md"
        />
      </div>
      <div className="md:col-span-2">
        <Input
          label="Kategori Pelatihan"
          value={kategoriPelatihan}
          onChange={(e) => setKategoriPelatihan(e.target.value)}
          placeholder="Contoh: Teknologi Digital, Manajemen Bisnis"
          size="md"
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Biaya (Rp)"
          type="number"
          min={0}
          value={biayaPelatihan.toString()}
          onChange={(e) => setBiayaPelatihan(parseInt(e.target.value) || 500000)}
          size="md"
        />
      </div>

      <div className="md:col-span-3">
        <Button
          type="submit"
          intent="primary"
          variant="solid"
          size="md"
          loading={submitting}
          loadingText="Memproses..."
          disabled={disabled}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ILCArticleCreateForm({ submitting, topics, onSubmit }: SubFormProps & { topics: readonly TopicCategory[] }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");

  const disabled = submitting || title.trim().length < 3;
  const submitLabel = submitting ? "Memproses..." : "Submit Artikel";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, content, topic });
      }}
      className="grid gap-4 md:grid-cols-3"
      aria-label="Form submit artikel komunitas"
    >
      <div className="md:col-span-2">
        <Input
          label="Judul Artikel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul artikel penelitian..."
          required
          size="md"
        />
      </div>
      <div>
        <Select
          label="Topik Hukum"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          size="md"
          placeholder="Pilih topik"
          options={topics.map((t) => ({ value: t, label: t }))}
        />
      </div>
      <div className="md:col-span-3">
        <TextArea
          label="Konten Artikel"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tulis konten artikel Anda..."
          rows={8}
          size="md"
        />
      </div>
      <div className="md:col-span-3">
        <Button
          type="submit"
          intent="primary"
          variant="solid"
          size="md"
          loading={submitting}
          loadingText="Memproses..."
          disabled={disabled}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}