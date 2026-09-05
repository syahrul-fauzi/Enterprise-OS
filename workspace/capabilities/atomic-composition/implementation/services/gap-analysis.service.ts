// GapAnalysisService - E01-UNIVERSAL-INTENT-PIPELINE: Sufficiency checking for universal intents
// Analyzes intent understanding to determine if we can form work, or if we need resolution
// Implements the core "CAN EOS FORM WORK NOW?" logic from the architecture proposal

import { UniversalExpression, SufficiencyCheckResult, IntentResolutionRequirement } from "../contracts/universal-intent.contracts";
import { IntentUnderstanding, DomainCandidate } from "../contracts/intent-understanding.contracts";

// Minimum threshold for an intent to be considered sufficient
const SUFFICIENCY_THRESHOLD = 0.7; // 70% complete = can form work

// Domain-specific sufficiency requirements (can be extended per domain)
const DOMAIN_REQUIREMENTS: Record<string, { requiredFields: string[]; minUnknowns: number }> = {
  "legal": {
    requiredFields: ["objective", "domain", "primaryEntity"],
    minUnknowns: 3 // Max 3 unknowns allowed for legal intents to still form work
  },
  "services": {
    requiredFields: ["objective", "serviceType", "requester"],
    minUnknowns: 2
  },
  "internal": {
    requiredFields: ["objective", "source", "targetWorkId"],
    minUnknowns: 1
  },
  // Default for all other domains
  "generic": {
    requiredFields: ["objective"],
    minUnknowns: 5
  }
};

export class GapAnalysisService {
  private static instance: GapAnalysisService;

  private constructor() {}

  // Singleton pattern to ensure single instance across the system
  public static getInstance(): GapAnalysisService {
    if (!GapAnalysisService.instance) {
      GapAnalysisService.instance = new GapAnalysisService();
    }
    return GapAnalysisService.instance;
  }

  /**
   * Main method to check if an intent is sufficient to form work
   * Implements the core sufficiency/gap analysis logic
   * SUPPORTS BOTH:
   * - New UniversalExpression (user's new architecture: has 'state' for understanding)
   * - Legacy UniversalIntent (original architecture: uses IntentUnderstanding with direct context)
   */
  public async checkSufficiency(intent: UniversalExpression | any): Promise<SufficiencyCheckResult> {
    const understanding = intent.understanding;
    
    // If no understanding exists, it's definitely insufficient
    if (!understanding) {
      return this.createInsufficientResult(
        intent,
        ["No understanding generated for this intent"],
        "Understanding engine has not processed the intent yet"
      );
    }

    // Get domain-specific requirements - support BOTH new UniversalExpression (with state) and legacy IntentUnderstanding (with context)
    let contextDomain: string | undefined;
    // First check if there's a top-level context on the understanding object (new architecture)
    if ('context' in understanding && (understanding as any).context) {
      contextDomain = (understanding as any).context.domain;
    } 
    // If not found, check if state has context (some implementations might embed it there)
    else if ('state' in understanding && understanding.state && (understanding.state as any).context) {
      contextDomain = (understanding.state as any).context.domain;
    }
    const domain = contextDomain || "generic";
    const requirements = DOMAIN_REQUIREMENTS[domain] || DOMAIN_REQUIREMENTS["generic"];

    // Calculate completeness score - ensure requirements is never undefined
    const { score, gaps } = this.calculateCompleteness(understanding, requirements!);

    // Check if we meet the threshold
    const isSufficient = score >= SUFFICIENCY_THRESHOLD;

    if (isSufficient) {
      return {
        isSufficient: true,
        score,
        gaps: []
      };
    }

    // If insufficient, create resolution requirement
    return this.createInsufficientResult(
      intent,
      gaps,
      `Intent does not meet the minimum sufficiency threshold (${SUFFICIENCY_THRESHOLD * 100}%)`
    );
  }

