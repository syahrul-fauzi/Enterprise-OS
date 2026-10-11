import { describe, it, expect, vi } from 'vitest';
import { createContentArticle, publishContent } from '../implementation/commands/community.commands.js';
import type { IntentCategory } from "@repo/contracts-core";

// Mock session repository untuk test (reuse pattern dari FIN-001)
vi.mock('../../work-core/implementation/repository/session-postgres.repository.js', () => ({
  getSessionRepositoryPostgres: vi.fn().mockReturnValue({
    byId: vi.fn().mockResolvedValue({
      sessionId: 'test-session-001',
      tenantId: 'academic-tenant-001',
      workspaceId: 'journal-submission-workspace',
      actorId: 'researcher.001@university.ac.id',
      revokedAt: null
    })
  })
}));

// Mock content repository untuk validasi simpan
vi.mock('../implementation/repository/community-postgres.repository.js', () => ({
  getContentArticleRepositoryPostgres: vi.fn().mockReturnValue({
    save: vi.fn().mockResolvedValue(true),
    byId: vi.fn().mockResolvedValue({
      id: 'content-001',
      status: 'proposed',
      topicLabel: 'academic_journal'
    })
  })
}));

describe('WORK-ACA-001 Academic Submission Test Suite', () => {
  it('L1_EOS_PROOF: Academic journal content dapat dibuat dengan cross-tenant metadata valid', async () => {
    const testInput = {
      sessionId: 'test-session-001',
      title: 'Publikasi Penelitian AI Governance di Indonesia',
      summary: 'Studi kasus implementasi EOS untuk Work Continuity di institusi akademik',
      topicLabel: 'academic_journal',
      author: 'Dr. Researcher University',
      authorAffiliation: 'Institut Teknologi Bandung'
    };

    const result = await createContentArticle.execute(testInput);
    
    expect(result.id).toBeDefined();
    expect(result.status).toBe('proposed'); // Default status sesuai primitive
    console.log("[WORK-ACA-001-TEST] ✅ L1_EOS_PROOF: Academic content created dengan valid cross-tenant metadata");
  });

  it('L1_EOS_PROOF: Content dapat dipublish ke status published untuk akademik', async () => {
    const testInput = {
      sessionId: 'test-session-001',
      id: 'content-001'
    };

    const result = await publishContent.execute(testInput);
    expect(result.id).toBe('content-001');
    expect(result.status).toBe('published');
    expect(result.publishedAt).toBeDefined();
    console.log("[WORK-ACA-001-TEST] ✅ L1_EOS_PROOF: Academic content published sesuai workflow primitive legal-community");
  });

  it('L2_EOS_INTEGRITY: Cross-tenant publish attempt ditolak oleh tenant isolation', async () => {
    // Mock session dari tenant berbeda untuk test akses terlarang
    vi.mock('../../work-core/implementation/repository/session-postgres.repository.js', () => ({
      getSessionRepositoryPostgres: vi.fn().mockReturnValue({
        byId: vi.fn().mockResolvedValue({
          sessionId: 'wrong-tenant-session',
          tenantId: 'unauthorized-tenant-002',
          workspaceId: 'invalid-workspace',
          actorId: 'hacker@malicious.com',
          revokedAt: null
        })
      })
    }));

    const wrongTenantInput = {
      sessionId: 'wrong-tenant-session',
      id: 'content-001' // Milik tenant academic-tenant-001, bukan tenant yang login
    };

    await expect(publishContent.execute(wrongTenantInput)).rejects.toThrow("Article does not belong to the current tenant/workspace - access denied");
    console.log("[WORK-ACA-001-TEST] ✅ L2_EOS_INTEGRITY: Cross-tenant publish blocked oleh tenant isolation invariant");
  });

  it('L2_EOS_INTEGRITY: Session validation mencegah unauthorised academic submission', async () => {
    const revokedSessionInput = {
      sessionId: 'revoked-session-001',
      title: 'Invalid Submission',
      author: 'Unauthorised User'
    };

    // Override mock untuk sesi revoked
    vi.mock('../../work-core/implementation/repository/session-postgres.repository.js', () => ({
      getSessionRepositoryPostgres: vi.fn().mockReturnValue({
        byId: vi.fn().mockResolvedValue({ revokedAt: new Date() })
      })
    }));

    await expect(createContentArticle.execute(revokedSessionInput)).rejects.toThrow("Invalid or revoked session");
    console.log("[WORK-ACA-001-TEST] ✅ L2_EOS_INTEGRITY: Unauthorised submission blocked oleh session validation");
  });
});