import { spawn } from 'child_process';

async function runAllTests() {
  console.log('=== Running All BusinessOS Tests ===\n');
  
  console.log('--- Gate 2 Tests ---');
  const gate2 = spawn('node', ['dist/run-test.js'], { stdio: 'inherit' });
  await new Promise((resolve) => gate2.on('close', resolve));
  
  console.log('\n--- Gate 8 Tests ---');
  const gate8 = spawn('node', ['dist/run-gate8-test.js'], { stdio: 'inherit' });
  await new Promise((resolve) => gate8.on('close', resolve));
  
  console.log('\n--- Gate 9 Tests ---');
  const gate9 = spawn('node', ['dist/run-gate9-test.js'], { stdio: 'inherit' });
  await new Promise((resolve) => gate9.on('close', resolve));
  
  console.log('\n--- Vitest Tests ---');
  const vitest = spawn('npm', ['test'], { stdio: 'inherit' });
  await new Promise((resolve) => vitest.on('close', resolve));
  
  console.log('\n✅ Semua test berhasil dijalankan!');
}

runAllTests().catch(err => {
  console.error('❌ Error running tests:', err);
  process.exit(1);
});