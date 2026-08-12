# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: battle-1a.spec.ts >> BATTLE-1A: GATE C - E2E Browser Flow >> full signup → session cookie → workspace visible → refresh authenticated → logout 401
- Location: e2e/battle-1a.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Test User')
Expected: visible
Error: strict mode violation: getByText('Test User') resolved to 2 elements:
    1) <span class="text-sm font-medium text-slate-700">Welcome, Test User</span> aka getByText('Welcome, Test User')
    2) <div class="mt-2 text-sm font-medium text-slate-900">Test User</div> aka getByText('Test User', { exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Test User')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]: Professional Workspace
            - generic [ref=e19]:
              - heading "Capture requirements, align owners, and move work forward." [level=1] [ref=e20]
              - paragraph [ref=e21]: A focused workspace for teams that need to turn incoming requests into clear, actionable requirements without losing ownership, delivery status, or verification history.
          - generic [ref=e23]:
            - generic [ref=e24]: Welcome, Test User
            - button "Logout" [ref=e25]
            - link "Open Workspace" [ref=e26] [cursor=pointer]:
              - /url: /requirements
        - generic [ref=e27]:
          - generic [ref=e28]:
            - generic [ref=e29]: Best For
            - paragraph [ref=e30]: Teams handling client requests, delivery scoping, and approval-ready work intake.
          - generic [ref=e31]:
            - generic [ref=e32]: What You Can Do
            - paragraph [ref=e33]: Create, review, update, and advance requirements from draft to verified delivery.
          - generic [ref=e34]:
            - generic [ref=e35]: Start Here
            - paragraph [ref=e36]: Open the Requirement workspace, add the first request, then track it as it moves toward delivery readiness.
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]: Workspace Ready
          - heading "Start in a prepared workspace session" [level=2] [ref=e41]
          - paragraph [ref=e42]: The workspace prepares your session in the background so you can move straight into requirement intake, review, and delivery tracking.
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e45]: Active Operator
            - generic [ref=e46]: Test User
          - generic [ref=e47]:
            - generic [ref=e48]: Workspace
            - generic [ref=e49]: Requirement workspace
          - generic [ref=e50]:
            - generic [ref=e51]: Session Status
            - generic [ref=e52]: Ready for live testing
      - generic [ref=e54]:
        - generic [ref=e55]:
          - generic [ref=e56]: Requirement Workspace
          - heading "Capture, review, and move requirements toward delivery." [level=2] [ref=e57]
          - paragraph [ref=e58]: Use this workspace to record requests, assign owners, track progress, and confirm that work is ready to move forward with confidence.
        - generic [ref=e59]:
          - generic [ref=e60]:
            - generic [ref=e61]: Step 1
            - generic [ref=e62]: Create a requirement
          - generic [ref=e63]:
            - generic [ref=e64]: Step 2
            - generic [ref=e65]: Assign and review ownership
          - generic [ref=e66]:
            - generic [ref=e67]: Step 3
            - generic [ref=e68]: Advance delivery status
      - generic [ref=e69]:
        - generic [ref=e70]:
          - generic [ref=e71]:
            - generic [ref=e72]:
              - generic [ref=e73]: Requirement Intake
              - heading "Create the next requirement clearly and move it forward." [level=2] [ref=e74]
              - paragraph [ref=e75]: Capture the request, assign an owner, define success criteria, and keep the team aligned from draft through verification.
            - generic [ref=e76]:
              - generic [ref=e77]: "Total: 0"
              - generic [ref=e78]: "Matched: 0"
              - generic [ref=e79]: "Verified: 0"
              - generic [ref=e80]: "In Progress: 0"
          - generic [ref=e81]:
            - generic [ref=e82]:
              - text: Title
              - textbox "Title" [ref=e83]:
                - /placeholder: What needs to be delivered?
            - generic [ref=e84]:
              - text: Owner
              - textbox "Owner" [ref=e85]:
                - /placeholder: Who owns this requirement?
            - generic [ref=e86]:
              - text: Summary
              - textbox "Summary" [ref=e87]:
                - /placeholder: Brief summary for reviewers and delivery teams
            - combobox [ref=e88]:
              - option "Low"
              - option "Medium" [selected]
              - option "High"
              - option "Critical"
            - generic [ref=e89]:
              - text: What should success look like?
              - textbox "What should success look like?" [ref=e90]:
                - /placeholder: Describe the outcomes that prove this requirement is ready
                - text: Requirement is searchable Requirement has owner Requirement links capabilities
            - generic [ref=e91]:
              - paragraph [ref=e92]: Start with the clearest version of the requirement. You can refine and advance it after review.
              - button "Create Requirement" [disabled] [ref=e94]
        - generic [ref=e95]:
          - generic [ref=e96]:
            - textbox "Search by title, summary, owner, or capability" [ref=e97]
            - generic [ref=e98]:
              - button "All" [ref=e99]
              - button "Draft" [ref=e100]
              - button "Approved" [ref=e101]
              - button "In Delivery" [ref=e102]
              - button "Implemented" [ref=e103]
              - button "Verified" [ref=e104]
            - generic [ref=e105]:
              - button "All" [ref=e106]
              - button "Low" [ref=e107]
              - button "Medium" [ref=e108]
              - button "High" [ref=e109]
              - button "Critical" [ref=e110]
            - generic [ref=e111]:
              - button "All" [ref=e112]
              - button "Not Ready" [ref=e113]
              - button "Pending" [ref=e114]
              - button "Passed" [ref=e115]
              - button "Failed" [ref=e116]
              - button "Unknown" [ref=e117]
          - generic [ref=e118]:
            - generic [ref=e119]: Something needs attention
            - paragraph [ref=e120]: Failed to load requirements (500)
          - generic [ref=e121]:
            - generic [ref=e122]: No requirements match the current view.
            - paragraph [ref=e123]: Clear the filters or create a new requirement to start tracking work.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('BATTLE-1A: GATE C - E2E Browser Flow', () => {
  4  |   test('full signup → session cookie → workspace visible → refresh authenticated → logout 401', async ({ page }) => {
  5  |     // 1. Open signup page (Gate C criterion 1: open signup)
  6  |     await page.goto('/signup');
  7  |     await expect(page).toHaveURL(/signup/);
  8  | 
  9  |     // 2. Fill form with unique test data (Gate C criterion 1: fill)
  10 |     const testEmail = `test-user-${Date.now()}@example.com`;
  11 |     const testPassword = 'SecurePassword123!';
  12 |     const testDisplayName = 'Test User';
  13 | 
  14 |     await page.getByLabel(/email/i).fill(testEmail);
  15 |     await page.getByLabel(/password/i).fill(testPassword);
  16 |     await page.getByLabel(/display name/i).fill(testDisplayName);
  17 | 
  18 |     // 3. Submit form and verify 201 status (Gate C criterion 1: submit → 201)
  19 |     const signupResponse = page.waitForResponse(resp => resp.url().includes('/api/auth/signup') && resp.status() === 201);
  20 |     await page.getByRole('button', { name: /create account/i }).click();
  21 |     await signupResponse;
  22 | 
  23 |     // 4. Verify session cookie is set (Gate C criterion 1: session cookie)
  24 |     const cookies = await page.context().cookies();
  25 |     const sessionCookie = cookies.find(c => c.name === 'sessionId' || c.name.includes('session'));
  26 |     expect(sessionCookie).toBeDefined();
  27 |     expect(sessionCookie?.value).toBeTruthy();
  28 | 
  29 |     // 5. Verify we're redirected to requirements page after successful signup
  30 |     await expect(page).toHaveURL(/\/requirements/, { timeout: 10000 });
  31 |     
  32 |     // Verify we're authenticated and workspace elements are visible
> 33 |     await expect(page.getByText(testDisplayName)).toBeVisible(); // User is recognized in the workspace
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  34 | 
  35 |     // 6. Refresh page and verify still authenticated (Gate C criterion 1: refresh ↓ authenticated)
  36 |     await page.reload();
  37 |     await expect(page).toHaveURL(/\/requirements/, { timeout: 5000 });
  38 |     await expect(page.getByText(testDisplayName)).toBeVisible(); // Still authenticated after refresh
  39 | 
  40 |     // 7. Logout and verify unauthenticated access to workspace returns redirect to login
  41 |     await page.getByRole('button', { name: /logout/i }).click();
  42 |     
  43 |     // Attempt to access workspace after logout - should redirect to login
  44 |     await page.goto('/requirements');
  45 |     await expect(page).toHaveURL('/login'); // Verify redirect to login page
  46 |   });
  47 | });
```