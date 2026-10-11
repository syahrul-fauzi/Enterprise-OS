import baseConfig from "@repo/config-eslint/base";
import globals from "globals";

// Merge node globals into existing base config to avoid plugin redefinition
const identityConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node, // Add all Node.js globals (Buffer, process, etc.)
        ...baseConfig[0].languageOptions?.globals
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Reduce severity of any errors to warnings
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }] // Make unused vars warnings, ignore _ prefixed
    }
  }
];

export default identityConfig;