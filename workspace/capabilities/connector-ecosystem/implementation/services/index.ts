// @ts-nocheck
export * from "./connector-ecosystem.service.js";

// Panggil registrasi segera setelah modul diimpor (sesuai pola semua capability lain)
// Skip registrasi di environment test/standalone untuk menghindari error capabilityRegistry
import { registerConnectorEcosystemCapability } from "./connector-ecosystem.service.js";

if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
  console.log("[Connector-Ecosystem] Test/standalone environment detected - skipping auto-registration");
} else {
  registerConnectorEcosystemCapability();
}