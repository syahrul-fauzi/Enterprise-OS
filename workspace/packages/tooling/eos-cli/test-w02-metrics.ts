import { saveCurrentJourney, loadCurrentJourney, getStateMetrics, exportMetricsToProofs, resetStateMetrics } from "./src/state.js";
import { JOURNEY_ENGINE_ID } from "./src/state.js";

// Run 10 consecutive mutations to generate real metrics
async function runW02Workload() {
  resetStateMetrics();
  console.log("=== W02 WORKLOAD: 10 SEQUENTIAL SAVE CALLS ===");
  
  for (let i = 0; i < 10; i++) {
    const journey = loadCurrentJourney();
    const newJourney = { ...journey, work_id: `EOS-JOURNEY-006-${i}` };
    saveCurrentJourney(JOURNEY_ENGINE_ID, newJourney);
    console.log(`[WORKLOAD] Mutation ${i+1}/10 complete`);
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between mutations
  }
  
  const metrics = getStateMetrics();
  console.log("\n=== W02 METRICS AFTER WORKLOAD ===");
  console.log(JSON.stringify(metrics, null, 2));
  
  exportMetricsToProofs();
  console.log("\n=== METRICS EXPORTED TO PROOFS ===");
}

runW02Workload().catch(err => console.error(err));
