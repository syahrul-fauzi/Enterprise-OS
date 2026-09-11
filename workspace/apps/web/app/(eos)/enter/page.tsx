"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/presentation-ui-system";

export default function EnterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("alice@eos.dev");
          const [password, setPassword] = useState("DemoPass123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      console.log("[EnterPage] Login successful, redirecting to:", data.redirectUrl || "/my-reality");
      router.push(data.redirectUrl || "/my-reality");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Enter EOS
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to your Enterprise Operating System workspace
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <Button
              intent="primary"
              variant="solid"
              size="lg"
              block
              disabled={loading}
              type="submit"
            >
              {loading ? "Signing in..." : "Sign in to EOS"}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-600">
          Don't have an account? <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">Sign up for free</a>
        </p>
        <p className="text-center text-xs text-slate-500">
          Demo credentials are pre-filled. Use email: alice@eos.dev, password: DemoPass123!
        </p>
      </div>
    </div>
  );
}