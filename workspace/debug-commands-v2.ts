// loadCapabilityCommands has been REMOVED from capability-command-registry.ts per REALITY PATH requirements
// All commands are now imported directly in their respective route files - no bulk loading
async function debug() {
  console.log("ℹ️ Debug mode: loadCapabilityCommands is deprecated (removed per REALITY PATH requirements)");
  console.log("ℹ️ All capability commands are now imported directly in their respective route files");
  console.log("ℹ️ Debug mode completed - no bulk capability loading available");
}

debug().catch(err => console.error("❌ Debug failed:", err));