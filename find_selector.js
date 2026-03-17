const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    console.log('Navigating...');
    await page.goto('https://www.yeogi.com/');
    
    console.log('Filling input...');
    const searchInput = page.getByPlaceholder('여행지나 숙소를 검색해보세요.');
    await searchInput.click();
    await searchInput.fill('서울');
    
    console.log('Waiting for suggestions...');
    await page.waitForTimeout(3000);
    
    console.log('Looking for "서울역"...');
    const locators = await page.locator(':has-text("서울역")').all();
    for (let el of locators) {
        try {
            const tagName = await el.evaluate(n => n.tagName);
            if (tagName !== 'SCRIPT' && tagName !== 'STYLE') {
                 const className = await el.evaluate(n => n.className);
                 console.log(`Tag: ${tagName}, Class: ${className}`);
            }
        } catch (e) {}
    }
    
    console.log('Evaluating parent structure of the first visible text match...');
    const match = page.locator('text="서울역"').last();
    if (await match.count() > 0) {
        const html = await match.evaluate(node => {
            let current = node;
            for(let i=0; i<4; i++) { if(current.parentElement) current = current.parentElement; }
            return current.outerHTML;
        });
        console.log('--- HTML STRUCTURE ---');
        console.log(html);
    } else {
        console.log('Not found');
    }
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
