import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// auth.json 사용 설정 (generate_auth.spec.ts 선행 실행 필수)
const authFile = path.resolve(__dirname, '../auth.json');
if (!fs.existsSync(authFile)) {
    console.warn('⚠️ auth.json이 없습니다! 먼저 generate_auth.spec.ts를 실행해주세요.');
}
test.use({ storageState: authFile });

test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(60000);

    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    //친구선택
    /*
    const friendList = page.locator('ul.list_recommfriend > li.ng-star-inserted').first();
    await page.click('div.box_profile');
    await friendList.locator('label.lab_pick > span.wrap_thumb').click();
    await page.click('button.btn_g.btn_confirm.ng-star-inserted');
    await page.waitForTimeout(1000);
    */

    // 2. 검색 버튼 클릭 및 '볼펜' 검색
    await page.click('a.link_search');
    await page.waitForTimeout(1000);

    const searchInput = page.locator('#searchInput');
    await searchInput.fill('볼펜');
    await page.waitForTimeout(1000);
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // 3. 검색 결과에서 첫 번째 상품 클릭
    await page.locator('a.link_thumb').first().click();
    await page.waitForLoadState();

    // 4. 상품 옵션 설정
    const optionInputs = page.locator('textarea');

    // 첫 번째 입력창에 '1234' 입력
    await optionInputs.nth(0).fill('1234');
    await page.waitForTimeout(1000);

    // 두 번째 입력창에 '5678' 입력
    await optionInputs.nth(1).fill('5678');
    await page.waitForTimeout(1000);

    // 5. 옵션 저장 버튼 클릭
    await page.click('button.btn_wrtoption.on');
    await page.waitForTimeout(1000);

    // 6. 구매하기 버튼 클릭
    await page.click('button.btn_g');
    await page.waitForTimeout(1000);

    // 7. 친구 설정 체크박스 클릭
    try {
        const friendList = page.locator('ul.list_recommfriend > li.ng-star-inserted').first();
        await friendList.locator('label.lab_pick > span.wrap_thumb').click();
    } catch (e) {
        await page.locator('div.group_chk_friend').nth(3).locator('span.ico_base.ico_chk').click();
        await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);

    // 8. 친구 선택하기 실행
    await page.locator('button.btn_confirm').click();
    await page.waitForTimeout(1000);

    // 9. 주문서 진입 버튼 클릭
    await page.locator('button.btn_g').nth(1).click();
    await page.waitForTimeout(1000);

    // 10. 주문정보 동의 버튼 클릭
    await page.locator('button#focus_btn').click();
    await page.waitForTimeout(5000);

    // 브라우저가 종료되지 않도록 일시 정지합니다.
    await page.pause();
});
