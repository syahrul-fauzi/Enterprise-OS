import "dotenv/config";
import("./d13-real-user-journey-services-id.ts").catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});