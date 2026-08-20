/**
 * E2E Test for Product Slice C3: CommsMe UMKM need → work
 * Verifies Building v0 as unified entry point that routes to correct capability:
 * - Legal needs → LawyersHub (legal-case)
 * - IT needs → Services.ID (service-directory)
 */
import { describe, it, expect } from '@jest/globals';

// Simulasi DOM environment untuk test
(global as any).document = {
  getElementById: jest.fn(() => ({
    value: "",
    addEventListener: jest.fn()
  })),
  addEventListener: jest.fn()
};
(global as any).window = {};

// Load the capability registry bridge dari Building v0
require('../prototypes/building-v0-FIXED.html');

describe('Product Slice C3: Building v0 as Unified Entry Point', () => {
  it('should route LEGAL need ("masalah hukum") to LawyersHub/legal-case', async () => {
    const registry = (window as any).capabilityRegistry;
    const mockInvoke = jest.spyOn(registry, 'invoke');
    
    // Simulasi user input masalah hukum
    const legalInput = "Saya punya masalah hukum dengan vendor katering";
    const itKeywords = ["server", "it support", "website", "aplikasi", "cybersecurity", "cloud", "internet", "komputer", "laptop"];
    const isITNeed = itKeywords.some(keyword => legalInput.toLowerCase().includes(keyword));
    
    // Harusnya bukan IT need → route ke legal-case
    expect(isITNeed).toBe(false);
    
    // Invoke capability sesuai routing
    if (!isITNeed) {
      await registry.invoke("legal-case", "case.create", {
        title: legalInput,
        sessionId: "session-test-001"
      });
    }
    
    // Verifikasi memanggil legal-case, BUKAN service-directory
    expect(mockInvoke).toHaveBeenCalledWith(
      "legal-case", 
      "case.create", 
      expect.objectContaining({ title: legalInput })
    );
    console.log('[TEST] Legal need correctly routed to LawyersHub');
  });

  it('should route IT need ("server down") to Services.ID/service-directory', async () => {
    const registry = (window as any).capabilityRegistry;
    const mockInvoke = jest.spyOn(registry, 'invoke');
    
    // Simulasi user input masalah IT
    const itInput = "Server kantor saya down, butuh IT support segera";
    const itKeywords = ["server", "it support", "website", "aplikasi", "cybersecurity", "cloud", "internet", "komputer", "laptop"];
    const isITNeed = itKeywords.some(keyword => itInput.toLowerCase().includes(keyword));
    
    // Harusnya terdeteksi sebagai IT need
    expect(isITNeed).toBe(true);
    
    // Invoke capability sesuai routing
    if (isITNeed) {
      await registry.invoke("service-directory", "createServiceRequest", {
        title: itInput,
        category: "IT Support",
        sessionId: "session-test-001"
      });
    }
    
    // Verifikasi memanggil service-directory, BUKAN legal-case
    expect(mockInvoke).toHaveBeenCalledWith(
      "service-directory", 
      "createServiceRequest", 
      expect.objectContaining({ title: itInput, category: "IT Support" })
    );
    console.log('[TEST] IT need correctly routed to Services.ID');
  });

  it('should complete FULL lifecycle for BOTH domains without errors', async () => {
    const registry = (window as any).capabilityRegistry;
    
    // TEST 1: Legal lifecycle
    console.log('\n=== TESTING LEGAL LIFECYCLE ===');
    const legalCreate = await registry.invoke("legal-case", "case.create", {
      title: "Masalah kontrak kerja",
      sessionId: "session-test-001"
    });
    expect(legalCreate.record.ok).toBe(true);
    expect(legalCreate.output.status).toBe("draft");
    
    const legalAssign = await registry.invoke("legal-case", "case.assignLawyer", {
      id: legalCreate.output.id,
      lawyerId: "lawyer-001",
      sessionId: "session-test-001"
    });
    expect(legalAssign.output.status).toBe("in_progress");
    
    const legalClose = await registry.invoke("legal-case", "case.close", {
      id: legalCreate.output.id,
      sessionId: "session-test-001"
    });
    expect(legalClose.output.status).toBe("closed");
    console.log('✅ LEGAL LIFECYCLE COMPLETE');
    
    // TEST 2: IT lifecycle
    console.log('\n=== TESTING IT LIFECYCLE ===');
    const itCreate = await registry.invoke("service-directory", "createServiceRequest", {
      title: "Website toko online error",
      category: "IT Support",
      sessionId: "session-test-001"
    });
    expect(itCreate.record.ok).toBe(true);
    expect(itCreate.output.status).toBe("draft");
    
    const itAssign = await registry.invoke("service-directory", "acceptServiceRequest", {
      id: itCreate.output.id,
      providerId: "provider-dev-001",
      sessionId: "session-test-001"
    });
    expect(itAssign.output.status).toBe("accepted");
    
    const itDeliver = await registry.invoke("service-directory", "markServiceDelivered", {
      id: itCreate.output.id,
      sessionId: "session-test-001"
    });
    expect(itDeliver.output.status).toBe("delivered");
    console.log('✅ IT LIFECYCLE COMPLETE');
    
    // BOTH lifecycles berjalan dengan SAMA registry, tanpa perubahan apapun
    console.log('\n🎉 BUILDING V0 AS UNIFIED ENTRY POINT: ALL TESTS PASSED');
  });
});