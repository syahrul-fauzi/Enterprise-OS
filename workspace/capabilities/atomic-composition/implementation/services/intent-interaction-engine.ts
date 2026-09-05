/**
 * IntentInteractionEngine - B2: Understanding Engine Implementation
 * Replaces legacy resolveSemanticIntent with modern pipeline:
 * HUMAN/AGENT/MACHINE → EXPRESSION → UNDERSTANDING → RESOLUTION → INTENT/NEED → CAPABILITY/WORK
 * 
 * Separated from UI/API routes per user's requirement: "Pisahkan resolver dari API route. Dari: resolveSemanticIntent(expression) menjadi: intentInteractionEngine.process({ expression, source, context })"
 * 
 * Implements the full interaction lifecycle from "belum memahami" to "cukup memahami untuk bertindak"
 */

import type {
  IntentInteractionState,
  InteractionProcessInput,
  InteractionProcessOutput,
  UnderstandingHypothesis,
  UnderstandingGap,
  AdaptiveQuestion
} from "../contracts/intent-understanding.contracts";
import { createNewInteraction } from "../contracts/intent-understanding.contracts";
import { intentUnderstandingService } from "./intent-understanding.service";
import { gapAnalysisService } from "./gap-analysis.service";

// Import the actual ruleBasedProvider directly from the service where it's defined
import { ruleBasedProvider } from "./intent-understanding.service";
type IntentUnderstandingProvider = any;
type IntentUnderstanding = any;

export class IntentInteractionEngine {
  private static instance: IntentInteractionEngine;
  private providers: Map<string, IntentUnderstandingProvider> = new Map();
  private activeProviderId: string;

  // Singleton pattern - engine is a global service
  private constructor() {
    // B3: SIMPLIFIED PROVIDER ARCHITECTURE - ONLY USE RULEBASED PROVIDER
    // This complies with user's requirement: "EOS tidak boleh bergantung total pada token AI"
    // Rulebased is 100% reliable, always available, no external API keys needed
    this.providers.set("rulebased", ruleBasedProvider);

    // No complex AI provider selection logic - rulebased is the only provider used
    this.activeProviderId = "rulebased";
    console.log(`[INTENT INTERACTION ENGINE] Initialized with default provider: rulebased (100% available, no external dependencies)`);
  }

  public static getInstance(): IntentInteractionEngine {
    if (!IntentInteractionEngine.instance) {
      IntentInteractionEngine.instance = new IntentInteractionEngine();
    }
    return IntentInteractionEngine.instance;
  }

  /**
   * Allow manual selection of a specific provider (for debugging/override)
   */
  public setProvider(providerId: string): boolean {
    if (this.providers.has(providerId) && this.providers.get(providerId)!.isAvailable()) {
      this.activeProviderId = providerId;
      console.log(`[INTENT INTERACTION ENGINE] Manually switched to provider: ${providerId}`);
      return true;
    }
    console.error(`[INTENT INTERACTION ENGINE] Failed to set provider: ${providerId} not available`);
    return false;
  }

