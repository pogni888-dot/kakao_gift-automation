
import { test, expect, chromium } from '@playwright/test';

test('위시리스트 추가 및 확인 테스트', async () => {
    test.setTimeout(60000);

    // 1. 이미 실행된 브라우저(Port 9222)에 연결
    // 주의: 터미널에서 chrome.exe --remote-debugging-port=9222 --user-data-dir="C:/ChromeDevSession" 명령어로 실행된 브라우저여야 합니다.
    const browser = await chromium.connectOverCDP('http://localhost:9222');

    // 2. 브라우저의 첫 번째 컨텍스트(창) 가져오기
    const defaultContext = browser.contexts()[0];
    if (!defaultContext) {
        throw new Error('브라우저 컨텍스트를 찾을 수 없습니다. 디버깅 모드로 크롬이 실행되었는지 확인해주세요.');
    }

    // 3. 활성화된 페이지 가져오기 (첫 번째 탭 사용)
    const page = defaultContext.pages()[0] || await defaultContext.newPage();

    // 3. 검색을 통해 상품 상세 페이지 진입
    console.log('상품 검색 시작: 초콜릿');
    await page.click('a.link_search');
    await page.fill('#searchInput', '초콜릿');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 검색 결과 첫 번째 상품 진입
    const firstProduct = page.locator('div.cmp_prd').first();
    await firstProduct.click();
    await page.waitForLoadState();
    await page.waitForTimeout(2000);

    // 상품명 저장 (검증용)
    const productTitleLocator = page.locator('h2.tit_subject');
    await productTitleLocator.waitFor();
    const productTitle = await productTitleLocator.innerText();
    console.log(`선택된 상품명: ${productTitle}`);

    // 4. 위시리스트(찜) 버튼 클릭
    // 상세페이지 내 찜하기 버튼 식별 (button.btn_wish)
    const wishBtn = page.locator('button.btn_wish').first();
    await wishBtn.click();
    await page.waitForTimeout(1000);

    const wishlist = await page.locator('div.group_wshradio').nth(1);
    await wishlist.locator('span.ico_base.ico_radio').click();
    await page.waitForTimeout(1000);

    await page.locator('button.btn_wshlimit').click();
    await page.waitForTimeout(5000);
});
