"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Fix TypeScript module resolution type mismatch
const SafeLink = Link as any;

export function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8;
  const formValid =
    email.trim().length >= 3 &&
    email.includes("@") &&
    displayName.trim().length >= 1 &&
    passwordValid;
  const disabled = submitting || !formValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    setError(null);
    setSubmitting(true);

    try {
      const resp = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        }),
      });

      const json = await resp.json();
      setSubmitting(false);

      if (!resp.ok || !json.ok) {
        setError(json.error ?? `HTTP ${resp.status}`);
        return;
      }

      router.push("/workspace");
      router.refresh();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <SafeLink href="/" className="inline-flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-700 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:shadow-md transition-shadow">
              LH
            </div>
          </SafeLink>
          <div className="pt-2">
            <div className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Buat Akun
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 pt-2">
            Mulai Ruang Kerja Hukum Profesional
          </h1>
          <p className="text-sm text-slate-600">
            Siapkan tenant, ruang kerja, dan akses pemilik dalam satu langkah.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
                Nama Lengkap *
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={1}
                autoComplete="name"
              />
            </label>

            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
                Email *
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anda@firma-hukum.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={3}
                autoComplete="email"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Kata Sandi *
                </div>
                <div
                  className={`text-xs font-medium ${
                    password.length === 0
                      ? "text-slate-400"
                      : passwordValid
                        ? "text-emerald-600"
                        : "text-amber-600"
                  }`}
                >
                  {password.length === 0
                    ? "Minimal 8 karakter"
                    : passwordValid
                      ? "Cukup kuat"
                      : `${8 - password.length} karakter lagi`}
                </div>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Buat kata sandi yang aman"
                className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                  password.length === 0
                    ? "border-slate-300 focus:ring-indigo-500"
                    : passwordValid
                      ? "border-emerald-300 focus:ring-emerald-500"
                      : "border-amber-300 focus:ring-amber-500"
                }`}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="font-semibold mb-1">Pembuatan akun gagal:</div>
                <div>{error}</div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={disabled}
                className="w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Memproses..." : "Buat Akun & Masuk ke Ruang Kerja"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <SafeLink
              href="/login"
              className="font-medium text-slate-950 hover:text-slate-700 underline-offset-4 hover:underline"
            >
              Masuk di sini
            </SafeLink>
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center text-sm text-slate-500 space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
            Butuh Bantuan?
          </div>
          <div>
            Tim support LawyersHub siap membantu onboarding organisasi hukum Anda.
          </div>
          <div className="text-slate-400 text-xs pt-1">
            Kontak administrator platform untuk akses enterprise.
          </div>
        </div>
      </div>
    </main>
  );
}