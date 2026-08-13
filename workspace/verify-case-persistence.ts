
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });
process.env.DATABASE_URL = 'postgresql://eos_user:eos_password@localhost:5432/eos_identity';
console.log('DATABASE_URL set to:', process.env.DATABASE_URL);

import { initIdentitySchema } from './capabilities/identity/implementation/repositories/base.repository';
import { CaseRepositoryPostgres } from './capabilities/legal-case/implementation/repository/case-postgres.repository';
import { identityCommands } from './capabilities/identity/implementation/commands';

async function main() {
  console.log("\n🔍 BATTLE-1B PERSISTENCE VERIFICATION: CHECK REAL CASES IN POSTGRESQL\n");
  
  // Initialize database connection
  await initIdentitySchema();
  
  // Query all cases from PostgreSQL
  const allCases = await CaseRepositoryPostgres.list();
  console.log(`\n📊 Total cases in PostgreSQL: ${allCases.length}`);
  
  if (allCases.length > 0) {
    console.log("\n📋 Case details from PostgreSQL:");
    allCases.forEach((c, i) => {
      console.log(`\n[Case ${i+1}]`);
      console.log(`  ID: ${c.id}`);
      console.log(`  Tenant ID: ${(c as any).tenantId}`);
      console.log(`  Workspace ID: ${(c as any).workspaceId}`);
      console.log(`  Title: ${c.title}`);
      console.log(`  Created At: ${c.createdAt}`);
    });
  } else {
    console.log("\n❌ No cases found in PostgreSQL. Creating a test case to verify persistence...");
    
    // Create a REAL test case via the actual API/command flow to verify persistence works
    const timestamp = Date.now();
    const userEmail = `test-lawyer-${timestamp}@example.test`;
    const userPassword = "TestPass123!";
    const userDisplayName = "Test Lawyer Verification";
    
    // Signup a real user to get valid session/tenant/workspace
    console.log("\n👤 Creating test user...");
    const signupResult = await identityCommands["identity.signupAndCreateSession"].execute({
      email: userEmail,
      password: userPassword,
      displayName: userDisplayName,
    }) as any;
    
    console.log("\n✅ User created with:");
    console.log(`  Session ID: ${signupResult.response.sessionId}`);
    console.log(`  Tenant ID: ${signupResult.response.tenantId}`);
    console.log(`  Workspace ID: ${signupResult.response.workspaceId}`);
    console.log(`  Actor ID: ${signupResult.response.userId}`);
    
    // Now create a real case using the actual create-case command
    const { caseCommands } = await import('./capabilities/legal-case/implementation/commands/case.commands');
    console.log("\n⚖️  Creating test legal case via create-case command...");
    
    const createCaseResult = await caseCommands["case.create"].execute({
      title: "Verification Test Case - Real PostgreSQL Record",
      description: "This case was created to verify BATTLE-1B persistence requirements",
      priority: "high",
      // Session context required for tenant isolation
      sessionId: signupResult.response.sessionId,
      tenantId: signupResult.response.tenantId,
      workspaceId: signupResult.response.workspaceId,
      actorId: signupResult.response.userId,
    });
    
    console.log("\n✅ Case created successfully via command:");
    console.log(`  Case ID (from response): ${createCaseResult.id}`);
    
    // Now query PostgreSQL directly to verify it exists
    const persistedCase = await CaseRepositoryPostgres.byId(createCaseResult.id);
    if (persistedCase) {
      console.log("\n🎯 PERSISTENCE VERIFIED: Case EXISTS in PostgreSQL!");
      console.log(`  PostgreSQL Case ID: ${persistedCase.id}`);
      console.log(`  PostgreSQL Tenant ID: ${(persistedCase as any).tenantId}`);
      console.log(`  PostgreSQL Workspace ID: ${(persistedCase as any).workspaceId}`);
      console.log(`  Match between response.id and PostgreSQL id: ${createCaseResult.id === persistedCase.id ? 'PASS' : 'FAIL'}`);
    } else {
      console.log("\n❌ PERSISTENCE FAILED: Case NOT found in PostgreSQL after creation!");
    }
  }
  
  // Check specifically for any case-fallback-* IDs in PostgreSQL (should NEVER exist)
  const allCasesAfter = await CaseRepositoryPostgres.list();
  const fallbackIdsInDb = allCasesAfter.filter(c => c.id.startsWith('case-fallback-'));
  console.log(`\n🔍 Fallback IDs in PostgreSQL: ${fallbackIdsInDb.length}`);
  if (fallbackIdsInDb.length > 0) {
    console.log("⚠️  WARNING: Fallback IDs found in database - this indicates persistence failure!");
  } else {
    console.log("✅ No fallback IDs found in database - only real case-XXX IDs are persisted");
  }
}

main().catch(err => {
  console.error("\n💥 Verification failed:", err);
  process.exit(1);
});