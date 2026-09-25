import { test, expect } from '@playwright/test';

test.describe('EOS Logout Journey (W006 Verification)', () => {
  const timestamp = Date.now();
  const testUserEmail = `logout-journey-${timestamp}@eos-test.example`;
  const testUserPassword = "LogoutJourneyTest2024!";

  test.beforeAll(async ({ browser }) => {
    // --- SETUP: Create a user to ensure a clean state ---
    const page = await browser.newPage();
    await page.goto('/signup');
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password').fill(testUserPassword);
    await page.getByLabel('Display Name').fill('Logout Journey User');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL('/my-reality', { timeout: 15000 });
    await page.close();
  });

  test('Actor can log in, see protected page, log out, and is denied access', async ({ page }) => {
    // --- STEP 1: Login ---
    await page.goto('/login');
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password').fill(testUserPassword);
    await page.getByRole('button', { name: 'Log in' }).click();

    // --- STEP 2: Verify access to protected page ---
    await page.waitForURL('/my-reality');
    await expect(page.getByText('Belum ada pekerjaan')).toBeVisible();
    console.log('[W006-VERIFY] Successfully accessed /my-reality after login.');

    // --- STEP 3: Execute Logout ---
    // Click the user avatar to open the dropdown
    await page.locator('img[alt="User avatar"]').click();
    console.log('[W006-VERIFY] User avatar clicked.');

    // Click the "Log out" button in the dropdown
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    console.log('[W006-VERIFY] "Log out" menu item clicked.');

    // --- STEP 4: Verify Redirect to Login Page ---
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Log in to your account' })).toBeVisible();
    console.log('[W006-VERIFY] Successfully redirected to /login after logout.');

    // --- STEP 5: Verify Protected Page is No Longer Accessible ---
    await page.goto('/my-reality');
    // After logout, accessing a protected route should redirect back to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
    console.log('[W006-VERIFY] Access to /my-reality was correctly denied and redirected to /login.');
  });
});