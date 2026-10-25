/**
 * AUDIT-001-006 G4: Dependency Failure Propagation Test
 * Verifies that chain failures cause process.exit(1) (fail-fast behavior)
 * Does NOT modify source code - only tests existing runtime behavior
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Ensure evidence directory exists
const evidenceDir = '/root/Enterprise-OS/.eos-state/audit';
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function runFailureTest() {
  console.log('🔍 AUDIT-001-006 G4: Starting dependency failure propagation test...');
  
  // Create a test script that will be executed in a child process
  // We'll use a modified call that simulates a dependency failure
  const testScript = path.join(__dirname, 'temp-failure-test.js');
  
  const testCode = `
  // Temporary test for fail-fast behavior
  const { getGlobalCapabilityRegistry } = require('./implementation/services/capability-resolver.service');
  
  // Monkeypatch one of the core registration functions to throw an error
  // This simulates a dependency failure during chain execution
  const originalRegister = require('./capabilities/work-core/implementation/commands/work.commands').registerWorkCoreCapability;
  
  require('./capabilities/work-core/implementation/commands/work.commands').registerWorkCoreCapability = async function() {
    console.error('[SIMULATED FAILURE] Work-Core registration failed intentionally for G4 test');
    throw new Error('SIMULATED_DEPENDENCY_FAILURE: Work-Core could not be registered');
  };
  
  // Attempt to initialize registry - this should trigger fail-fast and exit
  getGlobalCapabilityRegistry().catch(err => {
    console.error('Caught error (this should not happen if fail-fast works correctly):', err);
    process.exit(2);
  });
  `;
  
  fs.writeFileSync(testScript, testCode);
  
  // Run the test in a separate process
  return new Promise((resolve) => {
    const child = spawn('node', ['--import', 'tsx', testScript], {
      cwd: __dirname,
      stdio: 'pipe'
    });
    
    const logs: string[] = [];
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      logs.push(output);
      console.log(output);
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      logs.push(output);
      console.error(output);
    });
    
    child.on('close', (code) => {
      console.log(`\n📊 Child process exited with code: ${code}`);
      
      // Clean up temp file
      fs.unlinkSync(testScript);
      
      const g4Passed = code === 1; // Fail-fast should exit with code 1
      
      const evidence = {
        work_id: "AUDIT-001-006",
        gate: "G4",
        status: g4Passed ? "PASS" : "FAIL",
        tested_at: new Date().toISOString(),
        fail_fast_observed: g4Passed,
        exit_code: code,
        expected_exit_code: 1,
        logs: logs.join(''),
        log_source: "/root/Enterprise-OS/.eos-state/chain-verification-audit001006-g4.log"
      };
      
      // Write evidence
      fs.writeFileSync(
        path.join(evidenceDir, 'AUDIT-001-006_G4_evidence.json'),
        JSON.stringify(evidence, null, 2)
      );
      
      // Write logs
      fs.writeFileSync(
        '/root/Enterprise-OS/.eos-state/chain-verification-audit001006-g4.log',
        logs.join('')
      );
      
      console.log(`📝 G4 evidence recorded: ${g4Passed ? '✅ PASS' : '❌ FAIL'}`);
      resolve(evidence);
    });
  });
}

runFailureTest().then(evidence => {
  console.log('\n✅ G4 test completed');
  process.exit(evidence.status === 'PASS' ? 0 : 1);
}).catch(err => {
  console.error('❌ G4 test failed with error:', err);
  process.exit(1);
});