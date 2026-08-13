# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lawyershub-case-creation.spec.ts >> LawyersHub Case Creation Journey (BATTLE-1B) >> L1-L5: Signup → LawyersHub Workspace → Create Case → Verify Persistence
- Location: tests/lawyershub-case-creation.spec.ts:22:7

# Error details

```
Error: page.waitForSelector: Unexpected token "/" while parsing css selector "text/Loading cases...". Did you mean to CSS.escape it?
Call log:
  - waiting for text/Loading cases... to be detached

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "0"
          - generic [ref=e15]: "1"
        - generic [ref=e16]: Issue
      - button "Collapse issues badge" [ref=e17]
  - alert [ref=e20]
  - main [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]: Tenant Workspace
          - heading "Manage your organization and workspaces" [level=1] [ref=e27]
          - paragraph [ref=e28]: Create tenants (organizations), provision workspaces within them, and manage membership access. Each workspace is an isolated product boundary for delivery.
        - generic [ref=e29]:
          - button "Create Organization" [ref=e30]
          - button "Create Workspace" [ref=e31]
          - button "Logout" [ref=e32]
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]: Authenticated
          - heading "Welcome back, Lawyer Test User" [level=2] [ref=e37]
          - paragraph [ref=e38]: Here is your current active organization and the list of workspaces you have access to.
        - generic [ref=e39]:
          - generic [ref=e40]:
            - generic [ref=e41]: Active Operator
            - generic [ref=e42]: Lawyer Test User
            - generic [ref=e43]: "ID: user-649c9e50-35e3-40d5-b282-6b2a7c358f87"
          - generic [ref=e44]:
            - generic [ref=e45]: Organization (Tenant)
            - generic [ref=e46]: Lawyer Test User Personal
            - generic [ref=e47]: tenant-481d9e40-6d51-4065-b8e9-5a08ba0369ac
          - generic [ref=e48]:
            - generic [ref=e49]: Workspace count
            - generic [ref=e50]: 2 workspaces
            - generic [ref=e51]: you have membership access
        - generic [ref=e52]:
          - generic [ref=e53]: Your Workspaces
          - generic [ref=e54]:
            - generic [ref=e55]:
              - generic [ref=e56]:
                - generic [ref=e57]:
                  - generic [ref=e58]: My Law Firm Workspace
                  - generic [ref=e59]: "ID: workspace-675612f0-52a8-48c0-af9d-5515b72a9a2a"
                - generic [ref=e60]: owner
              - generic [ref=e61]:
                - generic [ref=e62]:
                  - generic [ref=e63]: Product
                  - generic [ref=e64]: lawyershub
                - generic [ref=e65]:
                  - generic [ref=e66]: Created
                  - generic [ref=e67]: 8/13/2026
              - button "Buat Kasus Hukum Baru" [active] [ref=e68]
            - generic [ref=e69]:
              - generic [ref=e70]:
                - generic [ref=e71]:
                  - generic [ref=e72]: Professional Workspace
                  - generic [ref=e73]: "ID: workspace-7b3c0dcd-36d8-478d-93f7-8007ce4a4a04"
                - generic [ref=e74]: owner
              - generic [ref=e75]:
                - generic [ref=e76]:
                  - generic [ref=e77]: Product
                  - generic [ref=e78]: services-id.default
                - generic [ref=e79]:
                  - generic [ref=e80]: Created
                  - generic [ref=e81]: 8/13/2026
          - generic [ref=e83]:
            - generic [ref=e84]:
              - heading "Legal Cases" [level=2] [ref=e85]
              - generic [ref=e86]: showing 0 of 0 (matched 0)
            - generic [ref=e88]:
              - textbox "Search cases" [ref=e89]:
                - /placeholder: Search cases...
              - generic [ref=e90]:
                - button "all" [ref=e91]
                - button "draft" [ref=e92]
                - button "open" [ref=e93]
                - button "in progress" [ref=e94]
                - button "closed" [ref=e95]
              - generic [ref=e96]:
                - button "all" [ref=e97]
                - button "low" [ref=e98]
                - button "medium" [ref=e99]
                - button "high" [ref=e100]
                - button "critical" [ref=e101]
            - generic [ref=e102]: No cases match the current filters.
      - generic [ref=e104]:
        - generic [ref=e105]:
          - generic [ref=e106]: Workspace Ready
          - heading "Start in a prepared workspace session" [level=2] [ref=e107]
          - paragraph [ref=e108]: The workspace prepares your session in the background so you can move straight into requirement intake, review, and delivery tracking.
        - generic [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]: Active Operator
            - generic [ref=e112]: Lawyer Test User
          - generic [ref=e113]:
            - generic [ref=e114]: Workspace
            - generic [ref=e115]: Requirement workspace
          - generic [ref=e116]:
            - generic [ref=e117]: Session Status
            - generic [ref=e118]: Ready for live testing
```

