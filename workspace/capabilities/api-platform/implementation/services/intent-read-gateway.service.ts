// B6.11: Intent Read Gateway Service - Runtime-only access to canonical intentUnderstandingService
// Isolates atomic-composition from api-platform's compile-time graph while preserving full runtime functionality
// Semantically identical local types copied directly from canonical atomic-composition contracts

// Canonical local types matching atomic-composition's intent-understanding.contracts.ts exactly
export type IntentCategory = "transaction" | "information-request" | "work-formation" | "generic";
export type IntentRawInput = {
  type: string;
  content: Record<string, unknown>;
};
export type IntentContext = {
  domain?: string;
  organization?: string;
  locale?: string;
  known?: string[];
  unknown?: string[];
  constraints?: string[];
};
export type IntentResolution = {
  success: boolean;
  message?: string;
  workflowId?: string;
};
export type IntentUnderstanding = {
  rawExpression: string;
  interpretedObjective: string;
  context: IntentContext;
  domainCandidates: Array<{ domain: string; confidence: number }>;
  intentType: string;
  entities: Array<{ type: string; role: string; value: string }>;
};

// Canonical IntentUnderstandingService interface matching the exact signature from atomic-composition
export interface IntentUnderstandingService {
  interpret(rawInput: IntentRawInput): Promise<{
    resolution: IntentResolution;
    context: IntentContext;
    domainType: string;
    category: IntentCategory;
    dynamicUnderstanding: IntentUnderstanding;
  }>;
}

// Gateway class following the exact same pattern as workflow-read-gateway.service.ts
export class IntentReadGatewayService {
  constructor(
    private readonly provider: IntentUnderstandingService = (globalThis as any).__EOS_CANONICAL_INTENT_UNDERSTANDING_SERVICE__,
  ) {}

  // Public gateway method with identical semantics to canonical service
  interpret(input: IntentRawInput) {
    return this.provider.interpret(input);
  }
}

// Export singleton gateway instance for api-platform consumption
export const intentReadGatewayService = new IntentReadGatewayService();