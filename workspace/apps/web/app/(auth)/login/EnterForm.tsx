"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, Card, Input } from "@repo/presentation-ui-system";

export function EnterForm() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Hindari hydration mismatch dengan tidak merender apapun sampai client ter-mount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions (P2: duplicate-submit protection)

    // Basic client-side validation
    if (!email || !password) {
      setError("Please fill in all required fields");
      return;
    }

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
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      router.push(data.redirectUrl || "/my-reality");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* P2: error states with proper accessibility */}
        {error && (
          <div 
            className="rounded-lg bg-status-error/10 p-4 text-sm text-status-error border border-status-error/30"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}
        
        {/* P2: visual hierarchy, accessibility labels */}
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address"
          autoComplete="email"
          required
          aria-required="true"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched({ ...touched, email: true })}
          error={touched.email && !email ? "Email is required" : undefined}
        />
        
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          aria-required="true"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched({ ...touched, password: true })}
          error={touched.password && !password ? "Password is required" : undefined}
        />
        
        {/* P2: loading states, visual consistency */}
        <Button
          intent="primary"
          variant="solid"
          size="lg"
          block
          disabled={loading}
          type="submit"
          className="focus:ring-2 focus:ring-status-info focus:ring-offset-2 transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in to EOS...
            </span>
          ) : "Sign in to EOS"}
        </Button>
      </form>
      {/* Footer section moved outside Card to work with new glassmorphism template */}
      <div className="mt-6 text-center border-t border-slate-700/50 pt-6">
        <p className="text-sm text-slate-400">
          Don't have an account?{" "}
          <a 
            href="/signup" 
            className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
          >
            Sign up for free
          </a>
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Demo credentials: alice@eos.dev / DemoPass123!
        </p>
      </div>
    </>
  );
}