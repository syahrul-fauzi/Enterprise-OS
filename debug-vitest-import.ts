// Debug khusus untuk memahami mengapa vitest tidak bisa mengakses fungsi singleton
import * as membershipModule from './workspace/capabilities/identity/implementation/repositories/membership.inmemory';
import * as workModule from './workspace/capabilities/work-core/implementation/repository/work-inmemory.repository';

console.log("=== membership.inmemory exports ===");
console.log("All keys:", Object.keys(membershipModule));
console.log("typeof getMembership:", typeof membershipModule.getMembershipRepositoryInMemory);
console.log("membershipModule:", membershipModule);

console.log("\n=== work-inmemory.repository exports ===");
console.log("All keys:", Object.keys(workModule));
console.log("typeof getWork:", typeof workModule.getWorkRepositoryInMemory);
console.log("workModule:", workModule);