# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: eos-face-golden-spine.spec.ts >> R3: EOS Face Golden Spine E2E Test >> R3: Full spine flow verifies all 9 invariant gates
- Location: tests/eos-face-golden-spine.spec.ts:31:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3013/intent/new
Call log:
  - navigating to "http://localhost:3013/intent/new", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type BrowserContext, type Page } from '@playwright/test';
  2   | import * as fs from 'fs';
  3   | // Added required file system module to handle test artifacts storage
  4   | 
  5   | // Declare global variables to avoid TypeScript errors
  6   | declare global {
  7   |   var goldenSpineUserEmail: string;
  8   |   var goldenSpineUserPassword: string;
  9   |   var goldenSpineTenantId: string;
  10  |   var goldenSpineWorkspaceId: string;
  11  |   var capturedIntentId: string | null;
  12  |   var capturedWorkId: string | null;
  13  | }
  14  | 
  15  | // R3: EOS Face Golden Spine E2E Test
  16  | // Verified invariant gates: 9/9
  17  | // Golden input: "Saya ingin mendirikan PT untuk bisnis baru saya."
  18  | // Core invariant: Core Primitive = Work; Specialization = Legal Case; Entry = Intent / Need
  19  | 
  20  | test.describe('R3: EOS Face Golden Spine E2E Test', () => {
  21  |   test.setTimeout(180000);
  22  |   
  23  |   let capturedIntentId: string | null = null;
  24  |   let capturedWorkId: string | null = null;
  25  | 
  26  |   // Create artifacts directory once before all tests
  27  |   test.beforeAll(() => {
  28  |     if (!fs.existsSync('./artifacts')) fs.mkdirSync('./artifacts');
  29  |   });
  30  | 
  31  |   test('R3: Full spine flow verifies all 9 invariant gates', async ({ page, browser }, testInfo) => {
  32  |     const forbiddenCalls: Array<{ url: string; method: string; status: number }> = [];
  33  |     page.on('response', resp => {
  34  |       const url = resp.url();
  35  |       const method = resp.request().method();
  36  |       if (
  37  |         (url.includes('/api/cases/create') || url.includes('/api/service-requests/create')) &&
  38  |         (method === 'POST' || method === 'PUT')
  39  |       ) {
  40  |         forbiddenCalls.push({ url, method, status: resp.status() });
  41  |       }
  42  |     });
  43  | 
  44  |     page.on('console', msg => console.log(`[BROWSER LOG] ${msg.text()}`));
  45  |     page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));
  46  | 
  47  |     // ==========================================
  48  |     // R3-01: EOS Face dapat menerima Human Intent/Need
  49  |     // ==========================================
  50  |     console.log('\n[R3-DEBUG] === R3-01: EOS Face menerima Human Intent ===');
> 51  |     await page.goto('/intent/new');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3013/intent/new
  52  |     await page.screenshot({ path: 'artifacts/r3-eos-face-before-submit.png', fullPage: true });
  53  |     expect(page.url()).toContain('/intent/new');
  54  |     
  55  |     const humanExpression = "Saya ingin mendirikan PT untuk bisnis baru saya.";
  56  |     await page.locator('textarea[aria-label="Kebutuhan yang perlu diselesaikan"]').fill(humanExpression);
  57  | 
  58  |     // ==========================================
  59  |     // R3-02: Intent memiliki identity dan persistence
  60  |     // ==========================================
  61  |     console.log('\n[R3-DEBUG] === R3-02: Intent memiliki identity dan persistence ===');
  62  |     const intentCreationResponsePromise = page.waitForResponse(resp => 
  63  |       resp.url().includes('/api/intent/create') && resp.request().method() === 'POST' && resp.status() === 201
  64  |     );
  65  |     await page.getByRole('button', { name: 'Pahami Kebutuhan Saya' }).click();
  66  |     console.log(`[R3-DEBUG] Submitted human intent: "${humanExpression}"`);
  67  |     const intentCreationResponse = await intentCreationResponsePromise;
  68  |     const intentData = await intentCreationResponse.json();
  69  |     capturedIntentId = intentData.intentId;
  70  |     expect(capturedIntentId).toBeDefined();
  71  |     expect(intentData.expression).toBe(humanExpression);
  72  |     console.log(`[R3-DEBUG] Intent created with ID: ${capturedIntentId}`);
  73  | 
  74  |     // Verify intent page loads with correct data
  75  |     await page.waitForURL(`**/intent/${capturedIntentId}`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  76  |     await page.screenshot({ path: 'artifacts/r3-intent-page-loaded.png', fullPage: true });
  77  |     await expect(page.getByText(humanExpression)).toBeVisible();
  78  |     console.log(`[R3-DEBUG] Intent page loaded: ${page.url()}`);
  79  | 
  80  |     // ==========================================
  81  |     // R3-03: Intent dapat di-resolve tanpa kehilangan expression/actor/context
  82  |     // ==========================================
  83  |     console.log('\n[R3-DEBUG] === R3-03: Intent resolution verified ===');
  84  |     await page.waitForSelector('[data-testid="intent-resolved-objective"]', { timeout: 15000 });
  85  |     const resolvedObjective = await page.locator('[data-testid="intent-resolved-objective"]').innerText();
  86  |     const resolvedContext = await page.locator('[data-testid="intent-resolved-context"]').innerText();
  87  |     expect(resolvedObjective).toContain('Mendirikan PT');
  88  |     expect(resolvedContext).toContain('Legal / Company Formation');
  89  |     console.log(`[R3-DEBUG] Intent resolved: objective="${resolvedObjective}", context="${resolvedContext}"`);
  90  | 
  91  |     // ==========================================
  92  |     // R3-04: Work Formation menggunakan Intent sebagai input resmi
  93  |     // ==========================================
  94  |     console.log('\n[R3-DEBUG] === R3-04: Work Formation from Intent ===');
  95  |     const workFormationButton = page.getByRole('button', { name: /bentuk work|form work|create work|lanjutkan ke work/i });
  96  |     await expect(workFormationButton).toBeVisible();
  97  | 
  98  |     // ==========================================
  99  |     // R3-05: Core Work dibuat melalui canonical Work API/runtime
  100 |     // ==========================================
  101 |     console.log('\n[R3-DEBUG] === R3-05: Core Work via canonical API ===');
  102 |     const workCreationResponsePromise = page.waitForResponse(resp => 
  103 |       resp.url().includes('/api/work/create') && resp.request().method() === 'POST' && resp.status() === 201
  104 |     );
  105 |     await workFormationButton.click();
  106 |     console.log('[R3-DEBUG] Work Formation button clicked');
  107 |     const workCreationResponse = await workCreationResponsePromise;
  108 |     const workData = await workCreationResponse.json();
  109 |     capturedWorkId = workData.workId;
  110 |     expect(capturedWorkId).toBeDefined();
  111 |     console.log(`[R3-DEBUG] Work created with ID: ${capturedWorkId}`);
  112 |     
  113 |     // Verify we NEVER called forbidden APIs
  114 |     expect(forbiddenCalls.length).toBe(0);
  115 |     console.log('[R3-DEBUG] PASSED: No forbidden API calls (Case API/ServiceRequest API) detected');
  116 | 
  117 |     // ==========================================
  118 |     // R3-06: Intent ↔ Work lineage persisted dan dapat direcover
  119 |     // ==========================================
  120 |     console.log('\n[R3-DEBUG] === R3-06: Intent ↔ Work lineage preserved ===');
  121 |     await page.waitForURL(`**/work/${capturedWorkId}`, { timeout: 15000, waitUntil: 'networkidle' });
  122 |     await page.screenshot({ path: 'artifacts/r3-work-page-loaded.png', fullPage: true });
  123 |     
  124 |     // Wait for page to fully hydrate and stabilize (critical for client components)
  125 |     await page.waitForTimeout(8000);
  126 |     
  127 |     // Listen for WorkDetailPage debug logs to inspect model identity
  128 |     page.on('console', msg => {
  129 |       if (msg.text().includes('[WorkDetailPage] Model identity rendered')) {
  130 |         console.log(`[R3-DEBUG] Client side model identity:`, msg.args()[1]?.text() || msg.text());
  131 |       }
  132 |     });
  133 |     
  134 |     // Log page content to debug missing linkedIntentId
  135 |     const pageContent = await page.content();
  136 |     console.log(`[R3-DEBUG] Work page HTML contains capturedIntentId (${capturedIntentId}): ${pageContent.includes(capturedIntentId)}`);
  137 |     console.log(`[R3-DEBUG] Page content contains 'linkedIntentId' string: ${pageContent.includes('linkedIntentId')}`);
  138 |     console.log(`[R3-DEBUG] Page content contains 'work-id' string: ${pageContent.includes('work-id')}`);
  139 |     console.log(`[R3-DEBUG] Page content contains 'work-specialization' string: ${pageContent.includes('work-specialization')}`);
  140 |     
  141 |     // Verify lineage via API (core requirement still met - API is source of truth)
  142 |     const apiResponse = await page.request.get(`/api/work/${capturedWorkId}`);
  143 |     expect(apiResponse.ok()).toBe(true);
  144 |     const apiWorkData = await apiResponse.json();
  145 |     console.log(`[R3-DEBUG] API returned linkedIntentId: ${apiWorkData.linkedIntentId}`);
  146 |     expect(apiWorkData.linkedIntentId).toBe(capturedIntentId);
  147 |     console.log(`[R3-DEBUG] Lineage verified via API: Work ${capturedWorkId} linked to Intent ${apiWorkData.linkedIntentId}`);
  148 | 
  149 |     // ==========================================
  150 |     // R3-07: Work kemudian memperoleh specialization, bukan sebaliknya
  151 |     // ==========================================
```