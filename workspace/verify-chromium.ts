import { chromium } from 'playwright';

async function main() {
  console.log('[VERIFY] Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('[VERIFY] ✅ Chromium launched successfully');

  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('[VERIFY] Creating page...');
  
  // Try to navigate to example.com first
  try {
    await page.goto('https://example.com', { timeout: 10000 });
    console.log('[VERIFY] ✅ Page navigation to example.com successful');
    const title = await page.title();
    console.log(`[VERIFY] Page title: ${title}`);
  } catch (e) {
    console.error('[VERIFY] ❌ Navigation failed:', e);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
  console.log('[VERIFY] ✅ All checks passed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});