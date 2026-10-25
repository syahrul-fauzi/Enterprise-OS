import { glob } from "glob";
import { readFile } from "fs/promises";
import { validateBoundaryAccess, validateNoCircularDependencies, DOMAIN_AUTHORITY_OWNERSHIP } from "../contracts/work.contracts.js";

// Architecture Fitness Checks - Tahap B Output
// Dapat dijalankan otomatis di CI/CD untuk memvalidasi compliance boundary
async function runArchitectureFitnessChecks() {
  console.log("🏃 Running EOS Architecture Fitness Checks...\n");
  
  let totalErrors = 0;
  let totalPassed = 0;

  // 1. Cek semua route API untuk memastikan pure adapter pattern dan valid boundary access
  console.log("📝 CHECK 1: Validating API route boundary compliance...");
  const apiRoutes = await glob("**/apps/api/app/api/**/route.ts", { cwd: process.cwd() });
  
  for (const routePath of apiRoutes) {
    try {
      const routeContent = await readFile(routePath, "utf-8");
      
      // Cek apakah route menggunakan capabilityRegistry (pure adapter pattern)
      const usesCapabilityRegistry = routeContent.includes("capabilityRegistry.invokeAsync");
      // Cek apakah route memanggil validateBoundaryAccess
      const usesBoundaryValidation = routeContent.includes("validateBoundaryAccess");
      // Cek apakah route mengandung business logic (bukan pure adapter)
      const containsBusinessLogic = !usesCapabilityRegistry && routeContent.includes("new Work(") || routeContent.includes("db.insert");
      
      if (usesCapabilityRegistry && usesBoundaryValidation) {
        totalPassed++;
        console.log(`✅ PASS: ${routePath} - Pure adapter pattern, boundary validation present`);
      } else {
        totalErrors++;
        console.log(`❌ FAIL: ${routePath}`);
        if (!usesCapabilityRegistry) console.log("   - Missing capabilityRegistry usage (not a pure adapter)");
        if (!usesBoundaryValidation) console.log("   - Missing validateBoundaryAccess call");
        if (containsBusinessLogic) console.log("   - Contains business logic in route (violates pure adapter pattern)");
      }
    } catch (err) {
      console.log(`⚠️  Could not read route: ${routePath}`);
    }
  }

  // 2. Validasi tidak ada circular dependency antar core domains
  console.log("\n📝 CHECK 2: Validating no circular dependencies in core domains...");
  const allDomains = Object.keys(DOMAIN_AUTHORITY_OWNERSHIP);
  const circularCheck = validateNoCircularDependencies(allDomains);
  
  if (circularCheck.valid) {
    totalPassed++;
    console.log("✅ PASS: No circular dependencies detected");
  } else {
    totalErrors++;
    console.log("❌ FAIL: Circular dependencies detected");
    circularCheck.errors.forEach(err => console.log(`   - ${err}`));
  }

  // 3. Validasi "Workspace is not identity/authority" invariant di semua file
  console.log("\n📝 CHECK 3: Validating 'Workspace is not identity/authority' invariant...");
  const allTsFiles = await glob("**/*.ts", { 
    cwd: process.cwd(),
    ignore: ["**/node_modules/**", "**/dist/**"]
  });
  
  let workspaceInIdentityViolations = 0;
  const violatingFiles: string[] = [];
  // Ignore script ini sendiri agar tidak terdeteksi sebagai false positive
  for (const filePath of allTsFiles) {
    if (filePath.includes("architecture-fitness-checks.ts")) continue;
    
    try {
      const content = await readFile(filePath, "utf-8");
      // Cek apakah file mendefinisikan IdentityBoundary DENGAN workspaceId di dalam interface
      const identityBoundaryWithWorkspace = /interface\s+IdentityBoundary\s*\{[^}]*workspaceId\s*:?/s.test(content);
      // Atau apakah ada kode yang menambahkan workspaceId ke IdentityBoundary object
      const assignWorkspaceToIdentity = /identityBoundary\s*:\s*IdentityBoundary\s*=\s*\{[^}]*workspaceId\s*:/s.test(content);
      
      if (identityBoundaryWithWorkspace || assignWorkspaceToIdentity) {
        workspaceInIdentityViolations++;
        violatingFiles.push(filePath);
      }
    } catch (err) {
      // Skip unreadable files
    }
  }
  
  if (workspaceInIdentityViolations === 0) {
    totalPassed++;
    console.log("✅ PASS: 'Workspace is not identity' invariant enforced everywhere");
  } else {
    totalErrors += workspaceInIdentityViolations;
    console.log(`❌ FAIL: Found ${workspaceInIdentityViolations} files with workspaceId in IdentityBoundary`);
    violatingFiles.forEach(file => console.log(`   - ${file}`));
  }

  // Ringkasan akhir
  console.log("\n" + "=".repeat(50));
  console.log(`🏁 ARCHITECTURE FITNESS CHECKS COMPLETE`);
  console.log(`✅ PASSED: ${totalPassed} checks`);
  console.log(`❌ FAILED: ${totalErrors} checks`);
  console.log("=".repeat(50));

  if (totalErrors > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runArchitectureFitnessChecks().catch(err => {
  console.error("Fatal error running checks:", err);
  process.exit(1);
});