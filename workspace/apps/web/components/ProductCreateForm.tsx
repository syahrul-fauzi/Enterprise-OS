import React, { useState } from "react";
import type { ServiceProviderCategory } from "../../../capabilities/service-directory/implementation/contracts/service.contracts";
import type { CasePriority } from "../../../capabilities/legal-case/implementation/contracts/case.contracts";
import type { TopicCategory } from "../../../capabilities/legal-community/implementation/contracts/community.contracts";
import {
  readServiceProviderCategories,
} from "../lib/product-reality";

export interface ProductCreateFormProps {
  readonly productId: "lawyershub" | "services-id" | "ilc" | "academic";
  readonly onCreated?: (result: { output: unknown; record: unknown }) => void;
}

const CASE_PRIORITIES: readonly CasePriority[] = ["low", "medium", "high", "critical"] as const;

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
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-1">
            First Real User Job
          </div>
          <h2 className="text-xl font-bold text-slate-950">
            {productId === "lawyershub" && "Buat Legal Matter (Kasus) Baru"}
            {productId === "services-id" && "Ajukan Permintaan Layanan"}
            {productId === "ilc" && "Mulai Diskusi Komunitas Baru"}
            {productId === "academic" && "Tulis Artikel Komunitas Baru"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {productId === "lawyershub" && "Catat legal matter baru untuk klien — berjalan melalui workflow Draft → Open → In Progress → Closed."}
            {productId === "services-id" && "Kirim permintaan layanan ke provider terdaftar — dari Draft → Accepted → In Service → Delivered."}
            {productId === "ilc" && "Mulai diskusi publik tentang topik hukum — komunitas akan mereply dan terlibat."}
            {productId === "academic" && "Submit artikel penelitian / analisis hukum — melalui Proposed → Accepted → Published."}
          </p>
        </div>
      </div>

      {productId === "lawyershub" && (
        <LawyersHubCreateForm submitting={state.submitting} onSubmit={(body) => commonSubmit("/api/capabilities/lawyershub/create", body)} />
      )}

      {productId === "services-id" && (
        <ServicesCreateForm
          submitting={state.submitting}
          categories={serviceCategories}
          onSubmit={(body) => commonSubmit("/api/capabilities/services-id/createServiceRequest", body)}
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
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const body: Record<string, unknown> = { title, priority };
        if (description.trim().length > 0) body.description = description.trim();
        onSubmit(body);
        setTitle("");
        setDescription("");
        setPriority("medium");
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Judul Kasus *</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Review Perjanjian B2B Vendor Q3"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            minLength={3}
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Deskripsi / Ringkasan</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Konteks kasus: pihak-pihak, deadline, target outcome..."
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Prioritas</div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as CasePriority)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {CASE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Menyimpan..." : "+ Buat Matter Baru"}
        </button>
      </div>
    </form>
  );
}

function ServicesCreateForm(
  props: SubFormProps & { readonly categories: readonly string[] },
) {
  const { submitting, onSubmit, categories } = props;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServiceProviderCategory>(
    (categories[0] as ServiceProviderCategory) ?? "Cloud Services",
  );
  const [requesterName, setRequesterName] = useState("");
  const [budget, setBudget] = useState("");

  const disabled = submitting || title.trim().length < 3;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const body: Record<string, unknown> = { title, category };
        if (description.trim()) body.description = description.trim();
        if (requesterName.trim()) body.requesterName = requesterName.trim();
        if (budget.trim()) body.budget = budget.trim();
        onSubmit(body);
        setTitle("");
        setDescription("");
        setRequesterName("");
        setBudget("");
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Judul Permintaan Layanan *</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Penetration Testing Aplikasi Mobile"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            minLength={3}
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Detail Permintaan</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Scope pekerjaan, spesifikasi, target SLA..."
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Kategori Layanan</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceProviderCategory)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {(categories.length > 0 ? categories : [
              "Cloud Services", "IT Support", "Infrastructure", "Cybersecurity", "Software Development",
            ]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Budget</div>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Contoh: Rp 250.000.000"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Nama / Perusahaan Pemohon</div>
          <input
            type="text"
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            placeholder="Contoh: Arief Rahman — PT Maju Jaya"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Mengirim..." : "+ Ajukan Permintaan Layanan"}
        </button>
      </div>
    </form>
  );
}

function ILCDiscussionCreateForm(
  props: SubFormProps & { readonly topics: readonly TopicCategory[] },
) {
  const { submitting, onSubmit, topics } = props;
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [topicLabel, setTopicLabel] = useState<TopicCategory>(topics[0] ?? "Hukum Teknologi Digital");
  const [startedBy, setStartedBy] = useState("");
  const [startedByAffiliation, setStartedByAffiliation] = useState("");

  const disabled = submitting || title.trim().length < 3;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const body: Record<string, unknown> = { title, topicLabel };
        if (summary.trim()) body.summary = summary.trim();
        if (startedBy.trim()) body.startedBy = startedBy.trim();
        if (startedByAffiliation.trim()) body.startedByAffiliation = startedByAffiliation.trim();
        onSubmit(body);
        setTitle("");
        setSummary("");
        setStartedBy("");
        setStartedByAffiliation("");
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Judul Diskusi *</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Perlukah Sanksi Tegas untuk Hoaks Kesehatan?"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            minLength={3}
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Ringkasan / Argumen Awal</div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Tuliskan latar belakang pertanyaan / poin-poin diskusi..."
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Topik Hukum</div>
          <select
            value={topicLabel}
            onChange={(e) => setTopicLabel(e.target.value as TopicCategory)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Afiliasi</div>
          <input
            type="text"
            value={startedByAffiliation}
            onChange={(e) => setStartedByAffiliation(e.target.value)}
            placeholder="Contoh: Peradi Jakarta / FH UI / NGO"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Nama Pemulai Diskusi</div>
          <input
            type="text"
            value={startedBy}
            onChange={(e) => setStartedBy(e.target.value)}
            placeholder="Contoh: Adv. Rudi Firmansyah, S.H."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Mempublikasikan..." : "+ Mulai Diskusi Baru"}
        </button>
      </div>
    </form>
  );
}

function ILCArticleCreateForm(
  props: SubFormProps & { readonly topics: readonly TopicCategory[] },
) {
  const { submitting, onSubmit, topics } = props;
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [topicLabel, setTopicLabel] = useState<TopicCategory>(topics[0] ?? "Hukum Teknologi Digital");
  const [author, setAuthor] = useState("");
  const [authorAffiliation, setAuthorAffiliation] = useState("");

  const disabled = submitting || title.trim().length < 3;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const body: Record<string, unknown> = { title, topicLabel };
        if (summary.trim()) body.summary = summary.trim();
        if (author.trim()) body.author = author.trim();
        if (authorAffiliation.trim()) body.authorAffiliation = authorAffiliation.trim();
        onSubmit(body);
        setTitle("");
        setSummary("");
        setAuthor("");
        setAuthorAffiliation("");
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Judul Artikel *</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Analisis Yuridis Implementasi UU PDP untuk AI Generatif"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            minLength={3}
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Abstrak / Summary</div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Ringkasan 2–3 paragraf: tujuan, metodologi, temuan utama..."
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Topik Hukum</div>
          <select
            value={topicLabel}
            onChange={(e) => setTopicLabel(e.target.value as TopicCategory)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Afiliasi Penulis</div>
          <input
            type="text"
            value={authorAffiliation}
            onChange={(e) => setAuthorAffiliation(e.target.value)}
            placeholder="Contoh: FH UGM / Cyber Law Institute / Kemenkumham"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Nama Penulis</div>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Contoh: Dr. Dewi Kartika, S.H., M.Hum."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Mensubmit..." : "+ Submit Artikel Baru"}
        </button>
      </div>
    </form>
  );
}

export default ProductCreateForm;