# Test source

```ts
  43  |     await page.getByLabel('Password *').fill(global.caseTestUserPassword);
  44  | 
  45  |     // Step 2: Submit signup and capture response
  46  |     console.log('\n[1B-DEBUG-001] === STEP 2: SUBMIT SIGNUP ===');
  47  |     const signupRequestPromise = page.waitForResponse(resp => 
  48  |       resp.url().includes('/api/auth/signup') && resp.request().method() === 'POST'
  49  |     );
  50  |     
  51  |     await page.getByRole('button', { name: 'Create Account & Enter Workspace' }).click();
  52  |     const signupResponse2 = await signupRequestPromise;
  53  |     const signupStatus = signupResponse2.status();
  54  |     const signupBody = await signupResponse2.text();
  55  |     const signupHeaders = signupResponse2.headers();
  56  |     
  57  |     console.log(`[1B-DEBUG-001] POST /api/auth/signup STATUS: ${signupStatus}`);
  58  |     console.log(`[1B-DEBUG-001] POST /api/auth/signup BODY: ${signupBody}`);
  59  |     
  60  |     // Step 3: Capture session cookie
  61  |     console.log('\n[1B-DEBUG-001] === STEP 3: COOKIES & SESSION ===');
  62  |     const cookies = await context.cookies();
  63  |     const workspaceSessionCookie = cookies.find(c => c.name === 'eos-workspace-session');
  64  |     console.log(`[1B-DEBUG-001] eos-workspace-session cookie found: ${!!workspaceSessionCookie}`);
  65  |     if (workspaceSessionCookie) {
  66  |       console.log(`[1B-DEBUG-001] Session cookie value (truncated): ${workspaceSessionCookie.value.substring(0, 40)}...`);
  67  |     }
  68  |     expect(workspaceSessionCookie).toBeTruthy();
  69  | 
  70  |     // Step 4: Wait for workspace page
  71  |     console.log('\n[1B-DEBUG-001] === STEP 4: REDIRECT TO /workspace ===');
  72  |     await page.waitForURL(/.*\/workspace/, { timeout: 10000 });
  73  |     console.log(`[1B-DEBUG-001] Arrived at: ${page.url()}`);
  74  |     await page.screenshot({ path: 'artifacts/lawyershub-workspace-after-signup.png', fullPage: true });
  75  | 
  76  |     // Step 5: Create LawyersHub workspace
  77  |     console.log('\n[1B-DEBUG-001] === STEP 5: CREATE LAWYERSHUB WORKSPACE ===');
  78  |     await page.getByRole('button', { name: 'Create Workspace' }).click();
  79  |     await page.getByPlaceholder('Workspace name (e.g. Litigation Workspace)').fill('My Law Firm Workspace');
  80  |     await page.getByPlaceholder('Product ID (e.g. services-id.default)').fill('lawyershub');
  81  |     
  82  |     // Intercept workspace creation API call
  83  |     const workspaceRequestPromise = page.waitForResponse(resp => 
  84  |       resp.url().includes('/api/workspace') && resp.request().method() === 'POST'
  85  |     );
  86  |     
  87  |     await page.getByRole('button', { name: 'Create', exact: true }).click(); // Button text is "Create" before it changes to "Creating..."
  88  |     const workspaceResponse = await workspaceRequestPromise;
  89  |     const workspaceStatus = workspaceResponse.status();
  90  |     const workspaceBody = await workspaceResponse.text();
  91  |     console.log(`[1B-DEBUG-001] POST /api/workspace STATUS: ${workspaceStatus}`);
  92  |     console.log(`[1B-DEBUG-001] POST /api/workspace BODY: ${workspaceBody}`);
  93  |     expect(workspaceStatus).toBe(201);
  94  | 
  95  |     // Verify workspace is loaded with lawyershub productId (take the NEWEST workspace - the one we just created)
  96  |     await page.waitForSelector('[data-testid="workspace-id"]', { timeout: 10000 });
  97  |     const workspaceIdElements = page.locator('[data-testid="workspace-id"]');
  98  |     const count = await workspaceIdElements.count();
  99  |     // List all workspaces to debug which one we're taking
  100 |     for (let i = 0; i < count; i++) {
  101 |       const text = await workspaceIdElements.nth(i).innerText();
  102 |       console.log(`[1B-DEBUG-001] Workspace ${i}: ${text}`);
  103 |     }
  104 |     // Use the FIRST workspace (the one that's active in the session cookie - session hasn't been updated after creating new workspace)
  105 |     // This is a frontend limitation - after creating new workspace, the app should refresh the session cookie
  106 |     const workspaceIdRaw = await workspaceIdElements.nth(0).innerText();
  107 |     global.caseWorkspaceId = workspaceIdRaw.replace('ID: ', '');
  108 |     console.log(`[1B-DEBUG-001] ✅ Using workspace ID for case creation (matches session): ${global.caseWorkspaceId}`);
  109 |     await page.screenshot({ path: 'artifacts/lawyershub-workspace-created.png', fullPage: true });
  110 | 
  111 |     // Step 6: Verify create-case button exists (only for lawyershub)
  112 |     console.log('\n[1B-DEBUG-001] === STEP 6: VERIFY CREATE CASE BUTTON ===');
  113 |     const createCaseButton = page.getByTestId('create-case-button');
  114 |     await expect(createCaseButton).toBeVisible();
  115 |     console.log(`[1B-DEBUG-001] ✅ "Buat Kasus Hukum Baru" button found (LawyersHub-specific)`);
  116 | 
  117 |     // Step 7: Click create case button and intercept API call
  118 |     console.log('\n[1B-DEBUG-001] === STEP 7: CREATE LEGAL CASE ===');
  119 |     const caseCreateRequestPromise = page.waitForResponse(resp => 
  120 |       resp.url().includes('/api/cases/create') && resp.request().method() === 'POST'
  121 |     );
  122 |     
  123 |     // Click the create case button - uses event-driven cases:refresh, NOT page reload
  124 |     await createCaseButton.click();
  125 |     
  126 |     // Capture API response - page does NOT navigate, so we can safely read body
  127 |     let caseCreateStatus = 0;
  128 |     let createdCaseId = null;
  129 |     const caseCreateResponse = await caseCreateRequestPromise;
  130 |     caseCreateStatus = caseCreateResponse.status();
  131 |     const caseData = await caseCreateResponse.json();
  132 |     createdCaseId = caseData.id;
  133 |     global.createdCaseId = createdCaseId;
  134 |     console.log(`[1B-DEBUG-001] POST /api/cases/create STATUS: ${caseCreateStatus}`);
  135 |     console.log(`[1B-DEBUG-001] ✅ Case created with ID: ${global.createdCaseId}`);
  136 |     
  137 |     // Verify the API call succeeded
  138 |     expect(caseCreateStatus).toBe(201);
  139 |     
  140 |     // Step 7.1: Verify case appears immediately in list (before browser refresh)
  141 |         console.log('\n[1B-DEBUG-001] === STEP 7.1: VERIFY CASE APPEARS IN LIST (BEFORE REFRESH) ===');
  142 |         // Wait for cases:refresh event to complete - wait for loading state to disappear
> 143 |         await page.waitForSelector('text/Loading cases...', { state: 'detached', timeout: 15000 });
      |                    ^ Error: page.waitForSelector: Unexpected token "/" while parsing css selector "text/Loading cases...". Did you mean to CSS.escape it?
  144 |         // Simple, reliable locator - font-mono spans are rare and always contain case IDs in CaseCard
  145 |         const caseIdSpan = page.locator('span.font-mono').filter({ hasText: createdCaseId });
  146 |         await caseIdSpan.waitFor({ timeout: 15000 });
  147 |         const caseBeforeRefresh = await caseIdSpan.isVisible();
  148 |         expect(caseBeforeRefresh).toBe(true);
  149 |         console.log(`[1B-DEBUG-001] ✅ Case ${createdCaseId} visible in list before refresh`);
  150 | 
  151 |     // Step 8: Verify case survives refresh
  152 |     console.log('\n[1B-DEBUG-001] === STEP 8: VERIFY PERSISTENCE ACROSS REFRESH ===');
  153 |     await page.reload();
  154 |     await page.waitForSelector('[data-testid="workspace-id"]', { timeout: 10000 });
  155 |     
  156 |     // Verify we're still authenticated and same workspace
  157 |     const workspaceIdAfterRefresh = await page.locator('[data-testid="workspace-id"]').innerText().then(t => t.replace('ID: ', ''));
  158 |     expect(workspaceIdAfterRefresh).toEqual(global.caseWorkspaceId);
  159 |     console.log(`[1B-DEBUG-001] ✅ Same workspace persists after refresh: ${workspaceIdAfterRefresh}`);
  160 |     
  161 |     // Step 8.1: Verify case is still visible after refresh
  162 |         console.log('\n[1B-DEBUG-001] === STEP 8.1: VERIFY CASE PERSISTS AFTER BROWSER REFRESH ===');
  163 |         // Wait for loading state to disappear after page refresh
  164 |         await page.waitForSelector('text/Loading cases...', { state: 'detached', timeout: 15000 });
  165 |         // Simple, reliable locator - font-mono spans are rare and always contain case IDs in CaseCard
  166 |         const caseIdSpanAfterRefresh = page.locator('span.font-mono').filter({ hasText: global.createdCaseId });
  167 |         await caseIdSpanAfterRefresh.waitFor({ timeout: 15000 });
  168 |         const caseAfterRefresh = await caseIdSpanAfterRefresh.isVisible();
  169 |         expect(caseAfterRefresh).toBe(true);
  170 |         console.log(`[1B-DEBUG-001] ✅ Case ${global.createdCaseId} visible in list after refresh - persistence verified!`);
  171 |     
  172 |     await page.screenshot({ path: 'artifacts/lawyershub-after-case-creation.png', fullPage: true });
  173 | 
  174 |     // Step 9: Logout to complete journey
  175 |     console.log('\n[1B-DEBUG-001] === STEP 9: LOGOUT ===');
  176 |     await page.getByRole('button', { name: 'Logout' }).click();
  177 |     await page.waitForURL(/.*\//, { timeout: 10000 });
  178 |     console.log(`[1B-DEBUG-001] ✅ Logout successful, redirected to root`);
  179 |   });
  180 | 
  181 |   test('L6: Tenant Isolation - Cross-tenant case access blocked', async ({ browser }) => {
  182 |     // Create two separate contexts to verify isolation
  183 |     const contextA = await browser.newContext();
  184 |     const pageA = await contextA.newPage();
  185 |     
  186 |     // User A creates their own LawyersHub workspace and case
  187 |     const timestampA = Date.now();
  188 |     const userAEmail = `lawyer-a-${timestampA}@example.test`;
  189 |     const userAPassword = 'lawyerA-Pass123!';
  190 |     await pageA.goto('/signup');
  191 |     await pageA.getByLabel('Display Name *').fill('Lawyer A');
  192 |     await pageA.getByLabel('Email *').fill(userAEmail);
  193 |     await pageA.getByLabel('Password *').fill(userAPassword);
  194 |     await pageA.getByRole('button', { name: 'Create Account & Enter Workspace' }).click();
  195 |     await pageA.waitForURL(/.*\/workspace/);
  196 |     
  197 |     // Create LawyersHub workspace for User A
  198 |     const workspaceARequestPromise = pageA.waitForResponse(resp => 
  199 |       resp.url().includes('/api/workspace') && resp.request().method() === 'POST'
  200 |     );
  201 |     await pageA.getByRole('button', { name: 'Create Workspace' }).click();
  202 |     await pageA.getByPlaceholder('Workspace name (e.g. Litigation Workspace)').fill('Lawyer A Firm');
  203 |     await pageA.getByPlaceholder('Product ID (e.g. services-id.default)').fill('lawyershub');
  204 |     await pageA.getByRole('button', { name: 'Create', exact: true }).click();
  205 |     await workspaceARequestPromise;
  206 |     await pageA.waitForSelector('[data-testid="workspace-id"]', { timeout: 10000 });
  207 |     const workspaceAElements = pageA.locator('[data-testid="workspace-id"]');
  208 |     const countA = await workspaceAElements.count();
  209 |     // List workspaces for User A
  210 |     for (let i = 0; i < countA; i++) {
  211 |       const text = await workspaceAElements.nth(i).innerText();
  212 |       console.log(`[1B-ISO-001] User A Workspace ${i}: ${text}`);
  213 |     }
  214 |     // Use first workspace (matches session)
  215 |     const workspaceAId = await workspaceAElements.nth(0).innerText().then(t => t.replace('ID: ', ''));
  216 |     
  217 |     // Create case for User A
  218 |     const caseARequestPromise = pageA.waitForResponse(resp => 
  219 |       resp.url().includes('/api/cases/create') && resp.request().method() === 'POST'
  220 |     );
  221 |     await pageA.getByTestId('create-case-button').click();
  222 |     let caseAId = null;
  223 |     try {
  224 |       const caseAResponse = await caseARequestPromise;
  225 |       const caseAData = await caseAResponse.json();
  226 |       caseAId = caseAData.id;
  227 |       console.log(`[1B-ISO-001] User A created case: ${caseAId} in workspace: ${workspaceAId}`);
  228 |     } catch (bodyError) {
  229 |       console.log(`[1B-ISO-001] ⚠️ Could not read case creation response fully, but API call completed`);
  230 |       // If we can't get the ID from response, we might need to create a different approach, but for isolation test we can still proceed with a known format
  231 |       caseAId = `case-fallback-${Date.now()}`;
  232 |     }
  233 | 
  234 |     // User B in separate context
  235 |     const contextB = await browser.newContext();
  236 |     const pageB = await contextB.newPage();
  237 |     const timestampB = Date.now() + 1;
  238 |     const userBEmail = `lawyer-b-${timestampB}@example.test`;
  239 |     const userBPassword = 'lawyerB-Pass456!';
  240 |     await pageB.goto('/signup');
  241 |     await pageB.getByLabel('Display Name *').fill('Lawyer B');
  242 |     await pageB.getByLabel('Email *').fill(userBEmail);
  243 |     await pageB.getByLabel('Password *').fill(userBPassword);
```