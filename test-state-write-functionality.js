import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { existsSync, readFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { writeStateFile, JOURNEY_ENGINE_ID, EOS_STATE_ROOT } from "./workspace/packages/tooling/eos-cli/src/state.js";

console.log("Testing writeStateFile functionality...");

// Test 1: Write state file with authorized actor
console.log("\nTest 1: Writing state file with authorized actor...");
const testStatePath = resolve(EOS_STATE_ROOT, "test-write-state.yaml");
const testContent = "test: true\nmessage: Hello from writeStateFile";

try {
  writeStateFile(JOURNEY_ENGINE_ID, testStatePath, testContent);
  console.log("✅ Test 1 passed: Authorized write successful!");
  
  // Verify file was written
  const writtenContent = readFileSync(testStatePath, "utf8");
  if (writtenContent === testContent) {
    console.log("✅ Test 1a passed: File content matches!");
  } else {
    console.error("❌ Test 1a failed: File content does not match!");
  }
  
  // Verify audit log was created
  const auditLogPath = resolve(EOS_STATE_ROOT, "audit", "state-write-audit.log");
  if (existsSync(auditLogPath)) {
    const auditContent = readFileSync(auditLogPath, "utf8");
    if (auditContent.includes(JOURNEY_ENGINE_ID) && auditContent.includes("test-write-state.yaml")) {
      console.log("✅ Test 1b passed: Audit log contains entry!");
    } else {
      console.error("❌ Test 1b failed: Audit log does not contain expected entry!");
    }
  } else {
    console.error("❌ Test 1b failed: Audit log file not found!");
  }
  
} catch (error) {
  console.error("❌ Test 1 failed:", error.message);
}

// Test 2: Attempt to write with unauthorized actor
console.log("\nTest 2: Attempting to write with unauthorized actor...");
const unauthorizedActor = "unauthorized-actor";
const unauthorizedPath = resolve(EOS_STATE_ROOT, "unauthorized-test.yaml");

try {
  writeStateFile(unauthorizedActor, unauthorizedPath, "test: unauthorized");
  console.error("❌ Test 2 failed: Should have thrown ownership violation error!");
} catch (error) {
  if (error.message.includes("OWNERSHIP_VIOLATION")) {
    console.log("✅ Test 2 passed: Correctly threw ownership violation error!");
  } else {
    console.error("❌ Test 2 failed: Threw unexpected error:", error.message);
  }
}

// Cleanup
console.log("\nCleaning up test files...");
if (existsSync(testStatePath)) {
  unlinkSync(testStatePath);
  console.log("✅ Test state file cleaned up!");
}
if (existsSync(unauthorizedPath)) {
  unlinkSync(unauthorizedPath);
  console.log("✅ Unauthorized test file cleaned up!");
}

console.log("\nAll tests completed!");