// Test import consultation.contracts.js untuk cek module not found
import("../capabilities/consultation/implementation/contracts/consultation.contracts.js")
  .then((mod) => {
    console.log("✅ Consultation contracts imported successfully!");
    console.log("Available exports:", Object.keys(mod));
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  });