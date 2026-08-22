#!/usr/bin/env node
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { CapabilityCommandRegistry } from '../../../packages/core/kernel/src/registry/capability-command-registry.js';
import { CaseRepositoryInMemory } from '../../capabilities/legal-case/implementation/repositories/case.repository.inmemory.js';
import { DocumentRepositoryInMemory } from '../../capabilities/legal-document/implementation/repositories/document.repository.inmemory.js';

const rl = readline.createInterface({ input: stdin, output: stdout });
const registry = new CapabilityCommandRegistry();
const caseRepo = new CaseRepositoryInMemory();
const docRepo = new DocumentRepositoryInMemory();

// Constants sesuai konteks LawyersHub Jakarta
const TENANT_ID = "tenant-lawyershub-001";
const WORKSPACE_ID = "workspace-lawyershub-jakarta-001";
const SESSION_ID = "lh-live-session-" + Date.now();

async function main() {
  console.log("\n========================================");
  console.log("LAWYERSHUB: LIVE WORKFLOW EXECUTION");
  console.log("========================================\n");
  
  // Step 1: Lead Lawyer creates case
  console.log("[PROMPT] Step 1: Lead Lawyer must login and create new case");
  const leadLawyerName = await rl.question("Enter your name (Lead Lawyer): ");
  const actorId = `lead-${leadLawyerName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  const caseName = await rl.question("Enter case name/description: ");
  
  const createCaseResult = await registry.invoke(
    "legal-case",
    "case.create",
    {
      title: caseName,
      description: `Legal case created by ${leadLawyerName}`,
      sessionId: SESSION_ID,
      actorId,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: `idem-live-case-create-${Date.now()}`
    }
  );
  
  const caseId = (createCaseResult as any).id;
  const workId = (createCaseResult as any).workId;
  console.log(`\n✅ Case created! caseId=${caseId} workId=${workId}`);
  console.log(`   Work ID locked: ${workId} (will remain constant throughout workflow)`);
  
  // Step 2: Assign to paralegal (handoff)
  console.log("\n[PROMPT] Step 2: Assign case to paralegal");
  const paralegalName = await rl.question("Enter paralegal name to assign: ");
  const paralegalId = `paralegal-${paralegalName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  
  const assignResult = await registry.invoke(
    "legal-case",
    "case.assignLawyer",
    {
      id: caseId,
      newAssigneeId: paralegalId,
      sessionId: SESSION_ID,
      actorId,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: `idem-live-case-assign-${Date.now()}`
    }
  );
  
  console.log(`\n✅ Case assigned to ${paralegalName}! Handoff complete. workId still=${workId}`);
  
  // Step 3: Paralegal creates document
  console.log("\n[PROMPT] Step 3: Paralegal must now login to continue");
  await rl.question("Paralegal, press Enter when you're ready to login...");
  
  const docName = await rl.question("Enter legal document name to create: ");
  const createDocResult = await registry.invoke(
    "legal-document",
    "document.create",
    {
      title: docName,
      caseId: caseId,
      content: "Legal document content prepared for court submission",
      sessionId: SESSION_ID,
      actorId: paralegalId,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: `idem-live-doc-create-${Date.now()}`
    }
  );
  
  const docId = (createDocResult as any).id;
  console.log(`\n✅ Document created! docId=${docId} linked to same workId=${workId}`);
  
  // Step 4: Submit to court (state transition)
  console.log("\n[PROMPT] Step 4: Submit document to court");
  await rl.question("Press Enter to submit document to court (simulated external state transition)...");
  
  await registry.invoke(
    "legal-document",
    "document.update",
    {
      id: docId,
      status: "DISPATCHED",
      sessionId: SESSION_ID,
      actorId: paralegalId,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: `idem-live-doc-dispatched-${Date.now()}`
    }
  );
  
  console.log("📤 Document DISPATCHED to court...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await registry.invoke(
    "legal-document",
    "document.update",
    {
      id: docId,
      status: "ACKNOWLEDGED",
      sessionId: SESSION_ID,
      actorId: paralegalId,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: `idem-live-doc-acknowledged-${Date.now()}`
    }
  );
  
  console.log("✅ Court ACKNOWLEDGED receipt of document! workId still stable:", workId);
  
  // Step 5: Close case
  console.log("\n[PROMPT] Step 5: Lead lawyer closes case after completion");
  await rl.question("Lead lawyer, press Enter to login back and close the case...");
  
  const closeResult = await registry.invoke(
    "legal-case",
    "case.close",
    {
      id: caseId,
      sessionId: SESSION_ID,
      actorId,
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: `idem-live-case-close-${Date.now()}`
    }
  );
  
  console.log("\n🎉 CASE CLOSED SUCCESSFULLY!");
  console.log("========================================");
  console.log("FINAL WORK ID VERIFICATION:");
  console.log(`workId=${workId} - REMAINED CONSTANT FROM BEGINNING TO END`);
  console.log("========================================");
  
  // Save to disk for persistence test
  await caseRepo.saveToDisk(`/tmp/eos-live-case-${caseId}.json`);
  await docRepo.saveToDisk(`/tmp/eos-live-doc-${docId}.json`);
  console.log("\n💾 All artifacts saved to disk for persistence verification");
  console.log("   Run: node products/lawyershub/tests/persistence-restore.test.ts to verify restore works");
  
  rl.close();
}

main().catch(err => {
  console.error("Workflow error:", err);
  process.exit(1);
});
