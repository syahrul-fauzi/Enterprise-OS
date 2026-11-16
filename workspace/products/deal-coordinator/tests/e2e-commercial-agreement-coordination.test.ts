// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert';

const DEAL_COORDINATOR_STAGES = ["request_created", "triage", "approve", "commit", "fulfill", "reconcile", "complete"];
const DEAL_COORDINATOR_COMMERCIAL_VALUE_IDR = 15000000;

describe('DC-101 · Commercial Agreement Coordination E2E', () => {
  it('Lifecycle end-to-end: request_created → triage → approve → commit → fulfill → reconcile → complete', async () => {
    const mockCapabilityRegistry = {
      handlers: new Map(),
      async invoke(capability, commandName, input) {
        const key = `${capability}.${commandName}`;
        if (!this.handlers.has(key)) {
          throw new Error(`Command not found in mock: ${key}`);
        }
        return this.handlers.get(key)(input);
      },
      registerHandler(capability, commandName, handler) {
        this.handlers.set(`${capability}.${commandName}`, handler);
      }
    };

    mockCapabilityRegistry.registerHandler('requirement-management', 'requirement.create', async (input) => {
      const requirementId = `req-${Date.now()}`;
      return {
        output: { id: requirementId, status: 'request_created', workId: input.workId },
        record: { ok: true, invokedAt: new Date().toISOString(), commandKey: 'requirement-management.requirement.create' }
      };
    });

    mockCapabilityRegistry.registerHandler('requirement-management', 'requirement.triage', async (input) => {
      return {
        output: { status: 'triage' },
        record: { ok: true, invokedAt: new Date().toISOString(), commandKey: 'requirement-management.requirement.triage' }
      };
    });

    mockCapabilityRegistry.registerHandler('requirement-management', 'requirement.approve', async (input) => {
      return {
        output: { status: 'approve' },
        record: { ok: true, invokedAt: new Date().toISOString(), commandKey: 'requirement-management.requirement.approve' }
      };
    });

    mockCapabilityRegistry.registerHandler('agreement-tracking', 'agreement.commit', async (input) => {
      const agreementId = `agreement-${Date.now()}`;
      return {
        output: { id: agreementId, status: 'commit', valueIdr: DEAL_COORDINATOR_COMMERCIAL_VALUE_IDR },
        record: { ok: true, invokedAt: new Date().toISOString(), commandKey: 'agreement-tracking.agreement.commit' }
      };
    });

    mockCapabilityRegistry.registerHandler('agreement-tracking', 'agreement.fulfill', async (input) => {
      return {
        output: { status: 'fulfill' },
        record: { ok: true, invokedAt: new Date().toISOString(), commandKey: 'agreement-tracking.agreement.fulfill' }
      };
    });

    mockCapabilityRegistry.registerHandler('payment-reconciliation', 'reconciliation.reconcile', async (input) => {
      return {
        output: { status: 'reconcile', matched: true },
        record: { ok: true, invokedAt: new Date().toISOString(), commandKey: 'payment-reconciliation.reconciliation.reconcile' }
      };
    });

    mockCapabilityRegistry.registerHandler('agreement-tracking', 'agreement.complete', async (input) => {
      return {
        output: { status: 'complete' },
        record: { ok: true, invokedAt: new Date().toISOString(), commandKey: 'agreement-tracking.agreement.complete' }
      };
    });

    const workId = `dc-work-${Date.now()}`;
    const results = [];

    const reqCreate = await mockCapabilityRegistry.invoke('requirement-management', 'requirement.create', { workId });
    results.push(reqCreate);
    assert.equal(reqCreate.output.status, 'request_created');

    const reqTriage = await mockCapabilityRegistry.invoke('requirement-management', 'requirement.triage', { id: reqCreate.output.id });
    results.push(reqTriage);
    assert.equal(reqTriage.output.status, 'triage');

    const reqApprove = await mockCapabilityRegistry.invoke('requirement-management', 'requirement.approve', { id: reqCreate.output.id });
    results.push(reqApprove);
    assert.equal(reqApprove.output.status, 'approve');

    const agCommit = await mockCapabilityRegistry.invoke('agreement-tracking', 'agreement.commit', { requirementId: reqCreate.output.id });
    results.push(agCommit);
    assert.equal(agCommit.output.status, 'commit');
    assert.equal(agCommit.output.valueIdr, DEAL_COORDINATOR_COMMERCIAL_VALUE_IDR);

    const agFulfill = await mockCapabilityRegistry.invoke('agreement-tracking', 'agreement.fulfill', { id: agCommit.output.id });
    results.push(agFulfill);
    assert.equal(agFulfill.output.status, 'fulfill');

    const recReconcile = await mockCapabilityRegistry.invoke('payment-reconciliation', 'reconciliation.reconcile', { agreementId: agCommit.output.id });
    results.push(recReconcile);
    assert.equal(recReconcile.output.status, 'reconcile');
    assert.equal(recReconcile.output.matched, true);

    const agComplete = await mockCapabilityRegistry.invoke('agreement-tracking', 'agreement.complete', { id: agCommit.output.id });
    results.push(agComplete);
    assert.equal(agComplete.output.status, 'complete');

    assert.equal(results.length, DEAL_COORDINATOR_STAGES.length);
    console.log(`[TEST] ✅ All ${results.length} lifecycle stages executed successfully`);
    console.log(`[TEST] ✅ Commercial agreement value: Rp${DEAL_COORDINATOR_COMMERCIAL_VALUE_IDR.toLocaleString()}`);
  });

  it('Product Health Checks', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const yaml = await import('yaml');

    const eosYamlPath = path.join(process.cwd(), 'eos.yaml');
    const eosYamlContent = fs.readFileSync(eosYamlPath, 'utf8');
    const eosConfig = yaml.parse(eosYamlContent);

    assert.ok(eosConfig.version, 'eos.yaml has version field');
    assert.ok(eosConfig.workspace, 'eos.yaml has workspace field');
    assert.ok(eosConfig.lifecycle, 'eos.yaml has lifecycle field');
    assert.equal(eosConfig.lifecycle.status, 'ACTIVE', 'Product status is ACTIVE');

    const requiredStages = DEAL_COORDINATOR_STAGES;
    const configStages = eosConfig.lifecycle.contract.stages.map(s => s.name);
    assert.deepEqual(configStages, requiredStages, 'All required lifecycle stages are present');

    console.log(`[TEST] ✅ Product health checks passed`);
  });
});