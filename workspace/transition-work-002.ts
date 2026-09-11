import { Pool } from "pg";

// Buat pool dengan kredensial staging yang sama dengan migration manager
const pool = new Pool({
  host: "localhost",
  port: 5433, // Docker compose maps container port 5432 to host port 5433
  user: "eos_user",
  password: "eos_pass123",
  database: "eos_identity" // Correct database name from compose.yaml
});

async function transitionWork002() {
  const client = await pool.connect();
  try {
    // 1. Ambil work WORK-002 yang sudah ada di database secara langsung
    const selectResult = await client.query(
      "SELECT * FROM works WHERE id = 'work-WORK-002';"
    );
    
    if (selectResult.rows.length === 0) {
      throw new Error('WORK-002 tidak ditemukan di database');
    }
    const existingWork = selectResult.rows[0];
    console.log('📋 Work sebelum transition:', JSON.stringify(existingWork, null, 2));
    
    // 2. Siapkan state history baru - tambahkan status active
    const newStateHistory = [...existingWork.state_history];
    newStateHistory.push({
      status: "active",
      timestamp: new Date().toISOString(),
      actorId: "lawyer-002",
      note: "Memindahkan WORK-002 ke status active - konsultasi merek dagang dimulai"
    });
    
    // 3. Stringify JSON untuk PostgreSQL (jsonb butuh string JSON valid)
    const stateHistoryJson = JSON.stringify(newStateHistory);
    
    // 4. Jalankan update di PostgreSQL
    const updateResult = await client.query(
      "UPDATE works SET status = $1, state_history = $2, updated_at = $3 WHERE id = $4 RETURNING *;",
      ["active", stateHistoryJson, new Date().toISOString(), "work-WORK-002"]
    );
    
    const updatedWork = updateResult.rows[0];
    console.log('✅ Work setelah transition:', JSON.stringify(updatedWork, null, 2));
    console.log(`📊 State history length sekarang: ${updatedWork.state_history.length}`);
    console.log(`🎉 WORK-002 berhasil dipindahkan ke status ACTIVE!`);
    
  } catch (error) {
    console.error('❌ Error saat transition WORK-002:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

transitionWork002();