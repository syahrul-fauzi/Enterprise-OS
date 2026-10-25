/**
 * WORKER PROCESS FOR MULTI-PROCESS FALSIFICATION
 * Child process that creates its OWN database connection and executes atomicClaim
 * Isolated from parent process to ensure no shared memory/pool state
 * Supports both PostgreSQL and SQLite (W-BETTER-004: Database Replacement Test)
 */
import { randomUUID } from 'crypto';
import { Pool, Client } from 'pg';
import Database from 'better-sqlite3';
import * as path from 'path';

// Worker receives parameters from parent via IPC
export interface WorkerInput {
  workId: string;
  actorId: string;
  executionId: string;
  expectedVersion: number;
  expectedStatuses: string[];
  allowReclaim: boolean;
  databaseUrl: string;
  databaseType: 'postgres' | 'sqlite'; // Tambahkan database type untuk worker
  releaseBarrier: boolean; // Signal to start claim after barrier
}

// TestDatabase interface yang sama dengan test file (polymorphic database abstraction)
interface TestDatabase {
  query(sql: string, params?: any[]): Promise<any>;
  close(): Promise<void>;
}

// Worker sends result back to parent
export interface WorkerResult {
  success: boolean;
  actorId: string;
  workerId: string; // Unique worker ID untuk evidence
  executionId: string;
  pid: number; // Add worker PID untuk evidence
  connection: { host: string; port: number }; // Add connection identity untuk evidence
  claimStartTimestamp: number; // Waktu mulai claim (ms since epoch)
  claimResultTimestamp: number; // Waktu selesai claim (ms since epoch)
  errorClass?: string; // Klasifikasi error untuk evidence
  work?: any;
  error?: string;
}

// Worker database abstraction (mendukung PostgreSQL/SQLite)
let workerDb: TestDatabase | null = null;

// PostgreSQL implementation dari TestDatabase (untuk kompatibilitas lama)
class PostgresWorkerDatabase implements TestDatabase {
  private pool: Pool;
  
