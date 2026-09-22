"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "../../index";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-surface-sunken rounded-xl p-8 text-center border border-dashed border-status-danger/50">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-status-danger/10 flex items-center justify-center" aria-hidden="true">
              <svg className="w-8 h-8 text-status-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-text-primary m-0">Terjadi Kesalahan</h1>
              <p className="text-sm text-text-secondary leading-relaxed m-0">
                Maaf, terjadi kesalahan saat memuat bagian ini.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4 w-full">
              <Button intent="danger" variant="solid" size="md" onClick={this.handleReset}>
                Coba Lagi
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}