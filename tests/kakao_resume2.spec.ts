import { test, expect } from '@playwright/test';
import { sendToSheet } from '../utils/sendToSheet';
import path from 'path';

// auth.json 사용 설정
const authFile = path.resolve(__dirname, '../auth.json');
test.use({ storageState: authFile });


const GOOGLE_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbypBHFV5wERziXeLdbPARPoh09bn4nQIxk_nM90z6dKp625egkt7alL4MSYPoDiajA/exec';

test.afterEach(async ({ }, testInfo) => {
    // 테스트 결과에 따라 PASS 또는 FAIL 결정
    // testInfo.status는 'passed', 'failed', 'timedOut', 'skipped' 값을 가짐
    const status = testInfo.status === 'passed' ? 'PASS' : 'FAIL';

    console.log(`테스트 종료: ${testInfo.status} -> 시트에 ${status} 전송`);

    // L53 셀에 결과 전송
    await sendToSheet(GOOGLE_SHEET_WEBHOOK_URL, {
        cell: 'L53',
        value: status,
        testName: testInfo.title,
        status: status
    });
});

test('카카오톡 선물하기 주문서 진입 테스트', async ({ page, context, browser }) => {
    test.setTimeout(60000); // 테스트 타임아웃을 60초로 늘림


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
    // 6. 검색 버튼을 찾아서 클릭
    await page.click('a.link_search');

    // 7. 검색 화면에서 '볼펜'을 검색
    await page.fill('#searchInput', '몽블랑');
    await page.keyboard.press('Enter');

    // 결과 확인을 위해 잠시 대기 (선택 사항)
    await page.waitForTimeout(2000);

    // 8. 검색 결과에서 첫 번째 상품 클릭
    await page.locator('div.cmp_prd').nth(0).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.locator('div.cmp_prd').nth(0).click();
    await page.waitForLoadState();

    // 9. 옵션 목록이 로드될 때까지 대기 (가장 중요한 수정 사항)

    try {
        // 선택형 옵션 로드될 때까지 대기(3초정도)
        await page.locator('div.wrap_option').first().waitFor({ timeout: 1500 });
        const wrapOptions = await page.locator('div.wrap_option').all();
        console.log(`총 ${wrapOptions.length}개의 선택형 옵션을 발견했습니다.`);

        await page.waitForTimeout(1000);
        for (const wrap of wrapOptions) {
            await wrap.locator('ul > li').first().click();
            await page.waitForTimeout(1000);
        }
    } catch (e) {
        console.log('옵션이 없거나 로드되지 않았습니다.');
        await page.waitForTimeout(1000);

    }
    // 10. 각인 옵션이 있다면 모두 '1234' 입력
    try {
        // 각인옵션 로드될 때까지 대기 (최대 3초 대기)
        await page.locator('textarea').first().waitFor({ timeout: 1500 });
        const optionInputs = await page.locator('textarea').all();
        console.log(`총 ${optionInputs.length}개의 각인 옵션을 발견했습니다.`);

        for (const input of optionInputs) {
            await input.fill('1234');
            await page.waitForTimeout(1000); // 입력 간 안전 딜레이
        }

        await page.locator('button.btn_wrtoption.on').click();
    } catch (e) {
        console.log('각인 옵션이 없거나 로드되지 않았습니다.');

    }
    // 11. 구매하기 버튼 클릭
    await page.locator('button.btn_g').nth(1).click();
    await page.waitForTimeout(1000);
    // 12. 친구 설정 체크박스 클릭
    try {
        const friendList = page.locator('ul.list_recommfriend > li.ng-star-inserted').first();
        await friendList.locator('label.lab_pick > span.wrap_thumb').click();

    } catch (e) {
        await page.locator('div.group_chk_friend').nth(3).locator('span.ico_base.ico_chk').click();
        await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);
    // 13. 친구 선택하기 실행
    await page.locator('button.btn_confirm').click();
    await page.waitForTimeout(1000);

    // 14. 주문서 진입 버튼 클릭
    await page.locator('button.btn_g').nth(1).click();
    await page.waitForTimeout(1000);

    // 15. 주문정보 동의 버튼 클릭
    try {
        // 버튼이 없으면 빠르게 넘어가도록 타임아웃 3초 설정
        await page.locator('button#focus_btn').click({ timeout: 1500 });
        await page.waitForTimeout(1000);

    } catch (e) {
        console.log('주문정보 동의 버튼이 없거나 로드되지 않았습니다.');
    }


    // 16. 테스트 종료
    console.log('테스트가 정상적으로 완료되었습니다.');

    await page.close();
    await context.close();
    await browser.close();
});
