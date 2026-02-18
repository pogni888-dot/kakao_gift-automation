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

    // 2. 검색을 통해 상품 상세 페이지 진입
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

    // 3. 위시리스트(찜) 버튼 클릭
    const wishBtn = page.locator('button.btn_wish').first();
    await wishBtn.click();
    await page.waitForTimeout(1000);

    const wishlist = await page.locator('div.group_wshradio').nth(1);
    await wishlist.locator('span.ico_base.ico_radio').click();
    await page.waitForTimeout(1000);

    await page.locator('button.btn_wshlimit').click();
    await page.waitForTimeout(5000);
});
