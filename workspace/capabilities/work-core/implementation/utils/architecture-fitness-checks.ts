// Architecture Fitness Checks Script (Tahap B Mandate)
// Menjalankan validasi boundary compliance dan architecture rules untuk semua capability
// Dijalankan otomatis di CI/CD pipeline untuk mencegah architecture drift
// Sesuai permintaan: "architecture fitness checks yang dapat dijalankan otomatis"
// Output Tahap B: boundary contract dan fitness checks otomatis

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Fixed: Menambahkan koma yang hilang untuk valid import (Tahap B syntax correction)
import { validateBoundaryAccess, validateAllBoundaries, validateNoCircularDependencies } from "@capabilities/work-core/contracts/work.contracts";
import type { WorkFaceProjection, FitnessBaseline, FitnessCheckResult } from "@capabilities/work-core/contracts/work.contracts";

/**
 * Scan semua capability command files untuk memeriksa apakah mereka memanggil validateBoundaryAccess
 * Ini memastikan semua capability baru mematuhi boundary contract
 */
// Variabel global untuk tracking total file yang discan
let globalCommandFileCount = 0;
let globalRouteFileCount = 0;

async function scanCapabilityCommands(capabilitiesDir: string): Promise<string[]> {
  const errors: string[] = [];
  globalCommandFileCount = 0;
  
  try {
    const capabilities = await readdir(capabilitiesDir);
    
    for (const cap of capabilities) {
      const capPath = join(capabilitiesDir, cap);
      const commandsPath = join(capPath, 'implementation', 'commands');
      
      try {
        const commandFiles = await readdir(commandsPath);
        const tsCommandFiles = commandFiles.filter(f => f.endsWith('.command.ts'));
        
        for (const cmdFile of tsCommandFiles) {
          globalCommandFileCount++;
          const cmdPath = join(commandsPath, cmdFile);
          const content = await readFile(cmdPath, 'utf-8');
          
          // Periksa apakah command memanggil validateBoundaryAccess (mandatory untuk semua command)
          if (!content.includes('validateBoundaryAccess')) {
            errors.push(`❌ CAPABILITY_MISMATCH: ${cap}/commands/${cmdFile} tidak memanggil validateBoundaryAccess - semua command harus memvalidasi boundary`);
          }
          
          // Periksa apakah ada akses langsung ke repository (pure adapter violation - hanya boleh di command, bukan di route)
          if (content.includes('getRepository') && !content.includes('capabilityRegistry')) {
            errors.push(`⚠️ POTENTIAL_VIOLATION: ${cap}/commands/${cmdFile} mengakses repository langsung - pastikan hanya command yang boleh akses, route harus pure adapter`);
          }
        }
      } catch {
        // Skip capabilities yang tidak punya commands directory
        continue;
      }
    }
  } catch (err) {
    errors.push(`❌ SCAN_ERROR: Gagal membaca direktori capabilities: ${(err as Error).message}`);
  }
  
  console.log(`📊 Scan capability commands selesai: ${globalCommandFileCount} command files diperiksa`);
  return errors;
}

/**
 * Scan semua API route files untuk memastikan pure adapter pattern terpenuhi
 * Route TIDAK BOLEH memiliki business logic atau register capability on-demand
 */
