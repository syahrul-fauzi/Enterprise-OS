"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formValid =
    email.trim().length >= 3 &&
    email.includes("@") &&
    password.length >= 1;
  const disabled = submitting || !formValid;

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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:shadow-md transition-shadow">
              E
            </div>
          </Link>
          <div className="pt-2">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Welcome Back
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 pt-2">
            Sign in to your Workspace
          </h1>
          <p className="text-sm text-slate-600">
            Access your tenant, workspace, and assigned roles.
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
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={3}
                autoComplete="email"
              />
            </label>

            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
                Password *
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={1}
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-semibold mb-1">Sign in failed:</div>
              <div>{error}</div>
            </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={disabled}
                className="w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Signing in..." : "Sign In to Workspace"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-slate-950 hover:text-slate-700 underline-offset-4 hover:underline"
            >
              Create one instead
            </Link>
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
            Seeded test accounts
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <div className="font-medium text-slate-900">Alice</div>
                <div className="text-xs font-mono text-slate-500">alice@eos.dev</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("alice@eos.dev");
                  setPassword("password123");
                }}
                className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                Autofill
              </button>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <div className="font-medium text-slate-900">Bob</div>
                <div className="text-xs font-mono text-slate-500">bob@eos.dev</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("bob@eos.dev");
                  setPassword("password123");
                }}
                className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                Autofill
              </button>
            </div>
            <div className="text-xs text-slate-500 font-medium pt-1">
              Password for both:&nbsp;
              <span className="font-mono">password123</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}