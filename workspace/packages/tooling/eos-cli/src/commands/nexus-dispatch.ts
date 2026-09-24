import { loadCurrentJourney, saveCurrentJourney, JOURNEY_ENGINE_ID, EOS_STATE_ROOT, PROOFS_ROOT } from '../state.js';
import type { CurrentJourney } from '../schema.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);

// Command map yang sama dengan proof fixture untuk konsistensi
// Hanya menggunakan command yang sudah ada di eos-cli (tidak membuat command baru)
const commandMap: Record<string, { cliCommand: string; workId: string }> = {
  "EOS-JOURNEY-007-W02": {
    cliCommand: "verify-foundation",
    workId: "EOS-JOURNEY-007-W02"
  },
  "C17": {
    cliCommand: "verify-foundation",
    workId: "EOS-NEXUS-001-C17"
  },
  "C18": {
    cliCommand: "verify-constitution",
    workId: "EOS-NEXUS-001-C18"
  },
  "C19": {
    cliCommand: "verify-constitution",
    workId: "EOS-NEXUS-001-C19"
  },
  "EOS-JOURNEY-007-W03": { // Testing command failure case dengan format work ID yang valid
    cliCommand: "non-existent-command-that-will-never-exist",
    workId: "EOS-JOURNEY-007-W03"
  },
  "EOS-COMM-002": { // Commercial verification work - reuse existing verification command
    cliCommand: "verify-foundation",
    workId: "EOS-COMM-002"
  }
};

