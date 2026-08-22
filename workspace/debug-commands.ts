import { capabilityRegistry } from "@repo/core-kernel";

async function debug() {
  // Wait for all commands to load
  await new Promise(r => setTimeout(r, 1000));
  console.log("✅ Capability commands loaded, inspecting keys...");
  // Access private capabilityCommands via any to debug
  const commands = (capabilityRegistry as any).capabilityCommands || {};
  console.log("Total registered commands:", Object.keys(commands).length);
  console.log("All command keys:", Object.keys(commands).slice(0, 50));
  console.log("\nLooking for case.* commands:");
  Object.keys(commands).filter(k => k.includes("case")).forEach(k => console.log("  -", k));
  console.log("\nLooking for document.* commands:");
  Object.keys(commands).filter(k => k.includes("document")).forEach(k => console.log("  -", k));
}

debug().catch(err => console.error("❌ Debug failed:", err));