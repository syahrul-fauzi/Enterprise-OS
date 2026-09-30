// eos-evidence-engine kompatibel - capture post-state evidence setelah FACE detachment
// W-003: Falsification Experiment #2 — FACE Independence / Work Survival Under FACE Detachment
// LANGKAH UNTUK JALANKAN EKSPERIMEN (development mode, TANPA PostgreSQL dependency):
// 1. export NODE_ENV=development
// 2. cd /root/Enterprise-OS/workspace/W-BETTER-005/phase-1
// 3. mkdir -p before after
// 4. node --import tsx/esm capture-pre-state.ts
// 5. node --import tsx/esm capture-post-state.ts
// 6. node --import tsx/esm verify-identity-continuity.ts
import * as fs from 'fs/promises';
import * as path from 'path';

// Sama persis dengan capture-pre-state.ts: file-based store untuk persistensi antar proses
const WORK_STORE_FILE = path.join(process.cwd(), 'work-store.json');
async function getGlobalWorkStore(): Promise<Map<string, any>> {
  try {
    const data = await fs.readFile(WORK_STORE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch (e) {
    console.error("[WorkRepositoryInMemory] Error reading work store:", e);
    return new Map<string, any>();
  }
}

async function saveGlobalWorkStore(store: Map<string, any>): Promise<void> {
  const obj = Object.fromEntries(store.entries());
  await fs.writeFile(WORK_STORE_FILE, JSON.stringify(obj, null, 2));
}

// WorkRepositoryInMemory yang 100% kompatibel dengan interface getWorkRepositoryPostgres()
const WorkRepositoryInMemory = {
  async save(work: any): Promise<any> {
    const store = await getGlobalWorkStore();
    store.set(work.id, { ...work, updatedAt: new Date().toISOString() });
    await saveGlobalWorkStore(store);
    return store.get(work.id);
  },
  async getById(id: string): Promise<any> {
    const store = await getGlobalWorkStore();
    return store.get(id);
  },
  async clear(): Promise<void> {
    const store = await getGlobalWorkStore();
    store.clear();
    await saveGlobalWorkStore(store);
    console.log("[WorkRepositoryInMemory] Global work store cleared for test isolation");
  },
  async list(): Promise<readonly any[]> {
    const store = await getGlobalWorkStore();
    return Array.from(store.values());
  }
};

async function capturePostState() {
  try {
    console.log("[W-003] Memulai capture post-state dari IN-MEMORY store via existing repository interface...");
    
    // Gunakan repository in-memory, tidak perlu koneksi PostgreSQL sama sekali
    const workRepository = WorkRepositoryInMemory;
    let allWorks = await workRepository.list();
    
    // Ekstrak semua WorkId dan anchor penting
    const allWorkIds = allWorks.map(w => w.id);
    const workCount = allWorks.length;
    const sampleWorkAnchors = allWorks.slice(0, 5).map(w => ({
      id: w.id,
      title: w.title,
      status: w.status,
      actor_id: w.actor_id,
      created_at: w.created_at
    }));

    // Buat objek semantic state
    const semanticState = {
      capture_timestamp: new Date().toISOString(),
      total_works: workCount,
      all_tenant_ids: [...new Set(allWorks.map(w => w.tenant_id))],
      all_workspace_ids: [...new Set(allWorks.map(w => w.workspace_id))],
      status_distribution: allWorks.reduce((acc, w) => {
        acc[w.status] = (acc[w.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Simpan post-state evidence ke direktori after (memperbarui yang lama)
    const fs = await import("fs/promises");
    const path = await import("path");
    const afterDir = path.join(process.cwd(), "after");
    
    await fs.writeFile(
      path.join(afterDir, "work-snapshot.json"),
      JSON.stringify({
        post_work_count: workCount,
        timestamp: new Date().toISOString(),
        sample_work_anchors: sampleWorkAnchors,
        all_work_ids: allWorkIds
      }, null, 2)
    );

    await fs.writeFile(
      path.join(afterDir, "semantic-state.json"),
      JSON.stringify(semanticState, null, 2)
    );

    console.log(`[W-BETTER-005] Post-state berhasil diperbarui di /phase-1/after/`);
    console.log(`[W-BETTER-005] Total Work ditemukan setelah FACE detachment: ${workCount}`);
    console.log(`[W-BETTER-005] Semua WorkId:`, allWorkIds);
    console.log("[W-BETTER-005] Capture post-state selesai, keluar otomatis");
    process.exit(0);

  } catch (error) {
    console.error("[W-BETTER-005] Gagal capture post-state:", error);
    process.exit(1);
  }
}

capturePostState();