import { chromium } from 'playwright';

async function main() {
  console.log('Launching browser...');
  try {
    const browser = await chromium.launch({ headless: true });
    console.log('Browser launched successfully!');
    const page = await browser.newPage();
    await page.goto('http://localhost:5174/');
    console.log('Page title:', await page.title());
    await browser.close();
  } catch (err) {
    console.error('Failed to launch browser or navigate:', err);
  }
}

main();
