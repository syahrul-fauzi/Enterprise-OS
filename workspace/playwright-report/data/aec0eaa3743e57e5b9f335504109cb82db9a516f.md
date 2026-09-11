# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lh-case-001-reality-acceptance.spec.ts >> ERA-001: LH-CASE-001 UI Runtime Verification (Layer A) >> A2: Cross-navigation context preservation (UX behavioral check)
- Location: tests/lh-case-001-reality-acceptance.spec.ts:159:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="work-item-lh-case-001"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Enter EOS" [level=1] [ref=e5]
      - paragraph [ref=e6]: Sign in to your Enterprise Operating System workspace
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Email address
        - textbox "Email address" [ref=e10]: alice@eos.dev
      - generic [ref=e11]:
        - generic [ref=e12]: Password
        - textbox "Password" [ref=e13]: DemoPass123!
      - button "Sign in to EOS" [ref=e15]
    - paragraph [ref=e17]:
      - text: Don't have an account?
      - link "Sign up for free" [ref=e18] [cursor=pointer]:
        - /url: /signup
    - paragraph [ref=e19]: "Demo credentials are pre-filled. Use email: alice@eos.dev, password: DemoPass123!"
  - button "Open Next.js Dev Tools" [ref=e25] [cursor=pointer]
  - alert [ref=e29]
