 /**
 * EOS-NEXUS-001-W01 Proof Fixture (Staging Only, NOT Permanent Daemon)
 * Alur: State → Dispatch → Execute → Prove → Reset
 * Menggunakan EXISTING C17-C20 machinery, tidak ada arsitektur baru
 */

import { writeFile, mkdir } from 'fs/promises';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { parse, parseAllDocuments } from 'yaml';
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Import state.ts secara in-process untuk debug parsing yang sama persis
import { loadCurrentJourney, saveCurrentJourney, JOURNEY_ENGINE_ID, invalidateCache, EOS_STATE_ROOT } from '../packages/tooling/eos-cli/src/state.js';

// Invariant yang dijaga: NEXUS hanya dispatch, tidak ambil keputusan bisnis
const EXECUTE_ONE_WORK_ONLY = true;
const PROOF_PATH = join(__dirname, '..', '.eos-state', 'proofs', `EOS-NEXUS-001-staging-proof-${Date.now()}.json`);

async function main() {
  console.log('[EOS-NEXUS-001] Starting proof fixture (staging-only)...');
  
  // 1. Seed deterministic state (step 1)
  // Invalidate cache untuk memastikan membaca file current-journey.yaml yang baru
  // Debug: Hitung path secara konsisten dengan state.ts untuk verifikasi file yang dibaca
  const CURRENT_JOURNEY_PATH = resolve(EOS_STATE_ROOT, "current-journey.yaml");
  console.log('[EOS-NEXUS-001-DEBUG] EOS_STATE_ROOT (from state.ts):', EOS_STATE_ROOT);
  console.log('[EOS-NEXUS-001-DEBUG] CURRENT_JOURNEY_PATH (computed):', CURRENT_JOURNEY_PATH);
  console.log('[EOS-NEXUS-001-DEBUG] File exists?', existsSync(CURRENT_JOURNEY_PATH));
  if (existsSync(CURRENT_JOURNEY_PATH)) {
    const rawContent = readFileSync(CURRENT_JOURNEY_PATH, 'utf8');
    console.log('[EOS-NEXUS-001-DEBUG] Raw file content from disk:', rawContent);
    const fileStat = statSync(CURRENT_JOURNEY_PATH);
    console.log('[EOS-NEXUS-001-DEBUG] File mtimeMs:', fileStat.mtimeMs);
    // PARSE SENDIRI SAMA SEPERTI state.ts!
    const parsedDocs = parseAllDocuments(rawContent);
    console.log('[fixture] DEBUG: parseAllDocuments() di fixture menemukan', parsedDocs.length, 'dokumen');
    parsedDocs.forEach((doc, i) => {
      if (doc && typeof doc.toJSON === 'function') {
        const json = doc.toJSON();
        console.log(`[fixture] DEBUG: Doc ${i} work_id: ${json?.work_id}, next_work_id: ${json?.next_work_id}`);
      }
    });
  }

  const cacheResult = invalidateCache(JOURNEY_ENGINE_ID);
  console.log('[EOS-NEXUS-001] Cache invalidation result:', cacheResult);
  const currentJourney = loadCurrentJourney();
  console.log('[EOS-NEXUS-001] Loaded canonical state:', currentJourney.work_id);
  
  // 2. Resolve NEXT WORK (hanya baca state, tidak berpikir) - gunakan field next_work_id sesuai schema
  const nextWork = currentJourney.next_work_id;
  if (!nextWork || nextWork === "") {
    console.log('[EOS-NEXUS-001] No next work found. Terminal state reached.');
    await writeProof({
      actor_id: "nexus-staging",
      work_id: "EOS-NEXUS-001-W01",
      milestone: "terminal_state_reached",
      exit_code: 0,
      timestamp: new Date().toISOString(),
      note: "No next work to dispatch. Sovereignty of .eos-state maintained."
    });
    return;
  }
  
  // 3. Resolve CLI command untuk next_work (C17 jika next_work=C17) - reuse existing CLI machinery
  // Gunakan command EOS CLI yang sudah terdaftar di src/index.ts
  const commandMap: Record<string, { cliCommand: string; workId: string }> = {
    "EOS-JOURNEY-007-W01": { 
      cliCommand: "cd /root/Enterprise-OS/workspace/packages/tooling/eos-cli && node --import tsx ./src/index.ts verify-foundation", 
      workId: "EOS-NEXUS-001-C17" 
    },
    "C17": { 
      cliCommand: "cd /root/Enterprise-OS/workspace/packages/tooling/eos-cli && node --import tsx ./src/index.ts verify-foundation", 
      workId: "EOS-NEXUS-001-C17" 
    },
    "C18": { 
      cliCommand: "cd /root/Enterprise-OS/workspace/packages/tooling/eos-cli && node --import tsx ./src/index.ts verify-requirement", 
      workId: "EOS-NEXUS-001-C18" 
    },
    "C19": { 
      cliCommand: "cd /root/Enterprise-OS/workspace/packages/tooling/eos-cli && node --import tsx ./src/index.ts verify-constitution", 
      workId: "EOS-NEXUS-001-C19" 
    },
    "C20": { 
      cliCommand: "cd /root/Enterprise-OS/workspace/packages/tooling/eos-cli && node --import tsx ./src/index.ts tracing:start", 
      workId: "EOS-NEXUS-001-C20" 
    }
  };
  
  const commandConfig = commandMap[nextWork];
  if (!commandConfig) {
    console.error(`[EOS-NEXUS-001] Unknown next_work: ${nextWork}. Cannot dispatch.`);
    await writeProof({
      actor_id: "nexus-staging",
      work_id: "EOS-NEXUS-001-W01",
      milestone: "unknown_work_blocked",
      exit_code: 1,
      timestamp: new Date().toISOString(),
      note: `Blocked: next_work '${nextWork}' is not defined in command map. Sovereignty of .eos-state maintained.`
    });
    return;
  }

  console.log(`[EOS-NEXUS-001] Dispatching work: ${nextWork} → CLI command: ${commandConfig.cliCommand}`);
  
  try {
    // 5. Capture exit/outcome (step 5) - reuse existing CLI machinery, no new code
    try {
      const { stdout, stderr } = await execAsync(commandConfig.cliCommand);
      console.log(`[EOS-NEXUS-001] CLI execution stdout:`, stdout);
      if (stderr) console.warn(`[EOS-NEXUS-001] CLI execution stderr:`, stderr);
      // Capture exit code 0 untuk proof artifact
      await writeProof({
        actor_id: "nexus-staging",
        work_id: commandConfig.workId,
        milestone: "execution_completed",
        exit_code: 0,
        timestamp: new Date().toISOString(),
        cli_output: stdout,
        cli_stderr: stderr,
        note: `Successfully dispatched and executed ${nextWork} via existing CLI. Proof written to .eos-state/proofs.`
      });
    } catch (execError: unknown) {
      // Capture non-zero exit code untuk proof artifact jika terjadi error
      const error = execError as { stderr?: string; stdout?: string; code?: number; message: string };
      console.error(`[EOS-NEXUS-001] ${nextWork} execution failed:`, error);
      await writeProof({
        actor_id: "nexus-staging",
        work_id: commandConfig.workId,
        milestone: "execution_failed",
        exit_code: error.code || 1,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        timestamp: new Date().toISOString(),
        note: `${nextWork} execution failed. Check proof artifacts for details.`
      });
      throw error; // Re-throw untuk memicu error handling di main()
    }

    // 7. Transition state (step7) - selesaikan W01, tetapkan next_work_id W02 yang valid
    // Semua field sesuai format dan invariant Golden Spine yang ada di state.ts
    const updatedJourney = {
      ...currentJourney,
      next_work_id: "EOS-JOURNEY-007-W02", // ID berikutnya yang sesuai format regex
      completed_at: new Date().toISOString(),
      verdict: "PASS" as const
    };
    saveCurrentJourney(JOURNEY_ENGINE_ID, updatedJourney);
    console.log('[EOS-NEXUS-001] State transitioned: next_work_id cleared. Terminal state reached.');

    // 8. Verify final invariant (step 8)
      const verifiedJourney = loadCurrentJourney();
      if (verifiedJourney.next_work_id === "" && EXECUTE_ONE_WORK_ONLY) {
        console.log('[EOS-NEXUS-001] Final invariant VERIFIED: One work executed, state transitioned to terminal.');
      } else {
        throw new Error(`Final invariant violated: State not properly transitioned to terminal. next_work_id is still: '${verifiedJourney.next_work_id}'`);
      }

  } catch (error) {
    const execError = error as { message: string; stdout?: string; stderr?: string };
    console.error(`[EOS-NEXUS-001] Execution failed:`, execError.message);
    await writeProof({
      actor_id: "nexus-staging",
      work_id: commandConfig.workId,
      milestone: "execution_failed",
      exit_code: 1,
      timestamp: new Date().toISOString(),
      error: execError.message,
      stdout: execError.stdout,
      stderr: execError.stderr,
      note: `Execution of ${nextWork} failed. Check logs for details.`
    });
    process.exit(1);
  }
  
  // Terminal condition: ONE NEXT WORK, ONE EXECUTION, ONE PROOF
  if (EXECUTE_ONE_WORK_ONLY) {
    console.log('[EOS-NEXUS-001] Staging fixture complete. Exiting (no loop, per requirement).');
    process.exit(0);
  }
}

async function writeProof(proofData: unknown) {
  // Hanya buat directory jika belum ada, JANGAN coba buat directory dari nama file
  const proofDir = join(__dirname, '..', '.eos-state', 'proofs');
  await mkdir(proofDir, { recursive: true });
  await writeFile(PROOF_PATH, JSON.stringify(proofData, null, 2));
  console.log(`[EOS-NEXUS-001] Proof written to: ${PROOF_PATH}`);
}

// Hanya jalankan jika module utama (tidak diimport)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(async (error) => {
    console.error('[EOS-NEXUS-001] Fatal error:', error);
    await writeProof({
      actor_id: "nexus-staging",
      work_id: "EOS-NEXUS-001-W01",
      milestone: "fatal_error",
      error: error.message,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  });
}

export { main };