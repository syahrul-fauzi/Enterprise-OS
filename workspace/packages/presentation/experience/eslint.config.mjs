import { config } from "../../../config/eslint/base.js";

export default [
  ...config,
  {
    languageOptions: {
      parserOptions: { project: true, tsconfigRootDir: import.meta.dirname },
    },
  },
];