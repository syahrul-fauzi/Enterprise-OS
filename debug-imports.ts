// Debug script untuk memeriksa export membership.inmemory.ts dengan tsx
import('./workspace/capabilities/identity/implementation/repositories/membership.inmemory')
  .then((module) => {
    console.log("✅ Import berhasil! Semua export yang tersedia:");
    console.log(Object.keys(module));
    console.log("\nDetail fungsi:");
    console.log("getMembershipRepositoryInMemory adalah function?", typeof module.getMembershipRepositoryInMemory === 'function');
    console.log("resetMembershipRepositoryInMemory adalah function?", typeof module.resetMembershipRepositoryInMemory === 'function');
    console.log("MembershipRepositoryInMemory adalah class?", typeof module.MembershipRepositoryInMemory === 'function');
  })
  .catch((err) => {
    console.error("❌ Error saat import:", err);
  });