/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { apiPlatformService, ApiPlatformQueryInput } from '../../api-platform/implementation/services/api-platform.service.js';

const fixturePath = path.join(__dirname, '../../../../workspace/execution/runs/--experiment/fixtures/SAGE-LINEN-002-VIOLATION.yaml');
const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
const SAGE_LINEN_002_VIOLATION = yaml.load(fixtureContent) as any;

describe('REAL-002-E: Runtime Proof via apps/api', () => {
  it('should enter through apps/api, trigger a governance violation, and prevent mutation', async () => {
    const transaction = SAGE_LINEN_002_VIOLATION.transformation_output.metadata.transaction;
    const policy = SAGE_LINEN_002_VIOLATION.transformation_output.metadata.policy;

    // This input simulates the request that would be parsed from an external HTTP call
    // to the /api/intent/execute endpoint.
    const queryInput: ApiPlatformQueryInput = {
      resource: 'workflows',
      operation: 'execute',
      params: {
        ...transaction,
        policy,
        actor: { id: 'actor:external/autonomous-test-runner' },
      },
    };

    // Execute the query through the main System Surface entry point
    const result = await apiPlatformService.executeQuery(queryInput);

    console.log('REAL-002-E Test Result:', JSON.stringify(result, null, 2));

    // --- VERIFY GOVERNANCE PIPELINE ---
    const intentResult = result.result as any;

    // 1. Verify the violation was detected
    expect(intentResult.dynamicUnderstanding.governance.mutationBlocked).toBe(true);
    expect(intentResult.dynamicUnderstanding.governance.reason).toContain('Boundary VIOLATION');
    expect(intentResult.dynamicUnderstanding.governance.reason).toContain('max_auto_approved_settlement');

    // 2. Verify escalation occurred
    expect(intentResult.dynamicUnderstanding.governance.assistanceMode).toBe('escalated');

    // 3. Verify evidence was recorded (existence of evidence reference)
    expect(intentResult.dynamicUnderstanding.governance.evidenceRef).toBeDefined();
    expect(intentResult.dynamicUnderstanding.governance.evidenceRef).not.toBe('');
  });
});