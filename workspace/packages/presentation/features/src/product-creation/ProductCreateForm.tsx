"use client";

import React, { useState } from "react";

// Inlined type definitions from capabilities contracts to avoid rootDir violations
// This maintains type safety while respecting package boundaries (Thin App Strategy)
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

// Fallback implementations to resolve module resolution errors (aligned with ProductPreviewShell)
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

function useCreateFormState() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ output: unknown; record: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return { submitting, setSubmitting, result, setResult, error, setError };
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

  return (
    <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {productId === "lawyershub" && "Buat Kasus Hukum Baru"}
            {productId === "services-id" && "Ajukan Permintaan Layanan"}
            {productId === "ilc" && "Mulai Diskusi Komunitas Baru"}
            {productId === "academic" && "Tulis Artikel Komunitas Baru"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {productId === "lawyershub" && "Catat kasus hukum baru untuk klien — berjalan melalui workflow Draf → Terbuka → Dalam Proses → Selesai."}
            {productId === "services-id" && "Kirim permintaan layanan ke provider terdaftar — dari Draf → Diterima → Dalam Layanan → Selesai."}
            {productId === "ilc" && "Mulai diskusi publik tentang topik hukum — komunitas akan mereply dan terlibat."}
            {productId === "academic" && "Submit artikel penelitian / analisis hukum — melalui Diajukan → Diterima → Dipublikasikan."}
          </p>
        </div>
      </div>

      {productId === "lawyershub" && (
        <LawyersHubCreateForm submitting={state.submitting} onSubmit={(body) => commonSubmit("/api/cases/create", body)} />
      )}

      {productId === "services-id" && (
        <ServicesCreateForm
          submitting={state.submitting}
          categories={serviceCategories}
          onSubmit={(body) => commonSubmit("/api/quotes/create", body)}
        />
      )}

      {productId === "ilc" && (
        <ILCDiscussionCreateForm
          submitting={state.submitting}
          topics={ilcTopicLabels}
          onSubmit={(body) => commonSubmit("/api/capabilities/ilc/createCommunityDiscussion", body)}
        />
      )}

      {productId === "academic" && (
        <ILCArticleCreateForm
          submitting={state.submitting}
          topics={ilcTopicLabels}
          onSubmit={(body) => commonSubmit("/api/capabilities/academic/createContentArticle", body)}
        />
      )}

      {(state.result || state.error) && (
        <div className="mt-6">
          {state.error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-semibold mb-1">Gagal diproses:</div>
              <div>{state.error}</div>
            </div>
          )}
          {state.result && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="font-semibold mb-1">Berhasil dibuat:</div>
              <pre className="whitespace-pre-wrap text-xs bg-emerald-100/60 rounded-lg p-3 mt-2 overflow-x-auto">
{JSON.stringify(state.result.output, null, 2)}
              </pre>
              {(state.result.record as { invokedAt?: string } | null)?.invokedAt && (
                <div className="mt-2 text-xs text-emerald-700">
                  Executed at: {(state.result.record as { invokedAt: string }).invokedAt}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface SubFormProps {
  readonly submitting: boolean;
  readonly onSubmit: (body: Record<string, unknown>) => void;
}

function LawyersHubCreateForm({ submitting, onSubmit }: SubFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");

  const disabled = submitting || title.trim().length < 3;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, description, priority });
      }}
      className="grid gap-4 md:grid-cols-3"
    >
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Judul Kasus</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Masukkan judul kasus hukum..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Prioritas</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as CasePriority)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {CASE_PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
          placeholder="Jelaskan detail kasus hukum..."
        />
      </div>
      <div className="md:col-span-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? "Memproses..." : "Buat Kasus"}
        </button>
      </div>
    </form>
  );
}

function ServicesCreateForm({ submitting, categories, onSubmit }: SubFormProps & { categories: readonly string[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const disabled = submitting || title.trim().length < 3;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, description, category });
      }}
      className="grid gap-4 md:grid-cols-3"
    >
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Judul Permintaan</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Masukkan judul permintaan layanan..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Pilih kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
          placeholder="Jelaskan detail permintaan layanan..."
        />
      </div>
      <div className="md:col-span-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? "Memproses..." : "Ajukan Permintaan"}
        </button>
      </div>
    </form>
  );
}

function ILCDiscussionCreateForm({ submitting, topics, onSubmit }: SubFormProps & { topics: readonly TopicCategory[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");

  const disabled = submitting || title.trim().length < 3;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, description, topic });
      }}
      className="grid gap-4 md:grid-cols-3"
    >
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Judul Diskusi</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Masukkan judul diskusi komunitas..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Topik Hukum</label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Pilih topik</option>
          {topics.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
          placeholder="Jelaskan detail diskusi yang ingin dibuka..."
        />
      </div>
      <div className="md:col-span-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? "Memproses..." : "Mulai Diskusi"}
        </button>
      </div>
    </form>
  );
}

function ILCArticleCreateForm({ submitting, topics, onSubmit }: SubFormProps & { topics: readonly TopicCategory[] }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");

  const disabled = submitting || title.trim().length < 3;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, content, topic });
      }}
      className="grid gap-4 md:grid-cols-3"
    >
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Judul Artikel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Masukkan judul artikel penelitian..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Topik Hukum</label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Pilih topik</option>
          {topics.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="block text-sm font-medium text-slate-700 mb-1">Konten Artikel</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[200px]"
          placeholder="Tulis konten artikel Anda..."
        />
      </div>
      <div className="md:col-span-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? "Memproses..." : "Submit Artikel"}
        </button>
      </div>
    </form>
  );
}