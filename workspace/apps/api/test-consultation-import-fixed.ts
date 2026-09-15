// Test import consultation.commands.js dari dist/
import("/root/Enterprise-OS/workspace/capabilities/consultation/dist/commands/consultation.commands.js")
  .then((mod) => {
    console.log("✅ Consultation commands imported successfully from dist/!");
    console.log("Available commands:", Object.keys(mod.consultationCommands));
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  });