import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating to https://zerot-sand.vercel.app/signup-institution ...');
  await page.goto('https://zerot-sand.vercel.app/signup-institution', { waitUntil: 'networkidle2' });

  console.log('Waiting for the form to load...');
  await page.waitForSelector('input[placeholder="e.g. Brain Education"]');

  console.log('Filling out the form...');
  // Institution Details
  await page.type('input[placeholder="e.g. Brain Education"]', 'Brain Academy Test');
  
  // Wait a moment for the slug to auto-generate and uniqueness check to complete
  console.log('Waiting for slug uniqueness check...');
  await page.waitForTimeout(2000); // Wait for the auto-check to finish
  
  await page.type('input[placeholder="e.g. United States"]', 'Test Country');
  
  // Owner Details
  await page.type('input[placeholder="John Doe"]', 'Test Owner');
  await page.type('input[placeholder="+1 (555) 000-0000"]', '555-555-5555');
  await page.type('input[placeholder="owner@academy.edu"]', 'owner@test.com');
  await page.type('input[placeholder="••••••••"]', 'password123');

  console.log('Checking button state...');
  const button = await page.$('button[type="submit"]');
  const isDisabled = await page.evaluate(btn => btn.disabled, button);
  
  if (isDisabled) {
    console.error('❌ TEST FAILED: Button is still disabled after validation.');
  } else {
    console.log('✅ TEST PASSED: Button is enabled successfully!');
  }
  
  console.log('Taking a screenshot of the filled form (form_test.png)...');
  await page.screenshot({ path: 'form_test.png' });
  
  await browser.close();
  console.log('Done!');
})();
