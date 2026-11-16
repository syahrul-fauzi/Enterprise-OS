// Test generateId consistency
const testSeed1 = 'recovery-test-idempotency-001--agent-ecommerce-runtime';
const testSeed2 = 'recovery-test-idempotency-001--agent-ecommerce-runtime';

function generateId(seed) {
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `genesis-${Math.abs(hash).toString(36)}`;
  }
  return `genesis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

console.log('Seed:', testSeed1);
console.log('ID1:', generateId(testSeed1));
console.log('ID2:', generateId(testSeed2));
console.log('Are equal?', generateId(testSeed1) === generateId(testSeed2));