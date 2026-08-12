import { test, expect } from '@playwright/test';

test.describe('BATTLE-1A: GATE C - E2E Browser Flow', () => {
  test('full signup → session cookie → workspace visible → refresh authenticated → logout 401', async ({ page }) => {
    // 1. Open signup page (Gate C criterion 1: open signup)
    await page.goto('/signup');
    await expect(page).toHaveURL(/signup/);

    // 2. Fill form with unique test data (Gate C criterion 1: fill)
    const testEmail = `test-user-${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';
    const testDisplayName = 'Test User';

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByLabel(/display name/i).fill(testDisplayName);

    // 3. Submit form and verify 201 status (Gate C criterion 1: submit → 201)
    const signupResponse = page.waitForResponse(resp => resp.url().includes('/api/auth/signup') && resp.status() === 201);
    await page.getByRole('button', { name: /create account/i }).click();
    await signupResponse;

    // 4. Verify session cookie is set (Gate C criterion 1: session cookie)
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionId' || c.name.includes('session'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBeTruthy();

    // 5. Verify we're redirected to requirements page after successful signup
    await expect(page).toHaveURL(/\/requirements/, { timeout: 10000 });
    
    // Verify we're authenticated and workspace elements are visible
    await expect(page.getByText(`Welcome ${testDisplayName}`)).toBeVisible(); // User is recognized in the workspace

    // 6. Refresh page and verify still authenticated (Gate C criterion 1: refresh ↓ authenticated)
    await page.reload();
    await expect(page).toHaveURL(/\/requirements/, { timeout: 5000 });
    await expect(page.getByText(`Welcome ${testDisplayName}`)).toBeVisible(); // Still authenticated after refresh

    // 7. Logout and verify unauthenticated access to workspace returns redirect to login
    await page.getByRole('button', { name: /logout/i }).click();
    
    // Attempt to access workspace after logout - should redirect to login
    await page.goto('/requirements');
    await expect(page).toHaveURL('/login'); // Verify redirect to login page
  });
});