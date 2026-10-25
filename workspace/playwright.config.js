import { defineConfig, devices } from '@playwright/test';
import * as process from 'node:process';
export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    cacheDir: './.playwright-cache',
    browsersPath: './.playwright-browsers',
    use: {
        baseURL: 'http://localhost:3005',
        trace: 'on',
        screenshot: 'on',
        video: 'on',
        launchOptions: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    },
    projects: [
        {
            name: 'chromium',
            use: Object.assign(Object.assign({}, devices['Desktop Chrome']), { headless: true }),
        },
    ],
    webServer: {
        command: 'cd apps/web && pnpm dev --port 3005',
        url: 'http://localhost:3005/api/health',
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
