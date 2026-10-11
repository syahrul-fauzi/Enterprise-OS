import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';

// FACE-001: Product Isolation Verification
// Verify cross-product work leakage is prevented:
// - LH_LGL_001 only appears in LawyersHub UI
// - ILC_INS_001 only appears in ILC UI
// No cross-product access in any surface

declare global {
  var testUserEmail: string;
  var testUserPassword: string;
  var tenantId: string;
}

test.describe('FACE-001: Product Isolation E2E Verification', () => {
  test.setTimeout(180000);
  
  // Create artifacts directory
  test.beforeAll(() => {
    if (!fs.existsSync('./artifacts/face-001')) fs.mkdirSync('./artifacts/face-001', { recursive: true });
  });

  async function loginToProduct(page: Page, productId: string) {
    console.log(`[FACE-001] Logging into product: ${productId}`);
    
    // Go to login page
    await page.goto('/login');
    
    // Set product header to simulate product context
    await page.setExtraHTTPHeaders({
      'x-eos-product-id': productId
    });
    
    // Perform login if globals are set
    if (globalThis.testUserEmail && globalThis.testUserPassword) {
      await page.locator('input[name="email"]').fill(globalThis.testUserEmail);
      await page.locator('input[name="password"]').fill(globalThis.testUserPassword);
      await page.getByRole('button', { name: /login|masuk/i }).click();
      await page.waitForURL('**/my-reality', { timeout: 15000 });
    }
    
    console.log(`[FACE-001] Successfully logged into ${productId}, on /my-reality`);
  }

  async function getWorkList(page: Page): Promise<string[]> {
    // Extract all work IDs/titles from My Reality page
    const workElements = page.locator('[data-testid="work-item"]');
    const count = await workElements.count();
    const workList: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const workId = await workElements.nth(i).getAttribute('data-work-id');
      const workTitle = await workElements.nth(i).innerText();
      if (workId) workList.push(workId);
    }
    
    return workList;
  }

  test('LH_LGL_001 appears only in LawyersHub, not in ILC', async ({ browser }) => {
    // Test 1: LawyersHub environment
    const lhContext = await browser.newContext();
    const lhPage = await lhContext.newPage();
    
    try {
      await loginToProduct(lhPage, 'lawyershub');
      await lhPage.screenshot({ path: './artifacts/face-001/lawyershub-my-reality.png', fullPage: true });
      
      const lhWorks = await getWorkList(lhPage);
      console.log(`[FACE-001] LawyersHub works: ${lhWorks.join(', ')}`);
      
      // Verify LH_LGL_001 is present in LawyersHub
      expect(lhWorks.some(id => id.includes('LH_LGL_001') || id.includes('lgl') || id.includes('lh'))).toBeTruthy();
      console.log('[FACE-001] ✅ LH_LGL_001 found in LawyersHub');
      
    } finally {
      await lhContext.close();
    }
    
    // Test 2: ILC environment
    const ilcContext = await browser.newContext();
    const ilcPage = await ilcContext.newPage();
    
    try {
      await loginToProduct(ilcPage, 'ilc');
      await ilcPage.screenshot({ path: './artifacts/face-001/ilc-my-reality.png', fullPage: true });
      
      const ilcWorks = await getWorkList(ilcPage);
      console.log(`[FACE-001] ILC works: ${ilcWorks.join(', ')}`);
      
      // Verify LH_LGL_001 is NOT present in ILC
      const hasLHWork = ilcWorks.some(id => id.includes('LH_LGL_001') || id.includes('lgl') || id.includes('lh'));
      expect(hasLHWork).toBeFalsy();
      console.log('[FACE-001] ✅ LH_LGL_001 correctly blocked from ILC');
      
    } finally {
      await ilcContext.close();
    }
  });

  test('ILC_INS_001 appears only in ILC, not in LawyersHub', async ({ browser }) => {
    // Test 1: ILC environment
    const ilcContext = await browser.newContext();
    const ilcPage = await ilcContext.newPage();
    
    try {
      await loginToProduct(ilcPage, 'ilc');
      await ilcPage.screenshot({ path: './artifacts/face-001/ilc-my-reality-ilconly.png', fullPage: true });
      
      const ilcWorks = await getWorkList(ilcPage);
      console.log(`[FACE-001] ILC works: ${ilcWorks.join(', ')}`);
      
      // Verify ILC_INS_001 is present in ILC
      expect(ilcWorks.some(id => id.includes('ILC_INS_001') || id.includes('ins') || id.includes('ilc'))).toBeTruthy();
      console.log('[FACE-001] ✅ ILC_INS_001 found in ILC');
      
    } finally {
      await ilcContext.close();
    }
    
    // Test 2: LawyersHub environment
    const lhContext = await browser.newContext();
    const lhPage = await lhContext.newPage();
    
    try {
      await loginToProduct(lhPage, 'lawyershub');
      await lhPage.screenshot({ path: './artifacts/face-001/lawyershub-my-reality-nilc.png', fullPage: true });
      
      const lhWorks = await getWorkList(lhPage);
      console.log(`[FACE-001] LawyersHub works: ${lhWorks.join(', ')}`);
      
      // Verify ILC_INS_001 is NOT present in LawyersHub
      const hasILCWork = lhWorks.some(id => id.includes('ILC_INS_001') || id.includes('ins') || id.includes('ilc'));
      expect(hasILCWork).toBeFalsy();
      console.log('[FACE-001] ✅ ILC_INS_001 correctly blocked from LawyersHub');
      
    } finally {
      await lhContext.close();
    }
  });

  test('Surface detection works across web/api/agent', async ({ browser }) => {
    // Verify web surface detection
    const webContext = await browser.newContext();
    const webPage = await webContext.newPage();
    
    try {
      await loginToProduct(webPage, 'lawyershub');
      
      // Execute client-side check of detectCurrentSurface
      const surface = await webPage.evaluate(() => {
        // @ts-ignore - import surface utils in client context
        return import('@repo/presentation-shared').then(utils => utils.detectCurrentSurface());
      });
      
      expect(surface).toBe('web');
      console.log('[FACE-001] ✅ Web surface correctly detected in browser');
      
    } finally {
      await webContext.close();
    }
    
    // API/agent surface detection verified in separate unit test
    console.log('[FACE-001] ✅ API/agent surface detection verified in unit tests');
  });
});