```

# Test source

```ts
  67  |     // Capture console errors
  68  |     page.on('console', msg => console.log(`[BROWSER LOG] ${msg.text()}`));
  69  |     page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));
  70  | 
  71  |     // 3. Wait for workspace page to render (sudah di my-reality)
  72  |     await page.waitForURL(/.*\/my-reality/, { timeout: 15000 });
  73  |     await page.screenshot({ path: 'artifacts/lh-case-001/02-workspace.png', fullPage: true });
  74  |     console.log('[ERA-001-A1] ✓ Page renders correctly (page benar-benar ter-render)');
  75  | 
  76  |     // 6. Skip identity display verification untuk anonymous user (preloaded fixture)
  77  |     // const identityElement = page.locator('[data-testid="user-identity"]');
  78  |     // await expect(identityElement).toBeVisible();
  79  |     // const identityText = await identityElement.textContent();
  80  |     // expect(identityText).toContain(displayName);
  81  |     await page.screenshot({ path: 'artifacts/lh-case-001/03-identity.png', fullPage: true });
  82  |     console.log('[ERA-001-A1] ✓ Identity verification skipped for anonymous fixture user');
  83  | 
  84  |     // 7. Verify LH-CASE-001 exists in work list
  85  |     // Pre-seeded LH-CASE-001 harus terlihat di daftar work
  86  |     const workItem = page.locator('[data-testid="work-item-lh-case-001"]');
  87  |     await expect(workItem).toBeVisible({ timeout: 10000 });
  88  |     (globalThis as any).lhCaseId = 'lh-case-001';
  89  |     await page.screenshot({ path: 'artifacts/lh-case-001/04-work-found.png', fullPage: true });
  90  |     console.log('[ERA-001-A1] ✓ Work LH-CASE-001 tampil di daftar');
  91  | 
  92  |     // 8. Click into the work
  93  |     await workItem.click();
  94  |     await page.waitForURL(/.*\/work\/lh-case-001/, { timeout: 10000 });
  95  |     await page.screenshot({ path: 'artifacts/lh-case-001/05-work-detail.png', fullPage: true });
  96  |     
  97  |     // 9. Verify status is visible
  98  |     const statusElement = page.locator('[data-testid="work-status"]');
  99  |     await expect(statusElement).toBeVisible();
  100 |     const statusText = await statusElement.textContent();
  101 |     console.log(`[ERA-001-A1] Work status: ${statusText}`);
  102 |     console.log('[ERA-001-A1] ✓ status Work terlihat jelas');
  103 | 
  104 |     // 10. Verify actions are available
  105 |     const actionButtons = page.locator('[data-testid^="work-action-"]');
  106 |     const actionCount = await actionButtons.count();
  107 |     expect(actionCount).toBeGreaterThan(0);
  108 |     console.log(`[ERA-001-A1] ✓ ${actionCount} action tersedia`);
  109 | 
  110 |     // 11. Verify evidence section is visible
  111 |     const evidenceSection = page.locator('[data-testid="evidence-section"]');
  112 |     await expect(evidenceSection).toBeVisible();
  113 |     console.log('[ERA-001-A1] ✓ semua evidence yang relevan tampil');
  114 | 
  115 |     // 12. Test responsive viewports
  116 |     const viewports = [
  117 |       { width: 1920, height: 1080, name: 'desktop' },
  118 |       { width: 1024, height: 768, name: 'tablet' },
  119 |       { width: 375, height: 667, name: 'mobile' }
  120 |     ];
  121 |     
  122 |     for (const viewport of viewports) {
  123 |       await page.setViewportSize({ width: viewport.width, height: viewport.height });
  124 |       await page.waitForTimeout(500);
  125 |       // Verify core elements still visible
  126 |       await expect(statusElement).toBeVisible();
  127 |       await expect(evidenceSection).toBeVisible();
  128 |       console.log(`[ERA-001-A1] ✓ Responsive di ${viewport.name}`);
  129 |     }
  130 |     await page.setViewportSize({ width: 1280, height: 720 });
  131 |     console.log('[ERA-001-A1] ✓ responsive di semua viewport');
  132 | 
  133 |     // 13. Test navigation back
  134 |     const backButton = page.locator('[data-testid="nav-back"]');
  135 |     await expect(backButton).toBeVisible();
  136 |     await backButton.click();
  137 |     await page.waitForURL(/.*\/my-reality/, { timeout: 5000 });
  138 |     await page.screenshot({ path: 'artifacts/lh-case-001/06-navigation-back.png', fullPage: true });
  139 |     console.log('[ERA-001-A1] ✓ navigation berfungsi dengan benar');
  140 | 
  141 |     // 14. Verify error state can be triggered (test error state display)
  142 |     // Navigate to invalid work ID to test 404/error state
  143 |     await page.goto('/work/invalid-work-id-1234', { waitUntil: 'networkidle' });
  144 |     const errorElement = page.locator('[data-testid="error-state"]');
  145 |     await expect(errorElement).toBeVisible({ timeout: 5000 });
  146 |     const errorText = await errorElement.textContent();
  147 |     console.log(`[ERA-001-A1] Error state displayed: ${errorText?.substring(0, 50)}...`);
  148 |     await page.screenshot({ path: 'artifacts/lh-case-001/07-error-state.png', fullPage: true });
  149 |     console.log('[ERA-001-A1] ✓ error state dapat ditampilkan');
  150 | 
  151 |     // Final screenshot untuk Layer A verification complete
  152 |     await page.goto('/work/lh-case-001');
  153 |     await page.waitForLoadState('networkidle');
  154 |     await page.screenshot({ path: 'artifacts/lh-case-001/99-layer-a-complete.png', fullPage: true });
  155 | 
  156 |     console.log('\n[ERA-001-A1] === LAYER A (UI RUNTIME) SEMUA KRITERIA LULUS ===');
  157 |   });
  158 | 
  159 |   test('A2: Cross-navigation context preservation (UX behavioral check)', async ({ page }) => {
  160 |     console.log('\n[ERA-001-A2] === STEP 1: Navigasi konteks preservation ===');
  161 |     
  162 |     // Login kembali dan navigasi ke LH-CASE-001
  163 |     await page.goto('/workspace');
  164 |     await page.waitForLoadState('networkidle');
  165 |     
  166 |     const workItem = page.locator('[data-testid="work-item-lh-case-001"]');
> 167 |     await workItem.click();
      |                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  168 |     await page.waitForURL(/.*\/work\/lh-case-001/, { timeout: 10000 });
  169 |     
  170 |     // Navigasi bolak-balik untuk verifikasi konteks tidak hilang
  171 |     const backButton = page.locator('[data-testid="nav-back"]');
  172 |     
  173 |     // First navigation back
  174 |     await backButton.click();
  175 |     await page.waitForURL(/.*\/workspace/, { timeout: 5000 });
  176 |     
  177 |     // Navigate back in again
  178 |     await workItem.click();
  179 |     await page.waitForURL(/.*\/work\/lh-case-001/, { timeout: 5000 });
  180 |     
  181 |     // Verify we're still on the correct work
  182 |     const pageUrl = page.url();
  183 |     expect(pageUrl).toContain('/work/lh-case-001');
  184 |     const statusElement = page.locator('[data-testid="work-status"]');
  185 |     await expect(statusElement).toBeVisible();
  186 |     
  187 |     console.log('[ERA-001-A2] ✓ Work yang dipilih tetap Work yang sama setelah navigasi');
  188 |     console.log('[ERA-001-A2] ✓ user tidak kehilangan context');
  189 | 
  190 |     await page.screenshot({ path: 'artifacts/lh-case-001/08-context-preservation.png', fullPage: true });
  191 |   });
  192 | });
```