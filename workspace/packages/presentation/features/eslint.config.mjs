import tseslint from "typescript-eslint";
import baseConfig from "@repo/config-eslint/base.js";

/** @type {import("eslint").Linter.Config} */
export default tseslint.config(...baseConfig, {
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    // EOS PRESENTATION ARCHITECTURE RULES
    // Prevent client-side reality reconstruction - server must build all models
    "no-restricted-globals": "off",
    "no-restricted-imports": ["error", {
      name: "deriveWorkRealityModel",
      message: "deriveWorkRealityModel is DEPRECATED. Server must build WorkRealityModel exclusively via buildWorkRealityModel(). Presentation layer may not interpret raw runtime reality."
    }],
    // No business logic in presentation features - only rendering and user interaction
    "no-restricted-syntax": [
      "error",
      {
        selector: "SwitchStatement",
        message: "Domain-specific switch statements (semantic interpretation) are not allowed in presentation features. All logic must live in server model builders."
      }
    ]
  }
});