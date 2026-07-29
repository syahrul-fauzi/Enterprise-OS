import baseConfig from "@repo/config-eslint";

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: { project: true, tsconfigRootDir: import.meta.dirname },
    },
  },
];
