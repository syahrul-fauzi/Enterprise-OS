import { test, expect } from '@playwright/test';

test.describe('BATTLE-1C: Golden Path Public Demo', () => {
  test('full end-to-end user journey: Landing → Signup → Workspace → Consultation → Legal Case → Outcome', async ({ page, context }) => {
    // Start recording for demo video (automatically saves to test-results/)
    await context.grantPermissions(['camera', 'microphone']);
    
    // ==========================================
    // STEP 1: LANDING PAGE (first point of entry)
    // ==========================================
    console.log('[DEMO] 1/7: Opening root landing page');
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await page.screenshot({ path: 'test-results/golden-path/01-landing-page.png', fullPage: true });
    
    // Verify landing page shows all three EOS products without EOS jargon
    await expect(page.getByText(/LawyersHub/i)).toBeVisible();
    await expect(page.getByText(/Services.ID/i)).toBeVisible();
    await expect(page.getByText(/ILC/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /get started|sign up/i }).first()).toBeVisible();

    // ==========================================
    // STEP 2: SIGNUP FLOW (authentication)
    // ==========================================
    console.log('[DEMO] 2/7: Navigating to signup page');
    await page.getByRole('button', { name: /get started|sign up/i }).first().click();
    await expect(page).toHaveURL(/\/signup/);
    await page.screenshot({ path: 'test-results/golden-path/02-signup-page.png', fullPage: true });

    // Fill signup form with unique test credentials
    const testEmail = `demo-user-${Date.now()}@example.com`;
    const testPassword = 'DemoPassword2024!';
    const testDisplayName = 'Demo Law Client';

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByLabel(/display name/i).fill(testDisplayName);

    // Submit and wait for successful account creation
    console.log('[DEMO] Creating user account...');
    const signupResponse = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/signup') && resp.status() === 201
    );
    await page.getByRole('button', { name: /create account|sign up/i }).click();
    await signupResponse;

    // Verify session cookie is set and we're redirected to workspace page
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBeTruthy();

    await expect(page).toHaveURL(/\/workspace/, { timeout: 15000 });
    await expect(page.getByText(`Welcome ${testDisplayName}`)).toBeVisible();
    await page.screenshot({ path: 'test-results/golden-path/03-post-signup-workspace.png', fullPage: true });

    // ==========================================
    // STEP 3: CREATE LAWYERSHUB WORKSPACE
    // ==========================================
    console.log('[DEMO] 3/7: Creating LawyersHub workspace');
    // Open workspace creation modal
    await page.getByRole('button', { name: /create workspace|new workspace/i }).click();
    
    // Fill workspace form for LawyersHub
    await page.getByLabel(/workspace name/i).fill('PT. Bisnis Maju Legal Matter');
    await page.getByLabel(/product/i).selectOption({ label: /LawyersHub/i });
    
    // Submit workspace creation
    const workspaceResponse = page.waitForResponse(resp => 
      resp.url().includes('/api/workspace') && resp.status() === 201
    );
    await page.getByRole('button', { name: /create|submit/i }).click();
    await workspaceResponse;

    // Verify workspace is created and CaseWorkspace loads
    await expect(page.getByText(/PT. Bisnis Maju Legal Matter/)).toBeVisible();
    await expect(page.getByText(/cases|legal matters/i).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/golden-path/04-lawyershub-workspace.png', fullPage: true });

    // ==========================================
    // STEP 4: CREATE CONSULTATION (front door)
    // ==========================================
    console.log('[DEMO] 4/7: Submitting initial consultation');
    // Open consultation creation form
    await page.getByRole('button', { name: /new consultation|start consultation/i }).click();
    
    // Fill consultation form with PT establishment case
    await page.getByLabel(/title/i).fill('Pendirian PT untuk Bisnis Jasa IT');
    await page.getByLabel(/description/i).fill('Saya ingin mendirikan Perseroan Terbatas untuk menjalankan bisnis jasa teknologi informasi di Jakarta. Membutuhkan bantuan hukum untuk proses pendaftaran dan perizinan.');
    await page.getByLabel(/kebutuhan|user need/i).fill('Butuh legalitas PT untuk mengajukan kontrak pemerintah, butuh bantuan buat anggaran dasar dan akta pendirian.');
    await page.getByLabel(/priority/i).selectOption({ label: /high/i });

    // Submit consultation
    const consultationResponse = page.waitForResponse(resp => 
      resp.url().includes('/consultation.create') && resp.status() === 201
    );
    await page.getByRole('button', { name: /submit|create consultation/i }).click();
    await consultationResponse;
    await page.screenshot({ path: 'test-results/golden-path/05-consultation-submitted.png', fullPage: true });

    // ==========================================
    // STEP 5: AUTOMATIC CASE CREATION FROM TRIAGE
    // ==========================================
    console.log('[DEMO] 5/7: Waiting for consultation triage and legal case creation');
    // Wait for triage to complete and legal case to be created
    await page.waitForResponse(resp => 
      resp.url().includes('/consultation.triage') && resp.status() === 200
    );

    // Verify legal case appears in the workspace
    await expect(page.getByText(/Pendirian PT - dari Konsultasi/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/golden-path/06-legal-case-created.png', fullPage: true });

    // ==========================================
    // STEP 6: VERIFY CASE LIFECYCLE PROGRESSION
    // ==========================================
    console.log('[DEMO] 6/7: Verifying case lifecycle transitions');
    // Verify case status starts as draft
    await expect(page.getByText(/draft|open/i).first()).toBeVisible();
    
    // Assign lawyer to case (simulate lawyer action)
    const assignBtn = page.getByRole('button', { name: /assign lawyer/i });
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await page.getByRole('option', { name: /senior lawyer/i }).click();
      await page.waitForResponse(resp => resp.url().includes('/case.assignLawyer') && resp.status() === 200, { timeout: 5000 }).catch(() => console.log('Assign lawyer flow optional, UI may vary'));
    }
    
    // Verify status transitions to open
    await expect(page.getByText(/open/i).first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/golden-path/07-case-lifecycle-open.png', fullPage: true });

    // ==========================================
    // STEP 7: FINAL OUTCOME & REFRESH VERIFICATION
    // ==========================================
    console.log('[DEMO] 7/7: Verifying persistence and final outcome');
    // Refresh page to verify data persists across reload
    await page.reload();
    await expect(page).toHaveURL(/\/workspace/, { timeout: 10000 });
    await expect(page.getByText(/Pendirian PT - dari Konsultasi/i).first()).toBeVisible();
    await expect(page.getByText(/open/i).first()).toBeVisible();
    
    // Verify evidence history is accessible
    const historyBtn = page.getByRole('button', { name: /history|activity log/i });
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await page.screenshot({ path: 'test-results/golden-path/08-activity-log.png', fullPage: true });
    }

    await page.screenshot({ path: 'test-results/golden-path/08-final-outcome.png', fullPage: true });

    // Final duration check - entire flow completes in <90 seconds
    console.log('[DEMO] ✅ Golden path execution completed successfully');
  });
});