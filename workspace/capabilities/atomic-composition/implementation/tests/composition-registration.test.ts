// @ts-nocheck
/**
 * COMP-001-Registration: Capability Registration Verification (eos-verification: independent auditor)
 * Memverifikasi bahwa semua command atomic-composition (termasuk billing.generate) terdaftar di capabilityRegistry
 * sesuai dengan SMACE-BUSINESS-001 requirement untuk 100% primitive reuse dan command aliasing
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { capabilityRegistry } from "../../../../packages/core/kernel/src/registry/capability-command-registry.ts";
import { registerAtomicCompositionCapability } from "../services/composition.service.ts";

describe("COMP-001-Registration: Atomic Composition Capability Registration Verification", { concurrency: false }, () => {
  // Flag untuk memastikan registrasi hanya terjadi sekali
  let isRegistered = false;
  
  // Register capability SEKALI sebelum test pertama (karena capabilityRegistry hanya mengizinkan registrasi sekali)
  beforeEach(() => {
    if (!isRegistered) {
      registerAtomicCompositionCapability();
      isRegistered = true;
      console.log("[TEST-SETUP] Semua command didaftarkan sekali sebelum test dimulai");
      console.log("[TEST-SETUP] capabilityCommands setelah registrasi:", Object.keys(capabilityRegistry.capabilityCommands));
    }
  });

  // REG-01: Semua core atomic-composition commands terdaftar
  it("REG-01: Core atomic-composition commands terdaftar di capabilityRegistry", async () => {
    // Debug: Lihat isi capabilityCommands sebelum verifikasi
    console.log("[TEST-DEBUG] capabilityCommands:", Object.keys(capabilityRegistry.capabilityCommands));
    
    // Verifikasi core commands ada
    assert.ok(capabilityRegistry.capabilityCommands["atomic-composition.createTeam"], "atomic-composition.createTeam harus terdaftar");
    assert.ok(capabilityRegistry.capabilityCommands["atomic-composition.composeTeamFromRequirements"], "atomic-composition.composeTeamFromRequirements harus terdaftar");
    
    console.log("✅ REG-01 PASSED: Semua core atomic-composition commands terdaftar");
  });

  // REG-02: SMACE-BUSINESS-001 billing.generate command terdaftar
  it("REG-02: SMACE-BUSINESS-001 billing.generate command terdaftar", async () => {
    // Verifikasi billing.generate terdaftar sebagai alias SMACE
    assert.ok(capabilityRegistry.capabilityCommands["billing.generate"], "billing.generate (SMACE alias) harus terdaftar di capabilityRegistry");
    
    console.log("✅ REG-02 PASSED: billing.generate command (SMACE-BUSINESS-001 alias) terdaftar dengan 100% primitive reuse");
  });

  // REG-03: Tidak ada duplikasi registrasi command di capabilityRegistry
  it("REG-03: Tidak ada duplikasi registrasi command di capabilityRegistry", async () => {
    // Hitung jumlah atomic-composition related commands di registry
    const actualRegistered = Object.keys(capabilityRegistry.capabilityCommands).filter(key => 
      key.includes("atomic-composition") || key.includes("billing.generate")
    ).length;
    
    // Total expected: 6 commands (2 core + atomic-composition.billing.generate + alias billing.generate + atomic-composition.register-seat-companion + atomic-composition.update-actor-lifecycle)
          const totalExpected = 6;
          assert.equal(actualRegistered, totalExpected, `Harus ada ${totalExpected} commands terdaftar, tanpa duplikasi. Ditemukan ${actualRegistered}`);
    
    console.log(`✅ REG-03 PASSED: Tidak ada duplikasi registrasi - ${actualRegistered} commands terdaftar sesuai ekspektasi`);
  });

  // REG-04: billing.generate command memiliki kill switch check di dalam execute method
  it("REG-04: billing.generate command mengimplementasikan kill switch check sesuai EOS requirements", async () => {
    const billingCommand = capabilityRegistry.capabilityCommands["billing.generate"];
    assert.ok(billingCommand, "billing.generate command harus terdaftar");
    assert.ok(typeof billingCommand.execute === "function", "billing.generate harus memiliki execute method");
    
    // Verifikasi source code command mengandung kill switch check
    const commandSource = billingCommand.execute.toString();
    assert.ok(
      commandSource.includes("getKillSwitchState") && commandSource.includes("kill_switch_triggered"),
      "billing.generate execute method harus memanggil getKillSwitchState dan memeriksa kill_switch_triggered"
    );
    
    console.log("✅ REG-04 PASSED: billing.generate command memiliki kill switch enforcement yang sesuai EOS");
  });
});