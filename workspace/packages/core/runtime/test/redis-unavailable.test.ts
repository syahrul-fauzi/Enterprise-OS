import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ExecutionStatusRepository } from '../src/execution-status.js';
import { EmailQueueRepository } from '../src/email-queue.js';

describe('LH-CASE-004: Redis Unavailable Simulation Test', () => {
  
  it('1. Sistem beroperasi normal ketika Redis available (default mode)', async () => {
    const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
    assert.ok(sharedRedis, 'Shared Redis instance harus ada');
    assert.strictEqual(sharedRedis._simulateUnavailable, false, 'Default mode harus Redis available');
    
    // Test operasi normal
    await ExecutionStatusRepository.setStatus('test-1', 'running');
    const testStatus = await ExecutionStatusRepository.getStatus('test-1');
    assert.ok(testStatus, 'getStatus harus berhasil');
    assert.strictEqual(testStatus.current, 'running', 'Status harus sesuai');
  });
  
  it('2. Sistem tetap beroperasi ketika Redis unavailable - ExecutionStatus', async () => {
    const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
    
    // Aktifkan mode Redis unavailable
    sharedRedis.simulateUnavailable(true);
    assert.strictEqual(sharedRedis._simulateUnavailable, true, 'Mode harus unavailable setelah di-set');
    
    // Test operasi ExecutionStatus ketika Redis unavailable
    await ExecutionStatusRepository.setStatus('test-2', 'processing');
    const testStatus = await ExecutionStatusRepository.getStatus('test-2');
    assert.ok(testStatus, 'getStatus harus berhasil meskipun Redis unavailable');
    assert.strictEqual(testStatus.current, 'processing', 'Status harus sesuai meskipun Redis unavailable');
  });
  
  it('3. Sistem tetap beroperasi ketika Redis unavailable - EmailQueue', async () => {
    const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
    
    // Pastikan masih dalam mode Redis unavailable
    assert.strictEqual(sharedRedis._simulateUnavailable, true, 'Mode harus masih unavailable');
    
    // Test operasi EmailQueue ketika Redis unavailable
    // Kirim email ke queue
    await EmailQueueRepository.enqueue('email-queue', {
      to: 'test@example.com',
      subject: 'Test Redis Unavailable',
      body: 'This is a test'
    });
    
    // Baca queue
    const queueItems = await EmailQueueRepository.list('email-queue');
    assert.ok(Array.isArray(queueItems), 'list harus mengembalikan array meskipun Redis unavailable');
    assert.ok(queueItems.length >= 1, 'Queue harus berisi item yang baru saja dikirim');
  });
  
  it('4. Sistem dapat beralih kembali ke mode normal setelah Redis pulih', async () => {
    const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
    
    // Kembalikan ke mode Redis available
    sharedRedis.simulateUnavailable(false);
    assert.strictEqual(sharedRedis._simulateUnavailable, false, 'Mode harus available setelah recovery');
    
    // Test operasi normal setelah recovery
    await ExecutionStatusRepository.setStatus('test-3', 'completed');
    const testStatus = await ExecutionStatusRepository.getStatus('test-3');
    assert.ok(testStatus, 'getStatus harus berhasil setelah Redis pulih');
    assert.strictEqual(testStatus.current, 'completed', 'Status harus sesuai setelah recovery');
  });
  
  it('5. Tidak ada error yang dilempar ketika Redis unavailable', async () => {
    const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
    
    // Aktifkan mode Redis unavailable
    sharedRedis.simulateUnavailable(true);
    
    // Pastikan tidak ada error ketika melakukan berbagai operasi
    let errorThrown = false;
    try {
      // Lakukan berbagai operasi yang seharusnya tidak melempar error
      await ExecutionStatusRepository.setStatus('error-test', 'loading');
      await ExecutionStatusRepository.getStatus('error-test');
      await EmailQueueRepository.enqueue('email-queue-error', { to: 'error@test.com', subject: 'Error Test', body: 'test' });
      await EmailQueueRepository.list('email-queue-error');
    } catch (error) {
      console.error('Error thrown:', error);
      errorThrown = true;
    }
    
    assert.strictEqual(errorThrown, false, 'Tidak boleh ada error yang dilempar ketika Redis unavailable');
  });
  
  it('6. Semua operasi tetap konsisten selama masa Redis unavailable', async () => {
    const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
    
    // Pastikan dalam mode Redis unavailable
    sharedRedis.simulateUnavailable(true);
    
    // Lakukan serangkaian operasi berturut-turut
    for (let i = 0; i < 5; i++) {
      await ExecutionStatusRepository.setStatus(`consistency-test-${i}`, 'running');
    }
    
    // Verifikasi semua status tersimpan dengan benar
    for (let i = 0; i < 5; i++) {
      const status = await ExecutionStatusRepository.getStatus(`consistency-test-${i}`);
      assert.ok(status, `Status ${i} harus ada`);
      assert.strictEqual(status.current, 'running', `Status ${i} harus sesuai`);
    }
  });
});