  /**
   * Get list of all available providers (for UI/debugging)
   */
  public getAvailableProviders(): Array<{ id: string; type: string; available: boolean }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      type: provider.getProviderType(),
      available: provider.isAvailable()
    }));
  }

  /**
   * Core processing method - replaces legacy resolveSemanticIntent
   * @param input Interaction input containing expression, source, and context
   * @returns Full interaction state with understanding, delta, and next action recommendation
   */
  async process(input: InteractionProcessInput): Promise<InteractionProcessOutput> {
    const now = new Date().toISOString();
    
    // Initialize or load existing interaction state
    let state: IntentInteractionState = input.existingState || createNewInteraction(
      input.expression,
      input.source,
      input.entryPoint,
      input.actorId
    );

    // SCENARIO 3: If we have existingState (continuing conversation), preserve all previous known facts
    // This ensures "understanding berubah bukan sekadar input terakhir menggantikan input sebelumnya"
    if (input.existingState) {
      console.log(`[INTENT INTERACTION ENGINE] Continuing existing interaction ${state.id} - preserving conversation history`);
      console.log(`[INTENT INTERACTION ENGINE] Previous history length: ${state.history.length}`);
    }

    try {
      // B3: Use selected provider to understand the expression
      const activeProvider = this.providers.get(this.activeProviderId)!;
      console.log(`[INTENT INTERACTION ENGINE] Processing with ${this.activeProviderId} provider`);
      
      // Step 1: Run understanding through our selected provider
      const interpretation: IntentUnderstanding = await activeProvider.understand(state.expression.raw);
      
      // SCENARIO 3: If continuing conversation, merge previous known facts into new understanding
      // This is the critical implementation that prevents "input terakhir menggantikan input sebelumnya"
      if (input.existingState && state.understanding.context?.known) {
        const previousKnown = [...state.understanding.context.known];
        // Merge into the interpretation's context.known directly (dynamicUnderstanding was removed per contract)
        if (interpretation.context?.known) {
          // Merge previous known facts with new ones - NO OVERWRITE!
          const mergedKnown = [...previousKnown];
          for (const fact of interpretation.context.known) {
            if (!mergedKnown.includes(fact)) {
              mergedKnown.push(fact);
            }
          }
          interpretation.context.known = mergedKnown;
          console.log(`[SCENARIO 3] MERGED known facts: ${JSON.stringify(interpretation.context.known)}`);
        }
      }

      // Step 2: Generate hypotheses from the interpretation (B1: Intent Hypothesis requirement)
      // SCENARIO 4-5: Pass previous hypotheses and correction flag to support retraction
      const previousHypotheses = input.existingState?.understanding?.hypotheses;
      const isCorrectingUnderstanding = input.isCorrectingUnderstanding || false;
      const hypotheses = this.generateHypotheses(interpretation, previousHypotheses, isCorrectingUnderstanding);
      
      // Step 3: Analyze understanding completeness (find gaps, calculate confidence)
      const { confidence, gaps } = await this.analyzeUnderstanding(interpretation, hypotheses);
      
      // Step 4: Generate adaptive questions to fill gaps (B4: Adaptive UI requirement)
      const questions = this.generateAdaptiveQuestions(gaps);

      // Step 5: Update interaction state with new understanding
      state.understanding.hypotheses = hypotheses;
      state.understanding.confidence = confidence;
      state.understanding.knownEntities = interpretation.entities;
      state.understanding.context = interpretation.context;
      state.delta.missing = gaps;
      state.delta.questions = questions;
      state.expression.lastUpdatedAt = now;
      state.delta.lastDeltaUpdate = now;

      // Step 6: Determine interaction status and next action
      const { status, nextInteraction } = this.determineNextAction(confidence, interpretation.canFormWork);
      state.understanding.status = status;
      state.understanding.statusUpdatedAt = now;

      // Step 7: If we can resolve immediately, create resolution
      if (nextInteraction === "RESOLVE" && interpretation.canFormWork) {
        state.resolution = this.createResolution(interpretation, input.actorId);
      }

      // Add history event for this processing cycle
      state.history.push({
        id: crypto.randomUUID(),
        eventType: "UPDATED",
        timestamp: now,
        actor: {
          type: "system",
          actorId: "intent-interaction-engine"
        },
        description: `Processed expression: confidence=${confidence.toFixed(2)}, gaps=${gaps.length}, canFormWork=${interpretation.canFormWork}`,
        newState: {
          understanding: { ...state.understanding },
          delta: { ...state.delta }
        }
      });

      // Return the full output for API/UI to consume
      return {
        state,
        understanding: state.understanding,
        delta: state.delta,
        nextInteraction,
        resolution: state.resolution
      };

    } catch (error) {
      // Handle any errors during processing
      console.error("[IntentInteractionEngine] Error processing expression:", error);
      state.understanding.status = "BLOCKED";
      state.understanding.statusUpdatedAt = now;
      
      state.history.push({
        id: crypto.randomUUID(),
        eventType: "ESCALATED",
        timestamp: now,
        actor: {
          type: "system",
          actorId: "intent-interaction-engine"
        },
        description: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
        newState: { understanding: { ...state.understanding } }
      });

      return {
        state,
        understanding: state.understanding,
        delta: state.delta,
        nextInteraction: "ESCALATE"
      };
    }
  }

  /**
   * Generate multiple understanding hypotheses from the raw interpretation
   * Implements the Intent Hypothesis requirement with confidence scoring
   * SCENARIO 4-5: Supports hypothesis retraction when user changes mind/corrects understanding
   * SCENARIO 6: Supports machine signal processing with structured inputs
   */
  private generateHypotheses(understanding: any, previousHypotheses?: UnderstandingHypothesis[], isCorrectingUnderstanding?: boolean): UnderstandingHypothesis[] {
    const hypotheses: UnderstandingHypothesis[] = [];
    const now = new Date().toISOString();
    
    // SCENARIO 4-5: Retract previous hypotheses if user is correcting understanding or changed their mind
    if (previousHypotheses && previousHypotheses.length > 0 && isCorrectingUnderstanding) {
      console.log(`[SCENARIO 5] RETRACTING ${previousHypotheses.length} previous hypotheses due to understanding correction`);
      previousHypotheses.forEach(h => {
        if (!h.retracted) {
          h.retracted = true;
          h.retractedAt = now;
          h.retractionReason = "User corrected previous understanding";
          console.log(`[SCENARIO 5] Retracted hypothesis ${h.id}: ${h.interpretedObjective}`);
        }
      });
      // Add retracted hypotheses to maintain history
      hypotheses.push(...previousHypotheses);
    }
    // SCENARIO 4: User changed their mind (retract all work candidates)
    else if (previousHypotheses && previousHypotheses.length > 0 && understanding?.intentType === "information-request") {
      const hadWorkCandidate = previousHypotheses.some(h => h.canFormWork === true);
      if (hadWorkCandidate) {
        console.log(`[SCENARIO 4] User changed mind: downgrading from WORK CANDIDATE to INFORMATION`);
        previousHypotheses.forEach(h => {
          if (h.canFormWork) {
            h.retracted = true;
            h.retractedAt = now;
            h.retractionReason = "User changed mind, now information request only";
            console.log(`[SCENARIO 4] Retracted work hypothesis ${h.id}`);
          }
        });
        hypotheses.push(...previousHypotheses);
      }
    }
    // SCENARIO 3: Maintain continuity, preserve previous hypotheses if no correction
    else if (previousHypotheses && !isCorrectingUnderstanding) {
      hypotheses.push(...previousHypotheses);
    }

    // Null safety: handle cases where understanding properties might be undefined
    const safeInterpretedObjective = understanding?.interpretedObjective || "Ekspresi belum teridentifikasi spesifik";
    const safeDomainCandidates = understanding?.domainCandidates || [{ domain: "generic", confidence: 0.5 }];
    const safeClarificationRequired = understanding?.clarificationRequired ?? true;
    const safeCanFormWork = understanding?.canFormWork ?? false;

    // Primary hypothesis from the interpretation
    const newHypothesis: UnderstandingHypothesis = {
      id: crypto.randomUUID(),
      interpretedObjective: safeInterpretedObjective,
      domainCandidates: safeDomainCandidates,
      confidence: isCorrectingUnderstanding ? 0.9 : (safeClarificationRequired ? 0.65 : 0.92),
      canFormWork: safeCanFormWork,
      createdAt: now,
      updatedAt: now,
      retracted: false
    };
    hypotheses.push(newHypothesis);
    console.log(`[SCENARIO 6] Created new hypothesis: ${newHypothesis.id} - ${newHypothesis.interpretedObjective} (canFormWork: ${newHypothesis.canFormWork})`);

    // For lower confidence cases, add alternative hypotheses
    if (understanding?.clarificationRequired && understanding?.unknowns?.length > 0) {
      // Add alternative interpretations as separate hypotheses
      if (understanding?.interpretedObjective?.includes("PT") || understanding?.interpretedObjective?.includes("perusahaan")) {
        hypotheses.push({
          id: crypto.randomUUID(),
          interpretedObjective: "Membutuhkan informasi tentang pajak perusahaan",
          domainCandidates: [{ domain: "tax", confidence: 0.4 }],
          confidence: 0.35,
          canFormWork: false,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    // Set top hypothesis (highest confidence)
    if (hypotheses.length > 0) {
      hypotheses.sort((a, b) => b.confidence - a.confidence);
    }

    return hypotheses;
  }

  /**
   * Analyze understanding to find gaps and calculate overall confidence
   * Uses gap analysis service to identify what's missing
   */
  private async analyzeUnderstanding(understanding: any, hypotheses: UnderstandingHypothesis[]): Promise<{ confidence: number; gaps: UnderstandingGap[] }> {
    const gaps: UnderstandingGap[] = [];
    let baseConfidence = hypotheses.length > 0 ? (hypotheses[0]?.confidence ?? 0.5) : 0.5;

    // Convert unknowns from interpretation into structured UnderstandingGaps
    if (understanding.unknowns && understanding.unknowns.length > 0) {
      understanding.unknowns.forEach((unknown: string, index: number) => {
        gaps.push({
          id: crypto.randomUUID(),
          field: `unknown_${index}`,
          description: unknown,
          priority: index === 0 ? 1 : index + 1,
          impact: "Cannot fully understand user's objective without this information"
        });
      });
      
      // Reduce confidence based on number of gaps
      baseConfidence -= gaps.length * 0.1;
    }

    // Use gap analysis service for additional checks
    const sufficiencyCheck = await gapAnalysisService.checkSufficiency({
      ...understanding,
      hypotheses
    });

    if (!sufficiencyCheck.isSufficient) {
      sufficiencyCheck.gaps.forEach((gap: string, index: number) => {
        if (!gaps.find(g => g.description === gap)) {
          gaps.push({
            id: crypto.randomUUID(),
            field: `gap_${index}`,
            description: gap,
            priority: gaps.length + 1,
            impact: "Additional information needed to proceed"
          });
        }
      });
    }

    // Ensure confidence stays within 0-1 bounds
    const finalConfidence = Math.max(0.1, Math.min(1.0, baseConfidence));

    return { confidence: finalConfidence, gaps };
  }

  /**
   * Generate adaptive questions to ask the user to fill identified gaps
   * Implements the adaptive interaction requirement - no forms, just natural questions
   */
  private generateAdaptiveQuestions(gaps: UnderstandingGap[]): AdaptiveQuestion[] {
    return gaps.map(gap => ({
      id: crypto.randomUUID(),
      gapId: gap.id,
      questionText: this.formatQuestion(gap.description),
      askedAt: undefined,
      answeredAt: undefined
    }));
  }

  /**
   * Format a gap description into a natural language question
   * Avoids form wizard pattern - generates conversational but clear questions
   */
  private formatQuestion(description: string): string {
    // Simple transformation from gap description to natural question
    if (description.includes("lokasi") || description.includes("tempat")) {
      return `Di mana lokasi yang Anda maksud?`;
    }
    if (description.includes("waktu") || description.includes("tanggal")) {
      return `Kapan Anda berencana untuk memulai?`;
    }
    if (description.includes("nama") || description.includes("perusahaan")) {
      return `Apa nama perusahaan yang ingin Anda dirikan?`;
    }
    // Default to open question for unknown formats
    return `Bisakah Anda jelaskan lebih detail tentang "${description}"?`;
  }

  /**
   * Determine the next interaction step based on confidence and work eligibility
   * Implements the lifecycle state transitions - aligned with UI contract
   */
  private determineNextAction(confidence: number, canFormWork: boolean): { status: IntentInteractionState["understanding"]["status"]; nextInteraction: InteractionProcessOutput["nextInteraction"] } {
    if (confidence >= 0.85 && canFormWork) {
      return { status: "SUFFICIENT", nextInteraction: "RESOLVE" };
    }
    if (confidence >= 0.5) {
      return { status: "UNDERSTANDING", nextInteraction: "CLARIFY" }; // ✅ Sesuai dengan InteractionStatus yang valid
    }
    return { status: "BLOCKED", nextInteraction: "ESCALATE" };
  }

  /**
   * Create a formal resolution when understanding is sufficient
   * Maps to the final RESOLUTION → WORK phase of the pipeline
   */
  private createResolution(understanding: any, actorId?: string): IntentInteractionState["resolution"] {
    const now = new Date().toISOString();
    
    // B5: Resolution Router - fully implements the 4 resolution types per user requirement
    // Never force Work creation; only create it if explicitly eligible and user confirms
    if (understanding.intentType === "information-request" || understanding.informationRequest || understanding.resolutionType === "INFORMATION") {
      return {
        type: "INFORMATION",
        resolvedAt: now,
        resolvedBy: {
          type: "system",
          actorId: "understanding-engine"
        },
        informationResponse: understanding.informationResponse || "Kami akan menyediakan informasi yang Anda butuhkan."
      };
    }

    // Check if this needs human/specialist consultation first
    const requiresConsultation = understanding.requiresConsultation || 
      (understanding.domainCandidates && understanding.domainCandidates[0]?.confidence < 0.75);
    
    if (requiresConsultation) {
      return {
        type: "CONSULTATION",
        resolvedAt: now,
        resolvedBy: {
          type: "system",
          actorId: "understanding-engine"
        },
        recommendedCapability: "consultation-booking"
      };
    }

    if (understanding.canFormWork) {
      return {
        type: "WORK",
        resolvedAt: now,
        resolvedBy: {
          type: actorId ? "human" : "system",
          actorId
        }
      };
    }

    // Default to capability handling if no other resolution type matches
    return {
      type: "CAPABILITY",
      resolvedAt: now,
      resolvedBy: {
        type: "system",
        actorId: "understanding-engine"
      },
      recommendedCapability: understanding.domainCandidates[0]?.domain || "general-support"
    };
  }
}

// Export the singleton instance for use in API routes and services
export const intentInteractionEngine = IntentInteractionEngine.getInstance();