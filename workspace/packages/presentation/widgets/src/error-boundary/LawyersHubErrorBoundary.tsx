"use client";

import React from "react";

interface LawyersHubErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface LawyersHubErrorBoundaryProps {
  children: React.ReactNode;
}

export class LawyersHubErrorBoundary extends React.Component<LawyersHubErrorBoundaryProps, LawyersHubErrorBoundaryState> {
  constructor(props: LawyersHubErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LawyersHubErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Minimal error logging - only critical errors for production
    console.error("[LawyersHub Error Boundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
              <h1 className="text-2xl font-bold text-red-900 mb-4">Terjadi Kesalahan</h1>
              <p className="text-red-700 mb-6">
                Maaf, terjadi kesalahan saat memuat halaman LawyersHub. Silakan refresh halaman untuk mencoba kembali.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Refresh Halaman
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}