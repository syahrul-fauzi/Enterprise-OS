-- Create works table first
CREATE TABLE IF NOT EXISTS works (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  workspace_id VARCHAR(255) NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::JSONB,
  state_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  composition_id VARCHAR(255),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert WORK-001
INSERT INTO works (
  id, title, description, status, actor_id, tenant_id, workspace_id, 
  participants, state_history, version, created_at, updated_at
) VALUES (
  'work-WORK-001',
  'WORK-001: Pendirian PT. EOS Indonesia',
  'G2-01 Golden Path: First real canonical work flowing from PostgreSQL → CanonicalWorkRepository → buildWorkRealityModel() → WorkRealityModel → browser. No mocks, no fixtures, 100% real data.',
  'active',
  '+628999999999',
  'tenant.anonymous',
  'professional-workspace.anonymous',
  '[{"actorId": "+628999999999", "role": "customer", "addedAt": "2026-09-09T00:00:00.000Z", "addedBy": "+628999999999"}, {"actorId": "lawyer-001", "role": "professional", "addedAt": "2026-09-09T00:30:00.000Z", "addedBy": "+628999999999"}]',
  '[{"status": "draft", "timestamp": "2026-09-09T00:00:00.000Z", "actorId": "+628999999999", "note": "Work created - G2-01 initialization"}, {"status": "active", "timestamp": "2026-09-09T01:00:00.000Z", "actorId": "lawyer-001", "note": "Work activated - ready for client interaction"}]',
  1,
  '2026-09-09T00:00:00.000Z',
  '2026-09-09T01:00:00.000Z'
) ON CONFLICT (id) DO NOTHING;
