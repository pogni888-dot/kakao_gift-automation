import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// auth.json 사용 설정 (generate_auth.spec.ts 선행 실행 필수)
const authFile = path.resolve(__dirname, '../auth.json');
if (!fs.existsSync(authFile)) {
    console.warn('⚠️ auth.json이 없습니다! 먼저 generate_auth.spec.ts를 실행해주세요.');
}
test.use({ storageState: authFile });

test('장바구니 테스트', async ({ page }) => {
    test.setTimeout(60000);

    // 1. 카카오 선물하기 홈으로 이동
    await page.goto('https://gift.kakao.com/home');
    await page.waitForTimeout(1000);

    // 디버깅: 현재 로드된 쿠키 개수 확인
    const cookies = await page.context().cookies();
    console.log(`현재 로드된 쿠키 개수: ${cookies.length}개`);
    console.log('쿠키 도메인 목록:', cookies.map(c => c.domain).join(', '));

    // 2. 검색 버튼을 찾아서 클릭
    await page.click('a.link_search');

    // 3. 검색 화면에서 '메가커피'를 검색
    await page.fill('#searchInput', '메가커피');
    await page.keyboard.press('Enter');

    // 결과 확인을 위해 잠시 대기
    await page.waitForTimeout(2000);

    // 4. 검색 결과에서 첫 번째 상품 포커싱 & 장바구니 버튼 클릭
    await page.locator('div.cmp_prd').nth(0).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.locator('div.cmp_prd').nth(0).locator('button.btn_cart > span.ico_base.ico_cart').click();
    await page.waitForLoadState();
    await page.waitForTimeout(1000);

    // 5. 주문정보 동의 버튼 클릭 (커스텀 제작상품)
    try {
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
        await page.locator('em', { hasText: '작성 옵션을 입력해주세요' }).first().waitFor({ timeout: 1500 });
        const optionInputs = await page.locator('em', { hasText: '작성 옵션을 입력해주세요' }).all();
        console.log(`총 ${optionInputs.length}개의 미입력 각인 옵션을 발견했습니다.`);

        const totalCount = optionInputs.length;

        for (let i = 0; i < totalCount; i++) {
            const input = page.locator('em', { hasText: '작성 옵션을 입력해주세요' }).nth(0);
            await input.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            const product = input.locator('xpath=ancestor::li').first();
            await product.waitFor({ timeout: 1500 });
            await product.locator('a.btn_dropdown').click();
            await page.waitForTimeout(1000);
            await product.locator('a', { hasText: '작성 옵션 변경' }).click();
            await page.waitForTimeout(1000);

            await page.locator('textarea').first().waitFor({ timeout: 1500 });
            const textAreaInputs = await page.locator('textarea').all();
            console.log(`총 ${textAreaInputs.length}개의 각인 옵션을 발견했습니다.`);

            for (const input of textAreaInputs) {
                await input.fill('ABC');
                await page.waitForTimeout(1000);
                await page.locator('button.btn_wrtoption').click();
                await page.waitForTimeout(1000);
            }
            await page.locator('button', { hasText: '변경 완료' }).click();
            await page.waitForTimeout(3000);
        }
    } catch (e) {
        console.log('미입력 각인 옵션이 없거나 로드되지 않았습니다.');
    }
    await page.waitForTimeout(1500);
    await page.locator('div.item_btn.item_dark > button.btn_g').click();
    await page.waitForTimeout(1500);

    // 6. 현금결제 여부 노출되는지 검사
    try {
        await page.locator('button.btn_payment.btn_point').click({ timeout: 1500 });
        await page.waitForTimeout(3000);
        await page.waitForLoadState();
    } catch (e) {
        console.log('현금결제 얼럿이 미노출되거나 로드되지 않았습니다.');
        await page.waitForLoadState();
    }

    await page.waitForTimeout(1500);
});
