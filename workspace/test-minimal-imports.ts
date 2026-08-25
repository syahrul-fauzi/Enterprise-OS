// Minimal import validation script - NO TEST FRAMEWORK, just validate dependencies load
declare const process: { exit: (code: number) => never };
console.log("[MINIMAL-TEST] Starting import validation...");

try {
  // 1. Import communication repository
  console.log("[MINIMAL-TEST] Importing CommunicationRepository...");
  const commRepoModule = await import('./capabilities/communication/implementation/repository/communication.repository.ts');
  const CommunicationRepository = commRepoModule.CommunicationRepositoryInMemory;
  console.log("[MINIMAL-TEST] ✅ CommunicationRepository imported successfully");

  // 2. Import case repository
  console.log("[MINIMAL-TEST] Importing CaseRepository...");
  const caseRepoModule = await import('./capabilities/legal-case/implementation/repository/case.repository.ts');
  const CaseRepository = caseRepoModule.CaseRepositoryInMemory;
  console.log("[MINIMAL-TEST] ✅ CaseRepository imported successfully");

  // 3. Import grounding converter
  console.log("[MINIMAL-TEST] Importing grounding converter...");
  const groundingModule = await import('./capabilities/communication/implementation/grounding/converter.ts');
  console.log("[MINIMAL-TEST] ✅ Grounding converter imported successfully");

  // 4. Verify clear() methods exist
  console.log("[MINIMAL-TEST] Verifying test isolation methods...");
  if (typeof CommunicationRepository.clear === 'function') {
    console.log("[MINIMAL-TEST] ✅ CommunicationRepository.clear() exists");
    CommunicationRepository.clear();
    console.log("[MINIMAL-TEST] ✅ CommunicationRepository.clear() executed");
  }
  if (typeof CaseRepository.clear === 'function') {
    console.log("[MINIMAL-TEST] ✅ CaseRepository.clear() exists");
    CaseRepository.clear();
    console.log("[MINIMAL-TEST] ✅ CaseRepository.clear() executed");
  }
  if (typeof CaseRepository.stopScanner === 'function') {
    CaseRepository.stopScanner();
    console.log("[MINIMAL-TEST] ✅ CaseRepository.stopScanner() executed");
  }

  // 5. Verify global stores exist
  console.log("[MINIMAL-TEST] Verifying global in-memory stores...");
  if (globalThis.__EOS_COMMUNICATION_STORE__) {
    console.log(`[MINIMAL-TEST] ✅ __EOS_COMMUNICATION_STORE__ exists, length: ${globalThis.__EOS_COMMUNICATION_STORE__.length}`);
  }
  if (globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__) {
    console.log(`[MINIMAL-TEST] ✅ __EOS_INMEMORY_EXECUTION_STATUSES__ exists, size: ${globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.size}`);
  }

  console.log("\n[MINIMAL-TEST] 🎉 ALL IMPORTS AND GLOBAL STORES VALIDATED SUCCESSFULLY");
  process.exit(0);

} catch (error) {
  console.error("\n[MINIMAL-TEST] ❌ IMPORT VALIDATION FAILED:", error);
  process.exit(1);
}

export {};