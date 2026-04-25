const { chromium } = require('playwright');

(async () => {
  const fileUrl = 'file:///C:/Users/fg/Desktop/projeler/playwright-mcp-poc/index.html';

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    else logs.push(msg.type() + ': ' + msg.text());
  });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  await page.goto(fileUrl);
  await page.waitForTimeout(1000);

  console.log('=== JS Errors ===');
  errors.forEach(e => console.log(e));
  if (errors.length === 0) console.log('(none)');

  // Check prompts variable in page
  const promptsState = await page.evaluate(() => {
    try {
      return {
        type: typeof prompts,
        length: Array.isArray(prompts) ? prompts.length : 'N/A',
        first: Array.isArray(prompts) && prompts[0] ? { id: prompts[0].id, title: prompts[0].title } : null,
      };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('\n=== prompts variable ===');
  console.log(JSON.stringify(promptsState, null, 2));

  // Check promptList container
  const listState = await page.evaluate(() => {
    const el = document.getElementById('promptList');
    return el ? { exists: true, innerHTML: el.innerHTML.slice(0, 300), childCount: el.children.length } : { exists: false };
  });
  console.log('\n=== #promptList DOM ===');
  console.log(JSON.stringify(listState, null, 2));

  // Tab prompts visibility
  const tabVisible = await page.evaluate(() => {
    const tab = document.getElementById('tab-prompts');
    return tab ? { exists: true, classList: tab.className } : { exists: false };
  });
  console.log('\n=== #tab-prompts ===');
  console.log(JSON.stringify(tabVisible, null, 2));

  await browser.close();
})();
