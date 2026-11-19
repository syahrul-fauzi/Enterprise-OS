// @ts-nocheck
process.env.NODE_ENV = 'test';
(globalThis as any)._forceMockPool = true;

import { describe, it, expect, beforeEach } from 'vitest';
import { getWorkRepositoryLazy, getWorkCommand } from '../implementation/commands/work.commands.js';
import type { ExecutionContext } from '@repo/core-runtime';
import { newSessionId, newTenantId, newActorId, newWorkId } from '@repo/contracts-core';

// Gunakan dynamic import untuk getSessionRepositoryLazy sesuai pola di work.commands.ts (fix path relatif)
let _sessionRepo: any = undefined;
async function getSessionRepositoryLazy() {
  if (!_sessionRepo) {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
    const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    
    if (isTestEnvironment && !hasConnectionString) {
      const { SessionRepositoryInMemory } = await import("../../identity/implementation/repositories/index.js");
      _sessionRepo = SessionRepositoryInMemory;
      console.log("[test] 🔧 Menggunakan IN-MEMORY session repository untuk TEST");
    } else {
      const { getSessionRepositoryPostgres } = await import("../../identity/implementation/repositories/index.js");
      _sessionRepo = getSessionRepositoryPostgres();
      console.log("[test] 🐘 Menggunakan POSTGRESQL session repository");
    }
  }
  return _sessionRepo;
}

// Ekstrak execute function dari command object
const getWork = getWorkCommand.execute;

import type { WorkId, TenantId, WorkspaceId, ActorId, SessionId } from "@repo/contracts-core";

// Test constants (sesuai pola test lain di work-core)
const TEST_TENANT_ID = "tenant-test-001" as TenantId;
const TEST_WORKSPACE_ID = "workspace-test-001" as WorkspaceId;
const TEST_USER_ID = "user-test-001" as ActorId;
const TEST_WORK_ID = "work-test-001" as WorkId;
const VALID_SESSION_ID = "session-valid-001" as SessionId;
const REVOKED_SESSION_ID = "session-revoked-001" as SessionId;
const CROSS_TENANT_SESSION_ID = "session-cross-tenant-001" as SessionId;

