// Test sederhana tanpa masalah module
import { getWorkRepositoryInMemory } from './capabilities/work-core/implementation/repository/work-inmemory.repository.ts';
console.log("✅ getWorkRepositoryInMemory type:", typeof getWorkRepositoryInMemory);
const repo = getWorkRepositoryInMemory();
console.log("✅ Repository instance created!");
console.log("✅ Semua berjalan dengan benar!");