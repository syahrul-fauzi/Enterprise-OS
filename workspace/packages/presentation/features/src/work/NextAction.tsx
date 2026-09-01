"use client";

import React, { useState } from "react";
import type { RealityWorkItem } from "@repo/presentation-entities";

export interface NextActionProps {
  action: RealityWorkItem["nextAction"];
  work?: {
    workId: string;
    title: string;
  };
  onExecute?: (actionId: string, workId?: string) => void | Promise<void>;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "inline";
}

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
} as const;

export function NextAction({
  action,
  work,
  onExecute,
  size = "md",
  variant = "primary",
}: NextActionProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [justExecuted, setJustExecuted] = useState(false);

  if (!action) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExecuting || !onExecute) return;

    setIsExecuting(true);
    try {
      await onExecute(action.actionId, work?.workId);
      setJustExecuted(true);
      setTimeout(() => setJustExecuted(false), 2000);
    } finally {
      setIsExecuting(false);
    }
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isExecuting || !onExecute}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
      >
        {isExecuting ? (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : justExecuted ? (
          <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
        {action.label}
      </button>
    );
  }

  const baseClass = `inline-flex items-center justify-center rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${SIZES[size]}`;
  const variantClass =
    variant === "secondary"
      ? "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400"
      : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm shadow-blue-600/10";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isExecuting || !onExecute}
      className={`${baseClass} ${variantClass}`}
    >
      {isExecuting ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Memproses...</span>
        </>
      ) : justExecuted ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Selesai</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{action.label}</span>
          <svg className="w-4 h-4 ml-1 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </>
      )}
    </button>
  );
}
