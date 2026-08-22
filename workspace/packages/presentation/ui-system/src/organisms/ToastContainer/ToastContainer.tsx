"use client";

import React from "react";
import type { Toast } from "@repo/presentation-hooks";
import "./ToastContainer.css";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => onRemove(toast.id)}
        >
          <div className="toast-header">
            <span className="toast-title">{toast.title}</span>
            <button className="toast-close" aria-label="Close notification">
              ×
            </button>
          </div>
          {toast.description && (
            <div className="toast-description">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}