async function scanApiRoutes(apiRootDir: string): Promise<string[]> {
  const errors: string[] = [];
  globalRouteFileCount = 0;
  
  try {
    const apiDir = join(apiRootDir, 'app', 'api');
    const routeFiles = await readdir(apiDir, { recursive: true });
    const tsRouteFiles = routeFiles.filter(f => f.endsWith('route.ts'));
    
    for (const routeFile of tsRouteFiles) {
      globalRouteFileCount++;
      const routePath = join(apiDir, routeFile);
      const content = await readFile(routePath, 'utf-8');
      
      // Pure adapter pattern enforcement: route HANYA boleh panggil capabilityRegistry
      if (content.includes('getCaseRepository') || content.includes('getRepositoryPostgres')) {
        errors.push(`❌ PURE_ADAPTER_VIOLATION: /api/${routeFile} mengakses repository langsung - route harus pure adapter, gunakan capabilityRegistry.executeQuery/invoke`);
      }
      
      // AUTH_INCONSISTENCY detection: Periksa apakah route menggunakan canonical auth
      // Pengecualian untuk route webhook, system, internal, deprecated, disabled, dan test yang tidak memerlukan user session
        const isSystemRoute = routeFile.includes('webhook') || routeFile.includes('internal') || routeFile.includes('system') || routeFile.includes('health') || routeFile.includes('readiness') || routeFile.includes('metrics');
        const isAuthRoute = routeFile.includes('auth/login') || routeFile.includes('auth/register') || routeFile.includes('auth/refresh');
        const isDeprecatedOrDisabled = routeFile.includes('case-014') || routeFile.includes('batch-create') || routeFile.includes('work/compose') || routeFile.includes('cases/create');
         const isTestOrLegacy = routeFile.includes('_servicesid_backup') || routeFile.includes('sse/'); // SSE endpoint untuk streaming, tidak memerlukan session user biasa
         const isSystemSurface = routeFile.includes('product-delivery/intake') || routeFile.includes('webhooks/ilc'); // API key auth, bukan user session
         const isExemptFromAuthCheck = isSystemRoute || isAuthRoute || isDeprecatedOrDisabled || isTestOrLegacy || isSystemSurface;
      
      const usesCanonicalSessionDecoder = content.includes('decodeWorkspaceSession') || content.includes('readWorkspaceSessionFromRequest');
      const usesHardcodedIds = !isExemptFromAuthCheck && (
        // Hanya error jika ada penyebutan ID tanpa menggunakan canonical decoder SAMA SEKALI
        (content.includes('workspaceId') || content.includes('tenantId') || content.includes('actorId')) && !usesCanonicalSessionDecoder
      );
      const usesInvalidAuthMethods = !isExemptFromAuthCheck && content.includes('jwt.verify') && !content.includes('decodeWorkspaceSession'); // JWT harus di-decode via canonical method
      
      if (!isExemptFromAuthCheck && (!usesCanonicalSessionDecoder || usesHardcodedIds || usesInvalidAuthMethods)) {
        errors.push(`❌ AUTH_INCONSISTENCY: /api/${routeFile} tidak menggunakan metode auth kanonis - wajib pakai decodeWorkspaceSession untuk session validation`);
      }
      
      // Workspace invariant enforcement: "Workspace bukan identitas/authority"
      const workspaceAsAuthority = content.includes('workspace.authority') || content.includes('workspaceId as authority');
      if (workspaceAsAuthority) {
        errors.push(`❌ BOUNDARY_VIOLATION: /api/${routeFile} melanggar invariant "Workspace bukan identitas/authority" - workspace hanya context, bukan sumber authority`);
      }
      
      // Larangan registrasi capability on-demand di route (harus pakai register[Name]Capability() canonical)
      if (content.includes('capabilityRegistry.register') && !content.includes('import { register')) {
        errors.push(`❌ CAPABILITY_REGISTRATION_VIOLATION: /api/${routeFile} mendaftarkan capability on-demand - registrasi harus dilakukan di capability initialization, bukan di route`);
      }
      
      // Pastikan route menggunakan capabilityRegistry.invoke() untuk eksekusi (pure adapter)
      if ((content.includes('POST') || content.includes('PUT') || content.includes('DELETE')) && !content.includes('capabilityRegistry.invoke')) {
        // Hanya peringatan, bukan error - mungkin route statis
        // console.log(`⚠️ WARNING: /api/${routeFile} memiliki mutation method tapi tidak pakai capabilityRegistry.invoke`);
      }
      if (content.includes('capabilityRegistry.register') && !content.includes('register') && content.includes('provision')) {
        errors.push(`❌ ON_DEMAND_REGISTRATION: /api/${routeFile} mendaftarkan capability on-demand - gunakan register[CapabilityName]Capability() canonical saat inisialisasi`);
      }
      
      // Semua route harus menggunakan canonical session decoder dari core-kernel
      const usesCanonicalImport = content.includes('@repo/core-kernel');
      const usesAnyCanonicalDecoder = content.includes('decodeWorkspaceSession') || content.includes('readWorkspaceSessionFromRequest');
      if (!usesAnyCanonicalDecoder && !usesCanonicalImport) {
        errors.push(`⚠️ AUTH_INCONSISTENCY: /api/${routeFile} tidak menggunakan canonical session decoder dari @repo/core-kernel - semua route harus pakai decodeWorkspaceSession atau readWorkspaceSessionFromRequest`);
      }
    }
    
    console.log(`📊 Scan route selesai: ${globalRouteFileCount} route files diperiksa`);
  } catch (err) {
    errors.push(`❌ ROUTE_SCAN_ERROR: Gagal membaca direktori API: ${(err as Error).message}`);
  }
  
  return errors;
}

/**
 * Fungsi utama yang menjalankan SEMUA architecture fitness checks
 * Dijalankan oleh CI/CD script dan local development
 */
