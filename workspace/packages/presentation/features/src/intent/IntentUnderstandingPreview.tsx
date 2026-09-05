'use client';

import React from 'react';
// Updated types to match new UniversalExpression contract from universal-intent.contracts
type ExpressionOrigin = "human" | "ai_agent" | "machine" | "external_system" | "internal_eos";
type RawContentType = "expression" | "request" | "signal" | "event";
type ExpressionStatus = "RECEIVED" | "CAPTURED" | "UNDERSTANDING" | "UNDERSTANDING_INSUFFICIENT" | "UNDERSTANDING_SUFFICIENT" | "RESOLVING" | "RESOLVED" | "WORK_FORMED" | "FAILED";
interface RawContent { type: RawContentType; content: unknown; metadata?: Record<string, unknown>; }
interface DomainCandidate {
  domain: string;
  confidence: number;
}

interface IntentHypothesis {
  id: string;
  hypothesis: string;
  confidence: number;
  status: "proposed" | "confirmed" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  evidence: string[];
  domainCandidates: DomainCandidate[];
  canFormWork: boolean;
}
interface UnderstandingState {
  known: string[];
  unknown: string[];
  goal?: string;
  problem?: string;
  confidence: number;
  isSufficient: boolean;
  sufficiencyReason: string;
}
interface UnderstandingRequirement {
  reason: string;
  requiredCapabilities: string[];
  suggestedQuestions: string[];
}
interface UnderstandingDelta {
  previousStatus: string;
  newStatus: string;
  reason: string;
  unknowns: string[];
  suggestedQuestions: string[];
}
interface ConversationTurn {
  timestamp: Date;
  actorId: string;
  content: string;
  role: "user" | "eos" | "ai_agent" | "external";
  delta?: UnderstandingDelta;
}
interface Conversation {
  turns: ConversationTurn[];
}
interface IntentUnderstanding {
  rawExpression: string;
  interpretedObjective: string;
  context: { domain?: string; locale?: string; known: string[]; unknown: string[]; constraints: string[] };
  domainCandidates: Array<{ domain: string; confidence: number }>;
  intentType: string;
  entities: Array<{ type: string; role: string; value: string }>;
  unknowns: string[];
  clarificationRequired: boolean;
  dynamicContext?: { known: string[]; unknown: string[] };
  understandingState?: UnderstandingState;
  requirement?: UnderstandingRequirement;
}
interface CapabilityProvider {
  id: string;
  capabilityId: string;
  name: string;
  description: string;
  providerType: "ai" | "human" | "system" | "hybrid";
  availabilityScore: number;
  canHandle: (intentId: string) => Promise<boolean>;
}
interface UniversalExpression {
  id: string;
  origin: ExpressionOrigin;
  actorId?: string;
  tenantId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  raw: RawContent;
  status: ExpressionStatus;
  understanding?: IntentUnderstanding;
  hypotheses?: IntentHypothesis[];
  conversation?: Conversation;
  resolution?: { requirement: { reason?: string; requiredCapabilities: string[] }; selectedProvider?: string; history: any[]; resolvedAt?: Date };
  workId?: string;
  createdBy: string;
  lastModifiedBy?: string;
}
// Maintain backward compatibility with legacy UniversalIntent type
interface UniversalIntent {
  id: string;
  origin: ExpressionOrigin;
  actorId?: string;
  tenantId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  raw: RawContent;
  status: ExpressionStatus;
  understanding?: IntentUnderstanding;
  hypotheses?: IntentHypothesis[];
  conversation?: Conversation;
  resolution?: { requirement: { reason?: string; requiredCapabilities: string[] }; selectedProvider?: string; history: any[]; resolvedAt?: Date };
  workId?: string;
  createdBy: string;
  lastModifiedBy?: string;
}
import { Button } from "@repo/presentation-ui-system";

// Legacy IntentContract interface (inlined for backward compatibility)
interface LegacyIntentContract {
  expression: string;
  understanding?: any;
  resolution?: any;
  status?: string;
  raw?: any;
}

// Make it backward compatible: accept both UniversalExpression and legacy types
interface IntentUnderstandingPreviewProps {
  intent: UniversalExpression | UniversalIntent | LegacyIntentContract;
  availableCapabilities?: {
    capabilityId: string;
    availableProviders: CapabilityProvider[];
  }[];
  onConfirm: () => void;
  onRevise: () => void;
  onSelectProvider?: (capabilityId: string, providerId: string) => void;
  isSubmitting?: boolean;
  className?: string;
}

// Helper untuk generate nama pekerjaan yang natural dari input user
const generateWorkTitle = (expression: string, domainType: string, resolution: any): string => {
  if (domainType === "legal-case" && (expression.includes("PT") || expression.includes("perseroan"))) {
    return "Pendirian Perseroan Terbatas (PT)";
  }
  return resolution?.objective || expression;
};

