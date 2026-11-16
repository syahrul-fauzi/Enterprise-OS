import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Verifying state.ts implementation...");

// Import state module
const stateModule = await import("./workspace/packages/tooling/eos-cli/src/state.js");

console.log("✅ State module imported successfully!");
console.log("Available exports:", Object.keys(stateModule));

// Check if writeStateFile exists
if (typeof stateModule.writeStateFile === 'function') {
  console.log("✅ writeStateFile function is exported!");
} else {
  console.error("❌ writeStateFile function not found in exports!");
  console.log("Checking if it exists as a property:", 'writeStateFile' in stateModule);
}

// Check if JOURNEY_ENGINE_ID exists
if (stateModule.JOURNEY_ENGINE_ID) {
  console.log("✅ JOURNEY_ENGINE_ID constant exists:", stateModule.JOURNEY_ENGINE_ID);
}

console.log("\nVerification complete!");