describe('W06-A2 Step 6: Revocation & Side Effect Testing', () => {
  let sessionRepo: any;
  let workRepo: any;
  
  beforeEach(async () => {
    // Reset repository sebelum setiap test untuk isolasi
    process.env.NODE_ENV = 'test';
    (globalThis as any)._forceMockPool = true;
    sessionRepo = await getSessionRepositoryLazy();
    workRepo = await getWorkRepositoryLazy();
    
    // Reset in-memory stores
    if (typeof (sessionRepo as any).reset === 'function') {
      await (sessionRepo as any).reset();
    }
    if (typeof (workRepo as any).reset === 'function') {
      await (workRepo as any).reset();
    }
    
    // Setup test data
    await sessionRepo.save({
      id: VALID_SESSION_ID,
      userId: TEST_USER_ID,
      actorId: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      productId: 'lawyershub',
      actorLabel: 'Test User',
      isAgent: false,
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null, // Sesi aktif
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Setup session yang sudah dicabut
    await sessionRepo.save({
      id: REVOKED_SESSION_ID,
      userId: TEST_USER_ID,
      actorId: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      productId: 'lawyershub',
      actorLabel: 'Revoked User',
      isAgent: false,
      issuedAt: new Date(Date.now() - 7200000),
      expiresAt: new Date(Date.now() + 82800000),
      revokedAt: new Date(Date.now() - 1800000), // Sesi dicabut 30 menit lalu
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Setup cross-tenant session (tenant berbeda)
    await sessionRepo.save({
      id: CROSS_TENANT_SESSION_ID,
      userId: newActorId('user-cross-tenant-001'),
      actorId: newActorId('user-cross-tenant-001'),
      tenantId: newTenantId('tenant-lain-002'),
      workspaceId: 'workspace-lain-002',
      productId: 'services-id',
      actorLabel: 'Cross Tenant User',
      isAgent: false,
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Buat test Work di tenant TEST_TENANT_ID
    await workRepo.save({
      id: TEST_WORK_ID,
      workId: TEST_WORK_ID,
      title: 'Test Work untuk A2',
      description: 'Work untuk testing revocation dan cross-tenant access',
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      actorId: TEST_USER_ID,
      participants: [TEST_USER_ID],
      status: 'in_progress',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  it('1. REVOKED ACCESS DENY: Sesi yang dicabut harus ditolak aksesnya', async () => {
    const testContext: ExecutionContext = {
      actor_id: String(TEST_USER_ID),
      tenant_id: String(TEST_TENANT_ID),
      session_id: String(REVOKED_SESSION_ID),
      decision_id: 'test-decision-revoked',
      context_trace_id: 'trace-revoked-001',
      workspace_id: TEST_WORKSPACE_ID
    };

    // Coba akses Work dengan session yang sudah dicabut
    await expect(
      getWork({
        workId: String(TEST_WORK_ID),
        sessionId: String(REVOKED_SESSION_ID)
      }, testContext)
    ).rejects.toThrow('unauthorized: Session revoked or expired');

    // Verifikasi Work TIDAK berubah (tidak ada side effect)
    const workAfter = await workRepo.byId(TEST_WORK_ID);
    expect(workAfter.version).toBe(1); // Versi tetap sama, tidak ada perubahan
  });

  it('2. CROSS-TENANT DENY: Akses Work dari tenant lain harus ditolak', async () => {
    const crossTenantContext: ExecutionContext = {
      actor_id: 'user-cross-tenant-001',
      tenant_id: 'tenant-lain-002', // Tenant berbeda dari Work
      session_id: String(CROSS_TENANT_SESSION_ID),
      decision_id: 'test-decision-cross-tenant',
      context_trace_id: 'trace-cross-tenant-001',
      workspace_id: 'workspace-lain-002'
    };

    // Coba akses Work yang berada di tenant lain - akan ditolak karena session.tenantId !== context.tenant_id
    await expect(
      getWork({
        workId: String(TEST_WORK_ID),
        sessionId: String(CROSS_TENANT_SESSION_ID)
      }, crossTenantContext)
    ).rejects.toThrow('work_not_found: Work does not exist or is outside your tenant boundary');
  });

  it('3. INVALID ACTOR DENY: Actor yang tidak terdaftar harus ditolak', async () => {
    const invalidActorContext: ExecutionContext = {
      actor_id: 'user-tidak-ada-999', // Actor tidak valid
      tenant_id: String(TEST_TENANT_ID),
      session_id: String(VALID_SESSION_ID),
      decision_id: 'test-decision-invalid-actor',
      context_trace_id: 'trace-invalid-actor-001',
      workspace_id: TEST_WORKSPACE_ID
    };

    // Coba akses dengan actor yang tidak valid - akan ditolak karena session.actorId !== context.actor_id
    await expect(
      getWork({
        workId: String(TEST_WORK_ID),
        sessionId: String(VALID_SESSION_ID)
      }, invalidActorContext)
    ).rejects.toThrow('unauthorized: Session belongs to different actor');
  });

  it('4. NO SIDE EFFECT ON DENY: Tidak ada perubahan state ketika akses ditolak', async () => {
    const workBefore = await workRepo.byId(TEST_WORK_ID);
    const timestampBefore = workBefore.updatedAt.getTime();

    // Coba akses dengan session yang dicabut
    await expect(
      getWork({
        workId: String(TEST_WORK_ID),
        sessionId: String(REVOKED_SESSION_ID)
      }, {
        actor_id: String(TEST_USER_ID),
        tenant_id: String(TEST_TENANT_ID),
        session_id: String(REVOKED_SESSION_ID),
        decision_id: 'test-decision-no-side-effect',
        context_trace_id: 'trace-no-side-effect-001',
        workspace_id: TEST_WORKSPACE_ID
      })
    ).rejects.toThrow();

    // Verifikasi tidak ada perubahan pada Work setelah akses ditolak
    const workAfter = await workRepo.byId(TEST_WORK_ID);
    expect(workAfter.version).toBe(workBefore.version);
    expect(workAfter.updatedAt.getTime()).toBe(timestampBefore); // Timestamp tidak berubah
  });

  it('5. OWNER ALLOW: Pemilik Work dapat mengakses dengan sukses', async () => {
    const ownerContext: ExecutionContext = {
      actor_id: String(TEST_USER_ID),
      tenant_id: String(TEST_TENANT_ID),
      session_id: String(VALID_SESSION_ID),
      decision_id: 'test-decision-owner-allow',
      context_trace_id: 'trace-owner-allow-001',
      workspace_id: TEST_WORKSPACE_ID
    };

    // Pemilik harus bisa mengakses Work
    const work = await getWork({
      workId: String(TEST_WORK_ID),
      sessionId: String(VALID_SESSION_ID)
    }, ownerContext);

    expect(work).toBeDefined();
    expect(work.workId).toBe(String(TEST_WORK_ID));
  });

  it('6. ADMIN NON-OWNER DENY: Admin yang bukan pemilik tidak dapat mengakses', async () => {
    const adminNonOwnerContext: ExecutionContext = {
      actor_id: 'user-admin-001', // Admin tapi bukan pemilik
      tenant_id: String(TEST_TENANT_ID),
      session_id: 'session-admin-001',
      decision_id: 'test-decision-admin-non-owner',
      context_trace_id: 'trace-admin-non-owner-001',
      workspace_id: TEST_WORKSPACE_ID
    };

    // Buat session admin yang valid tapi bukan pemilik
    await sessionRepo.save({
      id: newSessionId('session-admin-001'),
      userId: newActorId('user-admin-001'),
      actorId: newActorId('user-admin-001'),
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      productId: 'lawyershub',
      actorLabel: 'Admin User',
      isAgent: false,
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Admin non-owner harus ditolak
    await expect(
      getWork({
        workId: String(TEST_WORK_ID),
        sessionId: 'session-admin-001'
      }, adminNonOwnerContext)
    ).rejects.toThrow('permission_denied: Actor is not authorized to access this work');
  });
});