import { test, expect, BrowserContext } from '@playwright/test';

test.describe('BATTLE-2C: Cross-Actor Handoff (Plane C CONTINUITY)', () => {
  let lawyerContext: BrowserContext;
  let clientContext: BrowserContext;
  let notaryContext: BrowserContext;
  let sharedCaseId: string;
  let sharedCaseUrl: string;

  test('full cross-actor handoff: Lawyer opens → Client verifies → Notary authenticates → all actors see identical Work state', async ({ browser }) => {
    // Create isolated browser contexts for each actor (simulate separate sessions)
    lawyerContext = await browser.newContext({ storageState: 'tests/states/lawyer-state.json' });
    clientContext = await browser.newContext({ storageState: 'tests/states/client-state.json' });
    notaryContext = await browser.newContext({ storageState: 'tests/states/notary-state.json' });
    
    const lawyerPage = await lawyerContext.newPage();
    const clientPage = await clientContext.newPage();
    const notaryPage = await notaryContext.newPage();

    // ==========================================
    // STEP 1: LAWYER opens Work (pre-assigned legal case)
    // ==========================================
    console.log('[HANDOFF] 1/7: Lawyer logs in and opens existing Work');
    await lawyerPage.goto('/workspace');
    await expect(lawyerPage.getByText(/Pendirian PT ABC/i)).toBeVisible({ timeout: 15000 });
    
    // Navigate to Work detail page
    await lawyerPage.getByText(/Pendirian PT ABC/i).click();
    await expect(lawyerPage).toHaveURL(/\/work\/.+/);
    sharedCaseUrl = lawyerPage.url();
    sharedCaseId = sharedCaseUrl.split('/').pop()!;
    console.log(`[HANDOFF] Lawyer opened Work ID: ${sharedCaseId}`);
    
    // Verify Lawyer's initial view
    await expect(lawyerPage.getByText(/dalam proses/i)).toBeVisible(); // Current Reality
    await expect(lawyerPage.getByRole('button', { name: /tetapkan notary/i })).toBeVisible(); // Lawyer's Next Action
    await lawyerPage.screenshot({ path: 'test-results/handoff/01-lawyer-view.png', fullPage: true });

    // ==========================================
    // STEP 2: LAWYER executes Next Action (assign Notary)
    // ==========================================
    console.log('[HANDOFF] 2/7: Lawyer assigns Notary to the Work');
    await lawyerPage.getByRole('button', { name: /tetapkan notary/i }).click();
    await lawyerPage.getByRole('option', { name: /notary-wahyudi/i }).click();
    
    // Wait for API call and state transition
    const assignResponse = await lawyerPage.waitForResponse(resp => 
      resp.url().includes('/case.assignNotary') && resp.status() === 200
    );
    expect(assignResponse.ok()).toBe(true);
    
    // Verify Work state updates for Lawyer
    await expect(lawyerPage.getByText(/menunggu verifikasi notary/i)).toBeVisible();
    await lawyerPage.screenshot({ path: 'test-results/handoff/02-lawyer-after-action.png', fullPage: true });

    // ==========================================
    // STEP 3: CLIENT reopens the SAME Work from their session
    // ==========================================
    console.log('[HANDOFF] 3/7: Client opens the identical Work URL');
    await clientPage.goto(sharedCaseUrl);
    await expect(clientPage).toHaveURL(sharedCaseUrl);
    
    // Client sees EXACTLY the same state as Lawyer (Work identity preserved)
    await expect(clientPage.getByText(/Pendirian PT ABC/i)).toBeVisible();
    await expect(clientPage.getByText(/menunggu verifikasi notary/i)).toBeVisible(); // Same Current Reality
    await expect(clientPage.getByText(/notary-wahyudi/i)).toBeVisible(); // Same assignment
    await clientPage.screenshot({ path: 'test-results/handoff/03-client-view.png', fullPage: true });
    
    // Client's role-based Next Action is appropriate (only actions Client can take)
    await expect(clientPage.getByRole('button', { name: /verifikasi data/i })).toBeVisible();
    
    // Verify NO duplicate Work exists - Client accesses EXACT same record
    const clientPageCaseId = clientPage.url().split('/').pop()!;
    expect(clientPageCaseId).toBe(sharedCaseId);

    // ==========================================
    // STEP 4: CLIENT executes their Next Action (verify data)
    // ==========================================
    console.log('[HANDOFF] 4/7: Client verifies data in the Work');
    await clientPage.getByRole('button', { name: /verifikasi data/i }).click();
    const verifyResponse = await clientPage.waitForResponse(resp => 
      resp.url().includes('/case.clientVerify') && resp.status() === 200
    );
    expect(verifyResponse.ok()).toBe(true);
    
    // State updates for Client
    await expect(clientPage.getByText(/data terverifikasi oleh klien/i)).toBeVisible();
    await clientPage.screenshot({ path: 'test-results/handoff/04-client-after-action.png', fullPage: true });

    // ==========================================
    // STEP 5: NOTARY continues the Work from their session
    // ==========================================
    console.log('[HANDOFF] 5/7: Notary opens the same Work to authenticate');
    await notaryPage.goto(sharedCaseUrl);
    await expect(notaryPage).toHaveURL(sharedCaseUrl);
    
    // Notary sees ALL accumulated state from both previous actors
    await expect(notaryPage.getByText(/Pendirian PT ABC/i)).toBeVisible();
    await expect(notaryPage.getByText(/data terverifikasi oleh klien/i)).toBeVisible();
    await expect(notaryPage.getByText(/notary-wahyudi/i)).toBeVisible();
    await notaryPage.screenshot({ path: 'test-results/handoff/05-notary-view.png', fullPage: true });

    // ==========================================
    // STEP 6: Verify state persistence across page refreshes (all actors)
    // ==========================================
    console.log('[HANDOFF] 6/7: Verify persistence across page refreshes for all actors');
    // Refresh Lawyer's page
    await lawyerPage.reload();
    await expect(lawyerPage.getByText(/data terverifikasi oleh klien/i)).toBeVisible();
    
    // Refresh Client's page
    await clientPage.reload();
    await expect(clientPage.getByText(/data terverifikasi oleh klien/i)).toBeVisible();
    
    // Refresh Notary's page
    await notaryPage.reload();
    await expect(notaryPage.getByText(/data terverifikasi oleh klien/i)).toBeVisible();
    console.log('[HANDOFF] ✅ All actors see identical state after refresh');

    // ==========================================
    // STEP 7: Notary authenticates the Work (final step)
    // ==========================================
    console.log('[HANDOFF] 7/7: Notary authenticates the Work, completes lifecycle');
    await notaryPage.getByRole('button', { name: /autentikasi dokumen/i }).click();
    const authResponse = await notaryPage.waitForResponse(resp => 
      resp.url().includes('/case.notaryAuthenticate') && resp.status() === 200
    );
    expect(authResponse.ok()).toBe(true);
    
    // Final state visible to ALL actors
    await expect(notaryPage.getByText(/selesai - terdaftar resmi/i)).toBeVisible();
    await lawyerPage.reload();
    await expect(lawyerPage.getByText(/selesai - terdaftar resmi/i)).toBeVisible();
    await clientPage.reload();
    await expect(clientPage.getByText(/selesai - terdaftar resmi/i)).toBeVisible();
    
    await notaryPage.screenshot({ path: 'test-results/handoff/06-final-state.png', fullPage: true });
    console.log('[HANDOFF] ✅ CROSS-ACTOR HANDOFF COMPLETED SUCCESSFULLY');
    console.log('[HANDOFF] All actors accessed identical Work record, state preserved across all handoffs');
    
    // Cleanup contexts
    await lawyerContext.close();
    await clientContext.close();
    await notaryContext.close();
  });
});