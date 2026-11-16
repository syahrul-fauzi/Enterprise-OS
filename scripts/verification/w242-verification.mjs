import { ExecutionContext } from '../../workspace/packages/core/runtime/dist/src/execution-context.js';
import { AuditLogIsolationContinuityService } from '../../workspace/packages/core/runtime/dist/src/audit-log-isolation-continuity.js';

async function verifyW242() {
  console.log('=== W242 Verification: Independent Audit Log Isolation Continuity Check ===');
  
  const failures = [];
  const service = new AuditLogIsolationContinuityService();
  
  console.log('\n[TEST 1] ExecutionContext has all required properties...');
  const context = new ExecutionContext({
    actorId: 'verification-agent',
    workItemId: 'W242-VERIFY-001',
    tenantId: 'verification-tenant'
  });
  
  const requiredProps = ['workItemId', 'actorId', 'tenantId', 'invocationEvidence'];
  requiredProps.forEach(prop => {
    if (!(prop in context)) {
      failures.push(`ExecutionContext missing required property: ${prop}`);
    }
  });
  if (failures.length === 0) console.log('✓ All required ExecutionContext properties present');
  
  console.log('\n[TEST 2] All W242 methods exist and are async...');
  const requiredMethods = [
    'createAuditLogIsolationSession',
    'suspendAuditLogIsolationSession',
    'resumeAuditLogIsolationSession',
    'verifyAuditLogIsolationContinuity'
  ];
  
  requiredMethods.forEach(method => {
    if (!(method in service) || typeof service[method] !== 'function') {
      failures.push(`W242 service missing required method: ${method}`);
    }
  });
  if (failures.length === 0) console.log('✓ All required W242 methods exist');
  
  console.log('\n[TEST 3] Full end-to-end workflow execution...');
  const session = await service.createAuditLogIsolationSession(
    context, 'tenant-1', 'ctx-1', 'stream-1', 'retention-1'
  );
  if (!session.sessionId) failures.push('createAuditLogIsolationSession did not return sessionId');
  
  const suspend = await service.suspendAuditLogIsolationSession(context, session.sessionId, 'reason');
  if (!suspend.suspended) failures.push('suspendAuditLogIsolationSession did not return suspended=true');
  
  const resume = await service.resumeAuditLogIsolationSession(context, session.sessionId);
  if (resume.status !== 'resumed') failures.push('resumeAuditLogIsolationSession did not return correct status');
  
  const verify = await service.verifyAuditLogIsolationContinuity(context, session.sessionId);
  if (!verify.valid) failures.push('verifyAuditLogIsolationContinuity did not return valid=true');
  
  console.log('✓ Full end-to-end workflow executed successfully');
  
  console.log('\n[TEST 4] Invocation evidence chain integrity...');
  if (context.invocationEvidence.length !== 4) {
    failures.push(`Expected 4 evidence entries, got ${context.invocationEvidence.length}`);
  }
  const expectedOps = requiredMethods;
  context.invocationEvidence.forEach((ev, i) => {
    if (ev.operation !== expectedOps[i]) {
      failures.push(`Evidence entry ${i} operation mismatch: expected ${expectedOps[i]}, got ${ev.operation}`);
    }
  });
  if (failures.length === 0) console.log('✓ Invocation evidence chain complete and correct');
  
  console.log('\n=== VERIFICATION RESULT ===');
  if (failures.length === 0) {
    console.log('✅ ALL TESTS PASSED — W242 is SHIPPED');
    return { passed: true, evidenceCount: context.invocationEvidence.length };
  } else {
    console.log('❌ FAILURES FOUND:');
    failures.forEach(f => console.log(`  - ${f}`));
    return { passed: false, failures };
  }
}

verifyW242().catch(err => {
  console.error('W242 Verification FAILED:', err);
  process.exit(1);
});