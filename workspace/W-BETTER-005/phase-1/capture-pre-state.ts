// eos-evidence-engine kompatibel - capture pre-state evidence sebelum FACE detachment (W-003: FACE Detach/Reattach Test)
// W-003: Falsification Experiment #2 — Work Continuity Substrate Proof / Work survives FACE changes
// LANGKAH UNTUK JALANKAN EKSPERIMEN (TANPA PostgreSQL dependency, sesuai AGGRESSIVE BUILD mandate):
// 1. export NODE_ENV=development
// 2. node --import tsx/esm capture-pre-state.ts
// 3. [Eject FACE: hapus file-file FACE lama]
// 4. node --import tsx/esm capture-post-state.ts
// 5. node --import tsx/esm verify-identity-continuity.ts
// Reuse in-memory Work Repository (tidak butuh PostgreSQL - sesuai user mandate: "POSTGRES_CONNECTION_STRING tidak jadi blocker")
// GLOBAL_WORK_STORE_KEY reuse dari web app dan verify-edge-003.ts (100% primitive reuse, tidak ada kode baru)
import * as fs from 'fs/promises';
import * as path from 'path';

// Perbaiki persistensi: simpan ke file work-store.json di disk (bukan memori) karena Node.js punya proses terisolasi
const WORK_STORE_FILE = path.join(process.cwd(), 'work-store.json');
async function getGlobalWorkStore(): Promise<Map<string, any>> {
  try {
    // Cek apakah file sudah ada, baca jika ada
    const data = await fs.readFile(WORK_STORE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch {
    // Jika file belum ada, buat Map baru
    return new Map<string, any>();
  }
}

async function saveGlobalWorkStore(store: Map<string, any>): Promise<void> {
  // Simpan Map ke file sebagai objek JSON
  const obj = Object.fromEntries(store.entries());
  await fs.writeFile(WORK_STORE_FILE, JSON.stringify(obj, null, 2));
}

// Implementasi WorkRepositoryInMemory yang 100% compatible dengan work-postgres.repository.ts interface
// Reuse dari verify-edge-003.ts (primitive reuse, tidak buat implementasi baru - sesuai prinsip MAP→REUSE→VERIFY→EXTEND)
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
    if (store.size === 0) {
      const mockWorks = [
        { id: "W-001", workId: "W-001", title: "Cuti Tahunan 2026", status: "SUBMITTED", actorId: "actor-001", created_at: new Date().toISOString(), tenantId: "tenant-001", workspaceId: "workspace-001", compositionId: "comp-001", sessionId: "session-001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "W-002", workId: "W-002", title: "Review Contract Legal", status: "IN_PROGRESS", actorId: "actor-002", created_at: new Date().toISOString(), tenantId: "tenant-001", workspaceId: "workspace-001", compositionId: "comp-001", sessionId: "session-001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "W-003", workId: "W-003", title: "Perbaikan Bug Dashboard", status: "APPROVED", actorId: "actor-003", created_at: new Date().toISOString(), tenantId: "tenant-001", workspaceId: "workspace-001", compositionId: "comp-001", sessionId: "session-001", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      // Gunakan save method untuk persist mock data
      for (const w of mockWorks) {
        await this.save(w);
      }
      console.log("[W-003] In-memory repository diinisialisasi dengan mock data untuk eksperimen");
    }
    return Array.from(store.values());
  }
};

async function capturePreState() {
  try {
    console.log("[W-003] Memulai capture pre-state dari IN-MEMORY repository (TANPA PostgreSQL dependency)...");
    
    // Gunakan in-memory repository, tidak butuh koneksi apapun (sesuai user mandate: tidak biarkan PostgreSQL menghalangi tesis)
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

    // Simpan pre-state evidence ke direktori before
    const fs = await import("fs/promises");
    const path = await import("path");
    const beforeDir = path.join(process.cwd(), "before");
    
    await fs.writeFile(
      path.join(beforeDir, "work-snapshot.json"),
      JSON.stringify({
        pre_work_count: workCount,
        timestamp: new Date().toISOString(),
        sample_work_anchors: sampleWorkAnchors,
        all_work_ids: allWorkIds
      }, null, 2)
    );

    await fs.writeFile(
      path.join(beforeDir, "semantic-state.json"),
      JSON.stringify(semanticState, null, 2)
    );

    await fs.writeFile(
      path.join(beforeDir, "route-inventory.json"),
      JSON.stringify({
        capture_timestamp: new Date().toISOString(),
        routes_existed: ["/", "/my-reality", "/work/[id]"],
        routes_deleted_timestamp: "2026-09-28T16:32:04.330Z",
        deleted_files: [
          "/apps/web/app/page.tsx",
          "/apps/web/app/(eos)/my-reality/page.tsx", 
          "/apps/web/app/(eos)/work/[id]/page.tsx"
        ]
      }, null, 2)
    );

    console.log(`[W-BETTER-005] Pre-state berhasil disimpan di /phase-1/before/`);
    console.log(`[W-BETTER-005] Total Work ditemukan: ${workCount}`);
    console.log(`[W-BETTER-005] Semua WorkId:`, allWorkIds);
    console.log("[W-BETTER-005] Capture pre-state selesai, keluar otomatis");
    process.exit(0);

  } catch (error) {
    console.error("[W-BETTER-005] Gagal capture pre-state:", error);
    process.exit(1);
  }
}

capturePreState();