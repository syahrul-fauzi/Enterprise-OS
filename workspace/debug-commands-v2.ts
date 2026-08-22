import { loadCapabilityCommands } from "./packages/core/kernel/src/registry/capability-command-registry.js";

async function debug() {
  console.log("Loading capability commands...");
  const commands = await loadCapabilityCommands();
  console.log("✅ Capability commands loaded!");
  console.log("Total registered commands:", Object.keys(commands).length);
  console.log("\nAll command keys (first 50):", Object.keys(commands).slice(0, 50));
  console.log("\nLooking for case.* commands:");
  Object.keys(commands).filter(k => k.includes("case")).forEach(k => console.log("  -", k));
  console.log("\nLooking for document.* commands:");
  Object.keys(commands).filter(k => k.includes("document")).forEach(k => console.log("  -", k));
  console.log("\nLooking for requirement.* commands:");
  Object.keys(commands).filter(k => k.includes("requirement")).forEach(k => console.log("  -", k));
}

debug().catch(err => console.error("❌ Debug failed:", err));