  /**
   * Calculate how complete an understanding is based on domain requirements
   */
  private calculateCompleteness(
    understanding: IntentUnderstanding,
    requirements: { requiredFields: string[]; minUnknowns: number }
  ): { score: number; gaps: string[] } {
    let score = 0;
    const maxScore = 100;
    const gaps: string[] = [];

    // Check 1: Core required fields exist (40% of score)
    const fieldScore = this.checkRequiredFields(understanding, requirements.requiredFields);
    score += fieldScore.score;
    gaps.push(...fieldScore.gaps);

    // Check 2: Unknown count is within limits (30% of score) - support both legacy 'unknowns' and new 'state.unknown' (UniversalExpression)
    const unknowns = (understanding as any).state?.unknown || understanding.unknowns || [];
    const unknownScore = this.checkUnknownCount(unknowns.length, requirements.minUnknowns);
    score += unknownScore.score;
    if (!unknownScore.passed) {
      gaps.push(`Too many unknowns (${understanding.unknowns.length}), maximum allowed: ${requirements.minUnknowns}`);
    }

    // Check 3: Has at least one valid domain candidate (15% of score)
    const domainScore = this.checkDomainCandidates(understanding.domainCandidates);
    score += domainScore.score;
    gaps.push(...domainScore.gaps);

    // Check 4: Has intent type defined (15% of score)
    const intentTypeScore = this.checkIntentType(understanding.intentType);
    score += intentTypeScore.score;
    if (!intentTypeScore.passed) {
      gaps.push("No canonical intent type defined");
    }

    // Normalize score to 0.0-1.0
    const normalizedScore = score / maxScore;

    return {
      score: normalizedScore,
      gaps
    };
  }

  /**
   * Check if all required fields exist in the understanding
   */
  private checkRequiredFields(
    understanding: IntentUnderstanding,
    requiredFields: string[]
  ): { score: number; gaps: string[] } {
    const maxPoints = 40; // 40% of total score
    const pointsPerField = maxPoints / requiredFields.length;
    let earnedPoints = 0;
    const gaps: string[] = [];

    for (const field of requiredFields) {
      if (this.hasField(understanding, field)) {
        earnedPoints += pointsPerField;
      } else {
        gaps.push(`Missing required field: ${field}`);
      }
    }

    return {
      score: earnedPoints,
      gaps
    };
  }

  /**
   * Helper to check if a nested field exists in the understanding object
   */
  private hasField(understanding: IntentUnderstanding, fieldPath: string): boolean {
    const fields = fieldPath.split(".");
    let current: unknown = understanding;
    
    for (const field of fields) {
      if (current === null || current === undefined) return false;
      current = (current as Record<string, unknown>)[field];
    }
    
    return current !== undefined && current !== null;
  }

  /**
   * Check if the number of unknowns is within acceptable limits
   */
  private checkUnknownCount(unknowns: number, maxAllowed: number): { score: number; passed: boolean } {
    const maxPoints = 30;
    if (unknowns <= maxAllowed) {
      return { score: maxPoints, passed: true };
    }

    // Penalize proportionally for each unknown over the limit
    const excess = unknowns - maxAllowed;
    const penalty = excess * 5; // 5 points deducted per excess unknown
    const earnedPoints = Math.max(0, maxPoints - penalty);
    
    return {
      score: earnedPoints,
      passed: false
    };
  }

  /**
   * Check if there's at least one valid domain candidate with good confidence
   */
  private checkDomainCandidates(candidates: DomainCandidate[]): { score: number; gaps: string[] } {
    const maxPoints = 15;
    const gaps: string[] = [];

    if (!candidates || candidates.length === 0) {
      gaps.push("No domain candidates identified");
      return { score: 0, gaps };
    }

    // Check if any candidate has confidence > 0.7
    const hasValidCandidate = candidates.some(c => c.confidence >= 0.7);
    if (hasValidCandidate) {
      return { score: maxPoints, gaps };
    }

    gaps.push("No high-confidence domain candidate identified");
    return { score: maxPoints / 2, gaps }; // Half points for having some candidate
  }

  /**
   * Check if a valid canonical intent type is set
   */
  private checkIntentType(intentType: string): { score: number; passed: boolean } {
    const maxPoints = 15;
    if (intentType && intentType.length > 0) {
      return { score: maxPoints, passed: true };
    }
    return { score: 0, passed: false };
  }

