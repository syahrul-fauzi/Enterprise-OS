// ACaaS-COMMERCIAL-001: Unit Test struktur command ACaaS (tidak memerlukan runtime penuh)
import { describe, it, expect } from 'vitest';
import { apiPlatformCommands, registerApiPlatformCapability } from '../implementation/commands/index';

describe('ACaaS Compliance Check Commands - Structure Validation', () => {
  it('should have both ACaaS commands defined with correct structure', () => {
    // Verifikasi kedua command ada
    expect(apiPlatformCommands["acaas.complianceCheck.create"]).toBeDefined();
    expect(apiPlatformCommands["acaas.complianceCheck.getResult"]).toBeDefined();
  });

  it('acaas.complianceCheck.create should have correct schema and properties', () => {
    const createCommand = apiPlatformCommands["acaas.complianceCheck.create"];
    
    // Verifikasi properti dasar
    expect(createCommand.name).toBe("acaas.complianceCheck.create");
    expect(createCommand.capability).toBe("api-platform");
    expect(createCommand.description).toBeDefined();
    expect(createCommand.inputSchema).toBeDefined();
    expect(typeof createCommand.execute).toBe("function");
    
    // Verifikasi input schema lengkap
    const requiredInputs = ["tenantId", "workspaceId", "actorId", "documentType", "documentData", "compliancePolicies"];
    requiredInputs.forEach(key => {
      expect(createCommand.inputSchema).toHaveProperty(key);
    });
  });

  it('acaas.complianceCheck.getResult should have correct schema and properties', () => {
    const getResultCommand = apiPlatformCommands["acaas.complianceCheck.getResult"];
    
    // Verifikasi properti dasar
    expect(getResultCommand.name).toBe("acaas.complianceCheck.getResult");
    expect(getResultCommand.capability).toBe("api-platform");
    expect(getResultCommand.description).toBeDefined();
    expect(getResultCommand.inputSchema).toBeDefined();
    expect(typeof getResultCommand.execute).toBe("function");
    
    // Verifikasi input schema lengkap
    const requiredInputs = ["tenantId", "workspaceId", "actorId", "complianceCheckId"];
    requiredInputs.forEach(key => {
      expect(getResultCommand.inputSchema).toHaveProperty(key);
    });
  });

  it('registerApiPlatformCapability should be a function that iterates commands correctly', () => {
    expect(typeof registerApiPlatformCapability).toBe("function");
    
    // Hitung jumlah command yang akan didaftarkan - sekarang 5 command ACaaS (create, getResult, markProcessing, markCompleted, markFailed)
    const commandCount = Object.keys(apiPlatformCommands).length;
    expect(commandCount).toBe(5); // Semua 5 command ACaaS terdaftar
  });
});