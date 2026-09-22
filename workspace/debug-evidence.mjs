import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity' });

async function debug() {
  const res = await pool.query('SELECT * FROM evidence ORDER BY created_at DESC LIMIT 1');
  console.log("Raw DB record:", JSON.stringify(res.rows[0], null, 2));
  await pool.end();
}
debug().catch(console.error);