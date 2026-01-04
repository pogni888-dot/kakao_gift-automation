import { test, expect } from '@playwright/test';

test('카카오 선물하기 쥬시쿨 검색 테스트', async ({ page }) => {

    // 1. 카카오 선물하기 홈으로 이동합니다.
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(3000); // 3초 대기

    // 2. 검색 버튼(돋보기 아이콘)을 클릭하여 검색 입력창을 엽니다.
    // 이전에 브라우저 검사를 통해 알아낸 선택자('a.link_search')를 사용합니다.
    await page.click('a.link_search');
    await page.waitForTimeout(3000); // 3초 대기

    // 3. 검색 입력창이 화면에 나타날 때까지 기다립니다.
    const searchInput = page.locator('#searchInput');
    await expect(searchInput).toBeVisible();

    // 4. '쥬시쿨'을 입력하고 엔터 키를 누릅니다.
    await searchInput.fill('쥬시쿨');
    await page.waitForTimeout(3000); // 3초 대기
    await searchInput.press('Enter');
    await page.waitForTimeout(5000); // 3초 대기

    // 5. 검색 결과 페이지로 이동했는지 확인합니다.
    // URL에 'search'가 포함되어 있는지 확인하여 검색이 수행되었음을 검증합니다.
    await expect(page).toHaveURL(/search/);

    // 추가 검증: 검색 결과가 화면에 표시되는지 확인하는 코드를 추가할 수 있습니다.
    // 예: 상품 목록이 로드될 때까지 기다리거나, 특정 텍스트가 있는지 확인

    // 브라우저가 종료되지 않도록 일시 정지합니다. 사용자가 직접 닫거나 Playwright Inspector에서 Resume을 눌러야 합니다.
    //await page.pause();
});
