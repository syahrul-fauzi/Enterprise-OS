"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const vite_tsconfig_paths_1 = __importDefault(require("vite-tsconfig-paths"));
const node_path_1 = __importDefault(require("node:path"));
exports.default = (0, config_1.defineConfig)({
    resolve: {
        alias: [
            // Fix module resolution untuk semua @repo imports dari SEMUA lokasi file (termasuk @repo/core/kernel)
            { find: /^@repo\/(.*)/, replacement: node_path_1.default.resolve(__dirname, '../../packages/$1') },
            // Fix module resolution untuk semua @capabilities imports dari SEMUA lokasi file
            { find: /^@capabilities\/(.*)/, replacement: node_path_1.default.resolve(__dirname, '../../capabilities/$1') },
            // Fix .js extension imports (ubah jadi .ts source files)
            { find: /^(.*)\.js$/, replacement: '$1' },
        ],
    },
    plugins: [(0, vite_tsconfig_paths_1.default)({
            projects: [
                './tsconfig.json',
                '../../capabilities/work-core/tsconfig.json',
                '../../packages/core/kernel/tsconfig.json',
                '../../capabilities/atomic-composition/tsconfig.json',
                '../../capabilities/identity/tsconfig.json' // Tambahkan identity tsconfig untuk resolve semua command import
            ]
        })],
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
        pool: 'forks',
        globals: true, // Aktifkan globals Vitest (vi, expect, dll.)
        // Aktifkan mock untuk module yang membutuhkan SSR
        server: {
            deps: {
                inline: ['@capabilities/atomic-composition', '@capabilities/consultation', '@repo/core-kernel', '@capabilities/work-core']
            }
        }
    },
});
