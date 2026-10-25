// Script sederhana untuk memeriksa method di ServiceRequestRepositoryInMemory
// Jalanin dengan node workspace/capabilities/api-platform/implementation/commands/index.ts untuk melihat log
import { ServiceRequestRepositoryInMemory } from './workspace/capabilities/service-directory/implementation/repository/service.repository.js';

console.log("=== TEST REPOSITORY METHODS ===\n");
console.log("ServiceRequestRepositoryInMemory:", ServiceRequestRepositoryInMemory);
console.log("\nObject.keys():", Object.keys(ServiceRequestRepositoryInMemory));
console.log("\nHas 'update'?", 'update' in ServiceRequestRepositoryInMemory);
console.log("Has 'byExternalId'?", 'byExternalId' in ServiceRequestRepositoryInMemory);
console.log("Has 'delete'?", 'delete' in ServiceRequestRepositoryInMemory);
console.log("Has 'save'?", 'save' in ServiceRequestRepositoryInMemory);