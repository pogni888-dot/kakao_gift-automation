import { test, expect } from '@playwright/test';

// auth.json이 있다면 로그인 상태를 불러옵니다.
// test.use({ storageState: 'auth.json' }); 

import path from 'path';
const authFile = path.resolve(__dirname, '../auth.json');
test.use({ storageState: authFile });

test('카카오 로그인 테스트', async ({ page }) => {
    test.setTimeout(60000); // 타임아웃을 60초로 늘림
    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    // 2. 로그인 상태 확인 및 로그인
    // [사용자 요청 로직] 로그인 버튼 클릭 시 'btn_logout' 요소가 나타나면 로그인 된 상태로 판단

    // 먼저 명시적으로 로그아웃 버튼이 떠있는지 확인(혹시나 해서)
    if (await page.locator('.btn_logout').isVisible()) {
        console.log('이미 로그인되어 있습니다. (로그아웃 버튼 감지)');
    }
    else if (await page.isVisible('a.link_login')) {
        console.log('로그인 버튼 감지. 클릭하여 상태를 확인합니다.');
        await page.click('a.link_login');
        await page.waitForTimeout(1500); // 팝업/화면전환 대기

        // 클릭 후 로그아웃 버튼이 보이는지 확인
        if (await page.locator('.btn_logout').isVisible()) {
            console.log('로그인 버튼 클릭 후 로그아웃 버튼이 확인되었습니다. -> 이미 로그인 상태');
        } else {
            console.log('로그아웃 버튼이 보이지 않습니다. -> 로그인이 필요합니다.');

            // 3. 아이디/비밀번호 입력 (업데이트된 계정 정보)
            try {
                await page.fill('#loginId--1', 'pogni822@naver.com');
                await page.waitForTimeout(1000);

                await page.fill('#password--2', 'wpwnehQ!12');
                await page.waitForTimeout(1000);

                // 4. 로그인 버튼 클릭
                await page.click('button.btn_g.highlight.submit');
                await page.waitForTimeout(2000);
            } catch (e) {
                console.log('로그인 입력 폼을 찾을 수 없습니다. 이미 로그인이 완료되었거나 페이지 구조가 다를 수 있습니다.');
            }
        }
    } else {
        console.log('로그인 버튼도 보이지 않습니다. 이미 로그인된 상태로 간주합니다.');
    }


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
    const productTitleLocator = page.locator('h4.tit_subject');
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