  constructor(databaseUrl: string) {
    const url = new URL(databaseUrl);
    const pgHost = url.hostname;
    const pgPort = parseInt(url.port || "5432");
    this.pool = new Pool({
      host: pgHost,
      port: pgPort,
      user: url.username,
      password: String(url.password),
      database: url.pathname.substring(1),
      max: 1, // Single connection per worker - strict isolation
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
    console.log(`[worker ${process.pid}] PostgreSQL pool initialized (isolated): host=${pgHost}, port=${pgPort}, maxConnections=1`);
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const result = await this.pool.query(sql, params);
    return result;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// SQLite implementation dari TestDatabase (W-BETTER-004: Database Replacement Test)
class SqliteWorkerDatabase implements TestDatabase {
  private db: Database.Database;
  
  constructor(databasePath: string) {
    // Gunakan absolute path yang konsisten dengan parent process
    const absolutePath = path.isAbsolute(databasePath) 
      ? databasePath 
      : path.resolve(process.cwd(), databasePath);
    console.log(`[worker ${process.pid}] Resolved SQLite database path: ${absolutePath}`);
    this.db = new Database(absolutePath, { verbose: console.log });
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    console.log(`[worker ${process.pid}] SQLite database initialized (isolated): path=${absolutePath}`);
  }

  async query(sql: string, params?: any[]): Promise<any> {
    // Hanya ganti placeholder $1/$2 jika SQL MENGANDUNG placeholder PostgreSQL (jika pakai ? sudah, skip!)
    let sqliteSql = sql;
    const pgPlaceholders = sql.match(/\$(\d+)/g) || [];
    const nativePlaceholders = sql.match(/\?/g) || [];
    // Ganti placeholder PostgreSQL hanya jika ada di SQL
    for (let i = 1; i <= pgPlaceholders.length; i++) {
      sqliteSql = sqliteSql.replace(`$${i}`, '?');
    }
    
    // Normalize parameters untuk SQLite
    const normalizedParams = params ? params.map(p => p === undefined ? null : p) : [];
    
    // Hitung total placeholders setelah replace
    const finalPlaceholders = sqliteSql.match(/\?/g) || [];
    console.log(`[sqlite-debug-worker] SQL: ${sqliteSql} | pgPlaceholders: ${pgPlaceholders.length} | nativePlaceholders: ${nativePlaceholders.length} | finalPlaceholders: ${finalPlaceholders.length} | params: ${normalizedParams.length}`);
    
    // Jalankan query dengan parameter yang sesuai jumlah placeholder (prevent RangeError)
    const safeParams = normalizedParams.slice(0, finalPlaceholders.length);
    if (safeParams.length < finalPlaceholders.length) {
      console.error(`[sqlite-debug-worker] ⚠️ Parameter mismatch: ${safeParams.length} params for ${finalPlaceholders.length} placeholders. Filling missing with null.`);
      while (safeParams.length < finalPlaceholders.length) {
        safeParams.push(null);
      }
    }
    
    const stmt = this.db.prepare(sqliteSql);
    if (sqliteSql.trim().toUpperCase().startsWith('SELECT')) {
      return { rows: stmt.all(safeParams) };
    } else {
      const result = stmt.run(safeParams);
      return { rows: [], changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

// Initialize worker's OWN database connection (isolated from parent)
function getWorkerDatabase(databaseType: 'postgres' | 'sqlite', databaseUrl: string): TestDatabase {
  if (!workerDb) {
    if (databaseType === 'postgres') {
      workerDb = new PostgresWorkerDatabase(databaseUrl);
    } else {
      workerDb = new SqliteWorkerDatabase(databaseUrl);
    }
  }
  return workerDb;
}

// EXACT production atomicClaim logic - duplicated to ensure no shared state
async function atomicClaimWorker(
  workId: string,
  actorId: string,
  executionId: string,
  expectedVersion: number,
  expectedStatuses: string[],
  allowReclaim: boolean,
  db: TestDatabase,
  eventId?: string,
  leaseDurationMs?: number
): Promise<any> {
  // PostgreSQL-only: untuk SQLite tidak perlu BEGIN manual (transaksi sudah handle oleh better-sqlite3)
  let client: Client | null = null;
  if ('pool' in db && db instanceof PostgresWorkerDatabase) {
    client = await (db as any).pool.connect();
    await client!.query('BEGIN');
  }
  try {
    // EXACT PRODUCTION LOGIC: SELECT FOR UPDATE to lock row
    let workResult;
    if (client) {
      // PostgreSQL: gunakan client.query dengan FOR UPDATE (non-null assertion aman karena sudah dicek di if)
      workResult = await client!.query(
        `SELECT * FROM works WHERE id = $1 FOR UPDATE`,
        [workId]
      );
    } else {
      // SQLite: gunakan db.query (transaksi WAL sudah menangani concurrency)
      workResult = await db.query(
        `SELECT * FROM works WHERE id = $1`,
        [workId]
      );
    }
    
    if (workResult.rows.length === 0) throw new Error("work_not_found");
    const workRecord = workResult.rows[0];
    
    // 1. Version check
    if (workRecord.version !== expectedVersion) throw new Error(`conflict: version mismatch - current ${workRecord.version}, expected ${expectedVersion}`);
    
    // 2. Status check
    if (!expectedStatuses.includes(workRecord.status)) throw new Error(`forbidden: status ${workRecord.status} not allowed`);
    
    // 3. Active claim check
    const hasActiveClaim = workRecord.claim_status === 'CLAIMED';
    const leaseUntil = workRecord.lease_until ? new Date(workRecord.lease_until) : null;
    const isStale = leaseUntil && leaseUntil < new Date();
    const canReclaim = allowReclaim && (workRecord.claim_status === 'STALE' || isStale);
    
    // EDGE-A-001: Cek duplikasi event sebelum melanjutkan
    if (eventId) {
      let processedEventIds: string[] = [];
      if (workRecord.processed_event_ids) {
        try {
          if (typeof workRecord.processed_event_ids === 'string') {
            processedEventIds = JSON.parse(workRecord.processed_event_ids);
          } else if (Array.isArray(workRecord.processed_event_ids)) {
            processedEventIds = [...workRecord.processed_event_ids];
          }
        } catch (e) {
          processedEventIds = [];
        }
      }
      if (processedEventIds.includes(eventId)) {
        throw new Error(`duplicate_event: Event ${eventId} sudah pernah diproses untuk Work ${workId}`);
      }
    }
    
    if (hasActiveClaim && !canReclaim) throw new Error("conflict: already claimed");
    
    // 4. Execution lineage
    let previousExecutions: string[] = [];
    if (workRecord.previous_execution_ids) {
      try {
        if (typeof workRecord.previous_execution_ids === 'string') {
          previousExecutions = JSON.parse(workRecord.previous_execution_ids);
        } else if (Array.isArray(workRecord.previous_execution_ids)) {
          previousExecutions = [...workRecord.previous_execution_ids];
        }
      } catch (e) {
        previousExecutions = [];
      }
    }
    if (workRecord.active_execution_id) previousExecutions.push(workRecord.active_execution_id);
    
    // 5. EDGE-A-001: Update processed_event_ids jika ada eventId
    let processedEventIds: string[] = [];
    if (workRecord.processed_event_ids) {
      try {
        if (typeof workRecord.processed_event_ids === 'string') {
          processedEventIds = JSON.parse(workRecord.processed_event_ids);
        } else if (Array.isArray(workRecord.processed_event_ids)) {
          processedEventIds = [...workRecord.processed_event_ids];
        }
      } catch (e) {
        processedEventIds = [];
      }
    }
    if (eventId && !processedEventIds.includes(eventId)) {
      processedEventIds.push(eventId);
    }
    
    // 6. Atomic update
    let updateResult;
    const leaseMs = leaseDurationMs || 3600000; // Default 1 jam
    if (client) {
      // PostgreSQL: gunakan client.query dengan transaksi manual
      updateResult = await client.query(
        `UPDATE works 
         SET version = version + 1,
             actor_id = $1,
             session_id = $2,
             active_execution_id = $2,
             claim_status = 'CLAIMED',
             lease_until = NOW() + $6 * INTERVAL '1 millisecond',
             previous_execution_ids = $3,
             processed_event_ids = $4,
             status = 'executing',
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [actorId, executionId, JSON.stringify(previousExecutions), JSON.stringify(processedEventIds), workId, leaseMs]
      );
      await client.query('COMMIT');
    } else {
      // SQLite: gunakan db.query (better-sqlite3 menangani transaksi secara otomatis untuk single query)
      const sqliteLeaseMs = leaseDurationMs || 3600000;
      updateResult = await db.query(
        `UPDATE works 
         SET version = version + 1,
             actor_id = ?,
             session_id = ?,
             active_execution_id = ?,
             claim_status = 'CLAIMED',
             lease_until = datetime('now', '+' || ? || ' milliseconds'),
             previous_execution_ids = ?,
             processed_event_ids = ?,
             status = 'executing',
             updated_at = datetime('now')
         WHERE id = ?`,
        [actorId, executionId, executionId, sqliteLeaseMs, JSON.stringify(previousExecutions), JSON.stringify(processedEventIds), workId]
      );
      // Ambil work record yang baru diupdate
      const updatedWork = await db.query(`SELECT * FROM works WHERE id = ?`, [workId]);
      return updatedWork.rows[0];
    }
    return updateResult.rows[0];
  } catch (error) {
    console.error(`[atomicClaimWorker] Error during claim:`, error);
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    // Hanya PostgreSQL client yang perlu di-close
    if (client) {
      await client.end();
    }
  }
}

// Enhanced executeClaim yang mengembalikan result sebagai nilai return (bukan hanya mengirim via IPC saja
// Listen for parent messages (barrier synchronization)
export async function executeClaim(input: WorkerInput): Promise<WorkerResult> {
  const db = getWorkerDatabase(input.databaseType, input.databaseUrl);
  // Parse URL hanya untuk PostgreSQL (SQLite menggunakan file path, bukan URL)
  let host = 'localhost';
  let port = 0;
  if (input.databaseType === 'postgres') {
    const url = new URL(input.databaseUrl);
    host = url.hostname;
    port = parseInt(url.port || "5432");
  }
  const claimStartTimestamp = Date.now(); // Capture claim start time
  const result: WorkerResult = {
    success: false,
    actorId: input.actorId,
    workerId: `worker-${input.actorId}`, // Unique worker ID dari actorId
    executionId: input.executionId,
    pid: process.pid,
    connection: {
      host,
      port
    },
    claimStartTimestamp: claimStartTimestamp,
    claimResultTimestamp: 0
  };

  try {
    const work = await atomicClaimWorker(
      input.workId,
      input.actorId,
      input.executionId,
      input.expectedVersion,
      input.expectedStatuses,
      input.allowReclaim,
      db
    );
    result.success = true;
    result.work = work;
    console.log(`[worker ${process.pid}] ✅ CLAIM SUCCESS! Actor ${input.actorId}`);
  } catch (error: any) {
    result.success = false;
    result.error = error.message;
    // Klasifikasi error class untuk evidence
    if (error.message.includes("version mismatch")) result.errorClass = "VERSION_CONFLICT";
    else if (error.message.includes("already claimed")) result.errorClass = "CLAIM_CONFLICT";
    else if (error.message.includes("status not allowed")) result.errorClass = "STATUS_FORBIDDEN";
    else if (error.message.includes("work_not_found")) result.errorClass = "WORK_NOT_FOUND";
    else result.errorClass = "UNKNOWN_ERROR";
    console.log(`[worker ${process.pid}] ❌ CLAIM FAILED: ${error.message} (class: ${result.errorClass})`);
  } finally {
    // Set claim completion timestamp setelah semua operasi selesai
    result.claimResultTimestamp = Date.now();
    // Kirim hasil kembali ke parent process hanya jika BERJALAN SEBAGAI CHILD PROCESS ACTUAL
    // Di Vitest in-process, process.connected = false, jadi kita skip IPC dan hanya tutup database
    const isActualChildProcess = process.send !== undefined && process.connected;
    if (isActualChildProcess) {
      console.log(`[worker ${process.pid}] Attempting to send IPC message to parent (real child mode)...`);
      const sendToParent = process.send!.bind(process.send);
      try {
        sendToParent(JSON.stringify({ type: 'complete', result }), (sendError: Error | null) => {
          if (sendError) {
            console.error(`[worker ${process.pid}] ❌ IPC SEND FAILED: ${sendError.message}`);
          } else {
            console.log(`[worker ${process.pid}] ✅ IPC MESSAGE SENT SUCCESSFULLY to parent`);
          }
          db.close().then(() => {
            console.log(`[worker ${process.pid}] Database closed, exiting process`);
            process.exit(sendError ? 1 : 0);
          }).catch((cleanupError) => {
            console.error(`[worker ${process.pid}] Database cleanup error: ${cleanupError.message}`);
            process.exit(1);
          });
        });
      } catch (serializeError: any) {
        console.error(`[worker ${process.pid}] ❌ Failed to serialize IPC message: ${serializeError.message}`);
        await db.close();
      }
    } else {
      // In-process mode (Vitest/test): tutup database tanpa exit process (biarkan test handle lifecycle)
      console.log(`[worker ${process.pid}] In-process mode: skipping IPC, closing database only`);
      await db.close();
      // Kembalikan result untuk in-process execution agar test bisa menangkap hasilnya
      return result;
    }
  }
  return result;
}

// Hanya aktifkan IPC listener jika berjalan sebagai child process (process.send tersedia)
if (process.send) {
  const sendToParent = process.send!.bind(process.send); // Bind untuk menghindari "possibly undefined" error
  process.on('message', async (input: WorkerInput) => {
    console.log(`[worker ${process.pid}] Received message, merging into current input...`);
    
    // Gunakan mutable state untuk menampung input terbaru (releaseBarrier signal akan mengupdate state)
    let currentInput: Partial<WorkerInput> | null = null; // Partial untuk memungkinkan merge aman
    let hasExecuted = false; // Prevent duplicate execution even if multiple messages received
    let hasSentReady = false; // Prevent duplicate READY signals to parent
    
    // SELALU merge input baru ke currentInput untuk mempertahankan SEMUA field
    if (currentInput === null) {
      currentInput = { ...input };
    } else {
      // Fix spread type error: gunakan Object.assign sebagai alternatif spread yang aman
      currentInput = Object.assign({}, currentInput, input);
    }
    
    // HANYA jalankan executeClaim KETIKA releaseBarrier = true DAN belum pernah dieksekusi
    if (currentInput && input.releaseBarrier && !hasExecuted) {
      hasExecuted = true;
      // Gunakan currentInput yang sudah termerge SEMUA field (actorId, executionId, workId, dll.)
      const mergedInput = Object.assign({}, currentInput, { 
        databaseUrl: currentInput.databaseUrl || process.env.DATABASE_URL || "postgresql://eos_user:eos_pass123@localhost:5432/eos_identity" 
      }) as WorkerInput;
      console.log(`[worker ${process.pid}] Barrier released! Executing claim with actorId=${mergedInput.actorId?.slice(0,20)}...`);
      sendToParent({ type: 'BARRIER_RECEIVED' });
      await executeClaim(mergedInput);
    } else if (currentInput?.actorId && !input.releaseBarrier && !hasSentReady) {
      // Kirim READY HANYA setelah menerima inisialisasi lengkap (actorId ada)
      hasSentReady = true;
      console.log(`[worker ${process.pid}] Worker initialized (actor: ${currentInput.actorId}), sending READY...`);
      setTimeout(() => {
        try {
          sendToParent({ type: 'READY', pid: process.pid });
          console.log(`[worker ${process.pid}] Sent READY signal to parent successfully`);
        } catch (e) {
          console.error(`[worker ${process.pid}] Failed to send READY: ${(e as Error).message}`);
        }
      }, 10); // Tunggu 10ms untuk memastikan IPC channel stabil
    }
  });
} // Tutup blok if (process.send) untuk IPC listener