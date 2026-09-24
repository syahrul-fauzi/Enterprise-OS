import { loadGovernanceState, getStateMetrics, resetStateMetrics } from '../../workspace/packages/tooling/eos-cli/src/state';

// Test script untuk memverifikasi instrumentation terperinci (EOS-JOURNEY-003 Phase 2)
console.log('=== Testing EOS-JOURNEY-003 Detailed Instrumentation ===\n');

// Reset metrics sebelum test (termasuk reset cache)
resetStateMetrics();
console.log('1. Metrics reset:', getStateMetrics());

// Panggil loadGovernanceState() beberapa kali
console.log('\n2. Memanggil loadGovernanceState() 3x...');
loadGovernanceState(); // Pertama: cache miss, parsing (parseCount=1)
loadGovernanceState(); // Kedua: cache hit (cacheHits=1)
loadGovernanceState(); // Ketiga: cache hit (cacheHits=2)

// Cek metrics setelah panggilan
const metrics = getStateMetrics();
console.log('3. Hasil measurement (detail):');
console.log(`   - Load Calls:     ${metrics.loadCalls}`);
console.log(`   - Cache Hits:     ${metrics.cacheHits}`);
console.log(`   - Cache Misses:   ${metrics.cacheMisses}`);
console.log(`   - Parse Count:    ${metrics.parseCount}`);
console.log(`   - Total parse time: ${metrics.totalParseTimeMs.toFixed(2)}ms`);
console.log(`   - Last parse time: ${metrics.lastParseTimeMs.toFixed(2)}ms`);
console.log(`   - Average parse time: ${metrics.averageParseTimeMs.toFixed(2)}ms`);

// Verifikasi caching bekerja sesuai ekspektasi Phase 2
console.log('\n4. Detailed caching verification:');
if (metrics.loadCalls === 3 && metrics.cacheHits === 2 && metrics.cacheMisses === 1 && metrics.parseCount === 1) {
  console.log('   ✅ PASS: Semantic metrics terverifikasi - loader dipanggil 3x, parsing hanya 1x');
  console.log('   ✅ Cache efficiency: 66.67% hit rate (2/3 calls)');
} else {
  console.log('   ❌ FAIL: Metrics tidak sesuai ekspektasi semantic');
  console.log('   Expected: loadCalls=3, cacheHits=2, cacheMisses=1, parseCount=1');
  console.log(`   Actual:   loadCalls=${metrics.loadCalls}, cacheHits=${metrics.cacheHits}, cacheMisses=${metrics.cacheMisses}, parseCount=${metrics.parseCount}`);
}

// Test reset metrics dijalankan kedua kalinya untuk verifikasi reset berfungsi
console.log('\n5. Testing resetStateMetrics() untuk kedua kalinya:');
resetStateMetrics();
console.log('   Metrics setelah reset kedua:', getStateMetrics());