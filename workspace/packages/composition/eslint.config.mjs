import { config } from "@repo/config-eslint/base";

export default [
  {
    ignores: [
      "src/**/*.d.ts",
      "src/**/*.d.ts.map",
      "src/**/*.js",
      "src/**/*.js.map",
      "src/scripts/**",
    ],
  },
  ...config,
];
