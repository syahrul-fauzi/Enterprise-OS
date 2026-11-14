// @ts-nocheck
import { describe, beforeEach, it, expect } from 'vitest';
import { createRegistry, capabilityPrefixAliases } from "../../../packages/core/kernel/dist/registry/capability-command-registry.js";
import { atomicCompositionCommands } from "../../../capabilities/atomic-composition/implementation/services/composition.service.js";
// Hapus import register*CoreCapability untuk menghindari module cycle dan double registration

describe("DO-PHASE1-001: Digital Operations Capability Invokability Verification", { concurrency: false }, () => {
  let capabilityRegistry;

  beforeEach(async () => {
    // Buat instance registry FRESH untuk test ini (tidak share instance dengan file lain)
    capabilityRegistry = createRegistry();
    console.log("[TEST-SETUP] Membuat instance capabilityRegistry baru untuk test terisolasi");
    
    // Daftarkan semua atomic-composition commands KE INSTANCE TEST SETIAP KALI (reset sebelum setiap test)
    Object.entries(atomicCompositionCommands).forEach(([name, command]) => {
      capabilityRegistry.register(command);
    });
    
    // Lazy import dan register observability commands untuk menghindari module cycle
    const { observabilityCommands } = await import("../../../capabilities/observability/implementation/commands/observability.commands.js");
    console.log("[TEST-DEBUG] observabilityCommands keys:", Object.keys(observabilityCommands));
    Object.values(observabilityCommands).forEach((command) => {
      console.log("[TEST-DEBUG] Observability command.name before register:", command.name);
      capabilityRegistry.register(command);
    });
    
    // Lazy import dan register identity commands
    const { identityCommands } = await import("../../../capabilities/identity/implementation/commands/index.js");
    Object.values(identityCommands).forEach((command) => {
      capabilityRegistry.register(command);
    });
    
    // Lazy import dan register evidence commands
    const { evidenceCommands } = await import("../../../capabilities/evidence-registry/implementation/commands/index.js");
    Object.values(evidenceCommands).forEach((command) => {
      capabilityRegistry.register(command);
    });
    
    console.log("[TEST-SETUP] Semua core capability registered ke instance test");
    console.log("[TEST-DEBUG] capabilityCommands setelah registrasi:", capabilityRegistry.listCommandKeys());
  });

  it("INV-01: Alias core.atomic-composition dapat memanggil createTeam command melalui capabilityPrefixAliases", async () => {
    // Coba resolve command dengan prefix core. sesuai service-catalog.yaml
    const resolution = await capabilityRegistry.resolveByParts("core.atomic-composition", "createTeam");
    console.log("DEBUG INV-01: attemptedKeys =", resolution.attemptedKeys);
    console.log("DEBUG INV-01: capabilityCommands keys =", capabilityRegistry.listCommandKeys());
    
    expect(resolution.command).toBeDefined();
    expect(resolution.attemptedKeys.includes("atomic-composition.createTeam")).toBe(true);
    console.log("✅ INV-01 PASSED: core.atomic-composition.createTeam berhasil diresolve dengan alias mapping");
  });

  it("INV-02: Semua core. prefix capability di service-catalog.yaml memiliki mapping yang valid", async () => {
    const coreCapabilitiesFromServiceCatalog = [
      "core.observability",
      "core.atomic-composition", 
      "core.connector-ecosystem",
      "core.agent-orchestration",
      "core.evidence-registry",
      "core.workflow-engine",
      "core.incident-management",
      "core.data-sync",
      "core.payment-processing",
      "core.identity-management",
      "core.analytics"
    ];

    const allAliasesExist = coreCapabilitiesFromServiceCatalog.every(cap => 
      capabilityPrefixAliases[cap] !== undefined
    );

    expect(allAliasesExist).toBe(true);
    console.log("✅ INV-02 PASSED: Semua core. prefix capability memiliki mapping alias yang valid");
  });

  it("INV-03: Operational Intelligence domain capabilities dapat diresolve (core.observability.metrics.collect)", async () => {
    // Test observability.metrics.collect yang baru ditambahkan ke service-catalog.yaml
    const observabilityResolve = await capabilityRegistry.resolveByParts("core.observability", "metrics.collect");
    console.log("DEBUG INV-03: observabilityResolve =", observabilityResolve);
    console.log("DEBUG INV-03: Semua registered commands =", capabilityRegistry.listCommandKeys());
    
    expect(observabilityResolve.command).toBeDefined();
    expect(observabilityResolve.attemptedKeys.includes("observability.metrics.collect")).toBe(true);
    console.log("✅ INV-03 PASSED: core.observability.metrics.collect berhasil diresolve dengan alias mapping");
  });

  it("INV-04: Semua incident command di core.observability dapat diresolve dengan benar", async () => {
    // Test semua incident commands yang terdaftar di service-catalog.yaml
    const incidentCommands = ["incident.create", "incident.acknowledge", "incident.resolve", "incident.close"];
    const resolutions = await Promise.all(
      incidentCommands.map(cmd => capabilityRegistry.resolveByParts("core.observability", cmd))
    );
    
    const allFound = resolutions.every(res => res.command !== undefined);
    expect(allFound).toBe(true);
    console.log("✅ INV-04 PASSED: Semua core.observability.incident.* commands berhasil diresolve");
  });
});