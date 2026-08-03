import { config } from "@repo/config-eslint/base";

export default [
  ...config,
  {
    languageOptions: {
      parserOptions: { project: true, tsconfigRootDir: import.meta.dirname },
    },
  },
];
