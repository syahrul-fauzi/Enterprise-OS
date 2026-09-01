"use client";
import { useParams } from "next/navigation";
import { IntentRefinementPage } from "@repo/presentation-features";

// EOS Face intent detail page - thin client adapter (only extracts params)
// BOUNDARY COMPLIANCE: apps/web = ROUTE ADAPTER only, no UI composition, no business logic
// All UI logic, state management, and feature composition belongs to packages/presentation
export default function IntentDetailPage() {
  // Only extract route params client-side - everything else delegated to canonical experience
  const { intentId } = useParams<{ intentId: string }>();
  
  // Pass ONLY required param to experience component - maintains strict separation of concerns
  return <IntentRefinementPage intentId={intentId} />;
}