"use client";

import { useRouter } from "next/navigation";
import type { IntentContract } from "../intent/types.js";

interface WorkFormationButtonProps {
  /** The intent contract to create work from */
  intent: IntentContract;
  /** Optional intent ID (derived from intent if not provided) */
  intentId?: string;
  /** Button text customization */
  buttonText?: string;
  /** Optional className for styling */
  className?: string;
  /** Optional callback when work creation starts */
  onCreationStart?: () => void;
  /** Optional callback when work creation fails */
  onCreationError?: (error: Error) => void;
  /** Optional custom API endpoint (defaults to canonical /api/work/create) */
  apiEndpoint?: string;
}

/**
 * EOS FACE Core Building Block: WorkFormationButton
 * 
 * Reusable component that encapsulates the full work formation flow:
 * 1. Takes an IntentContract (EOS primitive)
 * 2. Calls canonical /api/work/create to form a Work from the intent
 * 3. Redirects to the newly created work's detail page
 * 
 * Maintains the invariant: Presentation terminology never redefines EOS primitives
 * Works across all domains: legal (Case), services (ServiceRequest), and any future Work specializations
 * 
 * Follows the spine flow: IntentDetailPage → /work/new?intentId=... → WorkDetailPage
 */
export function WorkFormationButton({
  intent,
  intentId: providedIntentId,
  buttonText = "Bentuk Work dari Intent ini",
  className = "",
  onCreationStart,
  onCreationError,
  apiEndpoint = "/api/work/create",
}: WorkFormationButtonProps) {
  const router = useRouter();
  const intentId = providedIntentId || intent.id;

  const handleWorkFormation = async () => {
    if (!intentId) {
      const error = new Error("Intent ID is required to form work");
      onCreationError?.(error);
      console.error("[WorkFormationButton] Error:", error);
      return;
    }

    onCreationStart?.();
    console.log("[WorkFormationButton] Starting work formation from intent:", intentId);

    try {
      // Canonical Work API call - uses the EOS primitive boundary
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
      
      // Redirect to canonical work detail page - maintains spine URL structure
      router.push(`/work/${result.workId}`);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error("Unknown error occurred");
      onCreationError?.(typedError);
      console.error("[WorkFormationButton] Work formation failed:", typedError);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleWorkFormation}
        disabled={!intentId}
        className={`inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {buttonText}
      </button>
      {/* Hover tooltip with work formation explanation */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Membentuk Work dari Intent ini untuk memulai perjalanan bisnis Anda
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}

export type { WorkFormationButtonProps };