// Helper untuk dapatkan apa yang dibutuhkan berdasarkan domain
const getRequirements = (domainType: string): string[] => {
  if (domainType === "legal-case") {
    return ["Informasi pendiri", "Dokumen identitas", "Penunjukan notaris"];
  }
  return ["Data yang diperlukan", "Konfirmasi detail", "Verifikasi kelengkapan"];
};

// Helper untuk dapatkan langkah pertama
const getFirstStep = (domainType: string): string => {
  if (domainType === "legal-case") {
    return "Bentuk pekerjaan pendirian PT";
  }
  return "Lanjutkan pembentukan pekerjaan";
};

export const IntentUnderstandingPreview: React.FC<IntentUnderstandingPreviewProps> = ({
  intent,
  availableCapabilities = [],
  onConfirm,
  onRevise,
  onSelectProvider,
  isSubmitting = false,
  className = '',
}) => {
  // Handle UniversalExpression, UniversalIntent and legacy IntentContract formats for backward compatibility
  const status: ExpressionStatus = "status" in intent ? intent.status as ExpressionStatus : "RESOLVED";
  const raw = "raw" in intent ? intent.raw : { type: "expression", content: (intent as any).expression };
  const understanding = "understanding" in intent ? intent.understanding : intent;
  const intentResolution = "resolution" in intent ? intent.resolution : undefined;
  const hypotheses = "hypotheses" in intent ? intent.hypotheses : undefined;
  const conversation = "conversation" in intent ? intent.conversation : undefined;
  const understandingState = understanding?.understandingState;
  
  // Extract raw expression from UniversalIntent format - preserve raw content
  const rawExpression = typeof raw.content === 'string' 
    ? raw.content 
    : JSON.stringify(raw.content);
  const lowerExpression = rawExpression.toLowerCase();
  
  // Extract dynamic understanding metadata from universal intent structure (supports new UniversalExpression's understandingState)
  const knownFacts = understandingState?.known || (understanding as any)?.dynamicContext?.known || understanding?.context?.known || [];
  const unknownFacts = understandingState?.unknown || (understanding as any)?.dynamicContext?.unknown || understanding?.context?.unknown || [];
  const confidenceScore = understandingState?.confidence || 0;
  const isSufficient = understandingState?.isSufficient || false;
  const sufficiencyReason = understandingState?.sufficiencyReason || "";
  
  // Use domain from dynamic understanding instead of hardcoded checks
  // Removed legacy hardcoded patterns per user request: if (text.includes("mendirikan pt")) { return LEGAL }
  const domainCandidates = understanding?.domainCandidates || [];
  const primaryDomain = domainCandidates.length > 0 ? domainCandidates[0] : null;
  const domainType = primaryDomain?.domain || (understanding?.workType || "general");
  const workTitle = generateWorkTitle(rawExpression, domainType, understanding);
  const requirements = getRequirements(domainType);
  const firstStep = getFirstStep(domainType);

  const isResolving = status === "RESOLVING";
  const isInsufficient = status === "UNDERSTANDING_INSUFFICIENT";
  const clarificationRequired = isResolving || isInsufficient || (understanding?.clarificationRequired ?? false);

  // Convert unknown facts to user-friendly questions
  const generateClarificationQuestions = (unknowns: string[]): string[] => {
    return unknowns.map(unknown => {
      if (unknown.includes("nama perusahaan") || unknown.includes("company name")) {
        return "Apa nama lengkap perusahaan yang ingin Anda dirikan?";
      }
      if (unknown.includes("alamat") || unknown.includes("address")) {
        return "Dimana alamat domisili perusahaan yang akan didirikan?";
      }
      if (unknown.includes("pendiri") || unknown.includes("founders")) {
        return "Siapa saja pendiri yang akan terlibat dalam perusahaan ini?";
      }
      if (unknown.includes("modal") || unknown.includes("capital")) {
        return "Berapa jumlah modal dasar yang akan disetorkan untuk perusahaan?";
      }
      if (unknown.includes("bidang usaha") || unknown.includes("business purpose")) {
        return "Apa bidang usaha utama dari perusahaan ini?";
      }
      // Default question if no specific pattern matched
      return `Bisakah Anda jelaskan lebih detail tentang: ${unknown}?`;
    });
  };

  const clarificationQuestions = unknownFacts.length > 0 ? generateClarificationQuestions(unknownFacts) : [];

  // Status badge styling for expression lifecycle states (new UniversalExpression statuses)
  const getStatusBadge = (status: ExpressionStatus) => {
    const statusConfig: Record<ExpressionStatus, { label: string; color: string }> = {
      "RECEIVED": { label: "Diterima", color: "bg-gray-100 text-gray-700" },
      "CAPTURED": { label: "Tercatat", color: "bg-blue-100 text-blue-700" },
      "UNDERSTANDING": { label: "Sedang dipahami", color: "bg-yellow-100 text-yellow-700" },
      "UNDERSTANDING_INSUFFICIENT": { label: "Butuh klarifikasi", color: "bg-orange-100 text-orange-700" },
      "UNDERSTANDING_SUFFICIENT": { label: "Pemahaman cukup", color: "bg-teal-100 text-teal-700" },
      "RESOLVING": { label: "Perlu penyelesaian", color: "bg-orange-100 text-orange-700" },
      "RESOLVED": { label: "Selesai dipahami", color: "bg-green-100 text-green-700" },
      "WORK_FORMED": { label: "Pekerjaan dibuat", color: "bg-emerald-100 text-emerald-700" },
      "FAILED": { label: "Gagal", color: "bg-red-100 text-red-700" }
    };
    return statusConfig[status];
  };

  // Fallback untuk status yang tidak dikenali (hindari runtime error)
  const statusBadge = getStatusBadge(status) || { label: "Diproses", color: "bg-gray-100 text-gray-700" };

  return (
    <div className={`w-full ${className}`}>
      {/* Status Badge - Show intent lifecycle state */}
      <div className="text-center mb-4">
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${statusBadge.color}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Hero Section - Follow user's UI requirement: "Apa yang perlu Anda selesaikan?" */}
      <div className="text-center mb-10 py-8 px-4 max-w-2xl mx-auto bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Apa yang perlu Anda selesaikan?</h2>
        <p className="text-xl text-gray-800 font-medium leading-relaxed">"{rawExpression}"</p>
        {/* Show confidence score if available from new understandingState */}
        {/* Hide technical confidence score per user requirement - only show sufficiency to users */}
        {sufficiencyReason && (
          <p className={`mt-3 text-base font-medium ${isSufficient ? 'text-green-600' : 'text-amber-600'}`}>
            {sufficiencyReason}
          </p>
        )}
      </div>

      {/* Main Card - If insufficient understanding: Show what's known + ask question (per user's insufficient layout) */}
      {!isSufficient ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 mb-8 max-w-2xl mx-auto">
          {/* What EOS already understands - per user's UI requirement */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">✦ Yang EOS pahami</h4>
            {knownFacts.length > 0 ? (
              <ul className="space-y-2 mb-8">
                {knownFacts.map((fact: string, i: number) => (
                  <li key={i} className="text-gray-800 text-lg">{fact}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700 mb-6">Saya masih mempelajari apa yang Anda butuhkan.</p>
            )}
            
            {/* Agar saya bisa membantu lebih tepat: */}
            <div className="mt-8 p-6 bg-amber-50 rounded-xl">
              <p className="text-gray-900 font-medium text-lg mb-6">Agar saya bisa membantu lebih tepat:</p>
              {(understanding?.requirement?.suggestedQuestions || clarificationQuestions).map((question: string, i: number) => (
                <p key={i} className="text-xl text-gray-900 font-semibold mb-4">{question}</p>
              ))}
              <Button
                intent="primary"
                variant="solid"
                onClick={onRevise}
                disabled={isSubmitting}
                className="w-full sm:w-auto mt-4 px-6 py-3"
              >
                Jawab sekarang →
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Card - If sufficient understanding: Show final summary + action options (per user's sufficient layout) */
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 mb-8 max-w-2xl mx-auto">
          {/* EOS sudah cukup memahami kebutuhan Anda - per user's UI requirement */}
          <div>
            <h4 className="text-xl font-bold text-gray-900 mb-6">EOS sudah cukup memahami kebutuhan Anda.</h4>
            
            <div className="space-y-6 mb-8">
              <div>
                <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Tujuan</h5>
                <p className="text-xl font-semibold text-gray-900">{understanding?.interpretedObjective || workTitle}</p>
              </div>
              <div>
                <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Hasil yang akan dicapai</h5>
                <p className="text-lg text-gray-800">{sufficiencyReason || "Pekerjaan Anda dapat segera dimulai."}</p>
              </div>
            </div>

            {/* Action options */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <p className="text-gray-900 font-medium text-lg mb-6">Bagaimana Anda ingin melanjutkan?</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  intent="primary"
                  variant="solid"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3"
                >
                  Bentuk Work →
                </Button>
                <Button
                  intent="secondary"
                  variant="outline"
                  onClick={() => {}}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3"
                >
                  Konsultasikan dulu
                </Button>
                <Button
                  intent="secondary"
                  variant="ghost"
                  onClick={onRevise}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3"
                >
                  Perbaiki pemahaman
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* "Optimize your Intent" Trigger Button - per user requirement: interaction trigger, not gimmick */}
      <div className="flex justify-center mt-6 mb-4">
        <button
          onClick={onRevise}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 rounded-full border border-indigo-200 hover:border-indigo-300 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
        >
          <span>✦</span>
          Optimize your Intent
        </button>
      </div>

      {/* Action Buttons - Only show when insufficient (sufficient view has its own buttons already) */}
      {!isSufficient && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto mt-8">
          <button
            onClick={onRevise}
            disabled={isSubmitting}
            className="text-gray-600 hover:text-gray-900 underline text-sm"
          >
            Bukan ini? Perbaiki pemahaman EOS
          </button>
        </div>
      )}
    </div>
  );
};

export default IntentUnderstandingPreview;