import { config } from "../../../config/eslint/base.js";
import tseslint from "typescript-eslint";

export default tseslint.config(...config, {
  languageOptions: {
    parserOptions: { project: true, tsconfigRootDir: import.meta.dirname },
  },
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    // EOS PRESENTATION COMPOSITION INVARIANT ENFORCEMENT
    // Experience components may ONLY compose features - no logic, no interpretation
    "no-restricted-syntax": [
      "error",
      {
        selector: "SwitchStatement",
        message: "Experience components are COMPOSITION ONLY. No domain logic or semantic interpretation allowed. All logic must live in server model builders."
      },
      {
        selector: "IfStatement",
        message: "Experience components may only contain rendering logic, not business logic. All decisions must be pre-built into canonical models."
      }
    ],
    // Block deprecated client-side model builders from ever being imported in experience layer
    "no-restricted-imports": ["error", {
      paths: [
        {
          name: "@repo/presentation-features",
          importNames: ["deriveWorkRealityModel"],
          message: "Client-side model derivation is not allowed. Server must build all canonical models. See EOS Presentation Constitution."
        }
      ]
    }]
  }
});