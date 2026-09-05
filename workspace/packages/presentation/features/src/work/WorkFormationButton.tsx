"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IntentContract } from "../intent/types.js";
import { Button } from "@repo/presentation-ui-system";

interface WorkFormationButtonProps {
  intent: IntentContract;
  intentId?: string;
  buttonText?: string;
  className?: string;
  onCreationStart?: () => void;
  onCreationError?: (error: Error) => void;
  apiEndpoint?: string;
}

export function WorkFormationButton({
  intent,
  intentId: providedIntentId,
  buttonText = "Bentuk Pekerjaan dari Kebutuhan ini",
  className = "",
  onCreationStart,
  onCreationError,
  apiEndpoint = "/api/work/create",
}: WorkFormationButtonProps) {
  const router = useRouter();
  const intentId = providedIntentId || intent.id;
  const [isForming, setIsForming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdWorkId, setCreatedWorkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWorkFormation = async () => {
    if (!intentId || isForming) {
      const error = new Error("Intent ID is required to form work");
      onCreationError?.(error);
      console.error("[WorkFormationButton] Error:", error);
      return;
    }

    setError(null);
    setIsForming(true);
    onCreationStart?.();
    console.log("[WorkFormationButton] Starting work formation from intent:", intentId);

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: intent.resolution.objective,
          description: intent.expression,
          linkedIntentId: intentId,
          domain: intent.resolution.context || "general",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create work: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("[WorkFormationButton] Work created successfully:", result.workId);
      
      // Set success state untuk menampilkan feedback visual
      setIsSuccess(true);
      setCreatedWorkId(result.workId);
      
      // Tunggu 2 detik sebelum redirect agar user bisa melihat pesan sukses
      setTimeout(() => {
        router.push(`/work/${result.workId}`);
      }, 2000);
    } catch (err) {
      const typedError = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(typedError.message);
      onCreationError?.(typedError);
      console.error("[WorkFormationButton] Work formation failed:", typedError);
      setIsForming(false);
    }
  };

  return (
    <div className="space-y-3">
      {!isSuccess ? (
        <Button
          intent="primary"
          variant="solid"
          size="lg"
          disabled={!intentId || isForming}
          loading={isForming}
          loadingText="Membentuk Work..."
          onClick={handleWorkFormation}
          className={className}
          rightIcon={
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h10m0 0l-3-3m3 3l-3 3" />
            </svg>
          }
          aria-label={buttonText}
          title="Membentuk Work dari Intent ini untuk memulai perjalanan bisnis Anda"
        >
          {buttonText}
        </Button>
      ) : (
        <div
          role="status"
          className="rounded-md border border-status-success/30 bg-status-success/5 p-4 text-sm text-status-success-fg animate-pulse"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-base">Work berhasil terbentuk!</p>
              <p className="mt-1">Work ID: {createdWorkId}</p>
              <p className="mt-1 text-xs opacity-80">Mengalihkan ke halaman Work...</p>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger-fg"
        >
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export type { WorkFormationButtonProps };