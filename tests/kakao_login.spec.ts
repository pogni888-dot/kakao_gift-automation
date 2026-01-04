import { test, expect } from '@playwright/test';
test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(60000); // 타임아웃을 60초로 늘림
    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    // 2. 로그인 버튼 클릭 (홈 화면의 '로그인' 링크)
    await page.click('a.link_login');
    await page.waitForTimeout(1000);

    // 3. 아이디/비밀번호 입력
    await page.fill('#loginId--1', 'pogni822@naver.com');
    await page.waitForTimeout(1000);

    await page.fill('#password--2', 'wpwnehQ!12');
    await page.waitForTimeout(1000);

    // 4. 로그인 버튼 클릭
    await page.click('button.btn_g.highlight.submit');
    await page.waitForTimeout(5000);

    //await page.pause();
});

