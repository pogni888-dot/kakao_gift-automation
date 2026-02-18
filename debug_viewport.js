const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const authFile = path.resolve(__dirname, 'auth.json');
    console.log('Auth file path:', authFile);

    const fs = require('fs');
    if (fs.existsSync(authFile)) {
        const data = JSON.parse(fs.readFileSync(authFile, 'utf8'));
        console.log('Auth file exists. Cookies count:', data.cookies.length);
        // Print cookie domains
        const domains = [...new Set(data.cookies.map(c => c.domain))];
        console.log('Cookie domains:', domains);
    } else {
        console.log('AUTH FILE NOT FOUND!');
        return;
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--window-size=1920,1080', '--force-device-scale-factor=1', '--no-sandbox', '--disable-gpu']
    });
    const ctx = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        storageState: authFile
    });
    const page = await ctx.newPage();

    // Check cookies loaded
    const cookies = await ctx.cookies();
    console.log('Cookies loaded into context:', cookies.length);

    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(3000);

    const dims = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        url: location.href,
    }));

    console.log('=== WITH AUTH ===');
    console.log('Viewport:', dims.innerWidth, 'x', dims.innerHeight);
    console.log('URL:', dims.url);

    // Check page state
    const html = await page.content();
    const hasSearchLink = html.includes('link_search');
    const hasLoginLink = html.includes('link_login');
    const hasLogoutBtn = html.includes('btn_logout');
    const hasLoginRequired = html.includes('로그인이 필요한');

    console.log('Has search link:', hasSearchLink);
    console.log('Has login link:', hasLoginLink);
    console.log('Has logout btn:', hasLogoutBtn);
    console.log('Has login required msg:', hasLoginRequired);

    await browser.close();
})();
