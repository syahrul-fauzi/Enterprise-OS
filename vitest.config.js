"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const vite_tsconfig_paths_1 = __importDefault(require("vite-tsconfig-paths"));
exports.default = (0, config_1.defineConfig)({
    plugins: [(0, vite_tsconfig_paths_1.default)()],
    test: {
        include: ['capabilities/**/test/*.test.ts', 'capabilities/**/tests/*.test.ts', 'workspace/capabilities/**/test/*.test.ts', 'workspace/capabilities/**/tests/*.test.ts', 'workspace/examples/vertical-slice/HV-*/tests/*.test.ts', 'workspace/examples/vertical-slice/FIN-001/tests/*.test.ts', 'workspace/products/**/tests/*.test.ts', 'workspace/apps/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
        globals: true,
    },
});
