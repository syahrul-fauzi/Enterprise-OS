// Test sederhana untuk verifikasi factory function (ES module)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const modulePath = './capabilities/work-core/implementation/repository/work-inmemory.repository.ts';
try {
  // Gunakan ts-node untuk load TypeScript file langsung
  const { getWorkRepositoryInMemory } = await import('ts-node/esm');
  const { getWorkRepositoryInMemory: factory } = await import(modulePath);
  console.log("getWorkRepositoryInMemory:", typeof factory);
  const repo = factory();
  console.log("Repository instance created successfully:", repo);
  console.log("✅ Test works! Factory function berjalan dengan benar.");
} catch (e) {
  console.error("❌ Error creating repository:", e);
  console.error(e.stack);
  // Coba import dari index.ts work-core (canonical entry point)
  try {
    const { getWorkRepositoryInMemory } = await import('./capabilities/work-core/index.ts');
    console.log("\n✅ Import dari index.ts berhasil! getWorkRepositoryInMemory:", typeof getWorkRepositoryInMemory);
    const repo2 = getWorkRepositoryInMemory();
    console.log("Repository instance dari index.ts created successfully:", repo2);
  } catch (e2) {
    console.error("\n❌ Import dari index.ts juga gagal:", e2);
    console.error(e2.stack);
  }
}