"use client";

import React, { useState } from "react";
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
    title: "Mulai Diskusi Komunitas Baru",
    description: "Mulai diskusi publik tentang topik hukum — komunitas akan mereply dan terlibat.",
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
            onSubmit={(body) => commonSubmit("/api/cases/create", body)}
          />
        );
      case "services-id":
        return (
          <ServicesCreateForm
            submitting={state.submitting}
            categories={serviceCategories}
            onSubmit={(body) => commonSubmit("/api/quotes/create", body)}
          />
        );
      case "ilc":
        return (
          <ILCDiscussionCreateForm
            submitting={state.submitting}
            topics={ilcTopicLabels}
            onSubmit={(body) => commonSubmit("/api/capabilities/ilc/createCommunityDiscussion", body)}
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

  const disabled = submitting || title.trim().length < 3;
  const submitLabel = submitting ? "Memproses..." : "Buat Kasus";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, description, priority });
      }}
      className="grid gap-4 md:grid-cols-3"
      aria-label="Form pembuatan kasus hukum"
    >
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

  const disabled = submitting || title.trim().length < 3;
  const submitLabel = submitting ? "Memproses..." : "Ajukan Permintaan";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, description, category });
      }}
      className="grid gap-4 md:grid-cols-3"
      aria-label="Form permintaan layanan"
    >
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
          onChange={(e) => setCategory(e.target.value)}
          size="md"
          placeholder="Pilih kategori"
          options={categories.map((c) => ({ value: c, label: c }))}
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

function ILCDiscussionCreateForm({ submitting, topics, onSubmit }: SubFormProps & { topics: readonly TopicCategory[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");

  const disabled = submitting || title.trim().length < 3;
  const submitLabel = submitting ? "Memproses..." : "Mulai Diskusi";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, description, topic });
      }}
      className="grid gap-4 md:grid-cols-3"
      aria-label="Form pembuatan diskusi komunitas"
    >
      <div className="md:col-span-2">
        <Input
          label="Judul Diskusi"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul diskusi komunitas..."
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
          label="Deskripsi"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan detail diskusi yang ingin dibuka..."
          rows={4}
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
