import { workflowEngineService } from "../../capabilities/workflow-engine/implementation/services/workflow-engine.service";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Execute requirement-delivery-readiness workflow for REQ-006
const executionResult = workflowEngineService.executeWorkflow({
  workflowId: "requirement-delivery-readiness",
  requirementId: "req-006",
  limit: 100,
});

// Write execution report to evidence directory
const reportPath = "/root/Enterprise-OS/workspace/.eos/evidence/req-006-execution-report.json";
const reportDir = dirname(reportPath);

if (!existsSync(reportDir)) {
  mkdirSync(reportDir, { recursive: true });
}

const fullReport = {
  workflow_execution: {
    ...executionResult,
    executionTimestamp: new Date().toISOString(),
  },
};

writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
console.log("REQ-006 delivery readiness workflow executed successfully. Report written to:", reportPath);
console.log("Execution status:", executionResult.status);
console.log("Steps completed:", executionResult.steps.length);