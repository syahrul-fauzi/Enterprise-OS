// Skrip untuk menjalankan hanya migrasi payroll (023-025) yang diperlukan untuk PAYROLL-IDEMPOTENCY-001
import { Pool } from "pg";
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

// Import semua migrasi dari migration.manager.js (memiliki semua migrasi dari 001 hingga terbaru termasuk 023-025)
import { MIGRATIONS } from './capabilities/shared/implementation/database/migrations/migration.manager.js';

// Migrasi 023-025 tetap dipertahankan untuk referensi, tapi kita gunakan migrasi dari migration.manager.js
// Pertama buat tabel works jika belum ada (dari migrasi sebelumnya di migration.manager.js)
const createWorksTable = `
      DO $$
      BEGIN
        -- Hanya buat tabel works jika belum ada
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') THEN
          CREATE TABLE works (
            id VARCHAR(255) PRIMARY KEY,
            tenant_id VARCHAR(255) NOT NULL,
            workspace_id VARCHAR(255) NOT NULL,
            actor_id VARCHAR(255) NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status VARCHAR(255) NOT NULL,
            version INTEGER DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            domain_type VARCHAR(255),
            domain_specific_data JSONB
          );
        END IF;

        -- Tambahkan kolom yang mungkin missing di tabel yang sudah ada
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'works' 
            AND column_name = 'domain_type'
        ) THEN
          ALTER TABLE works ADD COLUMN domain_type VARCHAR(255);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'works' 
            AND column_name = 'domain_specific_data'
        ) THEN
          ALTER TABLE works ADD COLUMN domain_specific_data JSONB;
        END IF;
      END $$;
`;

const migration023 = `
      DO $$
      BEGIN
        -- Tambahkan kolom dasar yang diperlukan
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'idempotency_key') THEN
          ALTER TABLE works ADD COLUMN idempotency_key VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'payment_id') THEN
          ALTER TABLE works ADD COLUMN payment_id VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'work_id') THEN
          -- work_id adalah id dari work itu sendiri, set nilai default ke kolom id yang sudah ada
          ALTER TABLE works ADD COLUMN work_id VARCHAR(255);
          UPDATE works SET work_id = id WHERE work_id IS NULL;
        END IF;
      END $$;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_tenant_idempotency_key') THEN
          ALTER TABLE works ADD CONSTRAINT unique_tenant_idempotency_key UNIQUE (tenant_id, idempotency_key);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_work_payment') THEN
          ALTER TABLE works ADD CONSTRAINT unique_work_payment UNIQUE (work_id, payment_id);
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_works_idempotency_key ON works(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_works_payment_id ON works(payment_id);
`;

const migration024 = `
      CREATE TABLE IF NOT EXISTS work_payments (
        id VARCHAR(255) PRIMARY KEY,
        payment_id VARCHAR(255) NOT NULL,
        work_id VARCHAR(255) NOT NULL,
        outcome_id VARCHAR(255),
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        amount NUMERIC NOT NULL,
        currency VARCHAR(255) NOT NULL,
        due_date_utc TIMESTAMP WITH TIME ZONE NOT NULL,
        payment_status VARCHAR(50) NOT NULL,
        reconciliation_status VARCHAR(50) NOT NULL,
        billable_units INTEGER NOT NULL,
        price_unit NUMERIC NOT NULL,
        actual_cost NUMERIC NOT NULL,
        idempotency_key VARCHAR(255),
        issued_at_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Add unique constraints for idempotency (dibalut dalam DO $$ karena PostgreSQL <17 tidak mendukung IF NOT EXISTS untuk ADD CONSTRAINT)
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_payments_unique_tenant_idempotency_key') THEN
          ALTER TABLE work_payments ADD CONSTRAINT work_payments_unique_tenant_idempotency_key UNIQUE (tenant_id, idempotency_key);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_payments_unique_work_payment') THEN
          ALTER TABLE work_payments ADD CONSTRAINT work_payments_unique_work_payment UNIQUE (work_id, payment_id);
        END IF;
      END $$;
      
      -- Create indexes for efficient queries
      CREATE INDEX IF NOT EXISTS idx_work_payments_work_id ON work_payments(work_id);
      CREATE INDEX IF NOT EXISTS idx_work_payments_tenant_id ON work_payments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_work_payments_payment_id ON work_payments(payment_id);
      CREATE INDEX IF NOT EXISTS idx_work_payments_idempotency_key ON work_payments(idempotency_key);
      
      -- Enable RLS for tenant isolation
      ALTER TABLE work_payments ENABLE ROW LEVEL SECURITY;
      
      -- Add tenant isolation policy
      DROP POLICY IF EXISTS tenant_isolation_work_payments ON work_payments;
      CREATE POLICY tenant_isolation_work_payments ON work_payments
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND (
            workspace_id = current_setting('app.current_workspace', true) 
            OR work_id = current_setting('app.current_work', true)
          )
        )
        WITH CHECK (
          tenant_id = current_setting('app.current_tenant', true) 
          AND (
            workspace_id = current_setting('app.current_workspace', true) 
            OR work_id = current_setting('app.current_work', true)
          )
        );
`;

