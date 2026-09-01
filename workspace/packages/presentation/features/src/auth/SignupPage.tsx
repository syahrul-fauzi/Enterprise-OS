"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Card, Input, Button } from "@repo/presentation-ui-system";

const SafeLink = Link as any;

export function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordScore = useMemo(() => {
    const len = password.length;
    if (len === 0) return { level: 0, label: "Minimal 8 karakter", intent: "neutral" as const };
    if (len < 8) return { level: 1, label: `${8 - len} karakter lagi`, intent: "warning" as const };
    let score = 2;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { level: 2, label: "Cukup kuat", intent: "warning" as const };
    if (score <= 3) return { level: 3, label: "Kuat", intent: "success" as const };
    return { level: 4, label: "Sangat kuat", intent: "success" as const };
  }, [password]);

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

  const strengthBarIntent = (level: number, bar: number) => {
    if (level === 0) return "bg-surface-border";
    if (bar > level) return "bg-surface-border";
    if (level <= 1) return "bg-status-danger";
    if (level <= 2) return "bg-status-warning";
    if (level <= 3) return "bg-brand-primary";
    return "bg-status-success";
  };

  return (
    <main className="min-h-screen bg-surface-background px-6 py-10 flex items-center justify-center">
      <a href="#main-signup" className="skip-link">Lewati ke formulir pendaftaran</a>
      <div id="main-signup" className="w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <SafeLink href="/" className="inline-flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-text-inverse text-sm font-bold shadow-token-sm group-hover:shadow-token-md transition-shadow duration-eos-fast">
              EOS
            </div>
          </SafeLink>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border bg-brand-primary/10 text-brand-primary border-brand-primary/30">
              Buat Akun
            </span>
          </div>
          <h1 className="pt-2">
            Mulai Ruang Kerja EOS Profesional
          </h1>
          <p className="text-sm text-text-secondary">
            Kelola semua pekerjaan Anda, kolaborasi tim, dan lacak progress dari awal hingga selesai.
          </p>
        </header>

        <Card size="lg">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Nama Lengkap"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              required
              minLength={1}
              autoComplete="name"
              size="lg"
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anda@firma-hukum.com"
              required
              minLength={3}
              autoComplete="email"
              size="lg"
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Kata Sandi
                  <span className="ml-1 text-status-danger" aria-hidden="true">*</span>
                </label>
                <span
                  className={`text-xs font-medium ${
                    passwordScore.intent === "success"
                      ? "text-status-success"
                      : passwordScore.intent === "warning"
                      ? "text-status-warning"
                      : "text-text-muted"
                  }`}
                  aria-live="polite"
                >
                  {passwordScore.label}
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat kata sandi yang aman"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="password-strength"
                  size="lg"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div id="password-strength" className="flex gap-1.5 pt-1" role="progressbar" aria-valuenow={passwordScore.level} aria-valuemin={0} aria-valuemax={4} aria-label="Kekuatan kata sandi">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-eos-fast ${strengthBarIntent(passwordScore.level, bar)}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

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
                    <div className="font-semibold mb-0.5">Pembuatan akun gagal:</div>
                    <div>{error}</div>
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
                Buat Akun &amp; Masuk ke EOS
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-divider text-center text-sm text-text-secondary">
            Sudah punya akun?{" "}
            <SafeLink
              href="/login"
              className="font-medium text-text-primary hover:text-text-secondary underline-offset-4 hover:underline"
            >
              Masuk di sini
            </SafeLink>
          </div>
        </Card>

        <Card size="md">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Butuh Bantuan?
          </div>
          <div className="space-y-2 text-sm text-text-secondary">
            <p className="leading-relaxed">
              Tim support EOS siap membantu Anda memulai perjalanan produktivitas.
            </p>
            <p className="text-text-muted text-xs pt-1">
              Kontak administrator platform untuk akses enterprise.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}