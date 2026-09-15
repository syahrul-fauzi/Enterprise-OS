// Reuse existing Work Repository primitive (100% primitive reuse, no new code)
import { getWorkRepositoryPostgres } from "/root/Enterprise-OS/workspace/capabilities/work-core/implementation/repository/work-postgres.repository.ts";

async function main() {
  console.log("✅ Connected to database via existing work repository. Mengecek jumlah work yang ada sebelum test...");
  const workRepository = getWorkRepositoryPostgres();
  const allWorks = await workRepository.list();
  const workCount = allWorks.length;
  console.log(`📊 PRE-TEST: Total work di database = ${workCount}`);
  console.log(`📝 Work list preview: ${allWorks.slice(-5).map(w => w.id).join(", ")}`);
  process.exit(0);
}

main().catch(async (e) => {
  console.error("❌ Database error:", e);
  process.exit(1);
});