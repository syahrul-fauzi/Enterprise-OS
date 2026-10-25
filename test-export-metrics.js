"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const state_ts_1 = require("./workspace/packages/tooling/eos-cli/src/state.ts");
console.log("[Test] Starting metrics export test...");
try {
    const metrics = (0, state_ts_1.getStateMetrics)();
    console.log("[Test] Current metrics:", metrics);
    (0, state_ts_1.exportMetricsToProofs)();
    console.log("[Test] Test completed successfully!");
}
catch (error) {
    console.error("[Test] Test failed:", error);
    process.exit(1);
}
