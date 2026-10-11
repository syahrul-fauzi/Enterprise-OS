
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { containerTrackingRepository } from '../implementation/repository/ContainerTrackingRepositoryInMemory';
import { commands } from '../implementation/commands/tracking.commands';

describe('iot-container-tracking Product Slice Integration Test', () => {
  before(async () => {
    await containerTrackingRepository._clear();
  });

  after(async () => {
    await containerTrackingRepository._clear();
  });

  test('Layer 9 Test: provision.execute should create a container, persist it, and return success', async () => {
    const work_id = `work_${Date.now()}`;
    const container_id = `CONTAINER-${Date.now()}`;
    const input = { work_id, container_id };

    // Layer 5: Capability Invocation (Direct)
    const result = await commands.provision.execute(input);

    // Assert command response is successful
    assert.strictEqual(result.success, true, 'Command should return success');
    assert.strictEqual(result.status, 'provisioned', 'Initial status should be provisioned');

    // Layer 6: Persistence Verification
    const persistedData = await containerTrackingRepository.findByWorkId(work_id);
    assert.ok(persistedData, 'Data should be persisted in the repository');
    assert.strictEqual(persistedData.work_id, work_id, 'Persisted work_id should match');
    assert.strictEqual(persistedData.container_id, container_id, 'Persisted container_id should match');
    assert.strictEqual(persistedData.status, 'provisioned', 'Persisted status should be provisioned');

    // Layer 8: Evidence Verification (Future Step)
    // This would query an evidence repository. For now, we trust the command's execution.
    console.log('Evidence for this test would need to be verified against an evidence store.');
  });
});