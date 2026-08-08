import { ObservabilityService } from './services/observability.service.js';

function main() {
  console.log('[TEST] Testing Observability Collector implementation...');
  const observabilityService = new ObservabilityService();
  
  console.log('[TEST] Calling getSnapshot() to trigger first invocation...');
  const snapshot = observabilityService.getSnapshot();
  
  console.log('[TEST] Snapshot generated successfully!');
  console.log(`[TEST] Logs count: ${snapshot.logs.length}`);
  console.log(`[TEST] Metrics count: ${snapshot.metrics.length}`);
  console.log(`[TEST] Traces count: ${snapshot.traces.length}`);
  
  console.log('[TEST] Check evidence file at: /root/Enterprise-OS/workspace/capabilities/observability/evidence/verification/runtime-invocations.jsonl');
}

main();