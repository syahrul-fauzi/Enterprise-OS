/**
 * FIN-001 Entry point: Register semua capability vertical slice ke capabilityRegistry
 * Sesuai pola standar yang digunakan work-core, product-delivery, dan capability lain
 * 100% primitive reuse, tidak ada primitive baru yang dibuat
 */

// Import dan jalankan registrasi cross-border adapter (akan otomatis terdaftar di capabilityRegistry)
import "./adapters/FIN-001-cross-border-adapter.js";

console.log("[FIN-001] ✅ Semua capability vertical slice FIN-001 berhasil diimpor dan didaftarkan");