const migration025 = `
      -- Backfill work_payments from existing works table that have payment records
      INSERT INTO work_payments (
        id,
        payment_id,
        work_id,
        outcome_id,
        tenant_id,
        workspace_id,
        amount,
        currency,
        due_date_utc,
        payment_status,
        reconciliation_status,
        billable_units,
        price_unit,
        actual_cost,
        idempotency_key,
        issued_at_utc,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid()::VARCHAR(255),
        payment_id,
        work_id,
        NULL,
        tenant_id,
        workspace_id,
        0,
        'IDR',
        created_at,
        'completed',
        'reconciled',
        0,
        0,
        0,
        -- Generate stable idempotency key format: payroll-work.id jika belum ada (hindari sintaks template literal JS)
        COALESCE(idempotency_key, 'payroll-' || work_id) as idempotency_key,
        created_at,
        created_at,
        updated_at
      FROM works
      WHERE payment_id IS NOT NULL
      ON CONFLICT (work_id, payment_id) DO NOTHING;
`;

async function runPayrollMigrations() {
  // Load env dari staging untuk kredensial yang konsisten
  const STAGING_ENV_PATH = path.join(process.cwd(), 'infra', 'staging', '.env');
  if (existsSync(STAGING_ENV_PATH)) {
    dotenv.config({ path: STAGING_ENV_PATH });
    console.log("✅ Berhasil load environment dari file:", STAGING_ENV_PATH);
  } else {
    console.error("❌ File .env staging tidak ditemukan, migrasi dihentikan");
    process.exit(1);
  }
  
  // Gunakan kredensial dari .env yang sudah dimuat
  const pool = new Pool({
    host: "localhost",
    port: 5433, // Sesuai compose.yaml staging: host port 5433 maps ke container PostgreSQL port 5432
    user: process.env.POSTGRES_USER || "eos_user",
    password: process.env.POSTGRES_PASSWORD || "eos_pass123",
    database: "eos_identity", // Database utama di container PostgreSQL sesuai compose.yaml
  });

  console.log("=== MENJALANKAN MIGRASI PAYROLL 023-025 ===\n");

  try {
    // DAHULUKAN GRANT PERMISSION SEBELUM MIGRASI (fix error 42501)
    // Gunakan superuser connection untuk setup schema permissions terlebih dahulu
  // Setup schema public permissions terlebih dahulu
  console.log("\n=== Setup schema public permissions untuk app_user... ===");
  const mainClient = await pool.connect();
  try {
    // Pastikan app_user punya akses schema public sebelum migrasi berjalan
    await mainClient.query(`
      GRANT USAGE, CREATE ON SCHEMA public TO ${process.env.POSTGRES_USER || 'eos_user'};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${process.env.POSTGRES_USER || 'eos_user'};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${process.env.POSTGRES_USER || 'eos_user'};
    `);
    console.log("✅ Berhasil setup schema public permissions");

    // Pertama, perbaiki ukuran kolom version di schema_migrations
    await mainClient.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
          ALTER TABLE schema_migrations ALTER COLUMN version TYPE VARCHAR(255);
        END IF;
      END $$;
    `);
    console.log("✅ Berhasil update schema_migrations.version menjadi VARCHAR(255)");

    // Daftar migrasi payroll yang akan dijalankan
    const payrollMigrations = [
      { version: "000", name: "create-works-table-if-not-exists", sql: createWorksTable },
      { version: "023", name: "add-payroll-idempotency-constraints", sql: migration023 },
      { version: "024", name: "add-work-payments-table", sql: migration024 },
      { version: "025", name: "backfill-work-payments-from-works", sql: migration025 }
    ];
    // Jalankan semua migrasi payroll secara manual
    console.log("\n=== Menjalankan migrasi payroll yang dipilih... ===");
    let migratedCount = 0;
    for (const mig of payrollMigrations) {
      console.log(`→ Menjalankan migrasi ${mig.version}: ${mig.name}`);
      await mainClient.query(mig.sql);
      // Catat migrasi ke schema_migrations
      await mainClient.query(`
        INSERT INTO schema_migrations (version, name, description, executed_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (version) DO NOTHING;
      `, [mig.version, mig.name, "Payroll idempotency migration"]);
      migratedCount++;
    }
    const result = { success: true, migratedCount };
    console.log("\n=== Hasil runMigrations:", result);
    console.log("\n=== Hasil runMigrations:", result);
    console.log("\n✅ SEMUA MIGRASI BERHASIL DITERAPKAN OLEH DATABASEMIGRATIONMANAGER!");

    // Grant permissions tambahan dan FORCE RLS setelah tabel dibuat
    console.log("\n=== Setup FORCE RLS dan table permissions akhir... ===");
    const postGrantClient = await pool.connect();
    try {
      // Grant permissions pada semua tabel yang baru dibuat
      await postGrantClient.query(`
        GRANT ALL ON TABLE works TO ${process.env.POSTGRES_USER || 'eos_user'};
        GRANT ALL ON TABLE work_payments TO ${process.env.POSTGRES_USER || 'eos_user'};
        GRANT ALL ON TABLE schema_migrations TO ${process.env.POSTGRES_USER || 'eos_user'};
      `);
      console.log("✅ Berhasil grant table permissions ke app_user untuk tabel payroll");
      
      // Enable FORCE RLS untuk bypass pemilik tabel yang bisa melewati RLS (sesuai permintaan war room)
      await postGrantClient.query(`
        ALTER TABLE works FORCE ROW LEVEL SECURITY;
        ALTER TABLE work_payments FORCE ROW LEVEL SECURITY;
      `);
      console.log("✅ Berhasil enable FORCE ROW LEVEL SECURITY untuk tabel payroll");
    } catch (e) {
      console.error("⚠️  Warning saat post-migration grant:", e instanceof Error ? e.message : e);
    } finally {
      postGrantClient.release();
    }

  } finally {
    mainClient.release();
  }

  } catch (e) {
    console.error("❌ Gagal menjalankan migrasi payroll:", e);
  } finally {
    await pool.end();
  }
}

runPayrollMigrations().catch(console.error);