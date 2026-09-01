"use client";

import React from "react";
import type { Toast } from "@repo/presentation-hooks";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const typeClasses: Record<string, string> = {
  success: "border-l-green-500 bg-green-50",
  error: "border-l-red-500 bg-red-50",
  warning: "border-l-amber-500 bg-amber-50",
  info: "border-l-blue-50 bg-blue-50"
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-[calc(100%-2rem)] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-white rounded-lg shadow-lg p-4 animate-slide-in border-l-4 ${typeClasses[toast.type] || typeClasses.info}`}
          onClick={() => onRemove(toast.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm font-semibold text-gray-900">{toast.title}</span>
            <button className="bg-none border-none text-xl leading-none cursor-pointer p-0 text-gray-500 hover:text-gray-900 transition-colors" aria-label="Close notification">
              ×
            </button>
          </div>
          {toast.description && (
            <div className="mt-1 text-sm text-gray-600">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}