import { test, expect } from '@playwright/test';
test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(60000); // 타임아웃을 60초로 늘림
    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    // 2. 로그인 버튼 클릭 (홈 화면의 '로그인' 링크)
    // 'text=로그인' 대신 더 정확한 CSS 선택자 사용
    await page.click('a.link_login');
    await page.waitForTimeout(1000);

    // 3. 아이디/비밀번호 입력
    // 아이디: imoneytest50@gmail.com
    // 비밀번호: nctest0528
    await page.fill('#loginId--1', 'pmoneytest_bt050@test.kakao.com');
    await page.waitForTimeout(1000);

    await page.fill('#password--2', 'nctest101010');
    await page.waitForTimeout(1000);

    // 4. 로그인 버튼 클릭
    await page.click('button.btn_g.highlight.submit');
    await page.waitForTimeout(1000);

    // 5. 로그인 성공 확인
    await page.waitForTimeout(1000);

    //친구선택
    /*
    const friendList = page.locator('ul.list_recommfriend > li.ng-star-inserted').first();
    await page.click('div.box_profile');
    await friendList.locator('label.lab_pick > span.wrap_thumb').click();
    await page.click('button.btn_g.btn_confirm.ng-star-inserted');
    await page.waitForTimeout(1000);
    */

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

    // 8. 상품 옵션 설정
    const optionInputs = page.locator('textarea');

    // 첫 번째 입력창에 '1234' 입력
    await optionInputs.nth(0).fill('1234');
    await page.waitForTimeout(1000);

    // 두 번째 입력창에 '5678' 입력
    await optionInputs.nth(1).fill('5678');
    await page.waitForTimeout(1000);

    // 9. 옵션 저장 버튼 클릭
    await page.click('button.btn_wrtoption.on');
    await page.waitForTimeout(1000);

    // 10. 구매하기 버튼 클릭
    await page.click('button.btn_g');
    await page.waitForTimeout(1000);

    // 11. 친구 설정 체크박스 클릭


    try {
        const friendList = page.locator('ul.list_recommfriend > li.ng-star-inserted').first();
        await friendList.locator('label.lab_pick > span.wrap_thumb').click();

    } catch (e) {
        await page.locator('div.group_chk_friend').nth(3).locator('span.ico_base.ico_chk').click();
        await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);


    // 12. 친구 선택하기 실행
    await page.locator('button.btn_confirm').click();
    await page.waitForTimeout(1000);

    // 13. 주문서 진입 버튼 클릭
    await page.locator('button.btn_g').nth(1).click();
    await page.waitForTimeout(1000);

    // 14. 주문정보 동의 버튼 클릭
    await page.locator('button#focus_btn').click();
    await page.waitForTimeout(5000);

    // 브라우저가 종료되지 않도록 일시 정지합니다.
    await page.pause();
});

