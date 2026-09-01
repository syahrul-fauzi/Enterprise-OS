"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Input, Button } from "@repo/presentation-ui-system";

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
    <main className="min-h-screen bg-surface-background px-6 py-10 flex items-center justify-center">
      <a href="#login-form" className="skip-link">Lewati ke formulir masuk</a>
      <div id="login-form" className="w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <SafeLink href="/" className="inline-flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-text-inverse text-sm font-bold shadow-token-sm group-hover:shadow-token-md transition-shadow duration-eos-fast">
              EOS
            </div>
          </SafeLink>
          <div className="pt-2">
            <div className="inline-flex rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
              Selamat Datang
            </div>
          </div>
          <h1 className="pt-2">
            Masuk ke Ruang Kerja EOS
          </h1>
          <p className="text-sm text-text-secondary">
            Akses semua pekerjaan Anda, ruang kerja, dan kolaborasi dengan tim.
          </p>
        </header>

        <Card size="lg">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anda@firma-hukum.com"
              required
              minLength={3}
              autoComplete="email"
            />

            <Input
              label="Kata Sandi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              required
              minLength={1}
              autoComplete="current-password"
            />

            {error && (
              <div
                role="alert"
                className="rounded-md border border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger"
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <div className="font-semibold mb-0.5">Gagal masuk</div>
                    <div className="text-status-danger/90">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                intent="primary"
                variant="solid"
                size="lg"
                block
                disabled={disabled}
                loading={submitting}
                loadingText="Memproses..."
              >
                Masuk ke EOS
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-divider">
            <Button
              type="button"
              intent="primary"
              variant="soft"
              size="lg"
              block
              disabled={oidcDisabled}
              loading={oidcSubmitting}
              loadingText="Menghubungkan SSO..."
              onClick={handleOidcLogin}
            >
              Masuk dengan SSO (OIDC)
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-surface-divider text-center text-sm text-text-secondary">
            Belum punya akun?{" "}
            <SafeLink
              href="/signup"
              className="font-medium text-text-primary hover:text-text-secondary underline-offset-4 hover:underline"
            >
              Buat akun baru
            </SafeLink>
          </div>
        </Card>

        <Card size="md">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Butuh bantuan?
          </div>
          <div className="space-y-2 text-sm text-text-secondary">
            <p className="leading-relaxed">
              Jika Anda adalah anggota organisasi, gunakan alamat email perusahaan yang telah diundang.
              Untuk masalah akses atau pendaftaran akun, hubungi administrator workspace Anda.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}