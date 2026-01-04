import { test, chromium } from '@playwright/test';

test('기존 브라우저 연결 테스트', async () => {
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

    // 4. 카카오 선물하기 홈으로 이동 (로그인은 이미 되어있으므로 생략)
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

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
