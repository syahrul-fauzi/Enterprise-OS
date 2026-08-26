"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Fix TypeScript module resolution type mismatch
const SafeLink = Link as any;

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oidcSubmitting, setOidcSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formValid =
    email.trim().length >= 3 &&
    email.includes("@") &&
    password.length >= 1;
  const disabled = submitting || !formValid;
  const oidcDisabled = submitting || oidcSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    setError(null);
    setSubmitting(true);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
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

  const handleOidcLogin = async () => {
    if (oidcDisabled) return;

    setError(null);
    setOidcSubmitting(true);

    try {
      const resp = await fetch("/api/auth/oidc-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = await resp.json();
      setOidcSubmitting(false);

      if (!resp.ok || !json.ok) {
        setError(json.error ?? `HTTP ${resp.status}`);
        return;
      }

      if (json.authorizationUrl) {
        window.location.href = json.authorizationUrl;
      }
    } catch (err) {
      setOidcSubmitting(false);
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
              Selamat Datang
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 pt-2">
            Masuk ke Ruang Kerja Hukum
          </h1>
          <p className="text-sm text-slate-600">
            Akses tenant, ruang kerja, dan peran yang Anda emban.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
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
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
                Kata Sandi *
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={1}
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-semibold mb-1">Gagal masuk:</div>
              <div>{error}</div>
            </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={disabled}
                className="w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Memproses..." : "Masuk ke Ruang Kerja"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              type="button"
              disabled={oidcDisabled}
              onClick={handleOidcLogin}
              className="w-full rounded-xl border border-indigo-300 bg-indigo-50 px-6 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oidcSubmitting ? "Menghubungkan SSO..." : "Masuk dengan SSO (OIDC)"}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
            Belum punya akun?{" "}
            <SafeLink
              href="/signup"
              className="font-medium text-slate-950 hover:text-slate-700 underline-offset-4 hover:underline"
            >
              Buat akun baru
            </SafeLink>
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            Butuh bantuan?
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p className="leading-relaxed">
              Jika Anda adalah anggota organisasi, gunakan alamat email perusahaan yang telah diundang.
              Untuk masalah akses atau pendaftaran akun, hubungi administrator workspace Anda.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}