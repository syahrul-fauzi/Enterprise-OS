// @ts-nocheck
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/index.js";

async function debugSession() {
  const sessions = await SessionRepositoryInMemory.list();
  console.log(`Total sessions: ${sessions.length}`);
  console.log("\n=== Session 0 ===");
  console.log(JSON.stringify(sessions[0], null, 2));
  console.log("\n=== Session 0 keys ===");
  console.log(Object.keys(sessions[0]));
}

debugSession().catch(err => console.error(err));