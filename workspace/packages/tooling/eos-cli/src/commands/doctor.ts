import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Environment capability definitions sesuai proposal: Capability → Contract → Handshake
const ENV_CAPABILITIES = [
  { id: 'database.read', name: 'Database Read', envVars: ['DATABASE_URL', 'POSTGRES_CONNECTION_STRING'] },
  { id: 'database.write', name: 'Database Write', envVars: ['DATABASE_URL', 'POSTGRES_CONNECTION_STRING'] },
  { id: 'github.read', name: 'GitHub Read', envVars: ['GITHUB_TOKEN'] },
  { id: 'github.write', name: 'GitHub Write', envVars: ['GITHUB_TOKEN'] },
  { id: 'ai.inference', name: 'AI Inference', envVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] },
  { id: 'filesystem.write', name: 'Filesystem Write', envVars: [] }, // Always available in dev
  { id: 'web.runtime', name: 'Web Runtime', envVars: ['NODE_ENV'] },
  { id: 'staging.deploy', name: 'Staging Deployment', envVars: ['STAGING_DEPLOY_KEY'] },
];

// List semua capability yang bisa di-check
export function runCapabilityListCommand(): number {
  process.stdout.write("\n📋 EOS CAPABILITY REGISTRY (Development Environment)\n");
  process.stdout.write("═".repeat(60) + "\n\n");
  
  ENV_CAPABILITIES.forEach(cap => {
    process.stdout.write(`  ${cap.id.padEnd(25)} ${cap.name}\n`);
  });
  
  process.stdout.write("\n✅ Total capabilities: " + ENV_CAPABILITIES.length + "\n");
  return 0;
}

// Final command: eos work <work-id> - Execute Work through authorized environment
export function runWorkCommand(workId: string): number {
  process.stdout.write("\n⚡ EOS WORK EXECUTION GATEWAY\n");
  process.stdout.write("═".repeat(60) + "\n\n");
  
  // 1. Validate Work ID format (sesuai primitive sovereignty: WorkId dari work-core)
  if (!workId.match(/^W-\d+$/)) {
    process.stderr.write(`❌ Invalid Work ID format: ${workId}\n`);
    process.stderr.write("Expected format: W-001, W-002, etc.\n");
    return 1;
  }

  process.stdout.write(`🔍 Work ID validated: ${workId}\n`);

  // 2. Pre-flight capability check (sesuai prinsip: capability check BEFORE execution)
  process.stdout.write("\n🔐 Pre-flight capability check for Work execution...\n");
  const requiredCapsForExecution = ['filesystem.write', 'web.runtime'];
  
  let allCapsGranted = true;
  requiredCapsForExecution.forEach(capId => {
    const cap = ENV_CAPABILITIES.find(c => c.id === capId);
    if (!cap) return;
    
    const missingVars = cap.envVars.filter(envVar => !process.env[envVar]);
    const status = missingVars.length === 0 ? 'GRANTED ✅' : 'DENIED ❌';
    if (missingVars.length > 0) allCapsGranted = false;
    
    process.stdout.write(`  ${capId.padEnd(20)} ${status}\n`);
  });

  if (!allCapsGranted) {
    process.stdout.write("\n⛔ Work execution BLOCKED: Missing required capabilities\n");
    process.stdout.write("Run: 'eos capability check <capability-id>' for details\n");
    return 1;
  }

  // 3. Jika semua capability terpenuhi, authorized untuk execute
  process.stdout.write("\n🚀 ALL CAPABILITIES GRANTED\n");
  process.stdout.write("────────────────────────────────────────────────────────────\n");
  process.stdout.write(`Work ${workId} is authorized to execute in this environment\n`);
  process.stdout.write("Agent operates through authorized capability gateway\n");
  process.stdout.write("Secret values are never exposed to the execution agent\n");
  process.stdout.write("\n✅ Work execution pipeline initialized\n");
  
  return 0;
}