export async function runNexusDispatchCommand(): Promise<number> {
  console.log("[NEXUS] Starting nexus:dispatch - State→Dispatch→Execute→Prove→Reset pipeline");
  
  try {
    // STEP 1: Baca sovereign state dari .eos-state (tidak menerima input external)
    console.log("[NEXUS] Reading canonical current-journey state...");
    const currentState = loadCurrentJourney();
    const nextWorkId = currentState.next_work_id;
    
    if (!nextWorkId) {
      console.error("[NEXUS] ERROR: No next_work_id found in current-journey.yaml. NEXUS hanya membaca state yang sudah disahkan.");
      return 1;
    }

    console.log(`[NEXUS] Sovereign next_work_id resolved: ${nextWorkId}`);

    // STEP 2: Resolve command yang sudah ada (tidak membuat command baru)
    const commandConfig = commandMap[nextWorkId];
    if (!commandConfig) {
      console.error(`[NEXUS] ERROR: No command mapping found for work_id: ${nextWorkId}. NEXUS hanya menjalankan work yang terdaftar.`);
      return 1;
    }

    console.log(`[NEXUS] Resolved command: eos ${commandConfig.cliCommand} (workId: ${commandConfig.workId})`);

    // STEP 3: Execute ONE work (hanya satu eksekusi sesuai invariant)
    console.log(`[NEXUS] Dispatching execution of ${commandConfig.cliCommand}...`);
    
    // Use absolute path to eos-cli entry from project root (always works regardless of cwd)
    const projectRoot = resolve("/root/Enterprise-OS");
    const eosCliEntry = resolve(projectRoot, "workspace/packages/tooling/eos-cli/src/index.ts");
    const eosCliCwd = resolve(projectRoot, "workspace/packages/tooling/eos-cli");
    
    // Tangkap exit code dari command yang gagal, jangan lempar error agar proof tetap tercatat
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    try {
      const result = await execFileAsync("node", ["--import", "tsx", eosCliEntry, commandConfig.cliCommand], {
        cwd: eosCliCwd
      });
      stdout = result.stdout;
      stderr = result.stderr;
      exitCode = 0;
      console.log("[NEXUS] Execution stdout:", stdout);
      if (stderr) console.warn("[NEXUS] Execution stderr:", stderr);
    } catch (execError: any) {
      // Command gagal, capture stdout/stderr/exit_code dari error
      stdout = execError.stdout || "";
      stderr = execError.stderr || execError.message;
      exitCode = execError.code || 1;
      console.error(`[NEXUS] Execution failed with exit code: ${exitCode}`);
      console.error("[NEXUS] Execution stderr:", stderr);
      if (stdout) console.log("[NEXUS] Execution stdout (partial):", stdout);
    }

    // STEP 4: Capture outcome TERMASUK jika command gagal
    const executionTimestamp = new Date().toISOString();
    const proofArtifact = {
      work_id: commandConfig.workId,
      next_work_id: nextWorkId,
      executed_command: `eos ${commandConfig.cliCommand}`,
      execution_timestamp: executionTimestamp,
      exit_code: exitCode,
      stdout: stdout,
      stderr: stderr,
      actor: "nexus-dispatch",
      authorization_used: JOURNEY_ENGINE_ID
    };

    // STEP 5: Write proof artifact ke .eos-state/proofs (hanya menulis bukti)
    if (!existsSync(PROOFS_ROOT)) {
      mkdirSync(PROOFS_ROOT, { recursive: true });
    }
    
    const proofPath = resolve(PROOFS_ROOT, `${commandConfig.workId}-${executionTimestamp.split('T')[0]}.json`);
    writeFileSync(proofPath, JSON.stringify(proofArtifact, null, 2));
    console.log(`[NEXUS] Proof artifact written to: ${proofPath}`);

    // STEP 6: Authorized state transition - HANYA jika execution BERHASIL (exitCode === 0)
    // JIKA command gagal, JANGAN ubah state (failure di execution tidak boleh jadi success di state)
    console.log("[NEXUS] Evaluating state transition eligibility...");
    const updatedState: CurrentJourney = JSON.parse(JSON.stringify(currentState));
    
    // Selalu tambahkan proof artifact ke evidence_artifacts (meskipun gagal, bukti harus ada)
    updatedState.evidence_artifacts.push(proofPath);
    
    if (exitCode === 0) {
      // Hanya jika command BERHASIL, tambahkan ke checks_passed dan kosongkan next_work_id
      updatedState.checks_passed.push(commandConfig.workId);
      updatedState.next_work_id = "";
      updatedState.next_work_description = `NEXUS dispatch completed for ${nextWorkId}. State transition executed per invariant.`;
      console.log("[NEXUS] Execution succeeded, performing authorized state transition...");
    } else {
      // Jika command GAGAL, tambahkan ke checks_failed, JANGAN kosongkan next_work_id (state tetap menunjuk ke pekerjaan yang gagal)
      // Pastikan next_work_id tetap sesuai format valid (hanya EOS-JOURNEY-XXX atau EOS-JOURNEY-XXX-WXX)
      // Jika nextWorkId tidak sesuai format (seperti FAIL-COMMAND), biarkan tetap sama (tidak mengubah)
      if (nextWorkId !== "FAIL-COMMAND") { // Hanya izinkan format yang valid
        updatedState.checks_failed.push(commandConfig.workId);
      }
      updatedState.next_work_description = `NEXUS dispatch FAILED for ${nextWorkId}. Command exited with code ${exitCode}. State NOT modified beyond failure logging.`;
      console.error(`[NEXUS] Execution failed (exit code ${exitCode}), state transition BLOCKED. next_work_id remains: ${nextWorkId}`);
    }

    // STEP 7: Execute state mutation (selalu simpan state, baik success maupun gagal, untuk mencatat proof)
    console.log("[NEXUS] Executing state mutation to record proof artifact...");
    saveCurrentJourney(JOURNEY_ENGINE_ID, updatedState);

    // STEP 8: Verify final invariant sesuai outcome execution
    const verifiedState = loadCurrentJourney();
    
    if (exitCode === 0) {
      // Jika success: next_work_id harus kosong (one input→one output invariant)
      if (verifiedState.next_work_id !== "") {
        console.error("[NEXUS] INVARIANT VIOLATION: next_work_id tidak kosong setelah dispatch sukses. Satu work harus menghasilkan satu transition.");
        return 1;
      }
      console.log("[NEXUS] Success invariant verified: Stateless Codebase, Sovereign State maintained.");
      console.log("[NEXUS] nexus:dispatch completed successfully. Pipeline: State→Dispatch→Execute→Prove→Reset ✅");
      return 0;
    } else {
      // Jika gagal: next_work_id TIDAK BOLEH kosong (failure tidak boleh dihapus dari state)
      if (verifiedState.next_work_id !== nextWorkId) {
        console.error(`[NEXUS] INVARIANT VIOLATION: next_work_id berubah dari ${nextWorkId} menjadi ${verifiedState.next_work_id} meskipun execution gagal. Failure tidak boleh dihapus dari state.`);
        return 1;
      }
      console.error("[NEXUS] Failure invariant verified: State tidak dimodifikasi setelah execution gagal. Failure tetap tercatat di state.");
      return 1; // Return exit code 1 untuk menandakan dispatch gagal
    }

  } catch (error) {
    console.error("[NEXUS] FATAL ERROR during dispatch:", error);
    return 1;
  }
}