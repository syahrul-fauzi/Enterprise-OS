// Script sederhana untuk test Redis mock methods
import { redis } from '../../../packages/core/runtime/src/email-queue.ts';

console.log('[TEST] Starting Redis mock verification...');
console.log('[TEST] redis object exists:', !!redis);
console.log('[TEST] All redis methods:', Object.keys(redis));
console.log('[TEST] Has srem:', 'srem' in redis);
console.log('[TEST] Has sadd:', 'sadd' in redis);
console.log('[TEST] Has del:', 'del' in redis);
console.log('[TEST] Has brpoplpush:', 'brpoplpush' in redis);

// Test srem dan sadd
async function testSetMethods() {
  console.log('\n[TEST] Testing Redis Set methods...');
  const testKey = 'test:set';
  await redis.sadd(testKey, 'txn-001');
  await redis.sadd(testKey, 'txn-002');
  console.log('[TEST] After sadd 2 items, sismember txn-001:', await redis.sismember(testKey, 'txn-001'));
  
  const removed = await redis.srem(testKey, 'txn-001');
  console.log('[TEST] After srem txn-001, removed:', removed);
  console.log('[TEST] sismember txn-001 now:', await redis.sismember(testKey, 'txn-001'));
  
  await redis.del(testKey);
  console.log('[TEST] After del, sismember txn-002:', await redis.sismember(testKey, 'txn-002'));
}

testSetMethods();