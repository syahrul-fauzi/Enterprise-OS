import { describe, it, expect } from 'vitest';
import {
  complianceAssessmentInvoker,
  complianceMonitoringInvoker,
  complianceEvidenceInvoker,
  complianceAutomationInvoker
} from '../runtime/capability-invokers';
import { complianceWorkflow } from '../runtime/workflow-definition';

describe('ACAAS-102: Compliance Automation E2E Test', () => {
  it('should bind all required capabilities successfully', async () => {
    const assessmentResult = await complianceAssessmentInvoker({});
    expect(assessmentResult.success).toBe(true);
    expect(assessmentResult.capability).toBe('compliance.assessment');

    const monitoringResult = await complianceMonitoringInvoker({});
    expect(monitoringResult.success).toBe(true);
    expect(monitoringResult.capability).toBe('compliance.monitoring');

    const evidenceResult = await complianceEvidenceInvoker({});
    expect(evidenceResult.success).toBe(true);
    expect(evidenceResult.capability).toBe('compliance.evidence');

    const automationResult = await complianceAutomationInvoker({ workflow: 'full-compliance-check' });
    expect(automationResult.success).toBe(true);
    expect(automationResult.capability).toBe('compliance.automation');
    expect(automationResult.result.allStepsPassed).toBe(true);
  });

  it('should maintain consistent workflow lifecycle', () => {
    expect(complianceWorkflow.stages).toHaveLength(6);
    expect(complianceWorkflow.stages).toContain('initiate');
    expect(complianceWorkflow.stages).toContain('assess');
    expect(complianceWorkflow.stages).toContain('monitor');
    expect(complianceWorkflow.stages).toContain('automate');
    expect(complianceWorkflow.stages).toContain('generate-evidence');
    expect(complianceWorkflow.stages).toContain('complete');
  });

  it('should generate execution evidence for automation run', async () => {
    const automationResult = await complianceAutomationInvoker({ workflow: 'pilot-automation' });
    expect(automationResult.result.automationRunId).toBeDefined();
    expect(automationResult.result.timestamp).toBeDefined();
    expect(automationResult.result.stepsExecuted).toBeGreaterThan(0);
  });
});