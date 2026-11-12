"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const vite_tsconfig_paths_1 = __importDefault(require("vite-tsconfig-paths"));
const path_1 = __importDefault(require("path"));
exports.default = (0, config_1.defineConfig)({
    resolve: {
        alias: {
            '@repo/core-kernel': path_1.default.resolve(__dirname, '../../packages/core/kernel'),
            '@repo/core-runtime': path_1.default.resolve(__dirname, '../../packages/core/runtime'),
            '@repo/contracts-core': path_1.default.resolve(__dirname, '../../packages/contracts-core'),
            '@repo': path_1.default.resolve(__dirname, '../../packages'),
        },
    },
    plugins: [(0, vite_tsconfig_paths_1.default)({
            projects: [
                './tsconfig.json',
                '../../packages/core/kernel/tsconfig.json',
                '../../packages/core/runtime/tsconfig.json'
            ]
        })],
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'node',
    },
});
