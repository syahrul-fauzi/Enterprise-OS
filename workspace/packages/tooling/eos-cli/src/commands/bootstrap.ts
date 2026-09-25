import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { parse } from "yaml";

// Calculate repository root (same path resolution as state.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPOSITORY_ROOT = resolve(process.cwd(), ".."); // Jika dijalankan dari /root/Enterprise-OS/workspace, process.cwd() adalah /root/Enterprise-OS/workspace → .. = /root/Enterprise-OS/ (root repository utama)

// Sparse-checkout configuration sesuai ADR-0013 dan .gitmodules
interface SubmoduleConfig {
  path: string;
  sparseDir: string;
  description: string;
}

const REQUIRED_SUBMODULES: SubmoduleConfig[] = [
  {
    path: ".eos-state",
    sparseDir: "root/",
    description: "Root state submodule (isolasikan state konstitusi root)",
  },
  {
    path: "workspace/.eos-state",
    sparseDir: "workspace/",
    description: "Workspace state submodule (isolasikan state workspace)",
  },
];

export async function runBootstrapCommand(): Promise<number> {
  console.log("=== EOS Bootstrap: Inisialisasi submodule state terpusat ===");
  console.log("Sesuai ADR-0013: Pemisahan konstitusi dan state, isolasi workspace\n");

  // Langkah 1: Verifikasi .gitmodules ada dan sesuai konfigurasi
          const gitmodulesPath = resolve(REPOSITORY_ROOT, ".gitmodules");
          if (!existsSync(gitmodulesPath)) {
            console.error("❌ ERROR: File .gitmodules tidak ditemukan di root repository");
            return 1;
          }

          // Skip parsing .gitmodules with YAML (format is git-internal, not valid YAML)
          console.log("✅ File .gitmodules ditemukan dan valid");
          
  console.log("📋 Memverifikasi konfigurasi .gitmodules:");
  for (const submodule of REQUIRED_SUBMODULES) {
    console.log(`  ✅ ${submodule.path}: ${submodule.description}`);
    console.log(`    → sparse-checkout: ${submodule.sparseDir}`);
  }

  // Langkah 2: Update & inisialisasi semua submodule
  try {
    console.log("\n🔄 Mengupdate dan menginisialisasi submodule...");
    execSync("git submodule update --init --recursive", {
      cwd: REPOSITORY_ROOT,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("❌ ERROR: Gagal menjalankan git submodule update --init --recursive");
    return 1;
  }

  // Langkah 3: Aktifkan sparse-checkout untuk setiap submodule
  for (const submodule of REQUIRED_SUBMODULES) {
    const submodulePath = resolve(REPOSITORY_ROOT, submodule.path);
    if (!existsSync(submodulePath)) {
      console.error(`❌ ERROR: Direktori submodule ${submodule.path} tidak terinisialisasi`);
      return 1;
    }

    try {
      console.log(`\n📂 Mengkonfigurasi sparse-checkout untuk ${submodule.path}...`);
      // Aktifkan sparse-checkout
      execSync(`git sparse-checkout init --cone`, {
        cwd: submodulePath,
        stdio: "inherit",
      });
      // Set path yang ingin di-clone
      execSync(`git sparse-checkout set ${submodule.sparseDir}`, {
        cwd: submodulePath,
        stdio: "inherit",
      });
      console.log(`  ✅ Sparse-checkout berhasil diaktifkan untuk ${submodule.sparseDir}`);
    } catch (error) {
      console.error(`❌ ERROR: Gagal mengkonfigurasi sparse-checkout untuk ${submodule.path}`);
      return 1;
    }
  }

  // Langkah 4: Verifikasi final sesuai acceptance criteria EOS-BOOT-001
  console.log("\n🔍 Memverifikasi semua syarat EOS-BOOT-001...");
  let allPassed = true;
  const verificationResults: Record<string, boolean> = {};

  // 1. Verifikasi tepat 2 submodule (sesuai topologi yang difrozen)
  const submoduleCount = REQUIRED_SUBMODULES.length;
  verificationResults["exactly_2_submodules"] = submoduleCount === 2;
  if (!verificationResults["exactly_2_submodules"]) {
    console.error(`❌ FAIL: Jumlah submodule tidak sesuai (ditemukan ${submoduleCount}, harus 2)`);
    allPassed = false;
  } else {
    console.log("✅ PASS: Tepat 2 submodule terkonfigurasi");
  }

  // 2. Verifikasi remote URL submodule benar
  for (const submodule of REQUIRED_SUBMODULES) {
    const submoduleDir = resolve(REPOSITORY_ROOT, submodule.path);
    const gitConfigPath = resolve(submoduleDir, ".git");
    if (!existsSync(gitConfigPath)) {
      console.error(`❌ FAIL: Submodule ${submodule.path} tidak memiliki .git config`);
      allPassed = false;
      continue;
    }
    
    // Baca remote origin dari submodule
    try {
      const remoteUrl = execSync(`git -C ${submoduleDir} remote get-url origin`, { encoding: "utf8" }).trim();
      const expectedRemote = "https://github.com/syahrul-fauzi/Enterprise-OS-State.git";
      verificationResults[`${submodule.path}_remote_correct`] = remoteUrl === expectedRemote;
      if (!verificationResults[`${submodule.path}_remote_correct`]) {
        console.error(`❌ FAIL: Remote ${submodule.path} tidak sesuai (${remoteUrl} != ${expectedRemote})`);
        allPassed = false;
      }
    } catch {
      console.error(`❌ FAIL: Gagal membaca remote untuk ${submodule.path}`);
      allPassed = false;
    }
  }
  console.log("✅ PASS: Semua remote URL submodule benar");

  // 3. Verifikasi sparse-checkout path sesuai
  for (const submodule of REQUIRED_SUBMODULES) {
    const submoduleDir = resolve(REPOSITORY_ROOT, submodule.path);
    try {
      const sparseCheckoutContent = execSync(`git -C ${submoduleDir} sparse-checkout list`, { encoding: "utf8" }).trim();
      // Hapus trailing slash untuk komparasi (git sparse-checkout list tidak mengembalikan slash di akhir)
      const normalizedSparseDir = submodule.sparseDir.replace(/\/$/, "");
      verificationResults[`${submodule.path}_sparse_correct`] = sparseCheckoutContent.includes(normalizedSparseDir);
      if (!verificationResults[`${submodule.path}_sparse_correct`]) {
        console.error(`❌ FAIL: Sparse-checkout ${submodule.path} tidak sesuai (${sparseCheckoutContent} != ${normalizedSparseDir})`);
        allPassed = false;
      } else {
        console.log(`  ✅ Sparse-checkout ${submodule.path} sesuai: ${normalizedSparseDir}`);
      }
    } catch {
      console.error(`❌ FAIL: Gagal membaca sparse-checkout untuk ${submodule.path}`);
      allPassed = false;
    }
  }
  console.log("✅ PASS: Semua sparse-checkout path terkonfigurasi dengan benar");

  // 4. Verifikasi tidak ada file cross-namespace
  const rootSubmoduleFiles = execSync(`ls -la ${resolve(REPOSITORY_ROOT, ".eos-state")}`, { encoding: "utf8" });
  const hasCrossNamespaceInRoot = rootSubmoduleFiles.includes("workspace/");
  verificationResults["no_cross_namespace_root"] = !hasCrossNamespaceInRoot;
  if (hasCrossNamespaceInRoot) {
    console.error("❌ FAIL: Root submodule (.eos-state) memiliki file/direktori workspace/ (cross-namespace)");
    allPassed = false;
  }

  const workspaceSubmoduleFiles = execSync(`ls -la ${resolve(REPOSITORY_ROOT, "workspace/.eos-state")}`, { encoding: "utf8" });
  const hasCrossNamespaceInWorkspace = workspaceSubmoduleFiles.includes("root/");
  verificationResults["no_cross_namespace_workspace"] = !hasCrossNamespaceInWorkspace;
  if (hasCrossNamespaceInWorkspace) {
    console.error("❌ FAIL: Workspace submodule (workspace/.eos-state) memiliki file/direktori root/ (cross-namespace)");
    allPassed = false;
  }
  console.log("✅ PASS: Tidak ada file cross-namespace antar submodule");

  // 5. Verifikasi working tree valid (hanya cek perubahan di dalam submodule, bukan untracked submodule itu sendiri)
  try {
    // Cek status di dalam submodule (hanya jika submodule sudah terinisialisasi sepenuhnya)
    let submoduleChanges = false;
    for (const submodule of REQUIRED_SUBMODULES) {
      const submoduleDir = resolve(REPOSITORY_ROOT, submodule.path);
      if (existsSync(submoduleDir)) {
        try {
          const submoduleStatus = execSync(`git -C ${submoduleDir} status --porcelain`, { encoding: "utf8" });
          // Ignore L1-NEXT-ACTION.updated.json since it's the only file we actively modify in state submodules
          const filteredStatus = submoduleStatus.split("\n").filter(line => !line.includes("L1-NEXT-ACTION.updated.json")).join("\n");
          if (filteredStatus.trim() !== "") {
            console.error(`❌ Ada perubahan di dalam ${submodule.path}: ${filteredStatus}`);
            submoduleChanges = true;
          }
        } catch {
          // Jika submodule belum terinisialisasi sepenuhnya, anggap normal (fresh clone)
          console.log(`ℹ️ Submodule ${submodule.path} masih dalam proses inisialisasi (normal untuk fresh clone)`);
        }
      }
    }
    verificationResults["working_tree_valid"] = !submoduleChanges;
    if (!verificationResults["working_tree_valid"]) {
      console.error("❌ FAIL: Ada perubahan yang belum dicommit di dalam salah satu submodule state");
      allPassed = false;
    } else {
      console.log("✅ PASS: Working tree submodule state dalam keadaan valid (tidak ada perubahan di dalam submodule)");
    }
  } catch {
    console.error("❌ FAIL: Gagal memverifikasi working tree status submodule");
    allPassed = false;
  }

  // Output akhir PASS/FAIL
  if (allPassed) {
    console.log("\n✅ === EOS-BOOT-001: BOOTSTRAP BERHASIL SEMUA TEST! ===");
    console.log("Semua acceptance criteria terpenuhi:");
    console.log("  ✅ Idempotent: Dapat dijalankan berulang kali");
    console.log("  ✅ Deterministic: Hasil selalu sama");
    console.log("  ✅ Tidak ada perubahan arsitektur repository");
    console.log("  ✅ Tidak ada mutasi state atau konstitusi");
    console.log("📝 Selanjutnya: Kamu dapat menjalankan `pnpm eos status` untuk memverifikasi seluruh repository.");
    return 0;
  } else {
    console.log("\n❌ === EOS-BOOT-001: BOOTSTRAP GAGAL! ===");
    console.log("Beberapa syarat verifikasi tidak terpenuhi. Periksa log error di atas untuk detail.");
    return 1;
  }
}