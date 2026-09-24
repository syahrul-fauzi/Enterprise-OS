import { exportMetricsToProofs, getStateMetrics } from './workspace/packages/tooling/eos-cli/src/state.ts';

console.log("[Test] Starting metrics export test...");
try {
  const metrics = getStateMetrics();
  console.log("[Test] Current metrics:", metrics);
  exportMetricsToProofs();
  console.log("[Test] Test completed successfully!");
} catch (error) {
  console.error("[Test] Test failed:", error);
  process.exit(1);
}