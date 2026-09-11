import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5433,
  user: "eos_user",
  password: "eos_pass123",
  database: "eos_identity"
});

async function fixJson() {
  const client = await pool.connect();
  try {
    const participants = JSON.stringify([
              { "actorId": "+628999999999", "role": "customer", "addedAt": "2026-09-09T00:00:00.000Z", "addedBy": "+628999999999" },
              { "actorId": "lawyer-001", "role": "professional", "addedAt": "2026-09-09T00:30:00.000Z", "addedBy": "+628999999999" }
            ]);
            
            const stateHistory = JSON.stringify([
              { "status": "draft", "timestamp": "2026-09-09T00:00:00.000Z", "actorId": "+628999999999", "note": "Work created - G2-01 initialization" },
              { "status": "active", "timestamp": "2026-09-09T01:00:00.000Z", "actorId": "lawyer-001", "note": "Work activated - ready for client interaction" }
            ]);

    const result = await client.query(
      "UPDATE works SET participants = $1, state_history = $2 WHERE id = 'work-WORK-001' RETURNING id, participants, state_history;",
      [participants, stateHistory]
    );
    
    console.log("✅ WORK-001 JSON updated successfully!");
    console.log("Updated record:", result.rows[0]);
  } catch (error) {
    console.error("❌ Error updating JSON:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixJson();