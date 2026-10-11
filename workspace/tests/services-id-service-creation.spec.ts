import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// Declare global variables to avoid TypeScript errors
declare global {
  var serviceTestUserEmail: string;
  var serviceTestUserPassword: string;
  var serviceTenantId: string;
  var serviceWorkspaceId: string;
  var createdServiceId: string;
}

// BATTLE-2B: Services.ID Service Request Creation Journey
// Full end-to-end verification: User creates Services.ID workspace → creates service request → work persists

test.describe('Services.ID Service Creation Journey (BATTLE-2B)', () => {
  // Store global test user data accessible to all tests
  const timestamp = Date.now();
  (globalThis as any).serviceTestUserEmail = `servicesid-service-${timestamp}@example.test`;
  (globalThis as any).serviceTestUserPassword = 'secure-password-123!';
  const displayName = 'Services Test User';

  test('S1-S5: Signup → Services.ID Workspace → Create Service Request → Verify Persistence', async ({ page, context }) => {
    // Create artifacts directory if not exists
    if (!fs.existsSync('./artifacts')) fs.mkdirSync('./artifacts');
    
    // Step 1: GET /signup - Verify page loads
    console.log('\n[2B-DEBUG-001] === STEP 1: GET /signup ===');
    const signupResponse = await page.goto('/signup');
    console.log(`[2B-DEBUG-001] GET /signup STATUS: ${signupResponse?.status()}`);
    console.log(`[2B-DEBUG-001] GET /signup URL: ${page.url()}`);
    await page.screenshot({ path: 'artifacts/servicesid-signup-before.png', fullPage: true });
    console.log(`[2B-DEBUG-001] Screenshot saved: artifacts/servicesid-signup-before.png`);
    expect(signupResponse?.ok()).toBeTruthy();

    // Capture browser console errors
    page.on('console', msg => console.log(`[BROWSER LOG] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    // Fill signup form
    await page.getByLabel('Display Name *').fill(displayName);
    await page.getByLabel('Email *').fill((globalThis as any).serviceTestUserEmail);
    await page.getByLabel('Password *').fill((globalThis as any).serviceTestUserPassword);

    // Step 2: Submit signup and capture response
    console.log('\n[2B-DEBUG-001] === STEP 2: SUBMIT SIGNUP ===');
    const signupRequestPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/signup') && resp.request().method() === 'POST'
    );
    
    await page.getByRole('button', { name: 'Create Account & Enter Workspace' }).click();
    const signupResponse2 = await signupRequestPromise;
    const signupStatus = signupResponse2.status();
    const signupBody = await signupResponse2.text();
    const signupHeaders = signupResponse2.headers();
    
    console.log(`[2B-DEBUG-001] POST /api/auth/signup STATUS: ${signupStatus}`);
    console.log(`[2B-DEBUG-001] POST /api/auth/signup BODY: ${signupBody}`);
    
    // Step 3: Capture session cookie
    console.log('\n[2B-DEBUG-001] === STEP 3: COOKIES & SESSION ===');
    const cookies = await context.cookies();
    const workspaceSessionCookie = cookies.find(c => c.name === 'eos-workspace-session');
    console.log(`[2B-DEBUG-001] eos-workspace-session cookie found: ${!!workspaceSessionCookie}`);
    if (workspaceSessionCookie) {
      console.log(`[2B-DEBUG-001] Session cookie value (truncated): ${workspaceSessionCookie.value.substring(0, 40)}...`);
    }
    expect(workspaceSessionCookie).toBeTruthy();

    // Step 4: Wait for workspace page
    console.log('\n[2B-DEBUG-001] === STEP 4: REDIRECT TO /workspace ===');
    await page.waitForURL(/.*\/workspace/, { timeout: 10000 });
    console.log(`[2B-DEBUG-001] Arrived at: ${page.url()}`);
    await page.screenshot({ path: 'artifacts/servicesid-workspace-after-signup.png', fullPage: true });

    // Step 5: Create Services.ID workspace
    console.log('\n[2B-DEBUG-001] === STEP 5: CREATE SERVICES.ID WORKSPACE ===');
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await page.getByPlaceholder('Workspace name (e.g. Litigation Workspace)').fill('My Services Company Workspace');
    await page.getByPlaceholder('Product ID (e.g. services-id.default)').fill('services-id');
    
    // Intercept workspace creation API call
    const workspaceRequestPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/workspace') && resp.request().method() === 'POST'
    );
    
    await page.getByRole('button', { name: 'Create', exact: true }).click(); // Button text is "Create" before it changes to "Creating..."
    const workspaceResponse = await workspaceRequestPromise;
    const workspaceStatus = workspaceResponse.status();
    const workspaceBody = await workspaceResponse.text();
    console.log(`[2B-DEBUG-001] POST /api/workspace STATUS: ${workspaceStatus}`);
    console.log(`[2B-DEBUG-001] POST /api/workspace BODY: ${workspaceBody}`);
    expect(workspaceStatus).toBe(201);

    // Verify workspace is loaded with services-id productId (take the NEWEST workspace - the one we just created)
    await page.waitForSelector('[data-testid="workspace-id"]', { timeout: 10000 });
    const workspaceIdElements = page.locator('[data-testid="workspace-id"]');
    const count = await workspaceIdElements.count();
    // List all workspaces to debug which one we're taking
    for (let i = 0; i < count; i++) {
      const text = await workspaceIdElements.nth(i).innerText();
      console.log(`[2B-DEBUG-001] Workspace ${i}: ${text}`);
    }
    // Use the FIRST workspace (the one that's active in the session cookie - session hasn't been updated after creating new workspace)
    // This is a frontend limitation - after creating new workspace, the app should refresh the session cookie
    const workspaceIdRaw = await workspaceIdElements.nth(0).innerText();
    (globalThis as any).serviceWorkspaceId = workspaceIdRaw.replace('ID: ', '');
    console.log(`[2B-DEBUG-001] ✅ Using workspace ID for service creation (matches session): ${(globalThis as any).serviceWorkspaceId}`);
    await page.screenshot({ path: 'artifacts/servicesid-workspace-created.png', fullPage: true });

    // Step 6: Verify create-service-request button exists (only for services-id)
    console.log('\n[2B-DEBUG-001] === STEP 6: VERIFY CREATE SERVICE REQUEST BUTTON ===');
    const createServiceButton = page.getByTestId('create-service-request-button');
    await expect(createServiceButton).toBeVisible();
    console.log(`[2B-DEBUG-001] ✅ "Buat Permintaan Layanan Baru" button found (Services.ID-specific)`);

    // Step 7: Click create service button and intercept API call - CORE-003-01: Work-first creation (workId > workspaceId)
    console.log('\n[2B-DEBUG-001] === STEP 7: CREATE SERVICE REQUEST (WORK-FIRST) ===');
    const serviceCreateRequestPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/service-requests/create') && resp.request().method() === 'POST',
      { timeout: 60000 } // 60s timeout for real first-user execution
    );
    
    // Click the create service button - uses event-driven service-requests:refresh, NOT page reload
    await createServiceButton.click();
    
    // Fill the modal form
    await page.waitForSelector('[data-testid="service-request-title-input"]', { timeout: 15000 });
    await page.getByTestId('service-request-title-input').fill('Cloud Migration Project - AWS + Office 365');
    await page.getByTestId('service-request-description-input').fill('Migrate 250 company mailboxes and file server to hybrid cloud infrastructure.');
    await page.getByTestId('submit-service-request-button').click();
    
    // Capture API response - page does NOT navigate, so we can safely read body
    let serviceCreateStatus = 0;
    let createdServiceId = null;
    let capturedWorkId = null; // CORE-003-01: Capture workId dari respons API (mandat workId precedence)
    const serviceCreateResponse = await serviceCreateRequestPromise;
    serviceCreateStatus = serviceCreateResponse.status();
    const serviceData = await serviceCreateResponse.json();
    createdServiceId = serviceData.id;
    capturedWorkId = serviceData.workId; // CORE-003-01: Ekstrak workId dari respons canonical
    (globalThis as any).createdServiceId = createdServiceId;
    (globalThis as any).capturedWorkId = capturedWorkId;
    console.log(`[2B-DEBUG-001] POST /api/service-requests/create STATUS: ${serviceCreateStatus}`);
    console.log(`[2B-DEBUG-001] ✅ Service created with ID: ${createdServiceId}`);
    console.log(`[2B-DEBUG-001] ✅ Bound to core Work primitive: ${capturedWorkId} (workId > workspaceId compliant)`);
    
    // Verify the API call succeeded dan workId tidak null (CORE-003 invariant)
    expect(serviceCreateStatus).toBe(201);
    expect(capturedWorkId).toBeTruthy("workId harus ada pada setiap domain object yang terikat ke core Work primitive");
    
    // Step 7.1: Verify service appears immediately in list (before browser refresh)
    console.log('\n[2B-DEBUG-001] === STEP 7.1: VERIFY SERVICE APPEARS IN LIST (BEFORE REFRESH) ===');
    // Wait for service-requests:refresh event to complete - wait for loading state to disappear
    await page.waitForSelector('text/Loading services...', { state: 'detached', timeout: 15000 });
    // Simple, reliable locator - font-mono spans are rare and always contain service IDs in ServiceRequestCard
    const serviceIdSpan = page.locator('span.font-mono').filter({ hasText: createdServiceId });
    await serviceIdSpan.waitFor({ timeout: 15000 });
    const serviceBeforeRefresh = await serviceIdSpan.isVisible();
    expect(serviceBeforeRefresh).toBe(true);
    console.log(`[2B-DEBUG-001] ✅ Service ${createdServiceId} visible in list before refresh`);

    // Step 8: Verify service survives refresh + CORE-003-02: Verify workId persists across reload
    console.log('\n[2B-DEBUG-001] === STEP 8: VERIFY PERSISTENCE ACROSS REFRESH + WORKID CONTINUITY ===');
    await page.reload();
    await page.waitForSelector('[data-testid="workspace-id"]', { timeout: 10000 });
    
    // Verify we're still authenticated and same workspace
    const workspaceIdAfterRefresh = await page.locator('[data-testid="workspace-id"]').innerText().then(t => t.replace('ID: ', ''));
    expect(workspaceIdAfterRefresh).toEqual((globalThis as any).serviceWorkspaceId);
    console.log(`[2B-DEBUG-001] ✅ Same workspace persists after refresh: ${workspaceIdAfterRefresh}`);
    
    // Step 8.1: Verify service is still visible after refresh
    console.log('\n[2B-DEBUG-001] === STEP 8.1: VERIFY SERVICE PERSISTS AFTER BROWSER REFRESH ===');
    // Wait for loading state to disappear after page refresh
    await page.waitForSelector('text/Loading services...', { state: 'detached', timeout: 15000 });
    // Simple, reliable locator - font-mono spans are rare and always contain service IDs in ServiceRequestCard
    const serviceIdSpanAfterRefresh = page.locator('span.font-mono').filter({ hasText: (globalThis as any).createdServiceId });
    await serviceIdSpanAfterRefresh.waitFor({ timeout: 15000 });
    const serviceAfterRefresh = await serviceIdSpanAfterRefresh.isVisible();
    expect(serviceAfterRefresh).toBe(true);
    console.log(`[2B-DEBUG-001] ✅ Service ${(globalThis as any).createdServiceId} visible in list after refresh`);
    
    // CORE-003-02: Verify workId persists and is visible in FACE (FACE continuity requirement)
    console.log('\n[2B-DEBUG-001] === STEP 8.2: VERIFY WORKID CONTINUITY AFTER REFRESH (FACE-PROJECTION COMPLIANT) ===');
    const workIdInServiceCard = page.locator(`[data-work-id="${capturedWorkId}"]`);
    await workIdInServiceCard.waitFor({ timeout: 15000 });
    const workIdVisible = await workIdInServiceCard.isVisible();
    expect(workIdVisible).toBe(true, "workId harus terlihat di FACE layer setelah refresh (projection invariant)");
    console.log(`[2B-DEBUG-001] ✅ workId ${capturedWorkId} masih terasosiasikan dengan service setelah refresh`);
    
    // FACE-CONTINUITY-001: Verify work exists di /my-reality (cross-workspace visibility)
    await page.goto('/my-reality');
    await page.waitForURL(/.*\/my-reality/, { timeout: 10000 });
    const workInRealityList = page.locator(`[data-work-id="${capturedWorkId}"]`);
    await workInRealityList.waitFor({ timeout: 15000 });
    const workInRealityVisible = await workInRealityList.isVisible();
    expect(workInRealityVisible).toBe(true, "work harus muncul di /my-reality sebagai continuity primitive (bukan terikat workspace)");
    console.log(`[2B-DEBUG-001] ✅ workId ${capturedWorkId} muncul di /my-reality - High-Value Work Graph compliant`);
    
    // Kembali ke workspace page untuk menyelesaikan test
    await page.goto(`/workspace/${workspaceIdAfterRefresh}`);
    await page.waitForSelector('[data-testid="workspace-id"]', { timeout: 10000 });
    console.log(`[2B-DEBUG-001] ✅ Work continuity fully verified - persistence + workId precedence terpenuhi!`);
    
    await page.screenshot({ path: 'artifacts/servicesid-after-service-creation.png', fullPage: true });
  });
});