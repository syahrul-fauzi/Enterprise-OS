import tseslint from "typescript-eslint";
import baseConfig from "@repo/config-eslint/base.js";

export default tseslint.config(...baseConfig, {
  files: ["src/**/*.{ts,tsx}"],
  rules: {},
});
