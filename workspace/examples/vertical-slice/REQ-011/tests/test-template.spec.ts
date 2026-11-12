import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// ERA-001: VERTICAL SLICE UI Runtime Layer A Verification (Template)
// Template ini generik untuk semua slice baru yang menggunakan _template/
// Setiap slice akan menyesuaikan testId, workTestId, dan slice-specific assertion

declare global {
  var sliceUserEmail: string;
  var sliceUserPassword: string;
  var sliceWorkspaceId: string;
  var sliceId: string;
}

test.describe('ERA-001: [SLICE-ID] UI Runtime Verification (Layer A)', () => {
  const sliceId = process.env.SLICE_ID || 'REQ-XXXX';
  const timestamp = Date.now();
  (globalThis as any).sliceUserEmail = `slice-${sliceId}-${timestamp}@example.test`;
  (globalThis as any).sliceUserPassword = 'secure-eos-password-123!';
  const displayName = 'EOS Verification User';

  // Setup artifacts directory untuk slice ini
  test.beforeAll(async () => {
    const artifactsDir = path.join(process.cwd(), 'artifacts', sliceId);
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    // Baca acceptance.yaml slice untuk verifikasi data
    const acceptancePath = path.join(process.cwd(), 'examples', 'vertical-slice', sliceId, 'acceptance.yaml');
    if (fs.existsSync(acceptancePath)) {
      console.log(`[ERA-001-TEMPLATE] ✓ Found acceptance.yaml for slice ${sliceId}`);
    }
  });

  test('A1: Page rendering & core UI elements verification', async ({ page, context }) => {
    console.log(`\n[ERA-001-A1] === STEP 1: Signup & Login untuk akses Workspace (${sliceId}) ===`);
    
    await page.screenshot({ path: `artifacts/${sliceId}/01-start.png`, fullPage: true });

    // 1. Go to signup page
    const signupResponse = await page.goto('/signup');
    expect(signupResponse?.ok()).toBeTruthy();
    
    page.on('console', msg => console.log(`[BROWSER LOG] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    // 2. Fill signup form
    await page.getByLabel('Display Name *').fill(displayName);
    await page.getByLabel('Email *').fill((globalThis as any).sliceUserEmail);
    await page.getByLabel('Password *').fill((globalThis as any).sliceUserPassword);
    
    // 3. Submit signup
    const signupRequestPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/signup') && resp.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Create Account & Enter Workspace' }).click();
    const signupResponse2 = await signupRequestPromise;
    expect(signupResponse2.status()).toBe(201);

    // 4. Wait for workspace page
    await page.waitForURL(/.*\/workspace/, { timeout: 15000 });
    await page.screenshot({ path: `artifacts/${sliceId}/02-workspace.png`, fullPage: true });
    console.log(`[ERA-001-A1] ✓ Page renders correctly (slice ${sliceId})`);

    // 5. Verify identity display
    const identityElement = page.locator('[data-testid="user-identity"]');
    await expect(identityElement).toBeVisible();
    console.log(`[ERA-001-A1] ✓ Identity actor tampil dengan benar`);

    // 6. Verify slice work exists in work list (data-testid="work-item-{sliceId}")
    const workItem = page.locator(`[data-testid="work-item-${sliceId}"]`);
    await expect(workItem).toBeVisible({ timeout: 10000 });
    (globalThis as any).sliceId = sliceId;
    await page.screenshot({ path: `artifacts/${sliceId}/04-work-found.png`, fullPage: true });
    console.log(`[ERA-001-A1] ✓ Work ${sliceId} tampil di daftar`);

    // 7. Click into work detail
    await workItem.click();
    await page.waitForURL(new RegExp(`.*\\/work\\/${sliceId}`), { timeout: 10000 });
    await page.screenshot({ path: `artifacts/${sliceId}/05-work-detail.png`, fullPage: true });
    
    // 8. Verify status visible
    const statusElement = page.locator('[data-testid="work-status"]');
    await expect(statusElement).toBeVisible();
    console.log(`[ERA-001-A1] ✓ status Work terlihat jelas`);

    // 9. Verify actions available
    const actionButtons = page.locator('[data-testid^="work-action-"]');
    const actionCount = await actionButtons.count();
    expect(actionCount).toBeGreaterThan(0);
    console.log(`[ERA-001-A1] ✓ ${actionCount} action tersedia`);

    // 10. Verify evidence section visible
    const evidenceSection = page.locator('[data-testid="evidence-section"]');
    await expect(evidenceSection).toBeVisible();
    console.log(`[ERA-001-A1] ✓ semua evidence yang relevan tampil`);

    // 11. Responsive viewports test
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      await expect(statusElement).toBeVisible();
      await expect(evidenceSection).toBeVisible();
      console.log(`[ERA-001-A1] ✓ Responsive di ${viewport.name}`);
    }
    await page.setViewportSize({ width: 1280, height: 720 });

    // 12. Navigation back test
    const backButton = page.locator('[data-testid="nav-back"]');
    await expect(backButton).toBeVisible();
    await backButton.click();
    await page.waitForURL(/.*\/workspace/, { timeout: 5000 });
    await page.screenshot({ path: `artifacts/${sliceId}/06-navigation-back.png`, fullPage: true });
    console.log(`[ERA-001-A1] ✓ navigation berfungsi dengan benar`);

    // 13. Error state test
    await page.goto(`/work/invalid-work-id-1234`, { waitUntil: 'networkidle' });
    const errorElement = page.locator('[data-testid="error-state"]');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `artifacts/${sliceId}/07-error-state.png`, fullPage: true });
    console.log(`[ERA-001-A1] ✓ error state dapat ditampilkan`);

    await page.screenshot({ path: `artifacts/${sliceId}/99-layer-a-complete.png`, fullPage: true });
    console.log(`\n[ERA-001-A1] === LAYER A (UI RUNTIME) SEMUA KRITERIA LULUS (${sliceId}) ===`);
  });

  test('A2: Cross-navigation context preservation (UX behavioral check)', async ({ page }) => {
    console.log(`\n[ERA-001-A2] === STEP 1: Navigasi konteks preservation (${sliceId}) ===`);
    
    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    
    const workItem = page.locator(`[data-testid="work-item-${sliceId}"]`);
    await workItem.click();
    await page.waitForURL(new RegExp(`.*\\/work\\/${sliceId}`), { timeout: 10000 });
    
    const backButton = page.locator('[data-testid="nav-back"]');
    await backButton.click();
    await page.waitForURL(/.*\/workspace/, { timeout: 5000 });
    await workItem.click();
    await page.waitForURL(new RegExp(`.*\\/work\\/${sliceId}`), { timeout: 10000 });
    
    const pageUrl = page.url();
    expect(pageUrl).toContain(`/work/${sliceId}`);
    const statusElement = page.locator('[data-testid="work-status"]');
    await expect(statusElement).toBeVisible();
    
    console.log(`[ERA-001-A2] ✓ Work yang dipilih tetap Work yang sama setelah navigasi (${sliceId})`);
    await page.screenshot({ path: `artifacts/${sliceId}/08-context-preservation.png`, fullPage: true });
  });
});