// Check specific capability availability (machine-readable handshake)
export function runCapabilityCheckCommand(capabilityId: string): number {
  const cap = ENV_CAPABILITIES.find(c => c.id === capabilityId);
  
  if (!cap) {
    process.stderr.write(`❌ Unknown capability: ${capabilityId}\n`);
    process.stderr.write("Run 'eos capability list' to see available capabilities\n");
    return 1;
  }

  // Check semua env vars yang dibutuhkan
  const missingVars: string[] = [];
  cap.envVars.forEach(envVar => {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  });

  if (missingVars.length === 0) {
    process.stdout.write(`\nGRANTED\n`);
    process.stdout.write(`Capability '${capabilityId}' is available in this environment\n`);
    return 0;
  } else {
    process.stdout.write(`\nDENIED\n`);
    process.stdout.write(`Reason: Missing required environment variables: ${missingVars.join(', ')}\n`);
    return 1;
  }
}

// Main doctor command yang memeriksa semua environment dan services
export function runDoctorCommand(): number {
  process.stdout.write("\n🚀 EOS DEVELOPMENT ENVIRONMENT DIAGNOSTICS\n");
  process.stdout.write("═".repeat(60) + "\n\n");

  // Check core services
  const services = [
    { name: 'Database', check: () => !!process.env.DATABASE_URL || !!process.env.POSTGRES_CONNECTION_STRING },
    { name: 'PostgreSQL', check: () => !!process.env.POSTGRES_CONNECTION_STRING },
    { name: 'Application', check: () => existsSync(join(process.cwd(), 'package.json')) },
    { name: 'Git', check: () => { try { execSync('git rev-parse --is-inside-work-tree', {stdio: 'ignore'}); return true; } catch { return false; } }},
    { name: 'Web Runtime', check: () => !!process.version },
    { name: 'Evidence Registry', check: () => existsSync(join(process.cwd(), 'workspace', '.eos-state')) },
  ];

  services.forEach(svc => {
    const status = svc.check() ? 'READY' : 'MISSING';
    const emoji = svc.check() ? '✅' : '❌';
    process.stdout.write(`  ${svc.name.padEnd(15)} ${emoji} ${status}\n`);
  });

  // Check secret configuration (tidak pernah menampilkan nilai!)
  process.stdout.write("\n🔐 Secrets Status (values hidden)\n");
  process.stdout.write("─".repeat(60) + "\n");
  
  const secrets = ['DATABASE_URL', 'POSTGRES_CONNECTION_STRING', 'GITHUB_TOKEN', 'OPENAI_API_KEY'];
  secrets.forEach(secret => {
    const status = process.env[secret] ? 'CONFIGURED' : 'NOT SET';
    process.stdout.write(`  ${secret.padEnd(25)} ${status}\n`);
  });

  process.stdout.write("\nℹ️  Secret values are never displayed. Capability-based access only.\n");
  process.stdout.write("ℹ️  Use 'eos capability check <capability-id>' for machine-readable handshake\n");

  // Run Python doctor engine jika product name diberikan
  const args = process.argv.slice(3);
  if (args.length > 0) {
    const productName = args[0];
    process.stdout.write(`\n🔬 Running full Doctor Engine for product: ${productName}...\n`);
    try {
      const doctorPath = join(process.cwd(), 'implementation', 'eos', 'engines', 'doctor', 'engine.py');
      execSync(`python3 ${doctorPath} ${productName}`, { stdio: 'inherit' });
    } catch (e) {
      process.stderr.write("\n❌ Doctor engine execution failed\n");
      return 1;
    }
  }

  return 0;
}

// Environment check command (mirip doctor tapi fokus ke env vars)
export function runEnvCheckCommand(): number {
  process.stdout.write("\n🌍 EOS ENVIRONMENT CONTRACT VERIFICATION\n");
  process.stdout.write("═".repeat(60) + "\n\n");

  const required = ['NODE_ENV'];
  const optional = ['DATABASE_URL', 'POSTGRES_CONNECTION_STRING', 'GITHUB_TOKEN', 'OPENAI_API_KEY'];
  
  process.stdout.write("Required environment variables:\n");
  required.forEach(envVar => {
    const status = process.env[envVar] ? '✓ SET' : '✗ MISSING';
    process.stdout.write(`  ${envVar.padEnd(30)} ${status}\n`);
  });

  process.stdout.write("\nOptional environment variables:\n");
  optional.forEach(envVar => {
    const status = process.env[envVar] ? '✓ CONFIGURED' : '○ NOT SET';
    process.stdout.write(`  ${envVar.padEnd(30)} ${status}\n`);
  });

  return 0;
}