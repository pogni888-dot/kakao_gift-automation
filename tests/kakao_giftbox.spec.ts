import { test, expect } from '@playwright/test';
import path from 'path';

// auth.json 사용 설정 (없을 경우 에러가 날 수 있으니 generate_auth.spec.ts 선행 필수)
// 프로젝트 루트의 auth.json을 명확하게 지정
const authFile = path.resolve(__dirname, '../auth.json');
console.log(`사용할 세션 파일 경로: ${authFile}`);
test.use({ storageState: authFile });

test('장바구니 테스트', async ({ page }) => {
    test.setTimeout(60000); // 타임아웃을 60초로 늘림
    // 1. 카카오 선물하기 홈으로 이동

    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    // 디버깅: 현재 로드된 쿠키 개수 확인
    const cookies = await page.context().cookies();
    console.log(`현재 로드된 쿠키 개수: ${cookies.length}개`);
    console.log('쿠키 도메인 목록:', cookies.map(c => c.domain).join(', '));


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
            // 로그인 페이지로 이동했으므로 입력 수행
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

            // 5. 로그인 성공 여부 (로그아웃 버튼 재확인)
            // await expect(page.locator('.btn_logout')).toBeVisible({ timeout: 5000 });
        }
    } else {
        console.log('로그인 버튼도 보이지 않습니다. 이미 로그인된 상태로 간주합니다.');
    }


    // 6. 검색 버튼을 찾아서 클릭
    await page.click('a.link_search');

    // 7. 검색 화면에서 '볼펜'을 검색
    await page.fill('#searchInput', '메가커피');
    await page.keyboard.press('Enter');

    // 결과 확인을 위해 잠시 대기
    await page.waitForTimeout(2000);

    // 8. 검색 결과에서 첫 번째 상품 포커싱 & 장바구니 버튼 클릭
    await page.locator('div.cmp_prd').nth(0).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.locator('div.cmp_prd').nth(0).locator('button.btn_cart > span.ico_base.ico_cart').click();
    await page.waitForLoadState();
    await page.waitForTimeout(1000);

    // 9. 주문정보 동의 버튼 클릭 (커스텀 제작상품)
    try {
        // 버튼이 없으면 빠르게 넘어가도록 타임아웃 3초 설정
        await page.locator('button#focus_btn').click({ timeout: 1500 });
        await page.waitForTimeout(3000);
        await page.waitForLoadState();

    } catch (e) {
        console.log('주문정보 동의 버튼이 없거나 로드되지 않았습니다.');
        await page.waitForLoadState();

    }

    await page.click('a.link_cart');
    await page.waitForLoadState();
    await page.waitForTimeout(3000);

    // 각인 옵션 상품이 있는지 & 미입력 각인 옵션 상품이 있는지 검사 후 임의 내용 입력
    try {
        // 미입력 각인 옵션 몇개인지 파악
        // await page.locator('a', { hasText: '로그인' }).click();
        await page.locator('em', { hasText: '작성 옵션을 입력해주세요' }).first().waitFor({ timeout: 1500 });
        const optionInputs = await page.locator('em', { hasText: '작성 옵션을 입력해주세요' }).all();
        console.log(`총 ${optionInputs.length}개의 미입력 각인 옵션을 발견했습니다.`);

        // 정방향으로 처리하기:
        // 처음에 총 개수를 저장해두고, 매번 "현재 시점의 첫 번째(0번째)" 요소만 계속 처리합니다.
        // 하나 처리하고 나면 목록에서 사라져서 다음 타자가 자동으로 0번째가 되기 때문입니다.
        const totalCount = optionInputs.length;

        for (let i = 0; i < totalCount; i++) {
            // 목록이 갱신되었으므로 다시 검색해서 항상 맨 위의 것(nth(0))을 가져옴
            const input = page.locator('em', { hasText: '작성 옵션을 입력해주세요' }).nth(0);
            await input.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            // 해당 'em' 태그가 포함된 상품의 상위 'li' 요소를 찾습니다.
            const product = input.locator('xpath=ancestor::li').first();
            await product.waitFor({ timeout: 1500 });
            // 옵션 변경 버튼 클릭
            await product.locator('a.btn_dropdown').click();
            await page.waitForTimeout(1000);
            // 작성 옵션 변경 클릭
            await product.locator('a', { hasText: '작성 옵션 변경' }).click();
            await page.waitForTimeout(1000);


            // 각인옵션 로드될 때까지 대기 (최대 3초 대기)
            await page.locator('textarea').first().waitFor({ timeout: 1500 });
            const textAreaInputs = await page.locator('textarea').all();
            console.log(`총 ${textAreaInputs.length}개의 각인 옵션을 발견했습니다.`);

            for (const input of textAreaInputs) {
                await input.fill('ABC');
                await page.waitForTimeout(1000); // 입력 간 안전 딜레이
                await page.locator('button.btn_wrtoption').click();
                await page.waitForTimeout(1000);
            }
            // 모든 입력 후 최종 '변경 완료' 버튼 클릭 (텍스트로 명확히 지정)
            await page.locator('button', { hasText: '변경 완료' }).click();
            // 변경 완료(저장) 버튼 클릭

            await page.waitForTimeout(3000);
        }
    } catch (e) {
        console.log('미입력 각인 옵션이 없거나 로드되지 않았습니다.');

    }
    await page.waitForTimeout(1500);
    await page.locator('div.item_btn.item_dark > button.btn_g').click();
    await page.waitForTimeout(1500);

    // 10. 현금결제 여부 노출되는지 검사
    try {
        // 버튼이 없으면 빠르게 넘어가도록 타임아웃 3초 설정
        await page.locator('button.btn_payment.btn_point').click({ timeout: 1500 });
        await page.waitForTimeout(3000);
        await page.waitForLoadState();

    } catch (e) {
        console.log('현금결제 얼럿이 미노출되거나 로드되지 않았습니다.');
        await page.waitForLoadState();
    }

    await page.waitForTimeout(1500);
});

