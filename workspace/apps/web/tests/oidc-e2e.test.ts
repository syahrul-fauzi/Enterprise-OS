
import { test } from 'node:test';
import assert from 'node:assert';
import { chromium } from 'playwright';

test('OIDC E2E flow', { timeout: 120000 }, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3002');

  await page.waitForSelector('text=Login with SSO');
  await page.click('text=Login with SSO');

  await page.waitForNavigation();

  const url = page.url();
  console.log('Redirected to:', url);
  assert.ok(url.startsWith('http://127.0.0.1:4444/oauth2/auth'), 'Should redirect to Hydra');

  await browser.close();
});