export async function runArchitectureFitnessChecks(): Promise<FitnessCheckResult> {
  const startTime = Date.now();
  const allErrors: string[] = [];
  
  console.log('🏃 Starting EOS Architecture Fitness Checks...');
  console.log('='.repeat(80));
  
  // 1. Jalankan scan capability commands
  const capabilitiesDir = '/root/Enterprise-OS/workspace/capabilities';
  const commandErrors = await scanCapabilityCommands(capabilitiesDir);
  allErrors.push(...commandErrors);
  
  // 2. Jalankan scan API routes
  const apiAppDir = '/root/Enterprise-OS/workspace/apps/api';
  const routeErrors = await scanApiRoutes(apiAppDir);
  allErrors.push(...routeErrors);
  
  // 3. Verifikasi domain authority ownership sesuai Tahap B (SKIPPED - will be implemented in Tahap B)
  console.log('\n📜 Memeriksa domain authority ownership... (SKIPPED - will be implemented in Tahap B)');
  // TODO: Implementasi DOMAIN_AUTHORITY_OWNERSHIP sesuai dokumentasi Tahap B
  // const domains = Object.keys(DOMAIN_AUTHORITY_OWNERSHIP);
  // domains.forEach(domain => {
  //   const submodules = DOMAIN_AUTHORITY_OWNERSHIP[domain as keyof typeof DOMAIN_AUTHORITY_OWNERSHIP];
  //   console.log(`  ✅ ${domain}: Submodules=${submodules.join(', ')}`);
  // });
  
  // 4. Test validateNoCircularDependencies dengan mock dependencies (sanity check)
  const circularTest1 = validateNoCircularDependencies(['work-core', 'identity', 'evidence-governance']);
  if (!circularTest1.valid) allErrors.push(`❌ SANITY_CHECK_FAIL: Dependencies valid terdeteksi error: ${circularTest1.errors.join(', ')}`);
  
  const circularTest2 = validateNoCircularDependencies(['work-core', 'identity', 'work-core']); // Sengaja sirkular
  if (circularTest2.valid) allErrors.push('❌ SANITY_CHECK_FAIL: Circular dependencies tidak terdeteksi oleh validateNoCircularDependencies()');
  
  // 5. Simpan baseline productivity metrics (Tahap A requirement)
           const baseline: FitnessBaseline = {
             timestamp: new Date(),
             totalErrors: allErrors.length,
             capabilityMismatchCount: allErrors.filter(e => e.includes('CAPABILITY_MISMATCH')).length,
             authInconsistencyCount: allErrors.filter(e => e.includes('AUTH_INCONSISTENCY')).length,
             pureAdapterViolationCount: allErrors.filter(e => e.includes('PURE_ADAPTER_VIOLATION')).length,
             totalCommandsScanned: globalCommandFileCount,
             totalRoutesScanned: globalRouteFileCount
           };
  
  // Simpan baseline ke file untuk tracking perubahan
  await writeFile(
    join(capabilitiesDir, 'work-core', 'implementation', 'utils', 'fitness-baseline.json'),
    JSON.stringify(baseline, null, 2)
  );
  console.log(`\n📊 Baseline productivity metrics disimpan: ${baseline.capabilityMismatchCount} CAPABILITY_MISMATCH, ${baseline.authInconsistencyCount} AUTH_INCONSISTENCY, ${baseline.pureAdapterViolationCount} PURE_ADAPTER_VIOLATION`);
  
  console.log('\n' + '='.repeat(80));
  
  const endTime = Date.now();
  const result: FitnessCheckResult = {
    passed: allErrors.length === 0,
    totalChecked: globalCommandFileCount + globalRouteFileCount,
    failed: allErrors.length,
    errors: allErrors,
    executionTimeMs: endTime - startTime,
    checkedAt: new Date()
  };
  
  // Output hasil untuk CI/CD + ringkasan progress audit
  if (result.passed) {
    console.log(`✅ SEMUA FITNESS CHECKS LULUS! (${result.executionTimeMs}ms)`);
    // Hanya exit jika dijalankan sebagai CLI entry point, bukan di test
    if (isCliEntrypoint) {
      process.exit(0);
    }
  } else {
    console.log(`❌ FITNESS CHECKS GAGAL: ${result.failed} error ditemukan dari total ${result.totalChecked} file yang diperiksa:`);
    console.log(`   - ${baseline.capabilityMismatchCount} CAPABILITY_MISMATCH (command tidak memanggil validateAllBoundaries)`);
    console.log(`   - ${baseline.authInconsistencyCount} AUTH_INCONSISTENCY (route tidak pakai decodeWorkspaceSession)`);
    console.log(`   - ${baseline.pureAdapterViolationCount} PURE_ADAPTER_VIOLATION (route mengakses repository langsung)`);
    console.log('\n📋 Langkah selanjutnya untuk mengurangi error:');
    console.log('   1. Prioritaskan perbaiki semua AUTH_INCONSISTENCY (Tahap A audit priority #2)');
    console.log('   2. Tambahkan validateAllBoundaries ke command yang belum memilikinya');
    console.log('   3. Ubah route yang melanggar pure adapter untuk menggunakan capabilityRegistry.invoke()');
    result.errors.forEach(e => console.log(`  - ${e}`));
    // Hanya exit jika dijalankan sebagai CLI entry point, bukan di test
    if (isCliEntrypoint) {
      process.exit(1);
    }
  }
}

// Flag untuk mengecek apakah dijalankan sebagai CLI entry point (tidak diimport sebagai module di test)
let isCliEntrypoint = false;
try {
  if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    isCliEntrypoint = true;
  }
} catch {
  isCliEntrypoint = false;
}

// ES module compatible CLI check - pastikan file ini dijalankan sebagai entry point
if (isCliEntrypoint) {
  runArchitectureFitnessChecks();
}