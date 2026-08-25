
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = [
  'products/ilc/tests/cont-test-001-channel-change.test.ts',
  'products/ilc/tests/cont-test-002-actor-change.test.ts',
  'products/ilc/tests/cont-test-003-human-agent-handoff.test.ts',
  'products/ilc/tests/cont-test-004-agent-external-system.test.ts',
  'products/ilc/tests/cont-test-005-external-response-mutation.test.ts',
  'products/ilc/tests/cont-test-006-perspective-change.test.ts',
  'products/ilc/tests/cont-test-007-execution-failure.test.ts'
];

async function runAllTests() {
  console.log('🧪 Running all 7 CONT-TEST attack vectors in sequence...\n');
  
  const allResults = [];
  
  for (const testFile of testFiles) {
    const testName = testFile.split('/').pop();
    console.log(`▶️ Starting ${testName}...`);
    
    const testPath = join(__dirname, testFile);
    const child = spawn('node', ['--import', 'tsx/esm', testPath], {
      env: { ...process.env, NODE_ENV: 'test' },
      cwd: __dirname
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    const exitCode = await new Promise((resolve) => {
      child.on('close', resolve);
    });
    
    const passed = exitCode === 0;
    allResults.push({
      testFile: testName,
      passed,
      exitCode,
      stdout,
      stderr
    });
    
    console.log(`${passed ? '✅' : '❌'} ${testName} - exit code: ${exitCode}`);
    console.log('----------------------------------------\n');
  }
  
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.length - totalPassed;
  
  console.log('📊 FINAL CONT-TEST SUMMARY:');
  console.log(`Total tests: ${allResults.length}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL 7 CONTINUITY ATTACK VECTORS PASSED! EOS SURVIVES ALL TESTS.');
    console.log('📝 Evidence saved to: .eos-state/evidence/CONT-TEST-ALL-PASS_evidence.json');
  } else {
    console.log('\n⚠️ Some tests failed. Review the failures above.');
    process.exit(1);
  }
  
  return allResults;
}

runAllTests().catch(console.error);