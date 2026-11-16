import { ExecutionContext } from '../../workspace/packages/core/runtime/dist/src/execution-context.js';
import { AuditLogIsolationContinuityService } from '../../workspace/packages/core/runtime/dist/src/audit-log-isolation-continuity.js';

async function executeW242() {
  console.log('=== W242 Execution: Audit Log Isolation Continuity ===');
  
  const context = new ExecutionContext({
    actorId: 'test-executor',
    workItemId: 'W242-EXECUTION-001',
    tenantId: 'test-tenant'
  });
  
  const service = new AuditLogIsolationContinuityService();
  
  console.log('\n1. Testing createAuditLogIsolationSession...');
  const session = await service.createAuditLogIsolationSession(
    context,
    'test-tenant',
    'audit-context-001',
    'log-stream-001',
    '90d-retention'
  );
  console.log('✓ Session created:', session.sessionId);
  
  console.log('\n2. Testing suspendAuditLogIsolationSession...');
  const suspendResult = await service.suspendAuditLogIsolationSession(
    context,
    session.sessionId,
    'Maintenance window'
  );
  console.log('✓ Session suspended:', suspendResult.suspended);
  
  console.log('\n3. Testing resumeAuditLogIsolationSession...');
  const resumedSession = await service.resumeAuditLogIsolationSession(
    context,
    session.sessionId
  );
  console.log('✓ Session resumed:', resumedSession.status);
  
  console.log('\n4. Testing verifyAuditLogIsolationContinuity...');
  const verifyResult = await service.verifyAuditLogIsolationContinuity(
    context,
    resumedSession.sessionId
  );
  console.log('✓ Continuity verified:', verifyResult.valid, 'Checks:', verifyResult.checks.length);
  
  console.log('\n5. Checking invocation evidence chain...');
  console.log('✓ Evidence entries:', context.invocationEvidence.length);
  context.invocationEvidence.forEach((ev, i) => {
    console.log(`  [${i}] ${ev.operation}`);
  });
  
  console.log('\n=== W242 Execution COMPLETE ===');
  return { success: true, evidenceCount: context.invocationEvidence.length };
}

executeW242().catch(err => {
  console.error('W242 Execution FAILED:', err);
  process.exit(1);
});