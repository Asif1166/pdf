const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  });

  const page = await browser.newPage();
  
  // Intercept and block external analytics/chat scripts to prevent page load timeouts
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('googletagmanager.com') || url.includes('chatbase.co')) {
      console.log(`Blocking request to: ${url}`);
      request.abort();
    } else {
      request.continue();
    }
  });

  const filePath = path.resolve(__dirname, 'gp-landscape-report-ebook2.html');
  const url = `file://${filePath}?print=1`;
  
  console.log(`Navigating to: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  } catch (err) {
    console.warn('Initial navigation page load warning:', err.message);
  }

  console.log('Waiting for Paged.js to finish rendering...');
  // Paged.js creates .pagedjs_pages element when pagination is complete
  try {
    await page.waitForSelector('.pagedjs_pages', { timeout: 120000 });
    console.log('Paged.js layout completed.');
  } catch (err) {
    console.error('Timed out waiting for Paged.js to complete layout.', err);
    await browser.close();
    process.exit(1);
  }

  // Brief pause to ensure all charts, layout adjustments, and fonts are fully settled
  await new Promise(resolve => setTimeout(resolve, 3000));

  const outputPath = path.resolve(__dirname, 'GP-landscape-report-2026.pdf');
  console.log(`Printing PDF to: ${outputPath}...`);
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true
  });

  console.log('PDF printed successfully.');
  await browser.close();
})();
