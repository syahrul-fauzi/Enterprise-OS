import { readFileSync } from 'fs';
import { statePath } from '@repo/eos-cli';

const REGISTRY_PATH = process.env.REGISTRY_PATH || statePath('..', 'foundation', 'evidence', 'registry');
const EVIDENCE_PATH = process.env.EVIDENCE_PATH || statePath('evidence');
const VERIFICATION_PATH = process.env.VERIFICATION_PATH || statePath('..', 'foundation', 'evidence', 'verification');

export type DataSource = 'registry_runtime' | 'fallback_static';

export interface DataSourceInfo {
  source: DataSource;
  verified: boolean;
  generatedAt?: string;
  registryPath?: string;
  fallbackSource?: string;
}

export interface CapabilityRegistryReport {
  summary: {
    total_capabilities: number;
    with_owner: number;
    owner_missing: number;
    invalid_capabilities: number;
    duplicate_candidates: number;
    lifecycle_counts: {
      reusable: number;
      experimental: number;
      core: number;
    };
    declared_products: number;
    declared_procedures: number;
    declared_evidence: number;
  };
  capabilities: Array<{
    id: string;
    name: string;
    owner: string;
    lifecycle: string;
    product: string;
    procedure: string;
    evidence: string;
    verified: boolean;
  }>;
  dataSource: DataSourceInfo;
}

export function loadCapabilityRegistry(): CapabilityRegistryReport {
  try {
    const evidenceFiles = require('fs').readdirSync(EVIDENCE_PATH);
    const latestEvidence = evidenceFiles
      .filter((f: string) => f.includes('capability-registry'))
      .sort()
      .pop();
    
    if (latestEvidence) {
      const fullPath = require('path').join(EVIDENCE_PATH, latestEvidence);
      const data = JSON.parse(readFileSync(fullPath, 'utf8'));
      return {
        ...data,
        dataSource: {
          source: 'registry_runtime',
          verified: true,
          generatedAt: data.generated_at,
          registryPath: fullPath
        }
      };
    }
  } catch (e) {
    console.log('No runtime evidence found, using fallback static registry');
  }

  try {
    const staticRegistryPath = require('path').join(REGISTRY_PATH, 'capability-registry.json');
    const staticData = JSON.parse(readFileSync(staticRegistryPath, 'utf8'));
    return {
      ...staticData,
      dataSource: {
        source: 'fallback_static',
        verified: false,
        fallbackSource: staticRegistryPath
      }
    };
  } catch (e) {
    throw new Error('No capability registry available');
  }
}