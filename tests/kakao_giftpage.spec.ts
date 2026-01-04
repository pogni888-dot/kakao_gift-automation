import { test, expect } from '@playwright/test';
test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(60000); // 타임아웃을 60초로 늘림
    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    // 2. 로그인 버튼 클릭 (홈 화면의 '로그인' 링크)
    // 'text=로그인' 대신 더 정확한 CSS 선택자 사용
    // await page.click('a.link_login')
    // await page.locator('a', { hasText: '로그인' }).click();
    await page.getByRole('link', { name: '로그인' }).click()
    await page.waitForTimeout(1000);

    // 3. 아이디/비밀번호 입력
    // 아이디: imoneytest50@gmail.com
    // 비밀번호: nctest0528
    await page.fill('#loginId--1', 'pogni822@naver.com');
    await page.waitForTimeout(1000);

    await page.fill('#password--2', 'wpwnehQ!12');
    await page.waitForTimeout(1000);

    // 4. 로그인 버튼 클릭
    await page.click('button.btn_g.highlight.submit');
    await page.waitForTimeout(1000);

    // 5. 로그인 성공 확인
    await page.waitForTimeout(1000);

    // 6. 검색 버튼 클릭 및 '볼펜' 검색
    await page.click('a.link_search');
    await page.waitForTimeout(1000);

    const searchInput = page.locator('#searchInput');
    await searchInput.fill('볼펜');
    await page.waitForTimeout(1000);
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // 7. 검색 결과에서 첫 번째 상품 클릭
    await page.locator('a.link_thumb').first().click();
    await page.waitForLoadState();
    await page.waitForTimeout(5000);
});