  /**
   * Create a standardized insufficient result with resolution requirement
   */
  private createInsufficientResult(
    intent: UniversalExpression,
    gaps: string[],
    reason: string
  ): SufficiencyCheckResult {
    // Generate required capabilities based on gaps and domain
    const requiredCapabilities = this.generateRequiredCapabilities(intent, gaps);
    const suggestedProviders = this.generateSuggestedProviders(requiredCapabilities);

    const resolutionRequirement: IntentResolutionRequirement = {
      required: true,
      reason,
      requiredCapabilities,
      suggestedProviders
    };

    return {
      isSufficient: false,
      score: 0, // Will be set by calculateCompleteness in caller
      gaps,
      resolutionRequirement
    };
  }

  /**
   * Generate list of capabilities that can help resolve the identified gaps
   */
  private generateRequiredCapabilities(intent: UniversalExpression, gaps: string[]): string[] {
    const capabilities: string[] = [];
    const understanding = intent.understanding;
    // Use top-level context (new UniversalExpression architecture) or fall back to legacy understanding.context
    const contextDomain = understanding?.context?.domain || (understanding as any)?.state?.context?.domain;
    const domain = contextDomain || "generic";

    // Base on domain (uses registered capability IDs per capability-resolver.service.ts)
    if (domain === "legal") {
      capabilities.push("legal-clarification-flow");
      capabilities.push("ai-legal-consultant");
      
      // C-001: Add PT establishment capabilities for company formation intents
      const intentText = (typeof intent.raw?.content === 'string' ? intent.raw.content : JSON.stringify(intent.raw?.content || '')).toLowerCase();
      if (intentText.includes("mendirikan pt") || intentText.includes("buat pt") || intentText.includes("pendirian perusahaan")) {
        capabilities.push("company-formation-management");
        capabilities.push("legal-document-preparation");
        capabilities.push("government-registration-handling");
        capabilities.push("notarization-coordination");
      }
    }
    // Always add generic resolution capability as fallback - per user's universal entry requirement
    if (capabilities.length === 0) {
      capabilities.push("generic-intent-resolution");
    }

    // Base on gaps
    if (gaps.some(g => g.includes("domain"))) {
      capabilities.push("domain-classification-capability");
    }

    if (gaps.some(g => g.includes("unknown"))) {
      capabilities.push("generic-intent-resolution"); // Fixed: use registered capability ID instead of non-existent general-clarification-capability
    }

    // Add human consultant capability for complex gaps
    if (gaps.length > 5) {
      capabilities.push("human-consultant-matcher");
    }

    // If no specific capabilities, add the generic one
    if (capabilities.length === 0) {
      capabilities.push("generic-intent-resolution");
    }

    return capabilities;
  }

  /**
   * Generate list of providers that can provide the required capabilities
   */
  private generateSuggestedProviders(capabilities: string[]): string[] {
    const providers: string[] = [];

    if (capabilities.includes("legal-clarification-flow")) {
      providers.push("deterministic-legal-clarification");
      providers.push("ai-legal-assistant");
    }

    if (capabilities.includes("ai-legal-consultant")) {
      providers.push("openai-legal-consultant", "anthropic-legal-consultant");
    }
    
    // C-001: Add suggested providers for PT establishment capabilities
    if (capabilities.includes("company-formation-management")) {
      providers.push("pt-establishment-manager");
    }
    if (capabilities.includes("legal-document-preparation")) {
      providers.push("legal-document-generator");
    }
    if (capabilities.includes("government-registration-handling")) {
      providers.push("government-api-connector");
    }
    if (capabilities.includes("notarization-coordination")) {
      providers.push("notary-network-connector");
    }

    if (capabilities.includes("human-consultant-matcher")) {
      providers.push("lawyer-finder-service");
    }

    if (capabilities.includes("generic-intent-resolution")) {
      providers.push("universal-clarification-bot");
    }

    // Services.ID Golden Slice: Add website maintenance provider
    if (capabilities.includes("website-maintenance")) {
      providers.push("provider.teknis.001");
    }

    return providers;
  }
}

// Export singleton instance
export const gapAnalysisService = GapAnalysisService.getInstance();