// Re-export all contracts, commands, repositories, services
export * from "./contracts/index.js";
export * from "./commands/observability.commands.js";
export * from "./repository/index.js";
export * from "./services/index.js";

// Main capability implementation export (required for StaticRegistry registration)
// Follows EOS canonical export pattern: export service singleton as capability name
// Gunakan path relative tanpa ekstensi untuk kompatibilitas TypeScript NodeNext module resolution
export { observabilityService as observability } from "./services/observability.service";