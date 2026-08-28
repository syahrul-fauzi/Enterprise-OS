/**
 * EOS Golden Kernel Invariant Registry
 * Trust Boundary for EOS-FACE-PRODUCTION-001
 * 
 * Semua invariant ini adalah frozen dan tidak dapat diubah tanpa production gate review.
 * Setiap invariant memiliki:
 * - deskripsi yang jelas
 * - owner yang bertanggung jawab
 * - mekanisme enforcement
 * - test yang memverifikasi invariant
 * - failure mode jika invariant dilanggar
 * - production gate yang harus dilewati untuk mengubah
 */

export interface KernelInvariant {
  readonly invariantId: string;
  readonly description: string;
  readonly owner: string;
  readonly enforcement: string;
  readonly test: string;
  readonly failureMode: string;
  readonly productionGate: string;
}

export const GOLDEN_KERNEL_INVARIANTS: readonly KernelInvariant[] = Object.freeze([
  {
    invariantId: "work-identity",
    description: "Setiap Work memiliki UUID/ID yang immutable sejak creation. Work ID tidak pernah berubah selama lifecycle Work.",
    owner: "kernel-engineer",
    enforcement: "Database constraint: work_id adalah primary key pada table works. Tidak ada update query yang memungkinkan perubahan work_id.",
    test: "E2E test: Setelah Work dibuat, refresh page dan verifikasi ID tetap sama. Database query: coba update work_id akan ditolak oleh constraint.",
    failureMode: "Work menjadi tidak dapat ditemukan, link rusak, history terputus, actor tidak dapat melanjutkan pekerjaan.",
    productionGate: "Arch review + 2 senior engineer approval + database migration rollback plan."
  },
  {
    invariantId: "work-persistence",
    description: "Semua state Work selalu persisted ke database sebelum dikembalikan ke client. Tidak ada state yang hanya disimpan di memory client.",
    owner: "kernel-engineer",
    enforcement: "Semua command/transition Work selalu menunggu database commit sebelum mengembalikan 200 OK. Client tidak pernah menyimpan state work di localStorage/sessionStorage kecuali session itu sendiri.",
    test: "Integration test: Kirim command transition, matikan database sebelum commit, verifikasi state tidak berubah di UI. Refresh browser setelah command sukses, verifikasi state tetap ada.",
    failureMode: "Work state hilang setelah refresh, actor melihat state yang berbeda, work tidak dapat dilanjutkan.",
    productionGate: "Runtime test pass + database durability verification."
  },
  {
    invariantId: "current-reality-sync",
    description: "Panel 'Current Reality' di UI selalu merefleksikan actual state Work di database. Tidak pernah ada ketidaksesuaian antara UI claim dan database state.",
    owner: "frontend-engineer + kernel-engineer",
    enforcement: "UI hanya membaca state dari API /api/work/getById, tidak pernah mengubah state secara lokal. Setiap transition selalu refetch data terbaru dari server.",
    test: "E2E test: Buka Work di dua browser berbeda, eksekusi command di satu, verifikasi kedua browser melihat Current Reality yang sama. Reality Fidelity check: 100% UI claims match runtime state.",
    failureMode: "Reality Fidelity turun di bawah 100%, actor salah memahami status Work, mengambil action yang salah.",
    productionGate: "Visual contract verification + reality fidelity audit."
  },
  {
    invariantId: "next-action-atomic",
    description: "Next Action di UI selalu adalah command yang valid dan dapat dieksekusi atomic. Tidak pernah ada Next Action yang tidak dapat diklik atau gagal dieksekusi tanpa alasan yang jelas.",
    owner: "frontend-engineer + capability-engineer",
    enforcement: "Next Action hanya dirender jika command tersedia di capability registry untuk actor yang sedang login. Button selalu dalam state yang jelas (enabled/disabled) dengan feedback yang tepat.",
    test: "UX test: User baru dapat mengidentifikasi dan mengeksekusi Next Action dalam <10 detik. Error state test: Jika session expired, button menampilkan error dengan retry yang jelas.",
    failureMode: "Actor stuck tidak dapat melanjutkan Work, human continuity terputus.",
    productionGate: "Human outcome verification + accessibility audit."
  },
  {
    invariantId: "command-execution-trace",
    description: "Setiap command yang dieksekusi selalu menghasilkan execution trace dengan evidence yang lengkap: actor, timestamp, input, output, state sebelum & sesudah.",
    owner: "kernel-engineer + evidence-engineer",
    enforcement: "Capability command registry selalu menulis execution trace ke invocation_evidence table sebelum command selesai. Semua command harus melalui registry, tidak ada direct state mutation.",
    test: "Audit log test: Setelah eksekusi command, query database dan verifikasi semua field trace terisi. W3C PROV compliance: activity dan agent tercatat dengan benar.",
    failureMode: "Provenance chain terputus, tidak dapat audit siapa yang mengubah Work, tidak dapat debug kegagalan.",
    productionGate: "Evidence chain verification + security audit."
  },
  {
    invariantId: "state-transition-valid",
    description: "Setiap perubahan state Work selalu melalui valid state transition graph. Tidak ada state yang dapat dicapai secara ilegal.",
    owner: "kernel-engineer",
    enforcement: "Workflow transition validator di capability registry selalu memeriksa apakah transition dari state A ke B diizinkan. Database memiliki check constraint pada status work.",
    test: "Invalid transition test: Coba eksekusi command yang menyebabkan illegal state transition, verifikasi ditolak. State graph test: Semua possible state transitions dapat dicapai melalui valid command.",
    failureMode: "Work masuk ke state yang tidak terdefinisi, tidak dapat dilanjutkan.",
    productionGate: "Workflow verification + schema validation."
  },
  {
    invariantId: "activity-timestamp-ordered",
    description: "Semua activity/communication event di Work selalu terurut berdasarkan timestamp ASC. Tidak pernah ada event yang keluar dari urutan waktu.",
    owner: "communication-engineer",
    enforcement: "Query byWorkId selalu menambahkan ORDER BY timestamp ASC. Setiap event selalu mendapatkan timestamp server saat creation, bukan client.",
    test: "Activity timeline test: Tambahkan event baru, verifikasi muncul di akhir timeline. Database query: Semua event by work_id selalu diurutkan timestamp.",
    failureMode: "Actor salah memahami urutan kejadian, context continuity rusak.",
    productionGate: "Timeline verification + UX consistency audit."
  },
  {
    invariantId: "evidence-immutable",
    description: "Setiap evidence yang ditambahkan ke Work tidak dapat diubah atau dihapus. Hanya dapat menambah evidence baru, tidak pernah modify/delete.",
    owner: "evidence-engineer",
    enforcement: "Database table evidence memiliki RLS (Row Level Security) yang hanya mengizinkan insert, tidak update/delete. API tidak memiliki endpoint update/delete evidence.",
    test: "Security test: Coba kirim request update evidence, verifikasi ditolak. Audit test: Semua evidence sejak creation tetap ada di database.",
    failureMode: "Evidence chain dapat dirusak, trust pada Work hilang, tidak dapat membuktikan outcome.",
    productionGate: "Security audit + immutable storage verification."
  },
  {
    invariantId: "actor-handoff-same-work",
    description: "Semua actor yang berpartisipasi dalam Work selalu mengakses Work record yang sama. Tidak ada duplicate Work untuk actor yang berbeda.",
    owner: "kernel-engineer",
    enforcement: "Workspace ID dan Work ID selalu menjadi primary filter untuk semua query. Semua actor membaca dari table works yang sama, hanya difilter oleh permission.",
    test: "Multi-actor test: Customer, Lawyer, Notary membuka Work yang sama, verifikasi semua melihat state yang sama. Cross-tenant test: Actor dari tenant lain tidak dapat mengakses Work.",
    failureMode: "Parallel Work muncul, state divergen, actor bekerja pada Work yang berbeda.",
    productionGate: "Tenant isolation verification + concurrency test."
  },
  {
    invariantId: "refresh-persistence",
    description: "Setelah refresh atau logout-in kembali, semua state Work, activity, dan evidence tetap sama persis. Tidak ada data yang hilang atau berubah.",
    owner: "kernel-engineer + frontend-engineer",
    enforcement: "UI selalu hydrate seluruh data dari API saat mount. Tidak ada caching client-side yang dapat menyebabkan stale state. Semua query selalu membaca dari read replica yang up-to-date.",
    test: "Recovery test: Refresh browser, verifikasi semua state sama. Logout-in test: Actor lain login, verifikasi melihat Work yang sama.",
    failureMode: "Actor melihat stale state, mengambil action yang salah, continuity terputus.",
    productionGate: "Continuity verification + E2E regression test."
  }
]);

export function validateInvariant(invariantId: string): boolean {
  const invariant = GOLDEN_KERNEL_INVARIANTS.find(i => i.invariantId === invariantId);
  return invariant !== undefined;
}

export function getInvariant(invariantId: string): KernelInvariant | undefined {
  return GOLDEN_KERNEL_INVARIANTS.find(i => i.invariantId === invariantId);
}

export function getAllInvariants(): readonly KernelInvariant[] {
  return GOLDEN_KERNEL_INVARIANTS;
}