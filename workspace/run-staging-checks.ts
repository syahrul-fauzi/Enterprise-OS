// Skrip untuk menjalankan 3 pemeriksaan read-only di staging sesuai permintaan WAR ROOM
import { Pool } from "pg";
import { writeFile } from "fs/promises";
import { resolve } from "path";

// Konfigurasi pool untuk staging (menggunakan kredensial yang sudah terkonfigurasi)
const pool = new Pool({
  connectionString: process.env.STAGING_DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000,
});

async function runStagingChecks() {
  console.log("🔍 Memulai pemeriksaan read-only di staging...");
  const evidence: any = {
    verified_at: new Date().toISOString(),
    work_id: "PAYROLL-IDEMPOTENCY-001",
    staging_checks: {},
    errors: []
  };

  try {
    // 1. Cek duplikat idempotency_key di tabel works
    console.log("\n📊 Pemeriksaan 1: Cek idempotency_key duplikat di works");
    const worksDuplicates = await pool.query(`
      SELECT idempotency_key, COUNT(*) AS total
      FROM works
      WHERE idempotency_key IS NOT NULL
      GROUP BY idempotency_key
      HAVING COUNT(*) > 1;
    `);
    evidence.staging_checks.works_duplicate_idempotency_keys = worksDuplicates.rows;
    console.log(`✅ Ditemukan ${worksDuplicates.rowCount} baris dengan idempotency_key duplikat di works`);

    // 2. Cek duplikat idempotency_key di tabel work_payments
    console.log("\n📊 Pemeriksaan 2: Cek idempotency_key duplikat di work_payments");
    const paymentsDuplicates = await pool.query(`
      SELECT idempotency_key, COUNT(*) AS total
      FROM work_payments
      GROUP BY idempotency_key
      HAVING COUNT(*) > 1;
    `);
    evidence.staging_checks.work_payments_duplicate_idempotency_keys = paymentsDuplicates.rows;
    console.log(`✅ Ditemukan ${paymentsDuplicates.rowCount} baris dengan idempotency_key duplikat di work_payments`);

    // 3. Cek definisi constraint dan index di work_payments
    console.log("\n📊 Pemeriksaan 3: Cek constraint dan index di work_payments");
    const constraints = await pool.query(`
      SELECT
        conname,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'work_payments'::regclass;
    `);
    evidence.staging_checks.work_payments_constraints = constraints.rows;
    console.log(`✅ Ditemukan ${constraints.rowCount} constraint pada tabel work_payments`);

    // Simpan evidence ke file
    const evidencePath = resolve("/root/Enterprise-OS/.eos-state/verification/PAYROLL-IDEMPOTENCY-001_staging_checks.json");
    await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    console.log(`\n💾 Hasil pemeriksaan staging disimpan ke: ${evidencePath}`);

  } catch (error: any) {
    console.error("❌ Error selama pemeriksaan staging:", error.message);
    evidence.errors.push(error.message);
    await writeFile(resolve("/root/Enterprise-OS/.eos-state/verification/PAYROLL-IDEMPOTENCY-001_staging_checks.json"), JSON.stringify(evidence, null, 2));
    throw error;
  } finally {
    await pool.end();
  }
}

runStagingChecks().catch(console.error);
