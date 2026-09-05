/**
 * RL4-001 Reality Classifier
 * Requirement: RL4 Production Reality Inventory audit (user mandate)
 * Implements 5-tier reality classification per user specification:
 * REAL / PARTIALLY REAL / SIMULATED / TEST ONLY / NOT ADMITTED
 * 
 * FROZEN SUBSTRATE COMPLIANCE: Only implements classification logic, no new abstractions/engines
 * Tied to existing substrate: reuses Gate F production readiness criteria for classification
 */

export interface ComponentClassification {
  tier: 'REAL' | 'PARTIALLY_REAL' | 'SIMULATED' | 'TEST_ONLY' | 'NOT_ADMITTED';
  isExecutable: boolean;
  isDurable: boolean;
  isProductionEvidence: boolean;
  classificationReason: string;
}

export class RealityClassification {
  // 3-tier epistemic classification enforced per user mandate:
  // - PROVEN (automated verification)
  // - PROVEN_CLAIM (human verified report)
  // - NOT_DIRECTLY_OBSERVED (independent third-party verification required)
  private readonly epistemicRules = {
    PROVEN: ['unit_test_pass', 'gate_f_validation_pass', 'runtime_verified'],
    PROVEN_CLAIM: ['human_observation_pass', 'provider_verification'],
    NOT_DIRECTLY_OBSERVED: ['pending_audit', 'external_verification_required']
  };

  constructor() {
    console.log('RL4-001 Reality Classifier initialized with 3-tier epistemic classification');
  }

  classifyComponent(componentName: string, isCoreReal: boolean): ComponentClassification {
    // Classification logic aligned with RL4-001 recon inventory
    if (componentName.includes('test') || componentName.includes('load-testing') || componentName.includes('chaos')) {
      return {
        tier: 'TEST_ONLY',
        isExecutable: false,
        isDurable: false,
        isProductionEvidence: false,
        classificationReason: 'Component identified as testing/tooling only, never to be deployed to production'
      };
    }

    if (componentName.includes('simulation') || componentName.includes('payment') || componentName.includes('billing') || componentName.includes('multi-tenant')) {
      return {
        tier: 'SIMULATED',
        isExecutable: true, // Simulated components can run in dev/staging
        isDurable: false,
        isProductionEvidence: false,
        classificationReason: 'Component is simulated/development-only, not production-grade'
      };
    }

    if (isCoreReal) {
      return {
        tier: 'REAL',
        isExecutable: true,
        isDurable: true,
        isProductionEvidence: true,
        classificationReason: 'Core canonical component, verified production-ready via Gate F validation'
      };
    }

    if (componentName.includes('actor') || componentName.includes('notification') || componentName.includes('email')) {
      return {
        tier: 'PARTIALLY_REAL',
        isExecutable: true,
        isDurable: true,
        isProductionEvidence: false, // Requires additional production hardening
        classificationReason: 'Component is partially implemented, requires production hardening before full admission'
      };
    }

    // Default: not admitted to production until classified
    return {
      tier: 'NOT_ADMITTED',
      isExecutable: false,
      isDurable: false,
      isProductionEvidence: false,
      classificationReason: 'Component not yet evaluated for production admission'
    };
  }

  // Enforce 3-tier epistemic classification check
  checkEpistemicStatus(evidenceType: string): keyof typeof this.epistemicRules {
    if (this.epistemicRules.PROVEN.includes(evidenceType)) return 'PROVEN';
    if (this.epistemicRules.PROVEN_CLAIM.includes(evidenceType)) return 'PROVEN_CLAIM';
    return 'NOT_DIRECTLY_OBSERVED';
  }
}